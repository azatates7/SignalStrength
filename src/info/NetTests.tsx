// "Bağlantı Bilgisi" sekmesindeki ağ testleri:
//  - DNS karşılaştırması: telefonun kullandığı DNS ve yaygın genel DNS sunucularının yanıt süresi
//  - Servis gecikmesi: popüler servislere küçük (HEAD) isteklerle gecikme
// Ölçümler native taraftadır (NetTools.kt). Az veri kullanır (her biri birkaç KB).
import SignalStrength from '../../modules/signal-strength/Index';
import { median } from '../speedtest/Cloudflare';

// privateDns: Android "Özel DNS" ayarına yazılacak ad (ayar IP değil ad ister); yoksa öneride ad verilmez
export type DnsServer = { name: string; ip: string; system?: boolean; privateDns?: string };
export const PUBLIC_DNS: DnsServer[] = [
  { name: 'Cloudflare', ip: '1.1.1.1', privateDns: 'one.one.one.one' },
  { name: 'Google', ip: '8.8.8.8', privateDns: 'dns.google' },
  { name: 'Quad9', ip: '9.9.9.9', privateDns: 'dns.quad9.net' },
  { name: 'OpenDNS', ip: '208.67.222.222' },
];
// Sorgulanan alan adı: her sunucuda büyük olasılıkla önbellekte olan popüler bir ad (adil karşılaştırma)
const DNS_HOST = 'www.google.com';

export type Service = { name: string; url: string };
export const SERVICES: Service[] = [
  { name: 'Google', url: 'https://www.google.com/generate_204' },
  { name: 'YouTube', url: 'https://www.youtube.com/generate_204' },
  { name: 'WhatsApp', url: 'https://www.whatsapp.com/' },
  { name: 'Instagram', url: 'https://www.instagram.com/' },
  { name: 'Netflix', url: 'https://www.netflix.com/' },
  { name: 'Steam', url: 'https://store.steampowered.com/' },
];

export type LatencyResult = {
  name: string;
  detail?: string;
  medianMs?: number;
  lost: number;
  sent: number;
  system?: boolean;
  privateDns?: string;
};

/** Örneklerden sonuç: ortanca gecikme ve kayıp sayısı (null = kayıp) */
export function latencyResult(name: string, samples: (number | null)[], extra: Partial<LatencyResult> = {}): LatencyResult {
  const ok = samples.filter((s): s is number => s !== null);
  return { name, medianMs: ok.length ? median(ok) : undefined, lost: samples.length - ok.length, sent: samples.length, ...extra };
}

/** Hızlıdan yavaşa; hiç yanıt vermeyenler en sonda */
export function rankResults(results: LatencyResult[]): LatencyResult[] {
  return [...results].sort((a, b) => (a.medianMs ?? Infinity) - (b.medianMs ?? Infinity));
}

/** Telefonun DNS'i genel bir DNS'ten belirgin (≥ %30 ve ≥ 10 ms) yavaşsa, en hızlı genel DNS önerilir */
export function dnsSuggestion(results: LatencyResult[]): LatencyResult | undefined {
  const system = results.find((r) => r.system);
  const best = rankResults(results.filter((r) => !r.system && r.medianMs !== undefined))[0];
  if (!best?.medianMs) return undefined;
  if (!system?.medianMs) return best;
  return system.medianMs - best.medianMs >= 10 && best.medianMs <= system.medianMs * 0.7 ? best : undefined;
}

export async function runDnsTest(systemDns: string[], onResult: (r: LatencyResult) => void, isCancelled: () => boolean) {
  const mod = SignalStrength;
  if (!mod) throw new Error('unavailable');
  const servers: DnsServer[] = [
    ...systemDns.filter((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip)).slice(0, 1).map((ip) => ({ name: '', ip, system: true })),
    ...PUBLIC_DNS,
  ];
  for (const s of servers) {
    if (isCancelled()) return;
    const samples = await mod.dnsLatency(s.ip, DNS_HOST, 5, 2000).catch(() => [null]);
    onResult(latencyResult(s.name, samples, { detail: s.ip, system: s.system, privateDns: s.privateDns }));
  }
}

export async function runServiceTest(onResult: (r: LatencyResult) => void, isCancelled: () => boolean) {
  const mod = SignalStrength;
  if (!mod) throw new Error('unavailable');
  for (const s of SERVICES) {
    if (isCancelled()) return;
    const samples = await mod.httpLatency(s.url, 3, 3000).catch(() => [null]);
    onResult(latencyResult(s.name, samples));
  }
}