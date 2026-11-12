// Ölçüm oturumu: kullanıcı başlatır, sinyal saniyede bir kaydedilir (yalnızca bellekte; konum yok).
// İsteğe bağlı not ("Salon", "Mutfak") o andan sonraki örneklere eklenir; böylece evin hangi noktasında sinyalin nasıl olduğu görülür. Sonuç XLSX / CSV olarak paylaşılabilir.
import type { Cell } from '../speedtest/Xlsx';

export type SessionSample = { t: number; dbm: number; score: number; tech?: string; note?: string };

export const SESSION_DURATIONS = [1, 5, 10] as const; // dakika
export const MAX_SESSION_SAMPLES = 10 * 60; // 10 dk × 1/sn

export type SessionStats = {
  count: number;
  minDbm: number;
  maxDbm: number;
  avgDbm: number;
  avgScore: number;
  /** Not başına ortalama (not yoksa boş) */
  byNote: { note: string; count: number; avgDbm: number; avgScore: number }[];
};

export function sessionStats(samples: SessionSample[]): SessionStats | undefined {
  if (!samples.length) return undefined;
  const dbms = samples.map((s) => s.dbm);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const groups = new Map<string, SessionSample[]>();
  for (const s of samples) {
    if (!s.note) continue;
    groups.set(s.note, [...(groups.get(s.note) ?? []), s]);
  }
  return {
    count: samples.length,
    minDbm: Math.min(...dbms),
    maxDbm: Math.max(...dbms),
    avgDbm: avg(dbms),
    avgScore: avg(samples.map((s) => s.score)),
    byNote: [...groups.entries()]
      .map(([note, xs]) => ({ note, count: xs.length, avgDbm: avg(xs.map((x) => x.dbm)), avgScore: avg(xs.map((x) => x.score)) }))
      .sort((a, b) => b.avgScore - a.avgScore),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** Dışa aktarma tablosu; ilk satır başlık */
export function sessionRows(
  samples: SessionSample[],
  h: { time: string; second: string; dbm: string; score: string; tech: string; note: string },
): Cell[][] {
  const start = samples[0]?.t ?? 0;
  return [
    [h.time, h.second, h.dbm, h.score, h.tech, h.note],
    ...samples.map((s) => [clock(s.t), Math.round((s.t - start) / 1000), s.dbm, s.score, s.tech ?? '', s.note ?? '']),
  ];
}