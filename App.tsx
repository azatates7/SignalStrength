import { Component, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSignalStrength } from './src/signal/useSignalStrength';
import { BAR_COUNT, MAX_SCORE, TECH_LABEL, qualityLabel, toScore } from './src/signal/levels';
import { METRICS, rate, type MetricInfo } from './src/signal/metrics';
import { ThemeProvider, useTheme, type ThemeMode } from './src/theme';
import { expo } from './app.json';

// app.json'daki ad ve sürüm, ör. "Sinyal Ölçer" + "3.0.0" → "Sinyal Ölçer v3.0"
const APP_FOOTER = `${expo.name} v${expo.version.split('.').slice(0, 2).join('.')}`;

const REASONS: Record<string, string> = {
  no_service: 'Şebeke yok (SIM yok / uçak modu)',
  no_data: 'Sinyal bilgisi alınamadı',
  unsupported_os: 'Bu uygulama Android 9 ve üzeri sürümlerde çalışır',
};

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'Sistem' },
  { mode: 'light', label: 'Açık' },
  { mode: 'dark', label: 'Koyu' },
];

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <SignalScreen />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

// Ekran çizilirken oluşan bir JS hatası uygulamayı kapatmak yerine ekranda gösterilir
class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <Centered text="Bir hata oluştu" detail={this.state.error.message} />;
    }
    return this.props.children;
  }
}

function SignalScreen() {
  const reading = useSignalStrength();
  const { colors: c, isDark } = useTheme();

  if (Platform.OS !== 'android') {
    return <Centered text="Şu an yalnızca Android destekleniyor" />;
  }
  if (!reading) return <Centered text="Okunuyor…" />;
  if (reading.reason === 'error') {
    return <Centered text="Bir hata oluştu" detail={reading.errorMessage} />;
  }
  if (!reading.available) return <Centered text={REASONS[reading.reason ?? 'no_data']} />;

  const score = toScore(reading);
  const tech = reading.technology ?? 'UNKNOWN';

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={[styles.tech, { color: c.textMuted }]}>
            {reading.operator ? `${reading.operator} · ` : ''}
            {TECH_LABEL[tech]}
          </Text>
          <Text style={[styles.dbm, { color: c.text }]}>
            {reading.dbm ?? '—'}
            <Text style={[styles.unit, { color: c.textMuted }]}> dBm</Text>
          </Text>
          <Bars score={score} />
          <Text style={[styles.quality, { color: c.textSoft }]}>
            {qualityLabel(score)} · {score}/{MAX_SCORE}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>Detaylar</Text>
        <MetricCard info={METRICS.rsrp} value={reading.rsrp} />
        <MetricCard info={METRICS.rsrq} value={reading.rsrq} />
        <MetricCard info={METRICS.sinr} value={reading.sinr} />
        <MetricCard info={METRICS.systemLevel} value={reading.systemLevel} bars={4} />

        <ThemePicker />
        <Text style={[styles.version, { color: c.textFaint }]}>{APP_FOOTER}</Text>
      </ScrollView>
    </View>
  );
}

