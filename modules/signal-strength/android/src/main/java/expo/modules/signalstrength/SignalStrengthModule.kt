package expo.modules.signalstrength

import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.CellSignalStrength
import android.telephony.CellSignalStrengthCdma
import android.telephony.CellSignalStrengthGsm
import android.telephony.CellSignalStrengthLte
import android.telephony.CellSignalStrengthNr
import android.telephony.CellSignalStrengthTdscdma
import android.telephony.CellSignalStrengthWcdma
import android.telephony.PhoneStateListener
import android.telephony.SignalStrength
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import androidx.annotation.RequiresApi
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Telefonun o anki hücresel sinyal gücünü okur. İnternet ve ek izin gerektirmez
 * (SignalStrength okumak için Android izin istemez).
 */
class SignalStrengthModule : Module() {

  private val telephony: TelephonyManager
    get() {
      val ctx = appContext.reactContext ?: throw IllegalStateException("React context yok")
      return ctx.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
    }

  private val mainHandler = Handler(Looper.getMainLooper())
  private var telephonyCallback: TelephonyCallback? = null   // Android 12+
  @Suppress("DEPRECATION")
  private var legacyListener: PhoneStateListener? = null     // Android 9-11

  override fun definition() = ModuleDefinition {
    Name("SignalStrength")
    Events("onSignalChange")

    // Anlık tek okuma. Android 9 (API 28) altı desteklenmez.
    Function("getCurrent") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) toMap(telephony.signalStrength)
      else mapOf("available" to false, "reason" to "unsupported_os", "timestamp" to System.currentTimeMillis())
    }

    // Sinyal değiştikçe "onSignalChange" olayı gönderir
    Function("startListening") { startListening() }
    Function("stopListening") { stopListening() }

    OnDestroy { runCatching { stopListening() } }
  }

  // Dinleyici callback'leri ana thread'de çalışır; buradaki bir hata uygulamayı kapatmasın,
  // JS tarafına "error" olarak iletilsin
  private fun emit(ss: SignalStrength?) {
    val payload = try {
      toMap(ss)
    } catch (e: Exception) {
      mapOf(
        "available" to false, "reason" to "error",
        "errorMessage" to e.toString(), "timestamp" to System.currentTimeMillis()
      )
    }
    runCatching { sendEvent("onSignalChange", payload) }
  }

  private fun startListening() {
    // Android 9 altında dinleyici başlatılmaz; aksi halde "desteklenmiyor" ekranının üzerine veri yazar
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return
    if (telephonyCallback != null || legacyListener != null) return

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val ctx = appContext.reactContext ?: return
      val cb = SignalCallback { emit(it) }
      telephony.registerTelephonyCallback(ctx.mainExecutor, cb)
      telephonyCallback = cb
    } else {
      // PhoneStateListener, Looper'ı olan bir thread'de oluşturulmalı
      mainHandler.post {
        @Suppress("DEPRECATION")
        val listener = object : PhoneStateListener() {
          @Deprecated("Deprecated in Java")
          override fun onSignalStrengthsChanged(ss: SignalStrength?) = emit(ss)
        }
        @Suppress("DEPRECATION")
        telephony.listen(listener, PhoneStateListener.LISTEN_SIGNAL_STRENGTHS)
        legacyListener = listener
      }
    }
  }

  private fun stopListening() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      telephonyCallback?.let { telephony.unregisterTelephonyCallback(it) }
      telephonyCallback = null
    }
    legacyListener?.let { l ->
      mainHandler.post {
        @Suppress("DEPRECATION")
        telephony.listen(l, PhoneStateListener.LISTEN_NONE)
      }
    }
    legacyListener = null
  }

  private fun toMap(ss: SignalStrength?): Map<String, Any?> {
    val now = System.currentTimeMillis()
    if (ss == null) return mapOf("available" to false, "reason" to "no_data", "timestamp" to now)

    // Android 9 (API 28): hücre bazlı detay public API'de yok, sadece sistemin 0-4 seviyesi
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      return mapOf(
        "available" to true, "technology" to "UNKNOWN", "dbm" to null,
        "systemLevel" to ss.level, "operator" to operatorName(), "timestamp" to now
      )
    }

    // 5G NSA'da LTE + NR birlikte gelir; en yeni teknolojiyi seç
    val cell = ss.cellSignalStrengths
      .filter { valid(it.dbm) != null }
      .minByOrNull { priority(it) }
      ?: return mapOf("available" to false, "reason" to "no_service", "timestamp" to now)

    val result = mutableMapOf<String, Any?>(
      "available" to true,
      "technology" to techOf(cell),
      "operator" to operatorName(),
      "dbm" to valid(cell.dbm),
      "asu" to valid(cell.asuLevel),
      "systemLevel" to cell.level,   // Android'in kendi 0-4 seviyesi (karşılaştırma için)
      "timestamp" to now
    )
    when (cell) {
      is CellSignalStrengthNr -> {
        result["rsrp"] = valid(cell.ssRsrp); result["rsrq"] = valid(cell.ssRsrq); result["sinr"] = valid(cell.ssSinr)
      }
      is CellSignalStrengthLte -> {
        result["rsrp"] = valid(cell.rsrp); result["rsrq"] = valid(cell.rsrq)
        result["sinr"] = valid(cell.rssnr); result["rssi"] = valid(cell.rssi)
      }
    }
    return result
  }

  private fun techOf(c: CellSignalStrength) = when (c) {
    is CellSignalStrengthNr -> "NR"
    is CellSignalStrengthLte -> "LTE"
    is CellSignalStrengthWcdma -> "WCDMA"
    is CellSignalStrengthTdscdma -> "TDSCDMA"
    is CellSignalStrengthGsm -> "GSM"
    is CellSignalStrengthCdma -> "CDMA"
    else -> "UNKNOWN"
  }

  private fun priority(c: CellSignalStrength) = when (c) {
    is CellSignalStrengthNr -> 0
    is CellSignalStrengthLte -> 1
    is CellSignalStrengthWcdma -> 2
    is CellSignalStrengthTdscdma -> 3
    is CellSignalStrengthGsm -> 4
    else -> 5
  }

  // Kayıtlı olunan şebekenin adı (ör. TURKCELL). İzin gerektirmez; şebeke yoksa null.
  private fun operatorName(): String? =
    runCatching { telephony.networkOperatorName }.getOrNull()?.trim()?.takeIf { it.isNotEmpty() }

  // CellInfo.UNAVAILABLE == Int.MAX_VALUE
  private fun valid(v: Int): Int? = if (v == Int.MAX_VALUE || v == Int.MIN_VALUE) null else v
}

@RequiresApi(Build.VERSION_CODES.S)
private class SignalCallback(
  private val onChange: (SignalStrength) -> Unit
) : TelephonyCallback(), TelephonyCallback.SignalStrengthsListener {
  override fun onSignalStrengthsChanged(signalStrength: SignalStrength) = onChange(signalStrength)
}