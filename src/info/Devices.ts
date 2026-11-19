// "Ağdaki cihazlar" (saf mantık): taramadan gelen cihazlara tür ve ad verir, sıralar ve bir önceki taramayla karşılaştırıp yeni cihazları işaretler. Android MAC adresi vermediği için bir cihaz adıyla (yoksa IP'siyle) tanınır; modem IP'yi değiştirirse adı olmayan cihaz "yeni" görünebilir.
import type { LanDevice } from '../../modules/signal-strength';

export const KNOWN_KEY = 'lan_known';
export const KNOWN_MAX = 200;

export type DeviceKind = 'router' | 'self' | 'tv' | 'speaker' | 'printer' | 'apple' | 'phone' | 'computer' | 'camera' | 'smartHome' | 'unknown';

export type Device = LanDevice & { kind: DeviceKind; name?: string; key: string; isNew: boolean };

const has = (d: LanDevice, ...types: string[]) => d.services.some((s) => types.some((t) => s.type.includes(t)));
const host = (d: LanDevice) => (d.hostname ?? '').toLowerCase();

export function deviceKind(d: LanDevice): DeviceKind {
  if (d.isSelf) return 'self';
  if (d.isGateway) return 'router';
  if (has(d, '_googlecast', '_androidtvremote', '_airplay')) return 'tv';
  if (has(d, '_raop', '_spotify-connect')) return 'speaker';
  if (has(d, '_ipp', '_printer', '_pdl-datastream') || d.openPorts.includes(9100)) return 'printer';
  if (has(d, '_hap')) return 'smartHome';
  if (d.openPorts.includes(62078) || /iphone|ipad|macbook|imac/.test(host(d)) || has(d, '_companion-link')) return 'apple';
  if (/android|galaxy|redmi|xiaomi|huawei|pixel|oppo|realme|vivo|oneplus/.test(host(d))) return 'phone';
  if (d.openPorts.includes(554)) return 'camera';
  if (has(d, '_smb') || d.openPorts.includes(445) || /desktop|laptop|pc/.test(host(d))) return 'computer';
  return 'unknown';
}

/** Okunur ad: duyurudaki ad ("Salon TV") > modemin verdiği ad (alan adı soneki olmadan) */
export function deviceName(d: LanDevice): string | undefined {
  const announced = d.services.map((s) => s.name).find((n) => n && !/^[0-9a-f-]{20,}$/i.test(n));
  if (announced) return announced;
  const h = d.hostname?.replace(/\.(lan|local|home|localdomain|router|domain)$/i, '');
  return h && h !== d.ip ? h : undefined;
}

/** Bir sonraki taramada aynı cihazı tanımak için anahtar */
export const deviceKey = (d: LanDevice) => (deviceName(d) ?? d.ip).toLowerCase();

const ORDER: DeviceKind[] = ['router', 'self'];
const ipNum = (ip: string) => ip.split('.').reduce((a, x) => a * 256 + Number(x), 0);

/** Tür, ad ve "yeni" bilgisiyle sıralı liste. known: önceki taramalarda görülen anahtarlar (ilk taramada boş: hiçbiri yeni sayılmaz) */
export function describeDevices(devices: LanDevice[], known: string[] | undefined): Device[] {
  const seen = new Set(known ?? []);
  return devices
    .map((d) => {
      const kind = deviceKind(d);
      const key = deviceKey(d);
      return { ...d, kind, name: deviceName(d), key, isNew: known !== undefined && kind !== 'self' && kind !== 'router' && !seen.has(key) };
    })
    .sort((a, b) => {
      const oa = ORDER.indexOf(a.kind);
      const ob = ORDER.indexOf(b.kind);
      if (oa !== ob) return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob);
      return ipNum(a.ip) - ipNum(b.ip);
    });
}

export function parseKnown(json: string | null | undefined): string[] | undefined {
  try {
    const v = json ? JSON.parse(json) : undefined;
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : undefined;
  } catch {
    return undefined;
  }
}

/** Kaydedilecek bilinen anahtarlar: yeniler başa, en fazla 200 */
export function mergeKnown(known: string[] | undefined, devices: Device[]): string[] {
  const keys = devices.filter((d) => d.kind !== 'self').map((d) => d.key);
  return [...new Set([...keys, ...(known ?? [])])].slice(0, KNOWN_MAX);
}