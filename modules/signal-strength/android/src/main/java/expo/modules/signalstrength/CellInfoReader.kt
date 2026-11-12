package expo.modules.signalstrength

import android.annotation.SuppressLint
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.CellInfo
import android.telephony.CellInfoGsm
import android.telephony.CellInfoLte
import android.telephony.CellInfoNr
import android.telephony.CellInfoWcdma
import android.telephony.CellIdentityNr
import android.telephony.CellSignalStrengthNr
import android.telephony.TelephonyManager
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Baz istasyonu (hücre) bilgisi: bağlı olunan ve çevredeki hücreler.
 * Android bunu yalnızca HASSAS KONUM izni olan uygulamalara verir; izin "Göster"e dokununca istenir.
 * Hiçbir şey saklanmaz veya gönderilmez. Sonuç: {status, cells}
 *   status: "ok" | "permission" (izin yok) | "unsupported" | "error"
 */
internal object CellInfoReader {
  // Tek iş parçacığı yeter; her okumada yeni oluşturulursa boşta kalan iş parçacıkları birikir
  private val executor = Executors.newSingleThreadExecutor()

  private fun v(x: Int): Int? = if (x == Int.MAX_VALUE || x == Int.MIN_VALUE) null else x
  private fun v(x: Long): Long? = if (x == Long.MAX_VALUE || x == Long.MIN_VALUE) null else x

  @SuppressLint("MissingPermission") // İzin JS tarafında istenir; yoksa SecurityException → "permission"
  fun read(tm: TelephonyManager, done: (Map<String, Any?>) -> Unit) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
      done(mapOf("status" to "unsupported", "cells" to emptyList<Any>()))
      return
    }
    val finished = AtomicBoolean(false)
    fun finish(list: List<CellInfo>?, error: Throwable? = null) {
      if (!finished.compareAndSet(false, true)) return
      done(
        when {
          error is SecurityException -> mapOf("status" to "permission", "cells" to emptyList<Any>())
          error != null -> mapOf("status" to "error", "cells" to emptyList<Any>())
          else -> mapOf("status" to "ok", "cells" to (list ?: emptyList()).mapNotNull { toMap(it) })
        }
      )
    }
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        // Android 10+: güncel ölçüm istenir; 3 sn'de gelmezse son bilinen liste kullanılır
        tm.requestCellInfoUpdate(executor, object : TelephonyManager.CellInfoCallback() {
          override fun onCellInfo(cellInfo: MutableList<CellInfo>) = finish(cellInfo)
          override fun onError(errorCode: Int, detail: Throwable?) =
            finish(runCatching { tm.allCellInfo }.getOrNull())
        })
        Handler(Looper.getMainLooper()).postDelayed({
          if (!finished.get()) finish(runCatching { tm.allCellInfo }.getOrNull())
        }, 3000)
      } else {
        finish(tm.allCellInfo)
      }
    } catch (e: Throwable) {
      finish(null, e)
    }
  }

  private fun toMap(c: CellInfo): Map<String, Any?>? {
    val registered = c.isRegistered
    return when {
      c is CellInfoLte -> {
        val id = c.cellIdentity
        val s = c.cellSignalStrength
        mapOf(
          "type" to "LTE", "registered" to registered,
          "mcc" to id.mccString, "mnc" to id.mncString,
          "tac" to v(id.tac), "cellId" to v(id.ci)?.toLong(), "pci" to v(id.pci),
          "arfcn" to v(id.earfcn),
          "bands" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) id.bands.toList() else emptyList<Int>(),
          "bandwidthKhz" to v(id.bandwidth),
          "rsrp" to v(s.rsrp), "rsrq" to v(s.rsrq), "sinr" to v(s.rssnr),
          "dbm" to v(s.dbm), "timingAdvance" to v(s.timingAdvance),
        )
      }
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && c is CellInfoNr -> {
        val id = c.cellIdentity as CellIdentityNr
        val s = c.cellSignalStrength as CellSignalStrengthNr
        mapOf(
          "type" to "NR", "registered" to registered,
          "mcc" to id.mccString, "mnc" to id.mncString,
          "tac" to v(id.tac), "cellId" to v(id.nci), "pci" to v(id.pci),
          "arfcn" to v(id.nrarfcn),
          "bands" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) id.bands.toList() else emptyList<Int>(),
          "rsrp" to v(s.ssRsrp), "rsrq" to v(s.ssRsrq), "sinr" to v(s.ssSinr), "dbm" to v(s.dbm),
        )
      }
      c is CellInfoWcdma -> {
        val id = c.cellIdentity
        mapOf(
          "type" to "WCDMA", "registered" to registered,
          "mcc" to id.mccString, "mnc" to id.mncString,
          "tac" to v(id.lac), "cellId" to v(id.cid)?.toLong(), "pci" to v(id.psc),
          "arfcn" to v(id.uarfcn), "dbm" to v(c.cellSignalStrength.dbm),
        )
      }
      c is CellInfoGsm -> {
        val id = c.cellIdentity
        mapOf(
          "type" to "GSM", "registered" to registered,
          "mcc" to id.mccString, "mnc" to id.mncString,
          "tac" to v(id.lac), "cellId" to v(id.cid)?.toLong(), "pci" to v(id.bsic),
          "arfcn" to v(id.arfcn), "dbm" to v(c.cellSignalStrength.dbm),
          "timingAdvance" to v(c.cellSignalStrength.timingAdvance),
        )
      }
      else -> null
    }
  }
}