import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSignalStrength } from './src/signal/useSignalStrength';
import { LEVEL_COUNT, TECH_LABEL, qualityLabel, toLevel } from './src/signal/levels';

const REASONS: Record<string, string> = {
  no_service: 'Şebeke yok (SIM yok / uçak modu)',
  no_data: 'Sinyal bilgisi alınamadı',
  unsupported_os: 'Android 9 ve üzeri gerekli',
};

export default function App() {
  const reading = useSignalStrength();

  if (Platform.OS !== 'android') {
    return <Centered text="Şu an yalnızca Android destekleniyor" />;
  }
  if (!reading) return <Centered text="Okunuyor…" />;
  if (!reading.available) return <Centered text={REASONS[reading.reason ?? 'no_data']} />;

  const level = toLevel(reading);
  const tech = reading.technology ?? 'UNKNOWN';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.tech}>{TECH_LABEL[tech]}</Text>

      <Text style={styles.dbm}>
        {reading.dbm ?? '—'}
        <Text style={styles.unit}> dBm</Text>
      </Text>

      <Bars level={level} />
      <Text style={styles.quality}>
        {qualityLabel(level)} · {level}/{LEVEL_COUNT}
      </Text>

      <View style={styles.details}>
        <Detail label="RSRP" value={reading.rsrp} unit="dBm" />
        <Detail label="RSRQ" value={reading.rsrq} unit="dB" />
        <Detail label="SINR" value={reading.sinr} unit="dB" />
        <Detail label="ASU" value={reading.asu} />
        <Detail label="Android seviyesi" value={reading.systemLevel} unit="/ 4" />
      </View>
    </View>
  );
}

function Bars({ level }: { level: number }) {
  return (
    <View style={styles.bars}>
      {Array.from({ length: LEVEL_COUNT }, (_, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: 16 + i * 10 },
            i < level ? { backgroundColor: barColor(level) } : styles.barOff,
          ]}
        />
      ))}
    </View>
  );
}

function barColor(level: number) {
  const p = level / LEVEL_COUNT;
  if (p <= 0.3) return '#ef4444';
  if (p <= 0.6) return '#f59e0b';
  return '#22c55e';
}

function Detail({ label, value, unit }: { label: string; value?: number | null; unit?: string }) {
  if (value == null) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value} {unit}
      </Text>
    </View>
  );
}

function Centered({ text }: { text: string }) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.quality}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  tech: { color: '#94a3b8', fontSize: 18, marginBottom: 8 },
  dbm: { color: '#f8fafc', fontSize: 64, fontWeight: '700' },
  unit: { fontSize: 22, fontWeight: '400', color: '#94a3b8' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 24 },
  bar: { width: 14, borderRadius: 3 },
  barOff: { backgroundColor: '#334155' },
  quality: { color: '#e2e8f0', fontSize: 18, textAlign: 'center' },
  details: { marginTop: 32, alignSelf: 'stretch' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#334155' },
  label: { color: '#94a3b8', fontSize: 15 },
  value: { color: '#f8fafc', fontSize: 15, fontVariant: ['tabular-nums'] },
});
