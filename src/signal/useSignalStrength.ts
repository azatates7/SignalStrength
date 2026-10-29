// src/signal/useSignalStrength.ts
import { useEffect, useState } from 'react';
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
      setReading(failure("Native modül bulunamadı: 'SignalStrength'"));
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

    return () => {
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