// src/speedtest/bufferbloat.ts
// Yük altında gecikme notu (bufferbloat). Not, boştaki ping'e göre indirme / yükleme sırasında
// gecikmenin ne kadar arttığına göre verilir; ikisinden kötü olanı belirler. Sınırlar, bu ölçüm
// için yaygın kullanılan ölçekten (A+ < 5 ms, A < 30, B < 60, C < 200, D < 400, F ≥ 400 ms artış).
export type BloatGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
export type BloatLevel = 'good' | 'fair' | 'poor';

const LIMITS: [number, BloatGrade][] = [
  [5, 'A+'],
  [30, 'A'],
  [60, 'B'],
  [200, 'C'],
  [400, 'D'],
];

export function bloatGrade(increaseMs: number): BloatGrade {
  for (const [limit, grade] of LIMITS) if (increaseMs < limit) return grade;
  return 'F';
}

/** Renk / açıklama düzeyi: A+ ve A iyi, B ve C orta, D ve F kötü */
export const bloatLevel = (g: BloatGrade): BloatLevel => (g === 'A+' || g === 'A' ? 'good' : g === 'B' || g === 'C' ? 'fair' : 'poor');

export type BloatResult = {
  grade: BloatGrade;
  downIncreaseMs?: number;
  upIncreaseMs?: number;
};

/** Ölçüm yoksa (native modül yok, test çok kısa) undefined */
export function bufferbloat(r: { pingMs?: number; loadedDownMs?: number; loadedUpMs?: number }): BloatResult | undefined {
  if (r.pingMs === undefined) return undefined;
  const inc = (loaded?: number) => (loaded === undefined ? undefined : Math.max(0, loaded - r.pingMs!));
  const downIncreaseMs = inc(r.loadedDownMs);
  const upIncreaseMs = inc(r.loadedUpMs);
  const worst = Math.max(downIncreaseMs ?? -1, upIncreaseMs ?? -1);
  if (worst < 0) return undefined;
  return { grade: bloatGrade(worst), downIncreaseMs, upIncreaseMs };
}