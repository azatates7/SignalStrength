// src/signal/metrics.ts
// Teknik ölçümlerin birimi ve değerlendirme eşikleri. Ekrandaki ad, açıklama ve ideal aralık
// metinleri src/i18n/strings.ts → metrics içinde (Türkçe / İngilizce).
// Tüm ölçümlerde değer büyüdükçe (sıfıra yaklaştıkça) durum iyileşir.
import type { MetricKey, RatingKey } from '../i18n/strings';

export type Rating = { key: RatingKey; color: string };

const EXCELLENT: Rating = { key: 'excellent', color: '#22c55e' };
const GOOD: Rating = { key: 'good', color: '#84cc16' };
const FAIR: Rating = { key: 'fair', color: '#f59e0b' };
const POOR: Rating = { key: 'poor', color: '#ef4444' };

export type MetricInfo = {
  key: MetricKey;
  unit: string;
  // [mükemmel, iyi, orta] alt sınırları; altı "Zayıf"
  thresholds: [number, number, number];
};

export const METRICS = {
  rsrp: { key: 'rsrp', unit: 'dBm', thresholds: [-80, -90, -100] },
  rsrq: { key: 'rsrq', unit: 'dB', thresholds: [-10, -15, -20] },
  sinr: { key: 'sinr', unit: 'dB', thresholds: [20, 13, 0] },
  systemLevel: { key: 'systemLevel', unit: '/ 4', thresholds: [4, 3, 2] },
} satisfies Record<MetricKey, MetricInfo>;

export function rate(value: number, [excellent, good, fair]: MetricInfo['thresholds']): Rating {
  if (value >= excellent) return EXCELLENT;
  if (value >= good) return GOOD;
  if (value >= fair) return FAIR;
  return POOR;
}