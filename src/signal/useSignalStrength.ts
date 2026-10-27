// src/signal/useSignalStrength.ts
import { useEffect, useState } from 'react';
import SignalStrength, { type SignalReading } from '../../modules/signal-strength';

export function useSignalStrength(): SignalReading | null {
  const [reading, setReading] = useState<SignalReading | null>(null);

  useEffect(() => {
    setReading(SignalStrength.getCurrent());

    const sub = SignalStrength.addListener('onSignalChange', setReading);
    SignalStrength.startListening();

    return () => {
      sub.remove();
      SignalStrength.stopListening();
    };
  }, []);

  return reading;
}
