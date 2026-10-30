package expo.modules.signalstrength

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
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
import java.util.concurrent.atomic.AtomicBoolean
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Telefonun o anki hücresel sinyal gücünü ve aktif internet bağlantısının tipini okur.
 * Sinyal okumak izin gerektirmez; bağlantı tipi için yalnızca ACCESS_NETWORK_STATE
 * (kurulumda otomatik verilen, kullanıcıya sorulmayan) izni gerekir.
 */
class SignalStrengthModule : Module() {

  private val telephony: TelephonyManager
    get() {
      val ctx = appContext.reactContext ?: throw IllegalStateException("React context yok")
      return ctx.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
    }

  private val connectivity: ConnectivityManager?
    get() = appContext.reactContext?.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

  private val mainHandler = Handler(Looper.getMainLooper())
  private var telephonyCallback: TelephonyCallback? = null   // Android 12+
  @Suppress("DEPRECATION")
  private var legacyListener: PhoneStateListener? = null     // Android 9-11
  private var networkCallback: ConnectivityManager.NetworkCallback? = null

  override fun definition() = ModuleDefinition {
    Name("SignalStrength")
    Events("onSignalChange", "onNetworkChange")

    // Anlık tek okuma. Android 9 (API 28) altı desteklenmez.
    Function("getCurrent") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) toMap(telephony.signalStrength)
      else mapOf("available" to false, "reason" to "unsupported_os", "timestamp" to System.currentTimeMillis())
    }

    // Sinyal değiştikçe "onSignalChange" olayı gönderir
    Function("startListening") { startListening() }
    Function("stopListening") { stopListening() }

    // Tema tercihi ("system" | "light" | "dark"). Senkron okunur, böylece açılışta yanlış tema yanıp sönmez.
    Function("getThemePreference") { prefs()?.getString(KEY_THEME, null) }
    Function("setThemePreference") { mode: String ->
      prefs()?.edit()?.putString(KEY_THEME, mode)?.apply()
    }

    // Dil tercihi ("tr" | "en"); kullanıcı seçmediyse null (telefon dili kullanılır)
    Function("getLanguagePreference") { prefs()?.getString(KEY_LANGUAGE, null) }
    Function("setLanguagePreference") { lang: String ->
      prefs()?.edit()?.putString(KEY_LANGUAGE, lang)?.apply()
    }

    // Aktif internet bağlantısı (Wi-Fi / mobil veri / ...) ve değişiklik bildirimleri
    Function("getNetworkInfo") { networkInfo(currentCapabilities()) }
    Function("startNetworkListening") { startNetworkListening() }
    Function("stopNetworkListening") { stopNetworkListening() }

    // Bağlı Wi-Fi ağının adı (SSID). Android bunu yalnızca konum izni verilmiş ve
    // konum servisi açıkken verir; aksi halde null döner.
    AsyncFunction("getWifiName") { promise: Promise -> getWifiName(promise) }

    OnDestroy {
      runCatching { stopListening() }
      runCatching { stopNetworkListening() }
    }
  }

  private fun prefs() =
    appContext.reactContext?.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  // --- Bağlantı tipi ---

  private fun currentCapabilities(): NetworkCapabilities? {
    val cm = connectivity ?: return null
    val network = cm.activeNetwork ?: return null
    return cm.getNetworkCapabilities(network)
  }

  private fun networkInfo(caps: NetworkCapabilities?): Map<String, Any?> {
    if (caps == null) {
      return mapOf("connected" to false, "validated" to false, "type" to "none", "metered" to false)
    }
    val type = when {
      caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
      caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
      caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
      caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> "vpn"
      else -> "other"
    }
    return mapOf(
      "connected" to caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET),
      // Android, ağın gerçekten internete çıkabildiğini doğruladıysa true
      "validated" to caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED),
      "type" to type,
      // Kotalı bağlantı (genelde mobil veri); hız testi öncesi kullanıcı uyarısı için
      "metered" to !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
    )
  }

  private fun startNetworkListening() {
    if (networkCallback != null) return
    val cm = connectivity ?: return
    val cb = object : ConnectivityManager.NetworkCallback() {
      override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) = emitNetwork(caps)
      override fun onLost(network: Network) = emitNetwork(null)
    }
    cm.registerDefaultNetworkCallback(cb)
    networkCallback = cb
  }

  private fun stopNetworkListening() {
    networkCallback?.let { cb -> connectivity?.unregisterNetworkCallback(cb) }
    networkCallback = null
  }

  private fun getWifiName(promise: Promise) {
    val cm = connectivity ?: return promise.resolve(null)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      // Android 12+: SSID yalnızca FLAG_INCLUDE_LOCATION_INFO ile kayıtlı callback'e verilir
      val done = AtomicBoolean(false)
      val request = NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build()
      val cb = object : ConnectivityManager.NetworkCallback(ConnectivityManager.NetworkCallback.FLAG_INCLUDE_LOCATION_INFO) {
        override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) {
          if (done.getAndSet(true)) return
          runCatching { cm.unregisterNetworkCallback(this) }
          promise.resolve(cleanSsid((caps.transportInfo as? WifiInfo)?.ssid))
        }
      }
      try {
        cm.registerNetworkCallback(request, cb)
      } catch (e: Exception) {
        return promise.resolve(null)
      }
      // Wi-Fi yoksa callback hiç çağrılmaz; 3 sn sonra boş dön
      mainHandler.postDelayed({
        if (!done.getAndSet(true)) {
          runCatching { cm.unregisterNetworkCallback(cb) }
          promise.resolve(null)
        }
      }, 3000)
    } else {
      val wifi = appContext.reactContext?.applicationContext
        ?.getSystemService(Context.WIFI_SERVICE) as? WifiManager
      @Suppress("DEPRECATION")
      promise.resolve(cleanSsid(runCatching { wifi?.connectionInfo?.ssid }.getOrNull()))
    }
  }

  // Android SSID'yi tırnak içinde verir; izin yoksa "<unknown ssid>" döner
  private fun cleanSsid(raw: String?): String? {
    val s = raw?.trim()?.removeSurrounding("\"") ?: return null
    return if (s.isEmpty() || s == "<unknown ssid>") null else s
  }

  // Ağ callback'leri arka plan thread'inde çalışır; hata uygulamayı kapatmasın
  private fun emitNetwork(caps: NetworkCapabilities?) {
    runCatching { sendEvent("onNetworkChange", networkInfo(caps)) }
  }

  // --- Sinyal ---

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

  companion object {
    private const val PREFS_NAME = "sinyal_olcer"
    private const val KEY_THEME = "theme"
    private const val KEY_LANGUAGE = "language"
  }

  // CellInfo.UNAVAILABLE == Int.MAX_VALUE
  private fun valid(v: Int): Int? = if (v == Int.MAX_VALUE || v == Int.MIN_VALUE) null else v
}

@RequiresApi(Build.VERSION_CODES.S)
private class SignalCallback(
  private val onChange: (SignalStrength) -> Unit
) : TelephonyCallback(), TelephonyCallback.SignalStrengthsListener {
  override fun onSignalStrengthsChanged(signalStrength: SignalStrength) = onChange(signalStrength)
}