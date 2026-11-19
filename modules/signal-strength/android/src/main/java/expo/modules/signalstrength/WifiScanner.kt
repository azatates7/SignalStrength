package expo.modules.signalstrength

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import expo.modules.kotlin.Promise
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Çevredeki Wi-Fi ağlarını tarar (kanal analizi için). Yalnızca kullanıcı "Tara"ya dokununca çalışır.
 * Gereken izin: ACCESS_FINE_LOCATION (uygulamada zaten var, Wi-Fi adı ve baz istasyonu için isteniyor;
 * Android 13+ da tarama sonuçları için bu izni ister). CHANGE_WIFI_STATE normal izindir, sorulmaz.
 * Android, öndeki uygulamalara 2 dakikada en fazla 4 tarama izni verir; sınır dolunca startScan()
 * false döner ve sistemin son tarama sonuçları kullanılır (throttled = true).
 */
object WifiScanner {
  private const val WAIT_MS = 6000L

  fun scan(context: Context, promise: Promise) {
    val app = context.applicationContext
    if (app.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
      promise.resolve(mapOf("status" to "permission"))
      return
    }
    val wm = app.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    if (wm == null) {
      promise.resolve(mapOf("status" to "unsupported"))
      return
    }
    if (!wm.isWifiEnabled && !wm.isScanAlwaysAvailable) {
      promise.resolve(mapOf("status" to "wifiOff"))
      return
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      val lm = app.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
      if (lm != null && !lm.isLocationEnabled) {
        promise.resolve(mapOf("status" to "locationOff"))
        return
      }
    }

    val done = AtomicBoolean(false)
    val handler = Handler(Looper.getMainLooper())
    var receiver: BroadcastReceiver? = null

    fun finish(throttled: Boolean) {
      if (!done.compareAndSet(false, true)) return
      receiver?.let { runCatching { app.unregisterReceiver(it) } }
      promise.resolve(
        runCatching { result(wm, throttled) }.getOrElse { mapOf("status" to "error", "message" to it.toString()) }
      )
    }

    receiver = object : BroadcastReceiver() {
      override fun onReceive(c: Context?, intent: Intent?) = finish(false)
    }
    val filter = IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
    runCatching {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        app.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        app.registerReceiver(receiver, filter)
      }
    }

    @Suppress("DEPRECATION")
    val started = runCatching { wm.startScan() }.getOrDefault(false)
    if (!started) {
      finish(true) // Sınır doldu: son sonuçlar
      return
    }
    handler.postDelayed({ finish(false) }, WAIT_MS) // Yayın gelmezse eldekiyle bitir
  }

  private fun result(wm: WifiManager, throttled: Boolean): Map<String, Any?> {
    @Suppress("DEPRECATION")
    val connected = runCatching { wm.connectionInfo?.bssid }.getOrNull()?.lowercase()
    val nowUs = SystemClock.elapsedRealtimeNanos() / 1000
    val networks = wm.scanResults.orEmpty().map { r ->
      mapOf(
        "ssid" to ssidOf(r),
        "bssid" to r.BSSID?.lowercase(),
        "frequency" to r.frequency,
        "widthMhz" to widthMhz(r.channelWidth),
        "level" to r.level,
        "standard" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) r.wifiStandard else null,
        "ageMs" to ((nowUs - r.timestamp) / 1000).coerceAtLeast(0),
      )
    }
    return mapOf("status" to "ok", "throttled" to throttled, "connectedBssid" to connected, "networks" to networks)
  }

  private fun ssidOf(r: ScanResult): String? {
    val raw = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      r.wifiSsid?.toString()
    } else {
      @Suppress("DEPRECATION")
      r.SSID
    }
    return raw?.removeSurrounding("\"")?.takeIf { it.isNotEmpty() && it != "<unknown ssid>" }
  }

  private fun widthMhz(w: Int) = when (w) {
    ScanResult.CHANNEL_WIDTH_20MHZ -> 20
    ScanResult.CHANNEL_WIDTH_40MHZ -> 40
    ScanResult.CHANNEL_WIDTH_80MHZ -> 80
    ScanResult.CHANNEL_WIDTH_160MHZ, ScanResult.CHANNEL_WIDTH_80MHZ_PLUS_MHZ -> 160
    5 -> 320 // ScanResult.CHANNEL_WIDTH_320MHZ (Android 13+)
    else -> 20
  }
}