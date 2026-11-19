// "Wi-Fi kanal analizi" kartı. Yalnızca "Tara"ya dokununca tarar (Android sık taramayı sınırlar).
// Konum izni gerekir (Android kuralı; Wi-Fi adı ve baz istasyonu bilgisiyle aynı izin), izin yalnızca
// bu kartta dokununca istenir. Mantık wifiChannels.ts'te.
import { useState } from 'react';
import { Linking, PermissionsAndroid, StyleSheet, Text, View } from 'react-native';
import SignalStrength, { type WifiScanResult } from '../../modules/signal-strength';
import { useI18n } from '../i18n';
import { useTheme } from '../Theme';
import { Button, Card, Chip, Note, Row } from '../ui/UI';
import { analyzeWifi, isDfs, shouldSwitch, type Band, type BandSummary, type Located } from './WifiChannels';

const FINE = PermissionsAndroid?.PERMISSIONS?.ACCESS_FINE_LOCATION; // Android dışında tanımsız
const LIST_MAX = 12;
const CHANNELS_24 = Array.from({ length: 13 }, (_, i) => i + 1);

type Status = 'idle' | 'scanning' | 'denied' | 'blocked' | WifiScanResult['status'];

export function WifiChannelCard() {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<Extract<WifiScanResult, { status: 'ok' }>>();
  const [band, setBand] = useState<Band>();

  const scan = async () => {
    const mod = SignalStrength;
    if (!mod?.scanWifi) return setStatus('unsupported');
    setStatus('scanning');
    try {
      let r = await mod.scanWifi();
      if (r.status === 'permission' && FINE) {
        const p = await PermissionsAndroid.request(FINE);
        if (p !== PermissionsAndroid.RESULTS.GRANTED) {
          return setStatus(p === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied');
        }
        r = await mod.scanWifi();
      }
      if (r.status === 'ok') {
        setResult(r);
        // Varsayılan bant: bağlı olunan ağınki, yoksa en kalabalık olan
        const a = analyzeWifi(r.networks, r.connectedBssid);
        setBand((b) => b ?? a.current?.band ?? a.bands[0]?.band);
      }
      setStatus(r.status);
    } catch {
      setStatus('error');
    }
  };

  const openLocation = () => {
    try {
      if (SignalStrength?.openLocationSettings()) return;
    } catch {
      // aşağıda uygulama ayarları
    }
    Linking.openSettings();
  };

  const analysis = result ? analyzeWifi(result.networks, result.connectedBssid) : undefined;
  const summary = analysis?.bands.find((b) => b.band === band) ?? analysis?.bands[0];
  const scanning = status === 'scanning';

  return (
    <Card title={t.channels.title} desc={t.channels.desc}>
      {status === 'idle' ? <Note>{t.channels.needPermission}</Note> : null}
      {status === 'denied' ? <Note>{t.channels.denied}</Note> : null}
      {status === 'blocked' ? (
        <>
          <Note>{t.channels.denied}</Note>
          <Button label={t.channels.openSettings} onPress={() => Linking.openSettings()} />
        </>
      ) : null}
      {status === 'locationOff' ? (
        <>
          <Note>{t.channels.locationOff}</Note>
          <Button primary label={t.channels.openLocation} onPress={openLocation} />
        </>
      ) : null}
      {status === 'wifiOff' ? <Note>{t.channels.wifiOff}</Note> : null}
      {status === 'error' || status === 'unsupported' ? <Note>{t.channels.failed}</Note> : null}

      {analysis && summary ? (
        <>
          {analysis.bands.length > 1 ? (
            <View style={styles.bands}>
              {analysis.bands.map((b) => (
                <Chip key={b.band} label={t.channels.band(b.band)} selected={b.band === summary.band} onPress={() => setBand(b.band)} />
              ))}
            </View>
          ) : null}
          <ChannelBars summary={summary} current={analysis.current} />
          <Advice summary={summary} current={analysis.current} />
          <Text style={styles.spacer} />
          <NetworkList networks={summary.networks} total={result?.networks.length ?? 0} />
          {result?.throttled ? <Note>{t.channels.throttled}</Note> : null}
          <Note>{t.channels.howTo}</Note>
        </>
      ) : null}

      <View style={styles.buttons}>
        <Button
          primary={!result}
          label={scanning ? t.channels.scanning : result ? t.channels.rescan : status === 'idle' ? t.channels.scan : t.channels.allow}
          onPress={scan}
          disabled={scanning || status === 'blocked'}
        />
      </View>
    </Card>
  );
}

/** Kanal başına ağ sayısı çubukları: bağlı ağın kanalı vurgulu, önerilen kanal yeşil çerçeveli */
function ChannelBars({ summary, current }: { summary: BandSummary; current?: Located }) {
  const { colors: c, tone } = useTheme();
  const channels =
    summary.band === '2.4'
      ? CHANNELS_24.map((ch) => ({ channel: ch, count: summary.channels.find((x) => x.channel === ch)?.count ?? 0 }))
      : summary.channels;
  const max = Math.max(1, ...channels.map((x) => x.count));
  const mine = current?.band === summary.band ? current.channel : undefined;
  return (
    <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {channels.map(({ channel, count }) => {
        const isMine = channel === mine;
        const isBest = channel === summary.best && channel !== mine;
        return (
          <View key={channel} style={styles.barCol}>
            <Text style={[styles.barCount, { color: c.textFaint }]}>{count || ''}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(6, (count / max) * 100)}%`,
                    backgroundColor: isMine ? c.accent : count ? tone('#64748b') : c.barOff,
                    borderColor: isBest ? tone('#22c55e') : 'transparent',
                  },
                ]}
              />
            </View>
            <Text style={[styles.barLabel, { color: isMine ? c.text : c.textFaint, fontWeight: isMine ? '700' : '400' }]}>
              {channel}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Advice({ summary, current }: { summary: BandSummary; current?: Located }) {
  const { colors: c, tone } = useTheme();
  const { t } = useI18n();
  const mine = current?.band === summary.band ? current : undefined;
  const others = mine ? summary.networks.filter((n) => n.channel === mine.channel && n.bssid !== mine.bssid && n.ssid !== mine.ssid).length : 0;
  const switchIt = shouldSwitch(summary, mine);
  return (
    <View style={styles.advice}>
      {mine ? (
        <>
          <Row label={t.channels.yourNetwork} value={`${mine.ssid ?? t.channels.hidden} · ${t.channels.channel(mine.channel)}`} sub={t.channels.shared(others)} last />
          <Text style={[styles.adviceText, { color: switchIt ? tone('#f59e0b') : tone('#22c55e') }]}>
            {switchIt && summary.best !== undefined ? t.channels.suggest(summary.best) : t.channels.alreadyBest}
          </Text>
        </>
      ) : summary.best !== undefined ? (
        <Text style={[styles.adviceText, { color: c.textSoft }]}>{t.channels.bestFree(summary.best)}</Text>
      ) : null}
      {switchIt && summary.best !== undefined && isDfs(summary.best) ? <Note>{t.channels.dfs}</Note> : null}
    </View>
  );
}

function NetworkList({ networks, total }: { networks: Located[]; total: number }) {
  const { colors: c } = useTheme();
  const { t, upper } = useI18n();
  const list = networks.slice(0, LIST_MAX);
  return (
    <>
      <Text style={[styles.subTitle, { color: c.textMuted }]}>{upper(t.channels.networks(total))}</Text>
      {list.map((n, i) => (
        <Row
          key={`${n.bssid}-${i}`}
          label={n.ssid ?? t.channels.hidden}
          value={`${n.level} dBm`}
          sub={n.current ? `${t.channels.connected} · ${t.channels.net(n.channel, n.band)}` : t.channels.net(n.channel, n.band)}
          last={i === list.length - 1}
        />
      ))}
    </>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  bands: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 4 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 110, marginTop: 10 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barCount: { fontSize: 10, height: 14 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, borderWidth: 2 },
  barLabel: { fontSize: 10, marginTop: 3 },
  advice: { marginTop: 8 },
  adviceText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  spacer: { height: 4 },
  subTitle: { fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 2 },
  buttons: { flexDirection: 'row' },
});