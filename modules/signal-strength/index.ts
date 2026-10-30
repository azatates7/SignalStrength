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
};

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
  getNetworkInfo(): NetworkInfo;
  startNetworkListening(): void;
  stopNetworkListening(): void;
  /** Bağlı Wi-Fi'nin adı; konum izni yoksa / konum kapalıysa null */
  getWifiName(): Promise<string | null>;
}

// Modül bulunamazsa uygulama açılışta çökmesin diye null döner; hook bunu ekranda hata olarak gösterir
export default requireOptionalNativeModule<SignalStrengthNative>('SignalStrength');