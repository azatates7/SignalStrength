// Wi-Fi'ye bağlıyken Wi-Fi sinyalini 2 saniyede bir okur (internet kullanmaz, izin gerekmez) uygulama arka plandayken okunmaz.
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import SignalStrength, { type WifiSignal } from '../../modules/signal-strength/Index';

const read = (): WifiSignal | null => {
  try {
    return SignalStrength?.getWifiSignal() ?? null;
  } catch {
    return null;
  }
};

export function useWifiSignal(enabled: boolean): WifiSignal | null {
  const [signal, setSignal] = useState<WifiSignal | null>(null);
  useEffect(() => {
    if (!enabled) {
      setSignal(null);
      return;
    }
    setSignal(read());
    const id = setInterval(() => {
      if (AppState.currentState === 'active') setSignal(read());
    }, 2000);
    return () => clearInterval(id);
  }, [enabled]);
  return signal;
}