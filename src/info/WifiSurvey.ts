// Ev Wi-Fi haritası (saf mantık): oda oda ölçülen Wi-Fi sinyali, hızı ve ping'i saklar, odaları sınıflandırır ve öneri üretir. Ölçümler telefonda saklanır (getStoredString, anahtar "wifi_survey"); konum kullanılmaz, oda adlarını kullanıcı verir.
import { bandOf, type Band } from './WifiChannels';

export const SURVEY_KEY = 'wifi_survey';
export const MAX_ROOMS = 20;

export type RoomMeasure = {
  room: string;
  at: number;
  rssi: number; // dBm (ortanca)
  frequency?: number; // MHz (bant için)
  linkMbps?: number; // Telefon–modem bağlantı hızı
  downMbps?: number; // İnternet indirme hızı (kısa ölçüm)
  pingMs?: number;
};

export type SignalLevel = 'good' | 'fair' | 'weak' | 'bad';

/** ≥ -60 iyi, -60…-70 orta, -70…-80 zayıf, altı çok zayıf */
export const rssiLevel = (rssi: number): SignalLevel => (rssi >= -60 ? 'good' : rssi >= -70 ? 'fair' : rssi >= -80 ? 'weak' : 'bad');

export const roomBand = (m: RoomMeasure): Band | undefined => (m.frequency ? bandOf(m.frequency) : undefined);

export function median(xs: number[]): number | undefined {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function parseSurvey(json: string | null | undefined): RoomMeasure[] {
  try {
    const v = json ? JSON.parse(json) : undefined;
    if (!Array.isArray(v)) return [];
    return v.filter((m) => m && typeof m.room === 'string' && m.room.trim() && typeof m.rssi === 'number').slice(0, MAX_ROOMS);
  } catch {
    return [];
  }
}

const same = (a: string, b: string) => a.trim().toLocaleLowerCase('tr') === b.trim().toLocaleLowerCase('tr');

/** Aynı adlı oda varsa ölçümü yeniler, yoksa sona ekler (en fazla 20 oda) */
export function upsertRoom(list: RoomMeasure[], m: RoomMeasure): RoomMeasure[] {
  const i = list.findIndex((x) => same(x.room, m.room));
  if (i >= 0) return list.map((x, j) => (j === i ? m : x));
  return [...list, m].slice(-MAX_ROOMS);
}

export const removeRoom = (list: RoomMeasure[], room: string) => list.filter((x) => !same(x.room, room));

export type SurveyAdvice = {
  best?: RoomMeasure; // En güçlü sinyal (çoğunlukla modemin olduğu oda)
  weak: RoomMeasure[]; // Zayıf / çok zayıf sinyalli odalar
  slow: RoomMeasure[]; // İnternet hızı en iyi odanın yarısının altında kalan odalar
  fallsTo24: RoomMeasure[]; // En iyi odada 5 GHz varken 2,4 GHz'e düşen odalar
  verdict: 'empty' | 'allGood' | 'someWeak' | 'mostWeak';
};

export function surveyAdvice(list: RoomMeasure[]): SurveyAdvice {
  if (!list.length) return { weak: [], slow: [], fallsTo24: [], verdict: 'empty' };
  const best = [...list].sort((a, b) => b.rssi - a.rssi)[0];
  const weak = list.filter((m) => rssiLevel(m.rssi) === 'weak' || rssiLevel(m.rssi) === 'bad');
  const bestDown = Math.max(...list.map((m) => m.downMbps ?? 0));
  const slow = bestDown > 0 ? list.filter((m) => m !== best && m.downMbps !== undefined && m.downMbps < bestDown * 0.5) : [];
  const fallsTo24 = roomBand(best) === '5' ? list.filter((m) => roomBand(m) === '2.4') : [];
  const verdict = !weak.length ? 'allGood' : weak.length * 2 > list.length ? 'mostWeak' : 'someWeak';
  return { best, weak, slow, fallsTo24, verdict };
}