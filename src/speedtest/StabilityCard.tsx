// "Bağlantı kararlılığı" kartı: 30 sn sürekli ping, canlı gecikme grafiği, dalgalanma ve kayıp.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n/Index';
import { useTheme } from '../Theme';
import { Sparkline } from '../ui/Sparkline';
import { STABILITY_DURATION_MS, runStabilityTest, stabilityStats } from './Stability';

const VERDICT_COLOR = { good: '#22c55e', fair: '#f59e0b', poor: '#ef4444' } as const;

/**
 * disabled: hız testi sürerken (ikisi aynı anda ölçüm yapmasın).
 * onRunningChange: hız testi de bu test sürerken başlamasın.
 */
export function StabilityCard({
  online,
  disabled,
  onRunningChange,
}: {
  online: boolean;
  disabled: boolean;
  onRunningChange: (running: boolean) => void;
}) {
  const { colors: c, tone } = useTheme();
  const { t } = useI18n();
  const [samples, setSamples] = useState<(number | null)[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const cancelled = useRef(false);

  // Bağlantı koparsa test durur
  useEffect(() => {
    if (!online) cancelled.current = true;
  }, [online]);
  // Ekrandan kalkarsa durdur
  useEffect(() => () => void (cancelled.current = true), []);

  async function start() {
    cancelled.current = false;
    setSamples([]);
    setStatus('running');
    onRunningChange(true);
    const startedAt = Date.now();
    try {
      await runStabilityTest(
        (ms) => {
          setSamples((s) => [...s, ms]);
          setElapsed(Math.min(STABILITY_DURATION_MS, Date.now() - startedAt));
        },
        () => cancelled.current,
      );
      setStatus('done');
    } catch {
      setStatus('error');
    } finally {
      onRunningChange(false);
    }
  }

  const running = status === 'running';
  const stats = samples.length ? stabilityStats(samples) : undefined;
  const values = samples.filter((s): s is number => s !== null);
  const fmt = (v?: number) => (v === undefined ? '—' : `${Math.round(v)} ms`);

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <Text style={[styles.title, { color: c.text }]}>{t.stability.title}</Text>
      <Text style={[styles.desc, { color: c.textSoft }]}>{t.stability.desc}</Text>

      {values.length >= 2 ? (
        <View style={styles.chart}>
          <Sparkline values={values} color={tone('#3b82f6')} gridColor={c.barOff} floor={0} minSpan={20} height={56} />
        </View>
      ) : null}

      {stats ? (
        <>
          <Row label={t.stability.median} value={fmt(stats.medianMs)} />
          <Row label={t.stability.jitter} value={fmt(stats.jitterMs)} />
          <Row label={t.stability.loss} value={`${stats.lost}/${stats.sent} (${t.stability.pct(Math.round(stats.lossPct))})`} />
          <Row label={t.stability.max} value={fmt(stats.maxMs)} last />
          {status === 'done' ? (
            <Text style={[styles.verdict, { color: tone(VERDICT_COLOR[stats.verdict]) }]}>{t.stability[stats.verdict]}</Text>
          ) : null}
        </>
      ) : null}
      {status === 'error' ? <Text style={[styles.verdict, { color: tone('#ef4444') }]}>{t.stability.failed}</Text> : null}

      <Pressable
        onPress={running ? () => (cancelled.current = true) : start}
        disabled={!running && (disabled || !online)}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: c.background, opacity: pressed || (!running && (disabled || !online)) ? 0.6 : 1 },
        ]}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, { color: c.text }]}>
          {running ? `${t.stability.stop} · ${t.stability.running(Math.round(elapsed / 1000))}` : t.stability.start}
        </Text>
      </Pressable>
      <Text style={[styles.note, { color: c.textFaint }]}>{t.stability.data}</Text>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomColor: c.barOff, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: c.text }]}>{value}</Text>
    </View>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  desc: { fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 8 },
  chart: { marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  verdict: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  button: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { fontSize: 15, fontWeight: '700' },
  note: { fontSize: 12, textAlign: 'center', marginTop: 6 },
});