function ThemePicker() {
  const { mode, setMode, colors: c } = useTheme();
  return (
    <View style={styles.themeBox}>
      <Text style={[styles.sectionTitle, { color: c.textMuted }]}>Tema</Text>
      <View style={[styles.segment, { backgroundColor: c.segment }]}>
        {THEME_OPTIONS.map((o) => {
          const active = o.mode === mode;
          return (
            <Pressable
              key={o.mode}
              onPress={() => setMode(o.mode)}
              style={[styles.segmentItem, active && { backgroundColor: c.segmentActive }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segmentText, { color: active ? c.text : c.textMuted }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Bars({ score }: { score: number }) {
  const { colors: c, tone } = useTheme();
  const filled = Math.round(score / (MAX_SCORE / BAR_COUNT));
  return (
    <View style={styles.bars}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: 16 + i * 10 },
            { backgroundColor: i < filled ? tone(barColor(score)) : c.barOff },
          ]}
        />
      ))}
    </View>
  );
}

function barColor(score: number) {
  const p = score / MAX_SCORE;
  if (p <= 0.3) return '#ef4444';
  if (p <= 0.6) return '#f59e0b';
  return '#22c55e';
}

function MetricCard({
  info,
  value,
  bars,
}: {
  info: MetricInfo;
  value?: number | null;
  bars?: number; // Verilirse değerin yanında bu kadar kademeli küçük sinyal simgesi çizilir
}) {
  const { colors: c, tone } = useTheme();
  // 3G/2G'de bazı ölçümler gelmez; o kartlar gizlenir
  if (value == null) return null;
  const r = rate(value, info.thresholds);
  const color = tone(r.color);
  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBox}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{info.title}</Text>
          <Text style={[styles.cardTech, { color: c.textFaint }]}>{info.techName}</Text>
        </View>
        <View style={styles.cardValueBox}>
          <View style={styles.cardValueRow}>
            {bars ? <MiniBars filled={value} total={bars} color={color} /> : null}
            <Text style={[styles.cardValue, { color: c.text }]}>
              {value} <Text style={[styles.cardUnit, { color: c.textMuted }]}>{info.unit}</Text>
            </Text>
          </View>
          <Text style={[styles.badge, { color, borderColor: color }]}>{r.label}</Text>
        </View>
      </View>
      <Text style={[styles.cardDesc, { color: c.textSoft }]}>{info.description}</Text>
      <Text style={[styles.cardIdeal, { color: c.textMuted }]}>{info.ideal}</Text>
    </View>
  );
}

// Telefonun üst çubuğundaki gibi küçük kademeli sinyal simgesi
function MiniBars({ filled, total, color }: { filled: number; total: number; color: string }) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.miniBars}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.miniBar, { height: 6 + i * 4 }, { backgroundColor: i < filled ? color : c.barOff }]}
        />
      ))}
    </View>
  );
}

function Centered({ text, detail }: { text: string; detail?: string }) {
  const { colors: c, isDark } = useTheme();
  return (
    <View style={[styles.screen, styles.centered, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Text style={[styles.quality, { color: c.textSoft }]}>{text}</Text>
      {detail ? (
        <Text style={[styles.errorDetail, { color: c.textMuted }]} selectable>
          {detail}
        </Text>
      ) : null}
      <Text style={[styles.version, styles.versionCentered, { color: c.textFaint }]}>{APP_FOOTER}</Text>
    </View>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 20, paddingTop: 56, paddingBottom: 32 },
  hero: { alignItems: 'center', marginBottom: 28 },
  tech: { fontSize: 18, marginBottom: 8 },
  dbm: { fontSize: 64, fontWeight: '700' },
  unit: { fontSize: 22, fontWeight: '400' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 24 },
  bar: { width: 14, borderRadius: 3 },
  quality: { fontSize: 18, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardTitleBox: { flexShrink: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardTech: { fontSize: 12, marginTop: 2 },
  cardValueBox: { alignItems: 'flex-end' },
  cardValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 18 },
  miniBar: { width: 4, borderRadius: 1 },
  cardValue: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  cardUnit: { fontSize: 13, fontWeight: '400' },
  badge: { fontSize: 12, fontWeight: '600', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6, overflow: 'hidden' },
  cardDesc: { fontSize: 14, lineHeight: 20, marginTop: 12 },
  cardIdeal: { fontSize: 13, marginTop: 8 },
  themeBox: { marginTop: 16 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  segmentText: { fontSize: 14, fontWeight: '600' },
  errorDetail: { fontSize: 13, textAlign: 'center', marginTop: 12 },
  version: { fontSize: 12, textAlign: 'center', marginTop: 16 },
  versionCentered: { position: 'absolute', bottom: 32 },
});