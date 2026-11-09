// "Bu hız neye yeter?" kartı: test bitince sonucun günlük kullanımdaki karşılığı.
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n/Index';
import { useTheme } from '../Theme';
import { secondsPerGigabyte, usageVerdicts, type UsageInput, type Verdict } from './Usage';

const ICON: Record<Verdict, string> = { ok: '✓', maybe: '~', no: '✕' };
const COLOR: Record<Verdict, string> = { ok: '#22c55e', maybe: '#f59e0b', no: '#ef4444' };

export function UsageCard({ result }: { result: UsageInput }) {
  const { colors: c, tone } = useTheme();
  const { t } = useI18n();
  const down1gb = secondsPerGigabyte(result.downloadMbps);
  const up1gb = secondsPerGigabyte(result.uploadMbps);

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <Text style={[styles.title, { color: c.text }]}>{t.usage.title}</Text>
      {usageVerdicts(result).map(({ key, verdict }) => (
        <View key={key} style={[styles.row, { borderBottomColor: c.barOff }]}>
          <Text style={[styles.label, { color: c.textSoft }]}>{t.usage[key]}</Text>
          <Text style={[styles.verdict, { color: tone(COLOR[verdict]) }]}>
            {ICON[verdict]} {t.usage[verdict]}
          </Text>
        </View>
      ))}
      {down1gb !== undefined ? (
        <View style={[styles.row, { borderBottomColor: c.barOff }]}>
          <Text style={[styles.label, { color: c.textSoft }]}>{t.usage.download1gb}</Text>
          <Text style={[styles.value, { color: c.text }]}>{t.usage.duration(down1gb)}</Text>
        </View>
      ) : null}
      {up1gb !== undefined ? (
        <View style={[styles.row, styles.last]}>
          <Text style={[styles.label, { color: c.textSoft }]}>{t.usage.upload1gb}</Text>
          <Text style={[styles.value, { color: c.text }]}>{t.usage.duration(up1gb)}</Text>
        </View>
      ) : null}
      <Text style={[styles.note, { color: c.textFaint }]}>{t.usage.note}</Text>
    </View>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  last: { borderBottomWidth: 0 },
  label: { fontSize: 14, flexShrink: 1 },
  verdict: { fontSize: 14, fontWeight: '700' },
  value: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  note: { fontSize: 12, marginTop: 8 },
});