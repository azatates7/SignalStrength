package expo.modules.signalstrength

import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build

/**
 * Ana ekran ikonuna uzun basınca çıkan kısayollar. Her biri uygulamayı bir deep link ile açar
 * (App.tsx'teki Linking işleyicisi): signalstrength://speedtest?start=1 (testi başlatır),
 * signalstrength://signal, signalstrength://info. Metinler uygulamada seçilen dili izler,
 * bu yüzden manifest yerine kodla (dinamik kısayol) tanımlanır. İzin gerektirmez.
 */
object AppShortcuts {
  fun update(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) return // Android 7.1 öncesinde kısayol yok
    val manager = context.getSystemService(ShortcutManager::class.java) ?: return
    val tr = WidgetStyle.isTurkish(context)

    fun shortcut(id: String, short: String, long: String, icon: Int, uri: String) =
      ShortcutInfo.Builder(context, id)
        .setShortLabel(short)
        .setLongLabel(long)
        .setIcon(Icon.createWithResource(context, icon))
        .setIntent(Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(context.packageName))
        .build()

    val list = listOf(
      shortcut(
        "speedtest",
        if (tr) "Hız testi" else "Speed test",
        if (tr) "Hız testini başlat" else "Start speed test",
        R.drawable.ss_shortcut_speed,
        "signalstrength://speedtest?start=1",
      ),
      shortcut(
        "signal",
        if (tr) "Mobil sinyal" else "Mobile signal",
        if (tr) "Mobil sinyal gücü" else "Mobile signal strength",
        R.drawable.ss_shortcut_signal,
        "signalstrength://signal",
      ),
      shortcut(
        "info",
        if (tr) "Bağlantı bilgisi" else "Connection info",
        if (tr) "IP ve bağlantı bilgisi" else "IP and connection info",
        R.drawable.ss_shortcut_info,
        "signalstrength://info",
      ),
    )
    runCatching { manager.dynamicShortcuts = list }
  }
}