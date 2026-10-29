import { StatusBar } from 'expo-status-bar';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSignalStrength } from './src/signal/useSignalStrength';
import { LEVEL_COUNT, TECH_LABEL, qualityLabel, toLevel } from './src/signal/levels';
import { METRICS, rate, type MetricInfo } from './src/signal/metrics';
import { expo } from './app.json';

// app.json'daki "1.0.0" → "v1.0"
const APP_VERSION = `v${expo.version.split('.').slice(0, 2).join('.')}`;

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
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.tech}>{TECH_LABEL[tech]}</Text>
          <Text style={styles.dbm}>
            {reading.dbm ?? '—'}
            <Text style={styles.unit}> dBm</Text>
          </Text>
          <Bars level={level} />
          <Text style={styles.quality}>
            {qualityLabel(level)} · {level}/{LEVEL_COUNT}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Detaylar</Text>
        <MetricCard info={METRICS.rsrp} value={reading.rsrp} />
        <MetricCard info={METRICS.rsrq} value={reading.rsrq} />
        <MetricCard info={METRICS.sinr} value={reading.sinr} />
        <MetricCard info={METRICS.systemLevel} value={reading.systemLevel} />

        <Text style={styles.version}>Signal Strength {APP_VERSION}</Text>
      </ScrollView>
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

function MetricCard({ info, value }: { info: MetricInfo; value?: number | null }) {
  // 3G/2G'de bazı ölçümler gelmez; o kartlar gizlenir
  if (value == null) return null;
  const r = rate(value, info.thresholds);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBox}>
          <Text style={styles.cardTitle}>{info.title}</Text>
          <Text style={styles.cardTech}>{info.techName}</Text>
        </View>
        <View style={styles.cardValueBox}>
          <Text style={styles.cardValue}>
            {value} <Text style={styles.cardUnit}>{info.unit}</Text>
          </Text>
          <Text style={[styles.badge, { color: r.color, borderColor: r.color }]}>{r.label}</Text>
        </View>
      </View>
      <Text style={styles.cardDesc}>{info.description}</Text>
      <Text style={styles.cardIdeal}>{info.ideal}</Text>
    </View>
  );
}

function Centered({ text }: { text: string }) {
  return (
    <View style={[styles.screen, styles.centered]}>
      <StatusBar style="light" />
      <Text style={styles.quality}>{text}</Text>
      <Text style={[styles.version, styles.versionCentered]}>Signal Strength {APP_VERSION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 20, paddingTop: 56, paddingBottom: 32 },
  hero: { alignItems: 'center', marginBottom: 28 },
  tech: { color: '#94a3b8', fontSize: 18, marginBottom: 8 },
  dbm: { color: '#f8fafc', fontSize: 64, fontWeight: '700' },
  unit: { fontSize: 22, fontWeight: '400', color: '#94a3b8' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 24 },
  bar: { width: 14, borderRadius: 3 },
  barOff: { backgroundColor: '#334155' },
  quality: { color: '#e2e8f0', fontSize: 18, textAlign: 'center' },
  sectionTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardTitleBox: { flexShrink: 1 },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '600' },
  cardTech: { color: '#64748b', fontSize: 12, marginTop: 2 },
  cardValueBox: { alignItems: 'flex-end' },
  cardValue: { color: '#f8fafc', fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  cardUnit: { color: '#94a3b8', fontSize: 13, fontWeight: '400' },
  badge: { fontSize: 12, fontWeight: '600', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6, overflow: 'hidden' },
  cardDesc: { color: '#cbd5e1', fontSize: 14, lineHeight: 20, marginTop: 12 },
  cardIdeal: { color: '#94a3b8', fontSize: 13, marginTop: 8 },
  version: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 16 },
  versionCentered: { position: 'absolute', bottom: 32 },
});