// src/signal/useSignalStrength.ts
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import SignalStrength, { type SignalReading } from '../../modules/signal-strength';

const failure = (message: string): SignalReading => ({
  available: false,
  reason: 'error',
  errorMessage: message,
  timestamp: Date.now(),
});

export function useSignalStrength(): SignalReading | null {
  const [reading, setReading] = useState<SignalReading | null>(null);

  useEffect(() => {
    const mod = SignalStrength;
    if (!mod) {
      setReading(failure("Native module not found: 'SignalStrength'"));
      return;
    }

    let sub: { remove(): void } | undefined;
    try {
      setReading(mod.getCurrent());
      sub = mod.addListener('onSignalChange', setReading);
      mod.startListening();
    } catch (e) {
      // Native taraftaki hata uygulamayı kapatmak yerine ekranda gösterilir
      setReading(failure(e instanceof Error ? e.message : String(e)));
    }

    // Pil için: uygulama arka plandayken sinyal dinlenmez, öne gelince güncel değerle yeniden başlar
    const appSub = AppState.addEventListener('change', (state) => {
      try {
        if (state === 'active') {
          setReading(mod.getCurrent());
          mod.startListening();
        } else if (state === 'background') {
          mod.stopListening();
        }
      } catch (e) {
        setReading(failure(e instanceof Error ? e.message : String(e)));
      }
    });

    return () => {
      appSub.remove();
      try {
        sub?.remove();
        mod.stopListening();
      } catch {
        // kapanırken oluşan hatalar önemsiz
      }
    };
  }, []);

  return reading;
}