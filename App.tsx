import { Component, useRef, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from 'react-native';
import { useSignalStrength } from './src/signal/useSignalStrength';
import { BAR_COUNT, MAX_SCORE, qualityKey, techLabel, toScore } from './src/signal/levels';
import { METRICS, rate, type MetricInfo } from './src/signal/metrics';
import { SpeedTestScreen } from './src/speedtest/SpeedTestScreen';
import { ThemeProvider, useTheme } from './src/theme';
import { LanguageProvider, useI18n } from './src/i18n';
import { appFooter } from './src/appInfo';

type Tab = 'signal' | 'speed';
const TABS: Tab[] = ['signal', 'speed'];

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </LanguageProvider>
  );
}

function Root() {
  const { colors: c, isDark } = useTheme();
  const [tab, setTab] = useState<Tab>('signal');
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollViewInstance>(null);

  // Sekmeye dokununca ilgili sayfaya kaydır
  const goTo = (t: Tab) => {
    setTab(t);
    pager.current?.scrollTo({ x: TABS.indexOf(t) * width, animated: true });
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Header />
      <TabBar tab={tab} onChange={goTo} />
      {/* Sola / sağa kaydırarak sekme değiştirme. İki sayfa da bağlı kalır;
          sekme değişince devam eden hız testi kesilmez */}
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.tabPage}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setTab(TABS[Math.min(Math.max(i, 0), TABS.length - 1)]);
        }}
      >
        <View style={[styles.tabPage, { width }]}>
          <ErrorBoundary>
            <SignalScreen />
          </ErrorBoundary>
        </View>
        <View style={[styles.tabPage, { width }]}>
          <ErrorBoundary>
            <SpeedTestScreen active={tab === 'speed'} />
          </ErrorBoundary>
        </View>
      </ScrollView>
    </View>
  );
}

