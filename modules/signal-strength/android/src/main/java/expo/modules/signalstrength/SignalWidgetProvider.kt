package expo.modules.signalstrength

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.os.Build
import android.os.SystemClock
import android.telephony.CellSignalStrength
import android.telephony.CellSignalStrengthCdma
import android.telephony.CellSignalStrengthGsm
import android.telephony.CellSignalStrengthLte
import android.telephony.CellSignalStrengthNr
import android.telephony.CellSignalStrengthTdscdma
import android.telephony.CellSignalStrengthWcdma
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.widget.RemoteViews
import java.text.DateFormat
import java.util.Date
import java.util.Locale

/**
 * Ana ekran widget'ı: mobil sinyal gücü (dBm), 0–100 puan, operatör ve teknoloji.
 *
 * Güncelleme: Android en sık 30 dakikada bir (updatePeriodMillis), ⟳ butonuna basınca hemen,
 * uygulama açıkken de sinyal değiştikçe (en fazla 10 sn'de bir). İnternet ve izin kullanmaz.
 *
 * Puan ve kalite eşikleri src/signal/levels.ts ile aynıdır; birini değiştirirseniz diğerini de güncelleyin.
 */
class SignalWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    runCatching { val views = build(context); ids.forEach { manager.updateAppWidget(it, views) } }
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == ACTION_REFRESH) updateAll(context)
  }

  companion object {
    private data class Reading(val dbm: Int?, val tech: String, val operator: String?, val level: Int)

    private const val ACTION_REFRESH = "expo.modules.signalstrength.WIDGET_REFRESH"
    private const val THROTTLE_MS = 10_000L
    @Volatile private var lastAuto = 0L

    /** Ekrandaki bütün sinyal widget'larını günceller (widget yoksa hiçbir şey yapmaz) */
    fun updateAll(context: Context) {
      runCatching {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, SignalWidgetProvider::class.java))
        if (ids.isEmpty()) return
        val views = build(context)
        ids.forEach { manager.updateAppWidget(it, views) }
      }
    }

    /** Uygulama açıkken sinyal değiştikçe çağrılır; pil için en fazla 10 sn'de bir günceller */
    fun updateThrottled(context: Context) {
      val now = SystemClock.elapsedRealtime()
      if (now - lastAuto < THROTTLE_MS) return
      lastAuto = now
      updateAll(context)
    }

    // --- Görünüm ---

    private fun build(context: Context): RemoteViews {
      val tr = isTurkish(context)
      val dark = (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
        Configuration.UI_MODE_NIGHT_YES
      val views = RemoteViews(context.packageName, R.layout.ss_widget_signal)
      val r = read(context)

      if (r == null) {
        views.setTextViewText(R.id.ss_widget_dbm, "—")
        views.setTextViewText(R.id.ss_widget_operator, if (tr) "Şebeke yok" else "No network")
        views.setTextViewText(R.id.ss_widget_quality, if (tr) "SIM yok / uçak modu" else "No SIM / airplane mode")
        views.setImageViewBitmap(R.id.ss_widget_bars, bars(context, 0, dark))
      } else {
        val score = score(r)
        views.setTextViewText(R.id.ss_widget_dbm, r.dbm?.let { "$it dBm" } ?: "${r.level}/4")
        views.setTextViewText(
          R.id.ss_widget_operator,
          listOfNotNull(r.operator, techLabel(r.tech, tr)).joinToString(" · ")
        )
        views.setTextViewText(R.id.ss_widget_quality, "${quality(score, tr)} · $score/100")
        views.setImageViewBitmap(R.id.ss_widget_bars, bars(context, score, dark))
      }
      val locale = if (tr) Locale("tr", "TR") else Locale.getDefault()
      views.setTextViewText(R.id.ss_widget_time, DateFormat.getTimeInstance(DateFormat.SHORT, locale).format(Date()))

      // Widget'a dokununca uygulama açılır, ⟳ ile hemen yenilenir
      context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launch ->
        views.setOnClickPendingIntent(
          R.id.ss_widget_root,
          PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        )
      }
      val refresh = Intent(context, SignalWidgetProvider::class.java).setAction(ACTION_REFRESH)
      views.setOnClickPendingIntent(
        R.id.ss_widget_refresh,
        PendingIntent.getBroadcast(context, 1, refresh, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      )
      return views
    }

    // Uygulamadaki gibi 10 çubuk; renk puana göre (kırmızı / sarı / yeşil)
    private fun bars(context: Context, score: Int, dark: Boolean): Bitmap {
      val d = context.resources.displayMetrics.density
      val count = 10
      val barW = 5f * d
      val gap = 2f * d
      val w = (count * barW + (count - 1) * gap).toInt()
      val h = (28f * d).toInt()
      val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(bmp)
      val filled = Math.round(score / 10f)
      val on = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor(barColor(score, dark)) }
      val off = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor(if (dark) "#334155" else "#CBD5E1") }
      for (i in 0 until count) {
        val barH = h * (0.25f + 0.75f * i / (count - 1))
        val left = i * (barW + gap)
        canvas.drawRoundRect(RectF(left, h - barH, left + barW, h.toFloat()), d, d, if (i < filled) on else off)
      }
      return bmp
    }

    // App.tsx → barColor + theme.tsx → tone (açık temada koyu tonlar)
    private fun barColor(score: Int, dark: Boolean) = when {
      score <= 30 -> if (dark) "#EF4444" else "#B91C1C"
      score <= 60 -> if (dark) "#F59E0B" else "#B45309"
      else -> if (dark) "#22C55E" else "#15803D"
    }

    // --- Metinler (uygulamada seçilen dil; seçilmediyse telefon dili) ---

    private fun isTurkish(context: Context): Boolean {
      val saved = runCatching {
        context.getSharedPreferences("sinyal_olcer", Context.MODE_PRIVATE).getString("language", null)
      }.getOrNull()
      return (saved ?: Locale.getDefault().language) == "tr"
    }

    private fun quality(score: Int, tr: Boolean) = when {
      score == 0 -> if (tr) "Sinyal yok" else "No signal"
      score <= 20 -> if (tr) "Çok zayıf" else "Very poor"
      score <= 40 -> if (tr) "Zayıf" else "Poor"
      score <= 60 -> if (tr) "Orta" else "Fair"
      score <= 80 -> if (tr) "İyi" else "Good"
      else -> if (tr) "Mükemmel" else "Excellent"
    }

    private fun techLabel(tech: String, tr: Boolean) = when (tech) {
      "NR" -> "5G"
      "LTE" -> "4G (LTE)"
      "WCDMA" -> "3G (WCDMA)"
      "TDSCDMA" -> "3G (TD-SCDMA)"
      "GSM" -> "2G (GSM)"
      "CDMA" -> "2G/3G (CDMA)"
      else -> if (tr) "Bilinmiyor" else "Unknown"
    }

    // --- Sinyal okuma (modüldeki getCurrent ile aynı yöntem: mobil veri SIM'i, izin gerekmez) ---

    private fun read(context: Context): Reading? {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return null
      val base = context.getSystemService(TelephonyManager::class.java) ?: return null
      val subId = runCatching { SubscriptionManager.getDefaultDataSubscriptionId() }
        .getOrDefault(SubscriptionManager.INVALID_SUBSCRIPTION_ID)
      val tm = if (subId != SubscriptionManager.INVALID_SUBSCRIPTION_ID) {
        runCatching { base.createForSubscriptionId(subId) }.getOrDefault(base)
      } else base
      val ss = runCatching { tm.signalStrength }.getOrNull() ?: return null
      val operator = runCatching { tm.networkOperatorName }.getOrNull()?.trim()?.takeIf { it.isNotEmpty() }
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        return if (ss.level > 0) Reading(null, "UNKNOWN", operator, ss.level) else null
      }
      val cell = ss.cellSignalStrengths.filter { valid(it.dbm) != null }.minByOrNull { priority(it) } ?: return null
      return Reading(valid(cell.dbm), tech(cell), operator, cell.level)
    }

    // src/signal/levels.ts → toScore ile aynı aralıklar
    private fun score(r: Reading): Int {
      val dbm = r.dbm ?: return Math.round(r.level / 4f * 100)
      val (min, max) = when (r.tech) {
        "NR", "LTE" -> -125 to -75
        "WCDMA", "TDSCDMA" -> -115 to -65
        "GSM", "CDMA" -> -110 to -60
        else -> -120 to -70
      }
      return (Math.round((dbm - min) * 100f / (max - min))).coerceIn(0, 100)
    }

    private fun tech(c: CellSignalStrength) = when (c) {
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

    private fun valid(v: Int): Int? = if (v == Int.MAX_VALUE || v == Int.MIN_VALUE) null else v
  }
}