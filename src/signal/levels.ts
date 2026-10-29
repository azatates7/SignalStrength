// src/signal/levels.ts
// Android'in 0-4 seviyesi yerine dBm'den 0-100 arası bir sinyal puanı hesaplıyoruz.
import type { SignalReading, Technology } from '../../modules/signal-strength';

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

export function qualityLabel(score: number): string {
  if (score === 0) return 'Sinyal yok';
  if (score <= 20) return 'Çok zayıf';
  if (score <= 40) return 'Zayıf';
  if (score <= 60) return 'Orta';
  if (score <= 80) return 'İyi';
  return 'Mükemmel';
}

export const TECH_LABEL: Record<Technology, string> = {
  NR: '5G',
  LTE: '4G (LTE)',
  WCDMA: '3G (WCDMA)',
  TDSCDMA: '3G (TD-SCDMA)',
  GSM: '2G (GSM)',
  CDMA: '2G/3G (CDMA)',
  UNKNOWN: 'Bilinmiyor',
};