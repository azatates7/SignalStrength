// Wi-Fi frekansından bant ve kanal, Android'in standart kodundan "Wi-Fi 6" gibi ad.

/** 2.4 / 5 / 6 GHz; bilinmiyorsa undefined */
export function wifiBand(freqMhz?: number | null): '2.4 GHz' | '5 GHz' | '6 GHz' | undefined {
  if (!freqMhz) return undefined;
  if (freqMhz >= 2400 && freqMhz < 2500) return '2.4 GHz';
  if (freqMhz >= 5150 && freqMhz < 5925) return '5 GHz';
  if (freqMhz >= 5925 && freqMhz <= 7125) return '6 GHz';
  return undefined;
}

/** Kanal numarası (ör. 2437 MHz → 6, 5180 MHz → 36, 5955 MHz → 1) */
export function wifiChannel(freqMhz?: number | null): number | undefined {
  if (!freqMhz) return undefined;
  if (freqMhz === 2484) return 14;
  const band = wifiBand(freqMhz);
  const base = band === '2.4 GHz' ? 2407 : band === '5 GHz' ? 5000 : band === '6 GHz' ? 5950 : undefined;
  if (base === undefined) return undefined;
  const ch = (freqMhz - base) / 5;
  return Number.isInteger(ch) && ch > 0 ? ch : undefined;
}

/** Android ScanResult.WIFI_STANDARD_* → kullanıcının tanıdığı ad */
export function wifiStandardLabel(standard?: number | null, freqMhz?: number | null): string | undefined {
  switch (standard) {
    case 1:
      return '802.11a/b/g';
    case 4:
      return 'Wi-Fi 4 (802.11n)';
    case 5:
      return 'Wi-Fi 5 (802.11ac)';
    case 6:
      return wifiBand(freqMhz) === '6 GHz' ? 'Wi-Fi 6E (802.11ax)' : 'Wi-Fi 6 (802.11ax)';
    case 7:
      return '802.11ad';
    case 8:
      return 'Wi-Fi 7 (802.11be)';
    default:
      return undefined;
  }
}

/** Grafik için: son `max` örneği tutar (en eski düşer) */
export function pushSample(list: number[], value: number, max: number): number[] {
  const next = list.length >= max ? list.slice(list.length - max + 1) : list.slice();
  next.push(value);
  return next;
}