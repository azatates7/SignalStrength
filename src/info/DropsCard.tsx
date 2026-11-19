// "Bağlantı kopmaları" kartı: uygulama açıkken internet gidip gelirse zamanı ve süresi.
// Mantık drops.ts'te; kayıt yalnızca bellekte. Uygulama arka plandayken izleme durur.
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import type { NetworkInfo } from '../../modules/signal-strength';
import { useI18n } from '../i18n';
import { formatDateTime } from '../speedtest/Format';
import { useTheme } from '../Theme';
import { Button, Card, Note, Row } from '../ui/UI';
import { EMPTY_DROPS, dropTotals, pauseDrops, trackDrops, type DropState } from './Drops';

const time = (ts: number, locale: string) => {
  try {
    return new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return new Date(ts).toISOString().slice(11, 19);
  }
};

export function DropsCard({ info }: { info: NetworkInfo }) {
  const { colors: c, tone } = useTheme();
  const { t, locale } = useI18n();
  const [state, setState] = useState<DropState>(EMPTY_DROPS);
  const [now, setNow] = useState(Date.now());

  const infoRef = useRef(info);
  infoRef.current = info;

  // Her ağ değişikliğini işle (yalnızca uygulama öndeyken)
  useEffect(() => {
    if (AppState.currentState === 'active') setState((s) => trackDrops(s, info, Date.now()));
  }, [info]);

  // Arka plana geçince izlemeyi bırak; öne gelince mevcut durumla yeniden başla
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') setState(pauseDrops);
      else if (st === 'active') setState((s) => trackDrops(s, infoRef.current, Date.now()));
    });
    return () => sub.remove();
  }, []);

  // Süren kopmanın süresi canlı güncellensin
  useEffect(() => {
    if (!state.down) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.down]);

  const totals = dropTotals(state.drops);
  return (
    <Card title={t.drops.title} desc={t.drops.desc}>
      {state.down ? (
        <Text style={[styles.now, { color: tone('#ef4444') }]}>{t.drops.now(t.drops.duration(now - state.down.since))}</Text>
      ) : null}
      {state.watchingSince === undefined ? (
        <Note>{t.drops.watching}</Note>
      ) : !state.drops.length && !state.down ? (
        <Text style={[styles.ok, { color: tone('#22c55e') }]}>{t.drops.none(time(state.watchingSince, locale))}</Text>
      ) : null}

      {state.drops.length ? (
        <>
          <Text style={[styles.total, { color: c.textSoft }]}>{t.drops.total(totals.count, t.drops.duration(totals.totalMs))}</Text>
          {state.drops.slice(0, 20).map((d, i, list) => (
            <Row
              key={d.start}
              label={time(d.start, locale)}
              value={t.drops.duration(d.end - d.start)}
              sub={d.from !== d.to ? t.drops.switched(t.net[d.from], t.net[d.to]) : formatDateTime(d.start, locale)}
              last={i === list.length - 1}
            />
          ))}
          <View style={styles.buttons}>
            <Button label={t.drops.clear} onPress={() => setState((s) => ({ ...s, drops: [] }))} />
          </View>
        </>
      ) : null}
      <Note>{t.drops.note}</Note>
    </Card>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  now: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  ok: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  total: { fontSize: 13, marginTop: 6, marginBottom: 2 },
  buttons: { flexDirection: 'row' },
});