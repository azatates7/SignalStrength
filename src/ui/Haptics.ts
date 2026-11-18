// Kısa titreşimli geri bildirim (test bitti / başarısız / seçim). Sistemin dokunma titreşimi kullanılır: izin gerektirmez, telefonun dokunmatik titreşim ayarı kapalıysa titremez.
// Web önizlemesinde ve modül yoksa hiçbir şey yapmaz.
import SignalStrength from '../../modules/signal-strength';

export type HapticKind = 'success' | 'error' | 'tick';

export function haptic(kind: HapticKind) {
  try {
    SignalStrength?.haptic?.(kind);
  } catch {
    // Titreşim olmasa da uygulama çalışmaya devam eder
  }
}