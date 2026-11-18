// Başarılı hız testinden sonra çağrılır: sayacı günceller, zamanı geldiyse Google Play'in uygulama içi puan penceresini açar (kısa bir gecikmeyle, sonuç ekranda görülsün diye).
// Karar mantığı ReviewPrompt.ts'te. Web önizlemesinde / modül yoksa hiçbir şey yapmaz.
import SignalStrength from '../../modules/signal-strength';
import { parseReviewState, recordSuccess } from './ReviewPrompt';

const DELAY_MS = 1500;

export function onSuccessfulTest(downloadMbps: number | undefined) {
  if (!SignalStrength) return;
  try {
    const { state, ask } = recordSuccess(
      parseReviewState(SignalStrength.getReviewState?.()),
      Date.now(),
      downloadMbps,
    );
    SignalStrength.setReviewState?.(JSON.stringify(state));
    if (ask) setTimeout(() => SignalStrength?.requestReview?.().catch(() => {}), DELAY_MS);
  } catch {
    // Değerlendirme isteği olmasa da uygulama çalışmaya devam eder
  }
}