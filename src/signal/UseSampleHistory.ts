// Canlı grafik için son değerleri saniyede bir örnekler (varsayılan: son 2 dakika = 120 örnek).
// Hiçbir şey saklanmaz; uygulama arka plandayken örnek alınmaz.
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { pushSample } from './Wifi';

export const HISTORY_SECONDS = 120;

export function useSampleHistory(value: number | null | undefined, max = HISTORY_SECONDS, intervalMs = 1000) {
  const latest = useRef(value);
  latest.current = value;
  const [samples, setSamples] = useState<number[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      const v = latest.current;
      if (v == null || !Number.isFinite(v) || AppState.currentState !== 'active') return;
      setSamples((s) => pushSample(s, v, max));
    }, intervalMs);
    return () => clearInterval(id);
  }, [max, intervalMs]);

  return samples;
}