// "Son 2 dakika" sinyal grafiği: çizgi + en düşük / en yüksek / şu anki değer.
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { Sparkline } from './Sparkline';

export function SignalChart({ values, color }: { values: number[]; color: string }) {
  const { colors: c } = useTheme();
  const { t } = useI18n();
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.textMuted }]}>{t.signal.chartTitle}</Text>
        <Text style={[styles.range, { color: c.textFaint }]}>{t.signal.chartRange(min, max)}</Text>
      </View>
      <Sparkline values={values} color={color} gridColor={c.barOff} />
    </View>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', marginTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 },
  title: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  range: { fontSize: 12, fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
});