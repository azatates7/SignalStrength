package expo.modules.signalstrength

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.widget.RemoteViews
import java.util.Locale

/**
 * İki widget'ın (sinyal + hız testi) ortak teması ve dili.
 *
 * Tema: widget üzerindeki ☀️/🌙 butonuyla seçilen tema ("widget_theme"); seçilmediyse uygulamada
 * seçilen tema ("theme"); o da yoksa telefonun teması. Renkler uygulamanın paletiyle (theme.tsx) aynı.
 * Dil: uygulamada seçilen dil ("language"); seçilmediyse telefon dili.
 */
internal object WidgetStyle {
  private const val PREFS = "sinyal_olcer" // SignalStrengthModule ile aynı dosya
  private const val KEY_WIDGET_THEME = "widget_theme"
  private const val KEY_APP_THEME = "theme"
  private const val KEY_LANGUAGE = "language"
  const val ACTION_TOGGLE_THEME = "expo.modules.signalstrength.WIDGET_TOGGLE_THEME"

  data class Palette(
    val background: Int, // drawable
    val button: Int, // drawable
    val text: Int,
    val muted: Int,
    val faint: Int,
    val barOff: Int,
    val onAccent: Int,
  )

  private val LIGHT = Palette(
    R.drawable.ss_widget_bg_light, R.drawable.ss_widget_button_light,
    Color.parseColor("#0F172A"), Color.parseColor("#64748B"), Color.parseColor("#94A3B8"),
    Color.parseColor("#CBD5E1"), Color.parseColor("#FFFFFF"),
  )
  private val DARK = Palette(
    R.drawable.ss_widget_bg_dark, R.drawable.ss_widget_button_dark,
    Color.parseColor("#F8FAFC"), Color.parseColor("#94A3B8"), Color.parseColor("#64748B"),
    Color.parseColor("#334155"), Color.parseColor("#052E16"),
  )

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isTurkish(context: Context): Boolean {
    val saved = runCatching { prefs(context).getString(KEY_LANGUAGE, null) }.getOrNull()
    return (saved ?: Locale.getDefault().language) == "tr"
  }

  fun locale(context: Context): Locale = if (isTurkish(context)) Locale("tr", "TR") else Locale.getDefault()

  fun isDark(context: Context): Boolean {
    val p = runCatching { prefs(context) }.getOrNull()
    return when (p?.getString(KEY_WIDGET_THEME, null) ?: p?.getString(KEY_APP_THEME, null)) {
      "dark" -> true
      "light" -> false
      else -> (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
        Configuration.UI_MODE_NIGHT_YES
    }
  }

  fun palette(dark: Boolean) = if (dark) DARK else LIGHT

  /** Widget'taki tema butonu: açık ↔ koyu; iki widget da yeni temayla çizilir */
  fun toggleTheme(context: Context) {
    val next = if (isDark(context)) "light" else "dark"
    runCatching { prefs(context).edit().putString(KEY_WIDGET_THEME, next).apply() }
    updateAllWidgets(context)
  }

  fun updateAllWidgets(context: Context) {
    SignalWidgetProvider.updateAll(context)
    SpeedWidgetProvider.updateAll(context)
  }

  /** Tema butonu: o anki temayı gösterir (koyu → ay, açık → güneş), dokununca değiştirir */
  fun bindThemeButton(context: Context, views: RemoteViews, viewId: Int, provider: Class<*>, dark: Boolean) {
    val p = palette(dark)
    views.setImageViewResource(viewId, if (dark) R.drawable.ss_widget_moon else R.drawable.ss_widget_sun)
    views.setInt(viewId, "setColorFilter", p.muted)
    val intent = Intent(context, provider).setAction(ACTION_TOGGLE_THEME)
    views.setOnClickPendingIntent(
      viewId,
      PendingIntent.getBroadcast(context, 90, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    )
  }
}