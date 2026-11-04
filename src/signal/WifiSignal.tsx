// "Bağlantı Kontrol" sekmesinde, Wi-Fi'ye bağlıyken görünen Wi-Fi sinyal kartı.
import { StyleSheet, Text, View } from 'react-native';
import type { WifiSignal } from '../../modules/signal-strength';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { SignalChart } from '../ui/SignalChart';
import { METRICS, rate } from './metrics';
import { wifiBand, wifiChannel, wifiStandardLabel } from './wifi';

export function WifiCard({ signal, history }: { signal: WifiSignal; history: number[] }) {
  const { colors: c, tone } = useTheme();
  const { t } = useI18n();
  const r = rate(signal.rssi, METRICS.wifi.thresholds);
  const color = tone(r.color);
  const text = t.metrics.wifi;

  const band = wifiBand(signal.frequency);
  const channel = wifiChannel(signal.frequency);
  const speed =
    signal.rxLinkSpeed && signal.txLinkSpeed
      ? `↓ ${signal.rxLinkSpeed} · ↑ ${signal.txLinkSpeed} Mbps`
      : signal.linkSpeed
        ? `${signal.linkSpeed} Mbps`
        : undefined;
  const standard = wifiStandardLabel(signal.standard, signal.frequency);

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.header}>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: c.text }]}>{text.title}</Text>
          <Text style={[styles.tech, { color: c.textFaint }]}>{text.techName}</Text>
        </View>
        <View style={styles.valueBox}>
          <Text style={[styles.value, { color: c.text }]}>
            {signal.rssi} <Text style={[styles.unit, { color: c.textMuted }]}>dBm</Text>
          </Text>
          <Text style={[styles.badge, { color, borderColor: color }]} numberOfLines={1}>
            {t.rating[r.key]}
          </Text>
        </View>
      </View>

      <Row label={t.wifi.band} value={band} />
      <Row label={t.wifi.channel} value={channel?.toString()} />
      <Row label={t.wifi.linkSpeed} value={speed} sub={t.wifi.linkSpeedHint} />
      {standard ? <Row label={t.wifi.standard} value={standard} last /> : null}

      <SignalChart values={history} color={color} />

      <Text style={[styles.desc, { color: c.textSoft }]}>{text.description}</Text>
      <Text style={[styles.ideal, { color: c.textMuted }]}>{text.ideal}</Text>
    </View>
  );
}

function Row({ label, value, sub, last }: { label: string; value?: string; sub?: string; last?: boolean }) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomColor: c.barOff, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.rowLabel, { color: c.textMuted }]}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, { color: value ? c.text : c.textFaint }]}>{value ?? '—'}</Text>
        {sub ? <Text style={[styles.sub, { color: c.textFaint }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor (App.tsx'teki ölçüm kartlarıyla aynı görünüm)
const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4 },
  titleBox: { flexShrink: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  tech: { fontSize: 12, marginTop: 2 },
  valueBox: { alignItems: 'flex-end' },
  value: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 13, fontWeight: '400' },
  badge: { fontSize: 12, fontWeight: '600', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9 },
  rowLabel: { fontSize: 14 },
  rowRight: { alignItems: 'flex-end', flexShrink: 1 },
  rowValue: { fontSize: 14, fontWeight: '600', textAlign: 'right', fontVariant: ['tabular-nums'] },
  sub: { fontSize: 11, marginTop: 2, textAlign: 'right' },
  desc: { fontSize: 14, lineHeight: 20, marginTop: 12 },
  ideal: { fontSize: 13, marginTop: 8 },
});