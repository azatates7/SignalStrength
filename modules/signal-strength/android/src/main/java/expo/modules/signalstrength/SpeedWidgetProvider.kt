package expo.modules.signalstrength

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONArray
import java.text.DateFormat
import java.util.Date
import kotlin.math.roundToInt

/**
 * Ana ekran "Hız testi" widget'ı: son testin indirme / yükleme / ping değeri ve "Başlat" butonu.
 *
 * Hız testi widget'ın içinde çalışamaz (ölçüm uygulamadaki JS kodunda); "Başlat" uygulamayı
 * signalstrength://speedtest?start=1 ile açar, uygulama Hız Testi sekmesine geçip testi başlatır.
 * Widget'ın geri kalanına dokununca uygulama Hız Testi sekmesinde açılır (test başlamaz).
 * Son sonuç uygulamanın test geçmişinden okunur (SharedPreferences "speed_history").
 */
class SpeedWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    runCatching { val views = build(context); ids.forEach { manager.updateAppWidget(it, views) } }
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == WidgetStyle.ACTION_TOGGLE_THEME) WidgetStyle.toggleTheme(context)
  }

  companion object {
    private const val PREFS = "sinyal_olcer"
    private const val KEY_SPEED_HISTORY = "speed_history"

    fun updateAll(context: Context) {
      runCatching {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, SpeedWidgetProvider::class.java))
        if (ids.isEmpty()) return
        val views = build(context)
        ids.forEach { manager.updateAppWidget(it, views) }
      }
    }

    private data class Last(val at: Long, val down: Double, val up: Double?, val ping: Double)

    // Geçmiş yeniden eskiye sıralı tutulur (src/speedtest/history.ts); ilk kayıt en son test
    private fun lastTest(context: Context): Last? = runCatching {
      val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_SPEED_HISTORY, null)
        ?: return null
      val o = JSONArray(raw).optJSONObject(0) ?: return null
      Last(
        at = o.getLong("at"),
        down = o.getDouble("downloadMbps"),
        up = if (o.has("uploadMbps") && !o.isNull("uploadMbps")) o.getDouble("uploadMbps") else null,
        ping = o.getDouble("pingMs"),
      )
    }.getOrNull()

    // src/speedtest/format.ts → formatMbps ile aynı: 10 ve üzeri tam sayı, altı tek ondalık
    private fun mbps(v: Double?, tr: Boolean): String {
      if (v == null || v.isNaN()) return "—"
      if (v >= 10) return v.roundToInt().toString()
      val s = String.format(java.util.Locale.US, "%.1f", v)
      return if (tr) s.replace('.', ',') else s
    }

    private fun build(context: Context): RemoteViews {
      val tr = WidgetStyle.isTurkish(context)
      val dark = WidgetStyle.isDark(context)
      val p = WidgetStyle.palette(dark)
      val views = RemoteViews(context.packageName, R.layout.ss_widget_speed)

      views.setTextViewText(R.id.ss_speed_title, if (tr) "Hız testi" else "Speed test")
      views.setTextViewText(R.id.ss_speed_start, if (tr) "Başlat" else "Start")
      val last = lastTest(context)
      if (last == null) {
        views.setTextViewText(R.id.ss_speed_values, "↓ — · ↑ — Mbps")
        views.setTextViewText(R.id.ss_speed_detail, if (tr) "Henüz test yok" else "No tests yet")
      } else {
        views.setTextViewText(R.id.ss_speed_values, "↓ ${mbps(last.down, tr)} · ↑ ${mbps(last.up, tr)} Mbps")
        val df = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT, WidgetStyle.locale(context))
        views.setTextViewText(R.id.ss_speed_detail, "Ping ${last.ping.roundToInt()} ms · ${df.format(Date(last.at))}")
      }

      // Tema
      views.setInt(R.id.ss_speed_root, "setBackgroundResource", p.background)
      views.setInt(R.id.ss_speed_start, "setBackgroundResource", p.button)
      views.setTextColor(R.id.ss_speed_start, p.onAccent)
      views.setTextColor(R.id.ss_speed_title, p.muted)
      views.setTextColor(R.id.ss_speed_values, p.text)
      views.setTextColor(R.id.ss_speed_detail, p.muted)
      WidgetStyle.bindThemeButton(context, views, R.id.ss_speed_theme, SpeedWidgetProvider::class.java, dark)

      // "Başlat": uygulamayı açıp testi başlatır; widget'ın geri kalanı yalnızca Hız Testi sekmesini açar
      views.setOnClickPendingIntent(R.id.ss_speed_start, deepLink(context, "signalstrength://speedtest?start=1", 10))
      views.setOnClickPendingIntent(R.id.ss_speed_root, deepLink(context, "signalstrength://speedtest", 11))
      return views
    }

    private fun deepLink(context: Context, url: String, requestCode: Int): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        .setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
  }
}