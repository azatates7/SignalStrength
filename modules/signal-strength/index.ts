// modules/signal-strength/index.ts
import { NativeModule, requireNativeModule } from 'expo';

export type Technology = 'NR' | 'LTE' | 'WCDMA' | 'TDSCDMA' | 'GSM' | 'CDMA' | 'UNKNOWN';

export type SignalReading = {
  available: boolean;
  reason?: 'no_data' | 'no_service' | 'unsupported_os';
  technology?: Technology;
  dbm?: number | null;
  asu?: number | null;
  systemLevel?: number; // Android'in 0-4 seviyesi
  rsrp?: number | null;
  rsrq?: number | null;
  sinr?: number | null;
  rssi?: number | null;
  timestamp: number;
};

type Events = {
  onSignalChange: (reading: SignalReading) => void;
};

declare class SignalStrengthNative extends NativeModule<Events> {
  getCurrent(): SignalReading;
  startListening(): void;
  stopListening(): void;
}

export default requireNativeModule<SignalStrengthNative>('SignalStrength');
