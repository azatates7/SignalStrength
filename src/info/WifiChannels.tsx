// Wi-Fi kanal analizi (saf mantık): taranan ağları banda ve kanala yerleştirir, bağlı olunan ağın
// kanalının ne kadar kalabalık olduğunu ve daha boş bir kanal önerisini hesaplar.
// - 2,4 GHz: kanallar birbirine taşar; yalnızca 1 / 6 / 11 çakışmaz, öneri bunların arasından.
// - 5 GHz: 40 / 80 / 160 MHz ağlar bitişik kanal bloklarını kaplar; öneri DFS olmayan 36–48 ile
//   DFS'li 52–144 arasından, eşitlikte DFS olmayan tercih edilir (DFS: modem radar algılarsa kanal değiştirir).
// - 6 GHz: yalnızca listelenir (henüz kalabalık değil).
// Yükü hesaplarken yakın (güçlü) ağlar uzaktakilerden daha çok sayılır.
import type { WifiNetwork } from '../../modules/signal-strength';

export type Band = '2.4' | '5' | '6';

export function bandOf(freq: number): Band | undefined {
  if (freq >= 2400 && freq < 2500) return '2.4';
  if (freq >= 5000 && freq < 5925) return '5';
  if (freq >= 5925 && freq < 7200) return '6';
  return undefined;
}

export function channelOf(freq: number): number | undefined {
  if (freq === 2484) return 14;
  if (freq >= 2412 && freq <= 2472) return (freq - 2407) / 5;
  if (freq >= 5150 && freq <= 5895) return (freq - 5000) / 5;
  if (freq >= 5955 && freq <= 7115) return (freq - 5950) / 5;
  return undefined;
}

export const isDfs = (ch: number) => ch >= 52 && ch <= 144;

const FIVE_BLOCKS: Record<number, number[][]> = {
  40: [[36, 40], [44, 48], [52, 56], [60, 64], [100, 104], [108, 112], [116, 120], [124, 128], [132, 136], [140, 144], [149, 153], [157, 161]],
  80: [[36, 48], [52, 64], [100, 112], [116, 128], [132, 144], [149, 161]],
  160: [[36, 64], [100, 128]],
};

/** Bir ağın kapladığı kanal aralığı [ilk, son] */
export function span(band: Band, ch: number, widthMhz: number): [number, number] {
  if (band === '2.4') return [ch - 2, ch + 2]; // 20 MHz ≈ 4 kanal genişliği
  if (band === '5') {
    const blocks = FIVE_BLOCKS[Math.min(widthMhz, 160)];
    const b = blocks?.find(([a, z]) => ch >= a && ch <= z);
    if (b) return [b[0], b[1]];
  }
  return [ch, ch];
}

// Güçlü sinyal daha çok karışır: -50 dBm ≈ 1, -90 dBm ≈ 0,1
const weight = (level: number) => Math.min(1, Math.max(0.1, (level + 95) / 45));

const CANDIDATES: Record<Band, number[]> = {
  '2.4': [1, 6, 11],
  '5': [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140],
  '6': [],
};

export type Located = WifiNetwork & { band: Band; channel: number; current: boolean };

export type BandSummary = {
  band: Band;
  networks: Located[];
  channels: { channel: number; count: number }[]; // Kanal başına ağ sayısı (birincil kanal)
  best?: number; // Önerilen kanal
  bestLoad?: number;
  currentLoad?: number; // Bağlı ağın kanalındaki yük (kendi ağın hariç)
};

export type WifiAnalysis = {
  current?: Located;
  bands: BandSummary[];
};

/** Bir kanalın yükü: o kanalla çakışan ağların ağırlıklı toplamı (kendi ağın ve aynı adlı erişim noktaları hariç) */
function load(band: Band, ch: number, nets: Located[], exclude?: Located) {
  const [a0, a1] = band === '2.4' ? [ch - 2, ch + 2] : [ch, ch];
  let sum = 0;
  for (const n of nets) {
    if (exclude && (n.bssid === exclude.bssid || (n.ssid && n.ssid === exclude.ssid))) continue;
    const [b0, b1] = span(band, n.channel, n.widthMhz);
    if (b1 < a0 || b0 > a1) continue;
    // 2,4 GHz'de kanal uzaklığı arttıkça çakışma azalır
    const overlap = band === '2.4' ? 1 - Math.min(4, Math.abs(n.channel - ch)) / 5 : 1;
    sum += weight(n.level) * overlap;
  }
  return Math.round(sum * 10) / 10;
}

export function analyzeWifi(networks: WifiNetwork[], connectedBssid?: string | null): WifiAnalysis {
  const located: Located[] = [];
  for (const n of networks) {
    const band = bandOf(n.frequency);
    const channel = channelOf(n.frequency);
    if (!band || channel === undefined) continue;
    located.push({ ...n, band, channel, current: !!connectedBssid && n.bssid === connectedBssid });
  }
  located.sort((a, b) => b.level - a.level);
  const current = located.find((n) => n.current);

  const bands: BandSummary[] = [];
  for (const band of ['2.4', '5', '6'] as Band[]) {
    const nets = located.filter((n) => n.band === band);
    if (!nets.length) continue;
    const counts = new Map<number, number>();
    for (const n of nets) counts.set(n.channel, (counts.get(n.channel) ?? 0) + 1);
    const channels = [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([channel, count]) => ({ channel, count }));

    const mine = current?.band === band ? current : undefined;
    let best: number | undefined;
    let bestLoad: number | undefined;
    for (const ch of CANDIDATES[band]) {
      const l = load(band, ch, nets, mine);
      // Eşitlikte DFS olmayan ve listede önce gelen kanal
      if (bestLoad === undefined || l < bestLoad || (l === bestLoad && best !== undefined && isDfs(best) && !isDfs(ch))) {
        best = ch;
        bestLoad = l;
      }
    }
    bands.push({
      band,
      networks: nets,
      channels,
      best,
      bestLoad,
      currentLoad: mine ? load(band, mine.channel, nets, mine) : undefined,
    });
  }
  return { current, bands };
}

/** Kanal değiştirmek anlamlı mı? Önerilen kanal belirgin şekilde daha boşsa */
export function shouldSwitch(s: BandSummary, current?: Located): boolean {
  if (!current || current.band !== s.band || s.best === undefined || s.bestLoad === undefined || s.currentLoad === undefined) return false;
  if (s.best === current.channel) return false;
  return s.currentLoad - s.bestLoad >= 1;
}