function Header() {
  const { colors: c, isDark, setMode } = useTheme();
  const { t, lang, toggleLang } = useI18n();
  return (
    <View style={[styles.header, { paddingTop: (RNStatusBar.currentHeight ?? 24) + 12 }]}>
      <Text style={[styles.appTitle, { color: c.text }]} numberOfLines={1}>
        {t.appName}
      </Text>
      <View style={styles.headerButtons}>
        {/* Dil: geçilecek dili gösterir (Türkçedeyken "EN", İngilizcedeyken "TR") */}
        <Pressable
          onPress={toggleLang}
          style={({ pressed }) => [styles.roundButton, { backgroundColor: c.segment, opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={t.header.switchLanguage}
          hitSlop={8}
        >
          <Text style={[styles.langText, { color: c.text }]}>{lang === 'tr' ? 'EN' : 'TR'}</Text>
        </Pressable>
        {/* Tema: tek dokunuş açık ↔ koyu, uzun basış telefonun temasına dön */}
        <Pressable
          onPress={() => setMode(isDark ? 'light' : 'dark')}
          onLongPress={() => setMode('system')}
          style={({ pressed }) => [styles.roundButton, { backgroundColor: c.segment, opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={isDark ? t.header.toLight : t.header.toDark}
          hitSlop={8}
        >
          <Text style={styles.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { colors: c } = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.segment, styles.tabBar, { backgroundColor: c.segment }]}>
      {TABS.map((key) => {
        const active = key === tab;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[styles.segmentItem, active && { backgroundColor: c.segmentActive }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, { color: active ? c.text : c.textMuted }]}>{t.tabs[key]}</Text>
          </Pressable>
        );
      })}
    </View>
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
      return <ErrorView detail={this.state.error.message} />;
    }
    return this.props.children;
  }
}

// Hata ekranı (sınıf bileşeni hook kullanamadığı için ayrı)
function ErrorView({ detail }: { detail?: string }) {
  const { t } = useI18n();
  return <Centered text={t.common.error} detail={detail} />;
}

function SignalScreen() {
  const reading = useSignalStrength();
  const { colors: c } = useTheme();
  const { t } = useI18n();

  if (Platform.OS !== 'android') {
    return <Centered text={t.signal.androidOnly} />;
  }
  if (!reading) return <Centered text={t.signal.reading} />;
  if (reading.reason === 'error') {
    return <ErrorView detail={reading.errorMessage} />;
  }
  if (!reading.available) {
    const reason =
      reading.reason === 'no_service'
        ? t.signal.noService
        : reading.reason === 'unsupported_os'
          ? t.signal.unsupportedOs
          : t.signal.noData;
    return <Centered text={reason} />;
  }

  const score = toScore(reading);
  const tech = reading.technology ?? 'UNKNOWN';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={[styles.tech, { color: c.textMuted }]}>
          {reading.operator ? `${reading.operator} · ` : ''}
          {techLabel(tech, t.common.unknown)}
        </Text>
        <Text style={[styles.dbm, { color: c.text }]}>
          {reading.dbm ?? '—'}
          <Text style={[styles.unit, { color: c.textMuted }]}> dBm</Text>
        </Text>
        <Bars score={score} />
        <Text style={[styles.quality, { color: c.textSoft }]}>
          {t.quality[qualityKey(score)]} · {score}/{MAX_SCORE}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: c.textMuted }]}>{t.signal.details}</Text>
      <MetricCard info={METRICS.rsrp} value={reading.rsrp} />
      <MetricCard info={METRICS.rsrq} value={reading.rsrq} />
      <MetricCard info={METRICS.sinr} value={reading.sinr} />
      <MetricCard info={METRICS.systemLevel} value={reading.systemLevel} bars={4} />

      <Text style={[styles.version, { color: c.textFaint }]}>{appFooter(t.appName)}</Text>
    </ScrollView>
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
  const { t } = useI18n();
  // 3G/2G'de bazı ölçümler gelmez; o kartlar gizlenir
  if (value == null) return null;
  const r = rate(value, info.thresholds);
  const text = t.metrics[info.key];
  const color = tone(r.color);
  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBox}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{text.title}</Text>
          <Text style={[styles.cardTech, { color: c.textFaint }]}>{text.techName}</Text>
        </View>
        <View style={styles.cardValueBox}>
          <View style={styles.cardValueRow}>
            {bars ? <MiniBars filled={value} total={bars} color={color} /> : null}
            <Text style={[styles.cardValue, { color: c.text }]}>
              {value} <Text style={[styles.cardUnit, { color: c.textMuted }]}>{info.unit}</Text>
            </Text>
          </View>
          <Text style={[styles.badge, { color, borderColor: color }]} numberOfLines={1}>
            {t.rating[r.key]}
          </Text>
        </View>
      </View>
      <Text style={[styles.cardDesc, { color: c.textSoft }]}>{text.description}</Text>
      <Text style={[styles.cardIdeal, { color: c.textMuted }]}>{text.ideal}</Text>
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

// Sekme içeriği yerine gösterilen durum / hata mesajı
function Centered({ text, detail }: { text: string; detail?: string }) {
  const { colors: c } = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.tabPage, styles.centered]}>
      <Text style={[styles.quality, { color: c.textSoft }]}>{text}</Text>
      {detail ? (
        <Text style={[styles.errorDetail, { color: c.textMuted }]} selectable>
          {detail}
        </Text>
      ) : null}
      <Text style={[styles.version, styles.versionCentered, { color: c.textFaint }]}>{appFooter(t.appName)}</Text>
    </View>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  appTitle: { fontSize: 22, fontWeight: '700', flexShrink: 1 },
  headerButtons: { flexDirection: 'row', gap: 10 },
  roundButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  langText: { fontSize: 14, fontWeight: '700' },
  themeIcon: { fontSize: 20 },
  tabBar: { marginHorizontal: 20, marginBottom: 8 },
  tabPage: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 20, paddingTop: 16, paddingBottom: 32 },
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
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  segmentText: { fontSize: 14, fontWeight: '600' },
  errorDetail: { fontSize: 13, textAlign: 'center', marginTop: 12 },
  version: { fontSize: 12, textAlign: 'center', marginTop: 16 },
  versionCentered: { position: 'absolute', bottom: 32 },
});