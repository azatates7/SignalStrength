// src/speedtest/SpeedTestScreen.tsx
// "Hız Testi" sekmesi: bağlantı bilgisi, ping / indirme / yükleme ölçümü.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NetworkInfo } from '../../modules/signal-strength';
import { AppFooter } from '../AppFooter';
import { useI18n, type Lang, type Strings } from '../i18n';
import { cityName } from '../i18n/strings';
import { techLabel } from '../signal/levels';
import { rate, type Rating } from '../signal/metrics';
import { useTheme } from '../theme';
import {
  CancelToken,
  TestCancelled,
  fetchMeta,
  runSpeedTest,
  toErrorInfo,
  type ConnectionMeta,
  type Phase,
  type SpeedErrorInfo,
  type SpeedResult,
} from './cloudflare';
import { MAX_TESTS, recordStart, waitMs } from './rateLimit';
import { useCellularName, useNetwork, useWifiName, type WifiNameState } from './useNetwork';

// Kotalı bağlantıda (mobil veri) yön başına en fazla bu kadar veri harcanır
const METERED_LIMIT = 50e6;
const UNMETERED_LIMIT = 300e6;

// Durum etiketleri: [Mükemmel, İyi, Orta] alt sınırları; altı "Zayıf"
const rateDownload = (mbps: number) => rate(mbps, [100, 25, 5]);
const rateUpload = (mbps: number) => rate(mbps, [50, 10, 2]);
const ratePing = (ms: number) => rate(-ms, [-20, -50, -100]); // Ping'de düşük değer iyidir

type Status = 'idle' | 'running' | 'done' | 'error';

/**
 * active: sekme şu an görünür mü. Sekme açıldığında test kendiliğinden başlar;
 * sağlayıcı bilgisi de yalnızca sekme açıkken alınır.
 */
