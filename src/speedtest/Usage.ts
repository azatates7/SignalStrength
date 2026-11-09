// "Bu hız neye yeter?": test sonucunu günlük kullanımlara çevirir. Eşikler yaygın servis önerilerine göre (HD video ~5 Mbps, 4K ~25 Mbps, görüntülü görüşme ~3 Mbps iki yönde, oyun için gecikme ve dalgalanma önemli). Sadece yol gösterir; servisten servise değişir.

export type Verdict = 'ok' | 'maybe' | 'no';
export type UsageKey = 'web' | 'hdVideo' | 'uhdVideo' | 'videoCall' | 'gaming';
export type UsageInput = { downloadMbps?: number; uploadMbps?: number; pingMs?: number; jitterMs?: number };

const grade = (v: number | undefined, ok: number, maybe: number): Verdict =>
  v === undefined ? 'maybe' : v >= ok ? 'ok' : v >= maybe ? 'maybe' : 'no';

const worst = (...vs: Verdict[]): Verdict => (vs.includes('no') ? 'no' : vs.includes('maybe') ? 'maybe' : 'ok');

export function usageVerdicts(r: UsageInput): { key: UsageKey; verdict: Verdict }[] {
  const down = r.downloadMbps;
  // Gecikme: düşük olan iyi → eşikleri ters çevirerek değerlendir
  const lowIsGood = (v: number | undefined, ok: number, maybe: number): Verdict =>
    v === undefined ? 'maybe' : v <= ok ? 'ok' : v <= maybe ? 'maybe' : 'no';

  return [
    { key: 'web', verdict: grade(down, 1, 0.5) },
    { key: 'hdVideo', verdict: grade(down, 5, 3) },
    { key: 'uhdVideo', verdict: grade(down, 25, 15) },
    {
      key: 'videoCall',
      verdict: worst(grade(down, 3, 1.5), grade(r.uploadMbps, 3, 1), lowIsGood(r.pingMs, 150, 250)),
    },
    {
      key: 'gaming',
      verdict: worst(lowIsGood(r.pingMs, 50, 100), lowIsGood(r.jitterMs ?? 0, 20, 40), grade(down, 3, 1)),
    },
  ];
}

/** 1 GB (8000 megabit) dosyanın aktarım süresi, saniye; hız bilinmiyorsa undefined */
export function secondsPerGigabyte(mbps?: number): number | undefined {
  if (!mbps || !Number.isFinite(mbps) || mbps <= 0) return undefined;
  return 8000 / mbps;
}