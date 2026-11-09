// Bağlantı kararlılığı testi: ~30 sn boyunca yarım saniyede bir küçük bir istek (ping) gönderilir.
// Gecikmenin dalgalanması (jitter) ve kayıp istekler, görüntülü görüşme / oyunda donmanın başlıca nedenidir; hız testi bunları göstermez. Toplam veri: birkaç on KB.
import SignalStrength from '../../modules/signal-strength/Index';
import { median } from './Cloudflare';

const BASE = 'https://speed.cloudflare.com';
export const STABILITY_DURATION_MS = 30_000;
const INTERVAL_MS = 500;
const TIMEOUT_MS = 2_000; // Bu süreyi aşan istek "kayıp" sayılır

// Karar: 30 örnekte 1 kayıp (%3) "ara ara", 2 ve üzeri (%5+) "kararsız" sayılır
export type StabilityStats = {
  sent: number;
  lost: number;
  lossPct: number;
  medianMs?: number;
  avgMs?: number;
  maxMs?: number;
  jitterMs?: number;
  verdict: 'good' | 'fair' | 'poor';
};

/** Örneklerden istatistik; null = kayıp (zaman aşımı / hata) */
export function stabilityStats(samples: (number | null)[]): StabilityStats {
  const ok = samples.filter((s): s is number => s !== null);
  const sent = samples.length;
  const lost = sent - ok.length;
  const lossPct = sent ? (lost / sent) * 100 : 0;
  let jitter: number | undefined;
  if (ok.length > 1) {
    let sum = 0;
    for (let i = 1; i < ok.length; i++) sum += Math.abs(ok[i] - ok[i - 1]);
    jitter = sum / (ok.length - 1);
  }
  const med = ok.length ? median(ok) : undefined;
  const verdict: StabilityStats['verdict'] =
    !ok.length || lossPct > 5 || (jitter ?? 0) > 50
      ? 'poor'
      : lossPct > 1 || (jitter ?? 0) > 20 || (med ?? 0) > 100
        ? 'fair'
        : 'good';
  return {
    sent,
    lost,
    lossPct,
    medianMs: med,
    avgMs: ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : undefined,
    maxMs: ok.length ? Math.max(...ok) : undefined,
    jitterMs: jitter,
    verdict,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Testi çalıştırır; her örnekte onSample çağrılır. isCancelled true dönünce durur.
 * Ölçüm native taraftadır (JS köprüsü gecikmeyi şişirmesin). Native modül yoksa hata fırlatır.
 */
export async function runStabilityTest(onSample: (ms: number | null) => void, isCancelled: () => boolean) {
  const mod = SignalStrength;
  if (!mod) throw new Error('unavailable');
  const once = () => mod.pingOnce(`${BASE}/__down?bytes=0`, `${BASE}/`, TIMEOUT_MS).catch(() => null);
  await once(); // İlk istek bağlantı kurulumunu (TCP + TLS) içerir, sayılmaz
  const end = Date.now() + STABILITY_DURATION_MS;
  while (Date.now() < end && !isCancelled()) {
    const t0 = Date.now();
    const ms = await once();
    if (isCancelled()) return;
    onSample(ms);
    await sleep(Math.max(0, INTERVAL_MS - (Date.now() - t0)));
  }
}