export function SpeedTestScreen({ active }: { active: boolean }) {
  const { colors: c, tone } = useTheme();
  const { t, lang, locale } = useI18n();
  const { info } = useNetwork();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<SpeedErrorInfo>();
  const [lastTestAt, setLastTestAt] = useState<number>(); // Son tamamlanan testin zamanı
  const [meta, setMeta] = useState<ConnectionMeta>();
  const [metaFailed, setMetaFailed] = useState(false);
  const [phase, setPhase] = useState<Phase>();
  const [liveMbps, setLiveMbps] = useState<number>();
  const [values, setValues] = useState<Partial<SpeedResult>>({});
  const tokenRef = useRef<CancelToken | undefined>(undefined);
  const [waitSec, setWaitSec] = useState(0); // Deneme sınırı dolduysa kalan süre
  // Mobil veride bu bağlantıda en az bir test başlatıldı mı (başlatılınca veri uyarısı kalkar)
  const [meteredTested, setMeteredTested] = useState(false);
  const autoPending = useRef(false);
  const prevType = useRef(info.type);

  // Ekrandan çıkılırsa / uygulama kapanırsa devam eden testi durdur
  useEffect(() => () => tokenRef.current?.cancel(), []);

  const online = info.connected;

  // Sekme açıkken servis sağlayıcı ve sunucu bilgisini al (tek küçük istek, ~1 KB).
  // Bağlantı değişince (Wi-Fi ↔ mobil) yeniden alınır.
  useEffect(() => {
    setMeta(undefined);
    setMetaFailed(false);
  }, [info.type]);
  useEffect(() => {
    if (!active || !online || meta || status === 'running') return;
    let alive = true;
    fetchMeta()
      .then((m) => alive && (setMeta(m), setMetaFailed(false)))
      .catch(() => alive && setMetaFailed(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, online, info.type, meta]);

  // Deneme sınırı dolduysa geri sayım
  useEffect(() => {
    if (waitSec <= 0) return;
    const id = setInterval(() => setWaitSec(Math.ceil(waitMs() / 1000)), 1000);
    return () => clearInterval(id);
  }, [waitSec > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Otomatik test: sekme açılınca, bağlantı tipi değişince (Wi-Fi ↔ mobil) ve bağlantı geri
  // gelince test kendiliğinden başlar. "autoPending" bekleyen bir otomatik test olduğunu tutar;
  // bağlantı hazır olunca (internet var, test sürmüyor, deneme sınırı dolmamış) çalıştırılır.
  useEffect(() => {
    if (active) autoPending.current = true;
  }, [active]);

  // Bağlantı tipi değişince eski test geçersiz olur: durdur. Bağlantı koptuysa değerleri temizle;
  // yeni bir bağlantı geldiyse (bağlantı yok → Wi-Fi da dahil) otomatik testi beklemeye al.
  useEffect(() => {
    const prev = prevType.current;
    prevType.current = info.type;
    if (prev === info.type) return;
    tokenRef.current?.cancel();
    tokenRef.current = undefined; // Durdurulan testin geç gelen sonuçları ekrana yazılmasın
    setPhase(undefined);
    setLiveMbps(undefined);
    setMeteredTested(false); // Yeni bağlantıda mobil veri uyarısı yeniden gösterilir
    if (info.type === 'none') {
      setValues({});
      setError(undefined);
      setStatus('idle');
      return;
    }
    setStatus((s) => (s === 'running' ? 'idle' : s));
    autoPending.current = true;
  }, [info.type]);

  // Bekleyen otomatik testi koşullar uygun olduğunda başlat. Bağlantı geri gelirken Android önce
  // "ağ var, internet yok" sonra "internet var" bildirebildiği için internetin gelmesi de beklenir.
  useEffect(() => {
    if (!autoPending.current || !active || !online || status === 'running' || waitSec > 0) return;
    autoPending.current = false;
    // Mobil veride (kotalı bağlantı) test kendiliğinden başlamaz; kullanıcı uyarıyı görüp kendisi başlatır
    if (info.metered) return;
    start(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, online, info.type, status, waitSec]);

  async function start(auto = false) {
    // 1 dakikada en fazla 3 test. Otomatik testse süre dolunca kendiliğinden başlar.
    const wait = waitMs();
    if (wait > 0) {
      if (auto) autoPending.current = true;
      setWaitSec(Math.ceil(wait / 1000));
      return;
    }
    recordStart();
    setWaitSec(0);
    tokenRef.current?.cancel(); // Önceki test sürüyorsa durdur
    const token = new CancelToken();
    tokenRef.current = token;
    // Bu test yerine yenisi başlatıldıysa eski testin sonuçları ekrana yazılmaz
    const current = () => tokenRef.current === token;
    setStatus('running');
    if (info.metered) setMeteredTested(true);
    setError(undefined);
    setValues({});
    setLiveMbps(undefined);
    setPhase('meta');
    try {
      // Servis sağlayıcı ve sunucu bilgisi; alınamazsa test yine de yapılır
      const m = await fetchMeta().catch(() => undefined);
      if (!current()) return;
      setMeta(m);
      setMetaFailed(!m);
      const result = await runSpeedTest(
        token,
        (p) => {
          if (!current()) return;
          setPhase(p.phase);
          if (p.mbps !== undefined) setLiveMbps(p.mbps);
          if (p.pingMs !== undefined) setValues((v) => ({ ...v, pingMs: p.pingMs }));
          if (p.partial) {
            setValues((v) => ({ ...v, ...p.partial }));
            setLiveMbps(undefined);
          }
        },
        info.metered ? METERED_LIMIT : UNMETERED_LIMIT,
      );
      if (!current()) return;
      setValues(result);
      setStatus('done');
      setLastTestAt(Date.now());
    } catch (e) {
      if (!current()) return;
      if (e instanceof TestCancelled) {
        setStatus('idle');
      } else {
        setError(toErrorInfo(e));
        setStatus('error');
        setLastTestAt(Date.now());
      }
    } finally {
      if (current()) {
        setPhase(undefined);
        setLiveMbps(undefined);
      }
    }
  }

  const running = status === 'running';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ConnectionCard info={info} meta={meta} metaFailed={metaFailed} />

      {/* Ana gösterge: test sırasında canlı hız, bitince indirme hızı */}
      <View style={[styles.gauge, { backgroundColor: c.card }]}>
        <Text style={[styles.gaugeLabel, { color: c.textMuted }]}>
          {running && phase
            ? t.phase[phase]
            : status === 'done'
              ? t.speed.gaugeDownload
              : status === 'error'
                ? t.speed.gaugeFailed
                : !online
                  ? t.speed.noInternet
                  : waitSec > 0
                    ? t.speed.waitGauge(waitSec)
                    : t.speed.tapToStart}
        </Text>
        <Text style={[styles.gaugeValue, { color: c.text }]}>
          {running
            ? phase === 'ping' || phase === 'meta'
              ? formatMs(values.pingMs)
              : formatMbps(liveMbps, lang)
            : formatMbps(values.downloadMbps, lang)}
          <Text style={[styles.gaugeUnit, { color: c.textMuted }]}>
            {running && (phase === 'ping' || phase === 'meta') ? ' ms' : ' Mbps'}
          </Text>
        </Text>
        {running ? <ActivityIndicator color={c.textMuted} style={styles.spinner} /> : null}
      </View>

      <View style={styles.tiles}>
        <ResultTile
          title={t.speed.ping}
          value={formatMs(values.pingMs)}
          unit="ms"
          rating={status === 'done' && values.pingMs !== undefined ? ratePing(values.pingMs) : undefined}
          active={running && phase === 'ping'}
          sub={values.jitterMs !== undefined ? `±${formatMs(values.jitterMs)} ms` : undefined}
        />
        <ResultTile
          title={t.speed.download}
          value={formatMbps(values.downloadMbps, lang)}
          unit="Mbps"
          rating={status === 'done' && values.downloadMbps !== undefined ? rateDownload(values.downloadMbps) : undefined}
          active={running && phase === 'download'}
        />
        <ResultTile
          title={t.speed.upload}
          value={formatMbps(values.uploadMbps, lang)}
          unit="Mbps"
          rating={status === 'done' && values.uploadMbps !== undefined ? rateUpload(values.uploadMbps) : undefined}
          active={running && phase === 'upload'}
          sub={values.uploadError ? t.speed.notMeasured : undefined}
        />
      </View>

      {/* Mobil veri bilgilendirmesi: test başlatılana kadar görünür */}
      {online && info.metered && !meteredTested ? (
        <View style={[styles.infoBox, { backgroundColor: c.card, borderLeftColor: tone('#f59e0b') }]}>
          <Text style={[styles.infoTitle, { color: c.text }]}>{t.speed.meteredTitle}</Text>
          <Text style={[styles.infoText, { color: c.textSoft }]}>
            {t.speed.meteredBody(Math.round((METERED_LIMIT * 2) / 1e6))}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={running ? () => tokenRef.current?.cancel() : () => start()}
        disabled={!running && (!online || waitSec > 0)}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: running || !online || waitSec > 0 ? c.segment : c.accent, opacity: pressed ? 0.8 : 1 },
        ]}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, { color: running || !online || waitSec > 0 ? c.textMuted : c.onAccent }]}>
          {running
            ? t.speed.stop
            : waitSec > 0
              ? t.speed.wait(waitSec)
              : status === 'done' || status === 'error'
                ? t.speed.retest
                : t.speed.start}
        </Text>
      </Pressable>
      {lastTestAt && !running ? (
        <Text style={[styles.note, { color: c.textMuted }]}>{t.speed.lastTest(formatDateTime(lastTestAt, locale))}</Text>
      ) : null}
      {waitSec > 0 && !running ? (
        <Text style={[styles.note, { color: c.textMuted }]}>{t.speed.rateLimit(MAX_TESTS)}</Text>
      ) : null}

      {status === 'error' && error ? (
        <Text style={[styles.note, { color: c.textSoft }]}>{t.speed.failed(formatError(error, t))}</Text>
      ) : null}
      {values.uploadError ? (
        <Text style={[styles.note, { color: c.textSoft }]}>{t.speed.uploadFailed(formatError(values.uploadError, t))}</Text>
      ) : null}
      {status === 'done' && values.bytesUsed ? (
        <Text style={[styles.note, { color: c.textMuted }]}>{t.speed.dataUsed(Math.round(values.bytesUsed / 1e6))}</Text>
      ) : null}


      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Explain title={t.speed.ping} text={t.speed.explainPing} />
        <Explain title={t.speed.download} text={t.speed.explainDownload} />
        <Explain title={t.speed.upload} text={t.speed.explainUpload} last />
      </View>

      <Text style={[styles.source, { color: c.textFaint }]}>{t.speed.source}</Text>
      <AppFooter style={styles.version} />
    </ScrollView>
  );
}

function ConnectionCard({
  info,
  meta,
  metaFailed,
}: {
  info: NetworkInfo;
  meta?: ConnectionMeta;
  metaFailed: boolean;
}) {
  const { colors: c, tone } = useTheme();
  const { t, lang } = useI18n();
  const wifi = useWifiName(info);
  const cell = useCellularName(info);
  // Durum yalnızca iki türlü: internete bağlı / bağlantı yok
  const hasInternet = info.connected && info.validated;
  const dot = hasInternet ? '#22c55e' : '#ef4444';
  const statusText = hasInternet ? t.conn.connected : t.net.none;
  // Mobil ağda operatör adı SIM'den gelir ve teknolojiyle yazılır (ör. "Turkcell · 4G (LTE)");
  // Wi-Fi'de Cloudflare'in verdiği ağ bilgisinden
  const operator = cell.operator ?? meta?.isp;
  const isp =
    info.type === 'cellular'
      ? operator && [operator, cell.technology && techLabel(cell.technology, t.common.unknown)].filter(Boolean).join(' · ')
      : meta?.isp;
  const ispDetail = meta?.asn ? `AS${meta.asn}${meta.ispRaw && meta.ispRaw !== isp ? ` · ${meta.ispRaw}` : ''}` : undefined;
  const pending = metaFailed ? t.conn.failed : info.connected ? t.conn.loading : '—';
  const server = meta?.serverCode
    ? `Cloudflare · ${cityName(meta.serverCode, lang) ?? meta.serverCity ?? meta.serverCode} (${meta.serverCode})`
    : undefined;

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.connHeader}>
        <View style={[styles.dot, { backgroundColor: tone(dot) }]} />
        <Text style={[styles.connType, { color: c.text }]} numberOfLines={1}>
          {statusText}
        </Text>
      </View>
      <Row label={t.conn.type} value={t.net[info.type]} />
      {info.type === 'wifi' ? <WifiNameRow {...wifi} /> : null}
      <Row label={t.conn.isp} value={isp} sub={ispDetail} placeholder={pending} />
      <Row label={t.conn.server} value={server} placeholder={pending} last />
    </View>
  );
}

