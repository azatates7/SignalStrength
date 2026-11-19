// src/signal/levels.ts
// Android'in 0-4 seviyesi yerine dBm'den 0-100 arası bir sinyal puanı hesaplıyoruz.
import type { SignalReading, Technology } from '../../modules/signal-strength';
import type { QualityKey } from '../i18n/Strings';

export const MAX_SCORE = 100;
export const BAR_COUNT = 10; // Ekrandaki çubuk sayısı (her çubuk 10 puan)

// [en kötü, mükemmel] dBm. Bu aralığın dışı 0 veya 100'e sabitlenir.
// LTE/NR: RSRP, WCDMA: RSCP, GSM: RSSI
const RANGES: Record<Technology, [number, number]> = {
  NR: [-125, -75],
  LTE: [-125, -75],
  WCDMA: [-115, -65],
  TDSCDMA: [-115, -65],
  GSM: [-110, -60],
  CDMA: [-110, -60],
  UNKNOWN: [-120, -70],
};

export function toScore(reading: SignalReading | null): number {
  if (!reading?.available) return 0;

  // Android 9'da dBm gelmez; sistemin 0-4 seviyesini ölçekle
  if (reading.dbm == null) {
    return Math.round(((reading.systemLevel ?? 0) / 4) * MAX_SCORE);
  }

  const [min, max] = RANGES[reading.technology ?? 'UNKNOWN'];
  const ratio = (reading.dbm - min) / (max - min);
  return Math.max(0, Math.min(MAX_SCORE, Math.round(ratio * MAX_SCORE)));
}

export function qualityKey(score: number): QualityKey {
  if (score === 0) return 'none';
  if (score <= 20) return 'veryPoor';
  if (score <= 40) return 'poor';
  if (score <= 60) return 'fair';
  if (score <= 80) return 'good';
  return 'excellent';
}

// "Bilinmiyor" / "Unknown" dile göre src/i18n/strings.ts → common.unknown
export const TECH_LABEL: Record<Exclude<Technology, 'UNKNOWN'>, string> = {
  NR: '5G',
  LTE: '4G (LTE)',
  WCDMA: '3G (WCDMA)',
  TDSCDMA: '3G (TD-SCDMA)',
  GSM: '2G (GSM)',
  CDMA: '2G/3G (CDMA)',
};

export const techLabel = (tech: Technology, unknown: string) => (tech === 'UNKNOWN' ? unknown : TECH_LABEL[tech]);

/**
 * Ekranda gösterilen ağ türü, 5G türü ve 4.5G ile birlikte:
 * "5G SA" (yalnızca 5G), "5G NSA" (4G ile birlikte 5G), "5G+ NSA" (operatörün 5G+ gösterimi),
 * "4G (LTE) · 5G NSA" (5G hücresine bağlı ama o an veri 4G'den), "4.5G (LTE-A)" (taşıyıcı birleştirme).
 * Bu ayrıntılar Android 12+'da gelir; yoksa yalnızca teknoloji yazılır.
 */
export function networkTechLabel(
  r: Pick<SignalReading, 'technology' | 'nrMode' | 'lteAdvanced' | 'nrAdvanced'>,
  unknown: string,
): string {
  const tech = r.technology ?? 'UNKNOWN';
  const five = (mode: 'SA' | 'NSA') => `5G${r.nrAdvanced ? '+' : ''} ${mode}`;
  if (tech === 'NR') return r.nrMode ? five(r.nrMode) : TECH_LABEL.NR;
  if (tech === 'LTE') {
    if (r.nrMode === 'NSA') return `${TECH_LABEL.LTE} · ${five('NSA')}`;
    if (r.lteAdvanced) return `4.5G (${r.lteAdvanced})`;
  }
  return techLabel(tech, unknown);
}