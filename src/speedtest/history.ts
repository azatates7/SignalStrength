// Hız testi geçmişi: son 20 test, yalnızca telefonda (native SharedPreferences, tema tercihinin yanında).
// Sunucuya hiçbir şey gönderilmez. IP adresi ve Wi-Fi adı saklanmaz.
import SignalStrength, { type NetworkType } from '../../modules/signal-strength/Index';

export const MAX_HISTORY = 20;

export type HistoryEntry = {
  at: number; // Test zamanı (ms)
  type: NetworkType; // wifi / cellular / ...
  vpn?: boolean;
  isp?: string; // Servis sağlayıcı, ör. "D-SMART"
  pingMs: number;
  jitterMs?: number;
  downloadMbps: number;
  uploadMbps?: number;
};

const TYPES: NetworkType[] = ['wifi', 'cellular', 'ethernet', 'vpn', 'other', 'none'];
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Yeni test en üste eklenir; en fazla `max` kayıt tutulur */
export function addEntry(list: HistoryEntry[], entry: HistoryEntry, max = MAX_HISTORY): HistoryEntry[] {
  return [entry, ...list].slice(0, max);
}

/** Saklanan JSON'u okur; bozuk / eksik kayıtlar atlanır, hiçbir durumda hata fırlatmaz */
export function parseHistory(raw: string | null | undefined): HistoryEntry[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: HistoryEntry[] = [];
  for (const d of data as Record<string, unknown>[]) {
    if (!d || !num(d.at) || !num(d.pingMs) || !num(d.downloadMbps)) continue;
    const type = TYPES.includes(d.type as NetworkType) ? (d.type as NetworkType) : 'other';
    out.push({
      at: d.at,
      type,
      vpn: d.vpn === true || undefined,
      isp: typeof d.isp === 'string' ? d.isp : undefined,
      pingMs: d.pingMs,
      jitterMs: num(d.jitterMs) ? d.jitterMs : undefined,
      downloadMbps: d.downloadMbps,
      uploadMbps: num(d.uploadMbps) ? d.uploadMbps : undefined,
    });
  }
  return out.sort((a, b) => b.at - a.at).slice(0, MAX_HISTORY);
}

export function loadHistory(): HistoryEntry[] {
  try {
    return parseHistory(SignalStrength?.getSpeedHistory());
  } catch {
    return [];
  }
}

export function saveHistory(list: HistoryEntry[]) {
  try {
    SignalStrength?.setSpeedHistory(list.length ? JSON.stringify(list) : null);
  } catch {
    // kaydedilemezse geçmiş sadece bu oturumda görünür
  }
}