const wifiStateText = (state: WifiNameState, t: Strings) => (state === 'loading' ? t.conn.reading : undefined);

// Android, Wi-Fi adını yalnızca konum izni varsa veriyor; izin ancak kullanıcı isterse sorulur
function WifiNameRow({
  ssid,
  state,
  requestPermission,
  retry,
  openSettings,
}: ReturnType<typeof useWifiName>) {
  const { colors: c } = useTheme();
  const { t } = useI18n();
  const action =
    state === 'needPermission' || state === 'denied'
      ? { label: t.conn.show, onPress: requestPermission, hint: t.conn.locationHint }
      : state === 'blocked'
        ? { label: t.conn.openSettings, onPress: openSettings, hint: t.conn.locationHint }
        : state === 'unavailable'
          ? // İzin var ama ad gelmedi: büyük ihtimalle konum servisi kapalı
            { label: t.conn.retry, onPress: retry, hint: t.conn.locationOffHint }
          : undefined;

  return (
    <View style={[styles.row, { borderBottomColor: c.barOff, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.rowLabel, { color: c.textMuted }]}>{t.conn.wifiName}</Text>
      {action ? (
        <View style={styles.wifiAction}>
          <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.rowValue, { color: c.accent }]}>{action.label}</Text>
          </Pressable>
          <Text style={[styles.wifiHint, { color: c.textFaint }]}>{action.hint}</Text>
        </View>
      ) : (
        <Text style={[styles.rowValue, { color: ssid ? c.text : c.textFaint }]} numberOfLines={2}>
          {ssid ?? wifiStateText(state, t) ?? '—'}
        </Text>
      )}
    </View>
  );
}

