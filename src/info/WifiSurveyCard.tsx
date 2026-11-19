// "Ev Wi-Fi haritası": kullanıcı oda seçer (hazır adlar ya da kendi yazdığı), "Ölç"e dokunur; ~3 sn Wi-Fi sinyali, 4 ping ve kısa bir indirme ölçümü yapılır. Sonuçlar oda kutucukları olarak sinyal düzeyine göre renklendirilir, altında öneriler çıkar. Ölçümler telefonda saklanır.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import SignalStrength from '../../modules/signal-strength';
import { useI18n } from '../i18n';
import { CancelToken, quickDownload } from '../speedtest/Cloudflare';
import { formatDateTime, formatMbps } from '../speedtest/Format';
import { useTheme } from '../Theme';
import { Button, Card, Chip, Note } from '../ui/UI';
import { haptic } from '../ui/Haptics';
import { SURVEY_KEY, median, parseSurvey, removeRoom, roomBand, rssiLevel, surveyAdvice, upsertRoom, type RoomMeasure, type SignalLevel } from './WifiSurvey';

const LEVEL_COLOR: Record<SignalLevel, string> = { good: '#22c55e', fair: '#84cc16', weak: '#f59e0b', bad: '#ef4444' };
const SIGNAL_SAMPLES = 6;
const SIGNAL_INTERVAL_MS = 500;
const PINGS = 4;
const PING_URL = 'https://speed.cloudflare.com/__down?bytes=0';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Phase = 'signal' | 'ping' | 'speed';

function load(): RoomMeasure[] {
  try {
    return parseSurvey(SignalStrength?.getStoredString?.(SURVEY_KEY));
  } catch {
    return [];
  }
}
function save(list: RoomMeasure[]) {
  try {
    SignalStrength?.setStoredString?.(SURVEY_KEY, list.length ? JSON.stringify(list) : null);
  } catch {
    // Kaydedilemese de ekranda kalır
  }
}

/** Tek oda ölçümü: sinyal (ortanca), ping (ortanca), kısa indirme */
async function measureRoom(room: string, token: CancelToken, onPhase: (p: Phase) => void): Promise<RoomMeasure> {
  const mod = SignalStrength;
  onPhase('signal');
  const rssi: number[] = [];
  let frequency: number | undefined;
  let link: number | undefined;
  for (let i = 0; i < SIGNAL_SAMPLES && !token.cancelled; i++) {
    const w = mod?.getWifiSignal?.();
    if (w) {
      rssi.push(w.rssi);
      frequency = w.frequency ?? frequency;
      link = w.linkSpeed ?? link;
    }
    await sleep(SIGNAL_INTERVAL_MS);
  }
  const r = median(rssi);
  if (r === undefined) throw new Error('no wifi');

  onPhase('ping');
  const pings: number[] = [];
  for (let i = 0; i < PINGS && !token.cancelled; i++) {
    const ms = await mod?.pingOnce?.(PING_URL, 'https://speed.cloudflare.com/', 2000).catch(() => null);
    if (ms != null) pings.push(ms);
  }

  onPhase('speed');
  const down = token.cancelled ? undefined : await quickDownload(token).catch(() => undefined);

  return {
    room: room.trim(),
    at: Date.now(),
    rssi: Math.round(r),
    frequency,
    linkMbps: link,
    downMbps: down !== undefined && Number.isFinite(down) ? Math.round(down * 10) / 10 : undefined,
    pingMs: pings.length ? Math.round(median(pings)!) : undefined,
  };
}

