// src/speedtest/useNetwork.ts
// Aktif internet bağlantısını (Wi-Fi / mobil veri / yok) izleyen hook.
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, PermissionsAndroid } from 'react-native';
import SignalStrength, { type NetworkInfo, type Technology } from '../../modules/signal-strength';

const NONE: NetworkInfo = { connected: false, validated: false, type: 'none', metered: false };

export function useNetwork(): { info: NetworkInfo; error?: string } {
  const [info, setInfo] = useState<NetworkInfo>(NONE);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const mod = SignalStrength;
    if (!mod) {
      setError("Native module not found: 'SignalStrength'");
      return;
    }
    let sub: { remove(): void } | undefined;
    try {
      setInfo(mod.getNetworkInfo());
      sub = mod.addListener('onNetworkChange', setInfo);
      mod.startNetworkListening();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    return () => {
      try {
        sub?.remove();
        mod.stopNetworkListening();
      } catch {
        // kapanırken oluşan hatalar önemsiz
      }
    };
  }, []);

  return { info, error };
}

export type WifiNameState = 'idle' | 'needPermission' | 'loading' | 'ok' | 'unavailable' | 'denied' | 'blocked';

const FINE = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
const COARSE = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

/**
 * Bağlı Wi-Fi ağının adı. Android bunu yalnızca konum izni verilmiş ve konum servisi açıkken
 * veriyor; izin, kullanıcı "Göster"e dokunduğunda istenir (uygulama açılışında sorulmaz).
 * Ad alınamazsa "Tekrar dene" ile yeniden sorgulanabilir; kullanıcı ayarlardan konumu açıp
 * uygulamaya döndüğünde de kendiliğinden yeniden denenir.
 */
export function useWifiName(info: NetworkInfo) {
  const [ssid, setSsid] = useState<string | null>(null);
  const [state, setState] = useState<WifiNameState>('idle');
  const isWifi = info.type === 'wifi';

  const load = useCallback(async () => {
    setState('loading');
    try {
      const name = (await SignalStrength?.getWifiName()) ?? null;
      setSsid(name);
      setState(name ? 'ok' : 'unavailable');
    } catch {
      setState('unavailable');
    }
  }, []);

  // İzin varsa adı oku, yoksa "Göster" butonunu göster
  const refresh = useCallback(() => {
    PermissionsAndroid.check(FINE)
      .then((granted) => (granted ? load() : setState((s) => (s === 'blocked' ? s : 'needPermission'))))
      .catch(() => setState('needPermission'));
  }, [load]);

  // Wi-Fi'ye bağlanınca / ağ değişince
  useEffect(() => {
    if (!isWifi) {
      setSsid(null);
      setState('idle');
      return;
    }
    refresh();
  }, [isWifi, info.validated, refresh]);

  // Kullanıcı ayarlardan konumu / izni açıp uygulamaya dönünce, ad hâlâ yoksa yeniden dene
  useEffect(() => {
    if (!isWifi) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && !ssid) refresh();
    });
    return () => sub.remove();
  }, [isWifi, ssid, refresh]);

  const requestPermission = useCallback(async () => {
    const r = await PermissionsAndroid.requestMultiple([FINE, COARSE]);
    if (r[FINE] === PermissionsAndroid.RESULTS.GRANTED) await load();
    else setState(r[FINE] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied');
  }, [load]);

  return { ssid, state, requestPermission, retry: load, openSettings: () => Linking.openSettings() };
}

const TECH_SHORT: Partial<Record<Technology, string>> = {
  NR: '5G',
  LTE: 'LTE',
  WCDMA: '3G',
  TDSCDMA: '3G',
  GSM: '2G',
  CDMA: '2G',
};

/** Mobil ağdayken operatör adı ve teknoloji (ör. TURKCELL, LTE). İnternet kullanmaz, SIM'den okunur. */
export function useCellularName(info: NetworkInfo): { operator?: string; tech?: string } {
  const [value, setValue] = useState<{ operator?: string; tech?: string }>({});
  useEffect(() => {
    if (info.type !== 'cellular') {
      setValue({});
      return;
    }
    try {
      const r = SignalStrength?.getCurrent();
      setValue({
        operator: r?.operator ?? undefined,
        tech: r?.technology ? TECH_SHORT[r.technology] : undefined,
      });
    } catch {
      setValue({});
    }
  }, [info.type, info.validated]);
  return value;
}