function Row({
  label,
  value,
  sub,
  placeholder,
  last,
}: {
  label: string;
  value?: string;
  sub?: string; // Değerin altında küçük ek bilgi
  placeholder?: string;
  last?: boolean;
}) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomColor: c.barOff, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.rowLabel, { color: c.textMuted }]}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, { color: value ? c.text : c.textFaint }]} numberOfLines={2}>
          {value ?? placeholder ?? '—'}
        </Text>
        {value && sub ? (
          <Text style={[styles.wifiHint, { color: c.textFaint }]} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ResultTile({
  title,
  value,
  unit,
  rating,
  active,
  sub,
}: {
  title: string;
  value: string;
  unit: string;
  rating?: Rating;
  active?: boolean;
  sub?: string;
}) {
  const { colors: c, tone } = useTheme();
  const { t } = useI18n();
  const color = rating ? tone(rating.color) : undefined;
  return (
    <View style={[styles.tile, { backgroundColor: c.card, borderColor: active ? c.textMuted : 'transparent' }]}>
      {/* Dar ekranlarda uzun kelimeler (Download, Excellent) bölünmesin: tek satır, gerekirse küçülür */}
      <Text style={[styles.tileTitle, { color: c.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {title}
      </Text>
      <Text style={[styles.tileValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.tileUnit, { color: c.textMuted }]}>{unit}</Text>
      {rating && color ? (
        <Text
          style={[styles.badge, { color, borderColor: color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {t.rating[rating.key]}
        </Text>
      ) : null}
      {sub ? <Text style={[styles.tileSub, { color: c.textFaint }]}>{sub}</Text> : null}
    </View>
  );
}

function Explain({ title, text, last }: { title: string; text: string; last?: boolean }) {
  const { colors: c } = useTheme();
  return (
    <View style={!last && styles.explainGap}>
      <Text style={[styles.explainTitle, { color: c.text }]}>{title}</Text>
      <Text style={[styles.explainText, { color: c.textSoft }]}>{text}</Text>
    </View>
  );
}

// 10'un altındaki hızlarda bir ondalık basamak; Türkçede ondalık ayırıcı virgül
function formatMbps(v: number | undefined, lang: Lang) {
  if (v === undefined || !Number.isFinite(v)) return '—';
  if (v >= 10) return String(Math.round(v));
  const s = v.toFixed(1);
  return lang === 'tr' ? s.replace('.', ',') : s;
}

// Ör. "30 Eki 2026 14:05" / "30 Oct 2026, 14:05"
function formatDateTime(ts: number, locale: string) {
  try {
    return new Date(ts).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 16).replace('T', ' ');
  }
}

function formatError(e: SpeedErrorInfo, t: Strings) {
  switch (e.code) {
    case 'connection':
      return t.errors.connection;
    case 'timeout':
      return t.errors.timeout;
    case 'rejected': {
      const size = !e.bytes ? '?' : e.bytes >= 1e6 ? `${e.bytes / 1e6} MB` : `${e.bytes / 1e3} KB`;
      return t.errors.rejected(e.phase === 'upload' ? t.speed.upload : t.speed.download, size, e.status ?? 0);
    }
    default:
      return e.message ?? t.common.error;
  }
}

function formatMs(v?: number) {
  if (v === undefined || !Number.isFinite(v)) return '—';
  return String(Math.round(v));
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, paddingBottom: 32 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  connHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  connType: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10 },
  rowLabel: { fontSize: 14 },
  rowRight: { alignItems: 'flex-end', flexShrink: 1 },
  wifiAction: { alignItems: 'flex-end', flexShrink: 1 },
  wifiHint: { fontSize: 11, marginTop: 2, textAlign: 'right' },
  rowValue: { fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  gauge: { borderRadius: 14, paddingVertical: 24, alignItems: 'center', marginBottom: 12 },
  gaugeLabel: { fontSize: 14 },
  gaugeValue: { fontSize: 56, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  gaugeUnit: { fontSize: 20, fontWeight: '400' },
  spinner: { marginTop: 8 },
  tiles: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tile: { flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1.5 },
  tileTitle: { fontSize: 13, fontWeight: '600' },
  tileValue: { fontSize: 24, fontWeight: '700', marginTop: 6, fontVariant: ['tabular-nums'] },
  tileUnit: { fontSize: 12 },
  tileSub: { fontSize: 11, marginTop: 6, textAlign: 'center' },
  badge: { fontSize: 12, fontWeight: '600', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 8, overflow: 'hidden', maxWidth: '100%' },
  infoBox: { borderRadius: 14, borderLeftWidth: 4, padding: 14, marginBottom: 12 },
  infoTitle: { fontSize: 14, fontWeight: '700' },
  infoText: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  button: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  buttonText: { fontSize: 17, fontWeight: '700' },
  note: { fontSize: 13, textAlign: 'center', marginBottom: 8, lineHeight: 18 },
  explainGap: { marginBottom: 12 },
  explainTitle: { fontSize: 14, fontWeight: '600' },
  explainText: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  source: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  version: { marginTop: 8 },
});