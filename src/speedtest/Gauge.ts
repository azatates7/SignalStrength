// İbreli hız göstergesinin ölçeği. Doğrusal ölçekte 5 Mbps ile 50 Mbps neredeyse aynı yerde
// dururdu; bu yüzden ölçek, her aralık eşit yay payı alacak şekilde seçilmiş eşiklerden oluşur
// (Speedtest uygulamalarındaki gibi). Aralık içinde doğrusal.
export const GAUGE_STOPS = [0, 1, 5, 10, 20, 50, 100, 250, 500, 1000] as const;

/** Hızın göstergedeki yeri: 0 (en sol) … 1 (en sağ). 1000 Mbps üstü en sağda kalır. */
export function gaugeFraction(mbps: number | undefined): number {
  if (mbps === undefined || !Number.isFinite(mbps) || mbps <= 0) return 0;
  const n = GAUGE_STOPS.length - 1;
  for (let i = 1; i <= n; i++) {
    const lo = GAUGE_STOPS[i - 1];
    const hi = GAUGE_STOPS[i];
    if (mbps <= hi) return (i - 1 + (mbps - lo) / (hi - lo)) / n;
  }
  return 1;
}

/** Yayın açısı (derece, saat 12 yönü 0; sola negatif). Gösterge -120° … +120° arasını kullanır. */
export const GAUGE_SWEEP = 240;
export const gaugeAngle = (fraction: number) => -GAUGE_SWEEP / 2 + Math.min(Math.max(fraction, 0), 1) * GAUGE_SWEEP;

/** Eşik etiketi: 1000 → "1G", diğerleri olduğu gibi */
export const stopLabel = (v: number) => (v >= 1000 ? `${v / 1000}G` : String(v));