// src/signal/levels.ts
// Android'in 0-4 seviyesi yerine dBm'den kendi ince taneli ölçeğimizi hesaplıyoruz.
import type { SignalReading, Technology } from '../../modules/signal-strength';

export const LEVEL_COUNT = 10;

// [en kötü, mükemmel] dBm. Bu aralığın dışı 0 veya tam seviyeye sabitlenir.
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

export function toLevel(reading: SignalReading | null, count = LEVEL_COUNT): number {
  if (!reading?.available) return 0;

  // Android 9 gibi dBm gelmeyen durumda sistemin 0-4 seviyesini ölçekle
  if (reading.dbm == null) {
    return Math.round(((reading.systemLevel ?? 0) / 4) * count);
  }

  const [min, max] = RANGES[reading.technology ?? 'UNKNOWN'];
  const ratio = (reading.dbm - min) / (max - min);
  return Math.max(0, Math.min(count, Math.round(ratio * count)));
}

export function qualityLabel(level: number, count = LEVEL_COUNT): string {
  const p = level / count;
  if (p === 0) return 'Sinyal yok';
  if (p <= 0.2) return 'Çok zayıf';
  if (p <= 0.4) return 'Zayıf';
  if (p <= 0.6) return 'Orta';
  if (p <= 0.8) return 'İyi';
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
