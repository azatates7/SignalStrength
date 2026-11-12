// Baz istasyonu bilgisini okunur hale getiren saf fonksiyonlar: kanal numarasından (ARFCN) bant ve frekans, LTE hücre kimliğinden eNB / sektör, zamanlama ilerlemesinden (TA) yaklaşık uzaklık,
// MCC-MNC'den operatör adı. Tablolar 3GPP TS 36.101 (LTE) ve 38.104 (5G NR) değerleridir; yalnızca yaygın bantlar listelenir (Android 11+ bandı zaten kendisi verir).
import type { CellInfo } from '../../modules/signal-strength/Index';

// LTE: [bant, DL en düşük frekans (MHz), N_offs (ilk EARFCN), son EARFCN]
const LTE: [number, number, number, number][] = [
  [1, 2110, 0, 599],
  [2, 1930, 600, 1199],
  [3, 1805, 1200, 1949],
  [4, 2110, 1950, 2399],
  [5, 869, 2400, 2649],
  [7, 2620, 2750, 3449],
  [8, 925, 3450, 3799],
  [12, 729, 5010, 5179],
  [13, 746, 5180, 5279],
  [17, 734, 5730, 5849],
  [20, 791, 6150, 6449],
  [28, 758, 9210, 9659],
  [32, 1452, 9920, 10359],
  [38, 2570, 37750, 38249],
  [40, 2300, 38650, 39649],
  [41, 2496, 39650, 41589],
  [42, 3400, 41590, 43589],
  [43, 3600, 43590, 45589],
  [66, 2110, 66436, 67335],
];

export function lteBand(earfcn?: number | null): { band: number; freqMhz: number } | undefined {
  if (earfcn == null) return undefined;
  const row = LTE.find(([, , lo, hi]) => earfcn >= lo && earfcn <= hi);
  if (!row) return undefined;
  const [band, fDl, nOffs] = row;
  return { band, freqMhz: Math.round((fDl + 0.1 * (earfcn - nOffs)) * 10) / 10 };
}

/** 5G NR-ARFCN → frekans (MHz), 3GPP TS 38.104 5.4.2.1 */
export function nrFreqMhz(arfcn?: number | null): number | undefined {
  if (arfcn == null || arfcn < 0) return undefined;
  const f = arfcn < 600000 ? 0.005 * arfcn : arfcn < 2016667 ? 3000 + 0.015 * (arfcn - 600000) : 24250.08 + 0.06 * (arfcn - 2016667);
  return Math.round(f * 10) / 10;
}

// 5G: frekanstan bant (DL aralıkları). Çakışan aralıklarda daha dar olan önce yazıldı (n78 > n77).
const NR: [number, number, number][] = [
  [78, 3300, 3800],
  [77, 3300, 4200],
  [1, 2110, 2170],
  [3, 1805, 1880],
  [7, 2620, 2690],
  [8, 925, 960],
  [20, 791, 821],
  [28, 758, 803],
  [38, 2570, 2620],
  [40, 2300, 2400],
  [41, 2496, 2690],
  [79, 4400, 5000],
  [258, 24250, 27500],
];

export function nrBand(freqMhz?: number): number | undefined {
  if (freqMhz === undefined) return undefined;
  return NR.find(([, lo, hi]) => freqMhz >= lo && freqMhz <= hi)?.[0];
}

/** 3G UARFCN → frekans (MHz): DL = UARFCN / 5 (yaygın bantlar için) */
export const umtsFreqMhz = (uarfcn?: number | null) => (uarfcn == null ? undefined : Math.round(uarfcn * 2) / 10);

/** 2G ARFCN → DL frekans (MHz) */
export function gsmFreqMhz(arfcn?: number | null): number | undefined {
  if (arfcn == null) return undefined;
  if (arfcn >= 0 && arfcn <= 124) return Math.round((935 + 0.2 * arfcn) * 10) / 10; // GSM 900
  if (arfcn >= 975 && arfcn <= 1023) return Math.round((935 + 0.2 * (arfcn - 1024)) * 10) / 10; // E-GSM
  if (arfcn >= 512 && arfcn <= 885) return Math.round((1805.2 + 0.2 * (arfcn - 512)) * 10) / 10; // DCS 1800
  return undefined;
}

// Türkiye operatörleri (MCC 286); diğerleri için MCC-MNC gösterilir
const OPERATORS: Record<string, string> = {
  '286-01': 'Turkcell',
  '286-02': 'Vodafone',
  '286-03': 'Türk Telekom',
  '286-04': 'Türk Telekom',
};

export function operatorName(mcc?: string | null, mnc?: string | null): string | undefined {
  if (!mcc || !mnc) return undefined;
  const key = `${mcc}-${mnc.padStart(2, '0')}`;
  return OPERATORS[key] ?? `${mcc}-${mnc}`;
}

/** Zamanlama ilerlemesinden (TA) yaklaşık uzaklık, metre. LTE: 1 birim ≈ 78 m · GSM: ≈ 550 m */
export function distanceMeters(cell: Pick<CellInfo, 'type' | 'timingAdvance'>): number | undefined {
  const ta = cell.timingAdvance;
  if (ta == null || ta < 0) return undefined;
  if (cell.type === 'LTE') return ta <= 1282 ? Math.round(ta * 78.12) : undefined;
  if (cell.type === 'GSM') return ta <= 63 ? ta * 550 : undefined;
  return undefined;
}

export type CellSummary = {
  tech: string; // "4G (LTE)" gibi değil, kısa: LTE / 5G / 3G / 2G
  band?: string; // "B3" / "n78" / "B1 (2100)"
  freqMhz?: number;
  enb?: number; // LTE baz istasyonu numarası
  sector?: number; // LTE sektör (anten yönü)
  distanceM?: number;
};

const SHORT: Record<CellInfo['type'], string> = { LTE: '4G', NR: '5G', WCDMA: '3G', GSM: '2G' };

export function summarizeCell(c: CellInfo): CellSummary {
  const out: CellSummary = { tech: SHORT[c.type] };
  const apiBand = c.bands?.length ? c.bands[0] : undefined;
  if (c.type === 'LTE') {
    const b = lteBand(c.arfcn);
    out.band = apiBand ? `B${apiBand}` : b ? `B${b.band}` : undefined;
    out.freqMhz = b?.freqMhz;
    if (c.cellId != null && c.cellId >= 0) {
      out.enb = Math.floor(c.cellId / 256);
      out.sector = c.cellId % 256;
    }
  } else if (c.type === 'NR') {
    out.freqMhz = nrFreqMhz(c.arfcn);
    const n = apiBand ?? nrBand(out.freqMhz);
    out.band = n ? `n${n}` : undefined;
  } else if (c.type === 'WCDMA') {
    out.freqMhz = umtsFreqMhz(c.arfcn);
  } else {
    out.freqMhz = gsmFreqMhz(c.arfcn);
  }
  out.distanceM = distanceMeters(c);
  return out;
}

/** Bağlı hücreler önce, sonra sinyali güçlü olandan zayıfa */
export function sortCells(cells: CellInfo[]): CellInfo[] {
  const strength = (c: CellInfo) => c.rsrp ?? c.dbm ?? -999;
  return [...cells].sort((a, b) => Number(b.registered) - Number(a.registered) || strength(b) - strength(a));
}