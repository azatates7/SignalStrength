// Sesli sinyal modu: sinyal puanı (0–100) arttıkça bipler sıklaşır (Geiger sayacı gibi). 0 puan → 1,6 sn'de bir · 100 puan → 0,2 sn'de bir. Sinyal yoksa bip yok.
export function beepIntervalMs(score: number): number | undefined {
  if (!Number.isFinite(score) || score <= 0) return undefined;
  const s = Math.min(100, score);
  return Math.round(1600 - s * 14);
}