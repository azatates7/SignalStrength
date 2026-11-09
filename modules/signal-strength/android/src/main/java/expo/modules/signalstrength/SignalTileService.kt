package expo.modules.signalstrength

import android.app.PendingIntent
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/**
 * Hızlı Ayarlar kutucuğu: bildirim paneli aşağı çekilince "−81 dBm" ve "Turkcell · 4G (LTE)".
 * Panel her açıldığında (onStartListening) sinyal yeniden okunur; dokununca uygulama açılır.
 * İzin ve internet kullanmaz; okuma ve metinler ana ekran widget'ıyla aynıdır.
 * Kullanıcı kutucuğu panelin düzenleme ekranından (kalem simgesi) ekler.
 */
class SignalTileService : TileService() {

  override fun onStartListening() {
    super.onStartListening()
    runCatching { refresh() }
  }

  override fun onClick() {
    super.onClick()
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: return
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    runCatching {
      if (Build.VERSION.SDK_INT >= 34) {
        // Android 14+: panel kapanıp uygulama açılır (Intent'li sürüm artık desteklenmiyor)
        startActivityAndCollapse(
          PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        )
      } else {
        @Suppress("DEPRECATION", "StartActivityAndCollapseDeprecated")
        startActivityAndCollapse(launch)
      }
    }
  }

  private fun refresh() {
    val tile = qsTile ?: return
    val tr = WidgetStyle.isTurkish(this)
    val r = SignalWidgetProvider.read(this)
    tile.icon = Icon.createWithResource(this, R.drawable.ss_tile_signal)
    if (r == null) {
      tile.label = if (tr) "Şebeke yok" else "No network"
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) tile.subtitle = if (tr) "Sinyal Ölçer" else "Signal Strength"
      tile.state = Tile.STATE_INACTIVE
    } else {
      val score = SignalWidgetProvider.score(r)
      tile.label = r.dbm?.let { "$it dBm" } ?: "${r.level}/4"
      val sub = listOfNotNull(r.operator, SignalWidgetProvider.techLabel(r.tech, tr)).joinToString(" · ")
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) tile.subtitle = sub
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        tile.stateDescription = "${SignalWidgetProvider.quality(score, tr)} · $score/100"
      }
      tile.contentDescription = "${tile.label} · $sub"
      tile.state = Tile.STATE_ACTIVE
    }
    tile.updateTile()
  }
}