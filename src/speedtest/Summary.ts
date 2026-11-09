// Test geçmişinin özeti: bağlantı tipine göre ortalamalar ve trend grafiği için seri.
import type { HistoryEntry } from './History';

export type Average = { count: number; downloadMbps: number; uploadMbps?: number; pingMs: number };

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function average(entries: HistoryEntry[]): Average | undefined {
  if (!entries.length) return undefined;
  const ups = entries.map((e) => e.uploadMbps).filter((v): v is number => v !== undefined);
  return {
    count: entries.length,
    downloadMbps: avg(entries.map((e) => e.downloadMbps)),
    uploadMbps: ups.length ? avg(ups) : undefined,
    pingMs: avg(entries.map((e) => e.pingMs)),
  };
}

/** Wi-Fi ve mobil veri için ayrı ortalama (VPN'li testler de kendi bağlantı tipine sayılır) */
export function averagesByType(entries: HistoryEntry[]): { wifi?: Average; cellular?: Average } {
  return {
    wifi: average(entries.filter((e) => e.type === 'wifi')),
    cellular: average(entries.filter((e) => e.type === 'cellular')),
  };
}

/** Trend grafiği: eskiden yeniye indirme hızları (geçmiş yeniden eskiye tutulur) */
export function downloadTrend(entries: HistoryEntry[]): number[] {
  return entries.map((e) => e.downloadMbps).reverse();
}