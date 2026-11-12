// modules/signal-strength/index.ts
import { NativeModule, requireOptionalNativeModule } from 'expo';

export type Technology = 'NR' | 'LTE' | 'WCDMA' | 'TDSCDMA' | 'GSM' | 'CDMA' | 'UNKNOWN';

export type SignalReading = {
  available: boolean;
  reason?: 'no_data' | 'no_service' | 'unsupported_os' | 'error';
  errorMessage?: string; // reason === 'error' olduğunda hatanın ayrıntısı
  technology?: Technology;
  operator?: string | null; // Şebeke operatörü adı, ör. TURKCELL
  dbm?: number | null;
  asu?: number | null;
  systemLevel?: number; // Android'in 0-4 seviyesi
  rsrp?: number | null;
  rsrq?: number | null;
  sinr?: number | null;
  rssi?: number | null;
  timestamp: number;
};

export type NetworkType = 'wifi' | 'cellular' | 'ethernet' | 'vpn' | 'other' | 'none';

export type NetworkInfo = {
  connected: boolean; // İnternet yeteneği olan bir ağ var
  validated: boolean; // Android internete gerçekten çıkılabildiğini doğruladı
  type: NetworkType;
  metered: boolean; // Kotalı bağlantı (genelde mobil veri)
  vpn: boolean; // VPN açık (type yine alttaki bağlantıyı gösterir: Wi-Fi / mobil veri)
};

/** Yerel ağ bilgisi (internet kullanmadan okunur). VPN açıksa alttaki Wi-Fi / mobil ağın bilgisidir. */
export type IpInfo = {
  available: boolean;
  ipv4?: string | null; // Cihazın yerel IP'si, ör. 192.168.1.34
  ipv6?: string | null;
  gateway?: string | null; // Modem / ağ geçidi, ör. 192.168.1.1 (mobil veride genelde yok)
  dns?: string[];
  // dhcp: modem otomatik verdi (dinamik) · static: elle ayarlı · carrier: mobil operatör atadı
  assignment?: 'dhcp' | 'static' | 'carrier' | 'unknown';
};

/** Bağlı Wi-Fi ağının sinyali (konum izni gerekmez) */
export type WifiSignal = {
  rssi: number; // dBm, ör. -58
  frequency?: number | null; // MHz, ör. 5180 (bant ve kanal bundan hesaplanır)
  linkSpeed?: number | null; // Mbps
  txLinkSpeed?: number | null; // Android 10+
  rxLinkSpeed?: number | null; // Android 10+
  standard?: number | null; // Android 11+: 1 eski, 4 = Wi-Fi 4 (n), 5 = Wi-Fi 5 (ac), 6 = Wi-Fi 6 (ax), 8 = Wi-Fi 7 (be)
};

/** Baz istasyonu (hücre). Değerler bilinmiyorsa null. */
export type CellTech = 'LTE' | 'NR' | 'WCDMA' | 'GSM';
export type CellInfo = {
  type: CellTech;
  registered: boolean; // true: telefonun bağlı olduğu hücre; false: çevredeki hücre
  mcc?: string | null;
  mnc?: string | null;
  tac?: number | null; // LTE/5G: TAC · 2G/3G: LAC
  cellId?: number | null; // LTE: ECI (eNB × 256 + sektör) · 5G: NCI · 2G/3G: CID
  pci?: number | null; // LTE/5G: PCI · 3G: PSC · 2G: BSIC
  arfcn?: number | null; // EARFCN / NR-ARFCN / UARFCN / ARFCN
  bands?: number[]; // Android 11+
  bandwidthKhz?: number | null;
  rsrp?: number | null;
  rsrq?: number | null;
  sinr?: number | null;
  dbm?: number | null;
  timingAdvance?: number | null; // LTE: 1 birim ≈ 78 m · GSM: ≈ 550 m
};
export type CellInfoResult = { status: 'ok' | 'permission' | 'unsupported' | 'error'; cells: CellInfo[] };

type Events = {
  onSignalChange: (reading: SignalReading) => void;
  onNetworkChange: (info: NetworkInfo) => void;
};

declare class SignalStrengthNative extends NativeModule<Events> {
  getCurrent(): SignalReading;
  startListening(): void;
  stopListening(): void;
  getThemePreference(): string | null;
  setThemePreference(mode: string): void;
  getLanguagePreference(): string | null;
  setLanguagePreference(lang: string): void;
  getPrivacyNoticeDismissed(): boolean;
  setPrivacyNoticeDismissed(value: boolean): void;
  getNetworkInfo(): NetworkInfo;
  isLocationEnabled(): boolean;
  openLocationSettings(): boolean;
  getStatusBarHeight(): number;
  getIpInfo(): IpInfo;
  getWifiSignal(): WifiSignal | null;
  getSpeedHistory(): string | null;
  setSpeedHistory(json: string | null): void;
  /** Ping örnekleri (ms); ilk istek sayılmaz. Ölçülemezse null */
  measurePing(url: string, count: number, referer: string): Promise<number[] | null>;
  /** Tek ping (ms); zaman aşımı / hata → null */
  pingOnce(url: string, referer: string, timeoutMs: number): Promise<number | null>;
  beep(durationMs: number): boolean;
  openSystemSettings(kind: 'mobile' | 'airplane'): boolean;
  dnsLatency(server: string, host: string, count: number, timeoutMs: number): Promise<(number | null)[]>;
  httpLatency(url: string, count: number, timeoutMs: number): Promise<(number | null)[]>;
  getCellInfo(): Promise<CellInfoResult>;
  startNetworkListening(): void;
  stopNetworkListening(): void;
  /** Bağlı Wi-Fi'nin adı; konum izni yoksa / konum kapalıysa null */
  getWifiName(): Promise<string | null>;
}

// Modül bulunamazsa uygulama açılışta çökmesin diye null döner; hook bunu ekranda hata olarak gösterir
export default requireOptionalNativeModule<SignalStrengthNative>('SignalStrength');