export function WifiSurveyCard() {
  const { colors: c, tone } = useTheme();
  const { t, lang, locale } = useI18n();
  const [list, setList] = useState<RoomMeasure[]>(load);
  const [room, setRoom] = useState('');
  const [phase, setPhase] = useState<Phase>();
  const [failed, setFailed] = useState(false);
  const token = useRef<CancelToken | null>(null);

  // Ekrandan kalkarsa süren ölçümü durdur
  useEffect(() => () => token.current?.cancel(), []);

  const measuring = phase !== undefined;
  const measure = async () => {
    if (!room.trim() || measuring) return;
    const tk = new CancelToken();
    token.current = tk;
    setFailed(false);
    try {
      const m = await measureRoom(room, tk, setPhase);
      if (tk.cancelled) return;
      const next = upsertRoom(list, m);
      setList(next);
      save(next);
      haptic('success');
    } catch {
      if (!tk.cancelled) {
        setFailed(true);
        haptic('error');
      }
    } finally {
      setPhase(undefined);
      token.current = null;
    }
  };

  const remove = (name: string) => {
    const next = removeRoom(list, name);
    setList(next);
    save(next);
  };

  const advice = surveyAdvice(list);
  const names = (xs: RoomMeasure[]) => xs.map((x) => x.room).join(', ');
  const measured = new Set(list.map((x) => x.room.toLocaleLowerCase('tr')));

  return (
    <Card title={t.survey.title} desc={t.survey.desc}>
      {/* Oda seçimi */}
      <View style={styles.chips}>
        {t.survey.rooms.map((r) => (
          <Chip
            key={r}
            label={measured.has(r.toLocaleLowerCase('tr')) ? `✓ ${r}` : r}
            selected={room === r}
            onPress={() => setRoom(r)}
            disabled={measuring}
          />
        ))}
      </View>
      <TextInput
        value={t.survey.rooms.includes(room) ? '' : room}
        onChangeText={setRoom}
        placeholder={t.survey.roomPlaceholder}
        placeholderTextColor={c.textFaint}
        style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.barOff }]}
        editable={!measuring}
        maxLength={30}
        accessibilityLabel={t.survey.roomPlaceholder}
      />
      <View style={styles.buttons}>
        <Button
          primary
          label={
            measuring
              ? phase === 'signal'
                ? t.survey.phaseSignal
                : phase === 'ping'
                  ? t.survey.phasePing
                  : t.survey.phaseSpeed
              : room.trim()
                ? t.survey.measure(room.trim())
                : t.survey.pickRoom
          }
          onPress={measure}
          disabled={measuring || !room.trim()}
        />
        {measuring ? <Button label={t.survey.cancel} onPress={() => token.current?.cancel()} /> : null}
      </View>
      {failed ? <Note>{t.survey.failed}</Note> : null}

      {/* Oda kutucukları */}
      {list.length ? (
        <View style={styles.grid}>
          {list.map((m) => {
            const level = rssiLevel(m.rssi);
            const color = tone(LEVEL_COLOR[level]);
            const band = roomBand(m);
            return (
              <Pressable
                key={m.room}
                onPress={() => !measuring && setRoom(m.room)}
                style={[styles.tile, { backgroundColor: c.background, borderColor: color }]}
                accessibilityRole="button"
                accessibilityLabel={`${m.room}: ${m.rssi} dBm, ${t.survey.level[level]}. ${t.survey.tile(
                  m.downMbps !== undefined ? formatMbps(m.downMbps, lang) : undefined,
                  m.pingMs !== undefined ? String(m.pingMs) : undefined,
                )}`}
              >
                <Text style={[styles.tileRoom, { color: c.text }]} numberOfLines={1}>
                  {m.room}
                </Text>
                <Text style={[styles.tileDbm, { color }]} maxFontSizeMultiplier={1.2}>
                  {m.rssi} <Text style={styles.tileUnit}>dBm</Text>
                </Text>
                <Text style={[styles.tileLevel, { color }]}>{t.survey.level[level]}</Text>
                <Text style={[styles.tileSub, { color: c.textMuted }]} numberOfLines={1}>
                  {t.survey.tile(m.downMbps !== undefined ? formatMbps(m.downMbps, lang) : undefined, m.pingMs !== undefined ? String(m.pingMs) : undefined)}
                </Text>
                {band ? <Text style={[styles.tileSub, { color: c.textFaint }]}>{band.replace('.', lang === 'tr' ? ',' : '.')} GHz</Text> : null}
                <Pressable onPress={() => !measuring && remove(m.room)} hitSlop={8} style={styles.tileRemove} accessibilityLabel={`${t.survey.remove}: ${m.room}`}>
                  <Text style={[styles.tileRemoveText, { color: c.textFaint }]}>✕</Text>
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Öneriler */}
      {advice.verdict !== 'empty' ? (
        <View style={styles.advice}>
          <Text style={[styles.verdict, { color: advice.verdict === 'allGood' ? tone('#22c55e') : tone('#f59e0b') }]}>
            {advice.verdict === 'allGood' ? t.survey.allGood : advice.verdict === 'mostWeak' ? t.survey.mostWeak : t.survey.someWeak(names(advice.weak))}
          </Text>
          {advice.weak.length && advice.best ? (
            <>
              <Note>{t.survey.adviceMove(advice.best.room)}</Note>
              <Note>{t.survey.adviceMesh}</Note>
            </>
          ) : null}
          {advice.slow.length ? <Note>{t.survey.adviceSlow(names(advice.slow))}</Note> : null}
          {advice.fallsTo24.length ? <Note>{t.survey.advice24(names(advice.fallsTo24))}</Note> : null}
          {advice.best ? (
            <Text style={[styles.when, { color: c.textFaint }]}>
              {t.survey.measuredAt(formatDateTime(Math.max(...list.map((x) => x.at)), locale))}
            </Text>
          ) : null}
        </View>
      ) : null}

      {list.length ? (
        <View style={styles.buttons}>
          <Button
            label={t.survey.clearAll}
            onPress={() => {
              setList([]);
              save([]);
            }}
            disabled={measuring}
          />
        </View>
      ) : null}
      <Note>{t.survey.data}</Note>
    </Card>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginTop: 10 },
  buttons: { flexDirection: 'row', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  tile: { width: '47%', flexGrow: 1, borderRadius: 12, borderWidth: 2, padding: 12 },
  tileRoom: { fontSize: 14, fontWeight: '700', paddingRight: 18 },
  tileDbm: { fontSize: 24, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
  tileUnit: { fontSize: 13, fontWeight: '500' },
  tileLevel: { fontSize: 12, fontWeight: '700' },
  tileSub: { fontSize: 12, marginTop: 2 },
  tileRemove: { position: 'absolute', top: 8, right: 10 },
  tileRemoveText: { fontSize: 14 },
  advice: { marginTop: 12 },
  verdict: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  when: { fontSize: 11, marginTop: 6 },
});