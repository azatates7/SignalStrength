// Sesli sinyal modu: açıkken sinyal puanına göre bip çalar (güçlü sinyal → sık bip).
// Uygulama arka plandayken veya sekme değişince susar.
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text } from 'react-native';
import SignalStrength from '../../modules/signal-strength/Index';
import { useI18n } from '../i18n/Index';
import { useTheme } from '../Theme';
import { beepIntervalMs } from './Beep';

export function SoundToggle({ score, active }: { score: number; active: boolean }) {
  const { colors: c } = useTheme();
  const { t } = useI18n();
  const [on, setOn] = useState(false);
  const latest = useRef(score);
  latest.current = score;

  useEffect(() => {
    if (!on || !active) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const interval = beepIntervalMs(latest.current);
      if (interval !== undefined && AppState.currentState === 'active') {
        try {
          SignalStrength?.beep(70);
        } catch {
          // ses çalınamazsa sessizce devam
        }
      }
      timer = setTimeout(tick, interval ?? 500);
    };
    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [on, active]);

  return (
    <>
      <Pressable
        onPress={() => setOn((v) => !v)}
        style={[styles.button, { backgroundColor: on ? c.accent : c.card }]}
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
      >
        <Text style={[styles.text, { color: on ? c.onAccent : c.text }]}>{on ? t.sound.on : t.sound.off}</Text>
      </Pressable>
      {on ? <Text style={[styles.hint, { color: c.textMuted }]}>{t.sound.hint}</Text> : null}
    </>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  button: { marginTop: 14, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  text: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
});