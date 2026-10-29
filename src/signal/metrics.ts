// src/signal/metrics.ts
// Teknik ölçümleri teknik bilgisi olmayan kullanıcılar için açıklar ve değerlendirir.
// Tüm ölçümlerde değer büyüdükçe (sıfıra yaklaştıkça) durum iyileşir.

export type Rating = { label: string; color: string };

const EXCELLENT: Rating = { label: 'Mükemmel', color: '#22c55e' };
const GOOD: Rating = { label: 'İyi', color: '#84cc16' };
const FAIR: Rating = { label: 'Orta', color: '#f59e0b' };
const POOR: Rating = { label: 'Zayıf', color: '#ef4444' };

export type MetricInfo = {
  title: string;      // Herkesin anlayacağı ad
  techName: string;   // Teknik ad (küçük yazılır)
  unit: string;
  description: string;
  ideal: string;      // İdeal aralık açıklaması
  // [mükemmel, iyi, orta] alt sınırları; altı "Zayıf"
  thresholds: [number, number, number];
};

export const METRICS = {
  rsrp: {
    title: 'Sinyal gücü',
    techName: 'RSRP',
    unit: 'dBm',
    description: 'Baz istasyonundan telefona ulaşan sinyalin gücü. Değer eksi olur; sıfıra ne kadar yakınsa sinyal o kadar güçlüdür.',
    ideal: 'İdeal: −80 dBm ve üzeri · Zayıf: −100 dBm altı',
    thresholds: [-80, -90, -100],
  },
  rsrq: {
    title: 'Sinyal kalitesi',
    techName: 'RSRQ',
    unit: 'dB',
    description: 'Sinyalin ne kadar temiz olduğunu gösterir. Sinyal güçlü olsa bile kalabalık ya da girişimli ortamlarda kalite düşebilir.',
    ideal: 'İdeal: −10 dB ve üzeri · Zayıf: −20 dB altı',
    thresholds: [-10, -15, -20],
  },
  sinr: {
    title: 'Parazit oranı',
    techName: 'SINR',
    unit: 'dB',
    description: 'Sinyalin çevredeki parazit ve gürültüye göre ne kadar baskın olduğu. Yüksek değer daha hızlı ve kesintisiz bağlantı demektir.',
    ideal: 'İdeal: 20 dB ve üzeri · Zayıf: 0 dB altı',
    thresholds: [20, 13, 0],
  },
  systemLevel: {
    title: 'Telefonun çubuk göstergesi',
    techName: 'Android seviyesi',
    unit: '/ 4',
    description: 'Telefonun üst çubuğunda gördüğünüz sinyal çubuğu sayısı. Bu uygulama aynı ölçümü 0–100 arası puanla daha hassas gösterir.',
    ideal: 'İdeal: 3–4 çubuk · Zayıf: 0–1 çubuk',
    thresholds: [4, 3, 2],
  },
} satisfies Record<string, MetricInfo>;

export function rate(value: number, [excellent, good, fair]: MetricInfo['thresholds']): Rating {
  if (value >= excellent) return EXCELLENT;
  if (value >= good) return GOOD;
  if (value >= fair) return FAIR;
  return POOR;
}