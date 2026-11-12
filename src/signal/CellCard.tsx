// Baz istasyonu kartı. Konum izni yalnızca "Göster"e dokununca istenir (Wi-Fi adıyla aynı izin); konum servisi kapalıysa konum ayarlarına yönlendirilir. İzin varsa sekme açıkken 5 sn'de bir okunur.
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, PermissionsAndroid, StyleSheet, Text, View } from 'react-native';
import SignalStrength, { type CellInfo, type CellInfoResult } from '../../modules/signal-strength/Index';
import { useI18n } from '../i18n/Index';
import { useTheme } from '../Theme';
import { Button, Card, Note, Row } from '../ui/UI';
import { operatorName, sortCells, summarizeCell } from './Cell';

type Gate = 'checking' | 'needPermission' | 'denied' | 'blocked' | 'locationOff' | 'ready';
const FINE = PermissionsAndroid?.PERMISSIONS?.ACCESS_FINE_LOCATION; // Android dışında tanımsız

const locationOn = () => {
  try {
    return SignalStrength?.isLocationEnabled() ?? true;
  } catch {
    return true;
  }
};

export function CellCard({ active }: { active: boolean }) {
  const { t } = useI18n();
  const [gate, setGate] = useState<Gate>('checking');
  const [result, setResult] = useState<CellInfoResult>();

  const check = useCallback(async () => {
    const granted = FINE ? await PermissionsAndroid.check(FINE).catch(() => false) : false;
    if (!granted) return setGate((g) => (g === 'blocked' || g === 'denied' ? g : 'needPermission'));
    setGate(locationOn() ? 'ready' : 'locationOff');
  }, []);

  // İlk açılış ve ayarlardan dönüş
  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [check]);

  // İzin hazırsa ve sekme açıksa 5 sn'de bir oku
  useEffect(() => {
    if (gate !== 'ready' || !active) return;
    let alive = true;
    const read = () => {
      if (AppState.currentState !== 'active') return;
      SignalStrength?.getCellInfo()
        .then((r) => {
          if (!alive) return;
          setResult(r);
          if (r.status === 'permission') setGate('needPermission');
        })
        .catch(() => alive && setResult({ status: 'error', cells: [] }));
    };
    read();
    const id = setInterval(read, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [gate, active]);

  const request = async () => {
    if (!FINE) return;
    const r = await PermissionsAndroid.request(FINE);
    if (r === PermissionsAndroid.RESULTS.GRANTED) setGate(locationOn() ? 'ready' : 'locationOff');
    else setGate(r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied');
  };
  const openLocation = () => {
    try {
      if (SignalStrength?.openLocationSettings()) return;
    } catch {
      // aşağıda uygulama ayarları
    }
    Linking.openSettings();
  };

  return (
    <Card title={t.cell.title} desc={gate === 'ready' ? undefined : t.cell.desc}>
      {gate === 'needPermission' || gate === 'denied' ? (
        <>
          {gate === 'denied' ? <Note>{t.cell.denied}</Note> : null}
          <Button primary label={t.cell.show} onPress={request} />
        </>
      ) : null}
      {gate === 'blocked' ? (
        <>
          <Note>{t.cell.blocked}</Note>
          <Button label={t.cell.openSettings} onPress={() => Linking.openSettings()} />
        </>
      ) : null}
      {gate === 'locationOff' ? (
        <>
          <Note>{t.cell.locationOff}</Note>
          <Button primary label={t.cell.turnOnLocation} onPress={openLocation} />
        </>
      ) : null}
      {gate === 'ready' ? <CellList result={result} /> : null}
    </Card>
  );
}

function CellList({ result }: { result?: CellInfoResult }) {
  const { colors: c } = useTheme();
  const { t, upper } = useI18n();
  if (!result) return <Note>{t.cell.loading}</Note>;
  if (result.status === 'unsupported') return <Note>{t.cell.unsupported}</Note>;
  const cells = sortCells(result.cells);
  if (result.status !== 'ok' || !cells.length) return <Note>{t.cell.none}</Note>;
  const serving = cells.filter((x) => x.registered);
  const neighbors = cells.filter((x) => !x.registered).slice(0, 8);
  return (
    <>
      {serving.map((cell, i) => (
        <ServingCell key={i} cell={cell} />
      ))}
      {neighbors.length ? (
        <>
          <Text style={[styles.subTitle, { color: c.textMuted }]}>{upper(t.cell.neighbors(cells.length - serving.length))}</Text>
          {neighbors.map((n, i) => {
            const s = summarizeCell(n);
            const sig = n.rsrp ?? n.dbm;
            return (
              <Row
                key={i}
                label={[s.tech, s.band, n.pci != null ? `PCI ${n.pci}` : undefined].filter(Boolean).join(' · ')}
                value={sig != null ? `${sig} dBm` : undefined}
                last={i === neighbors.length - 1}
              />
            );
          })}
        </>
      ) : null}
    </>
  );
}

function ServingCell({ cell }: { cell: CellInfo }) {
  const { colors: c } = useTheme();
  const { t, upper } = useI18n();
  const s = summarizeCell(cell);
  const freq = s.freqMhz !== undefined ? `${s.freqMhz} MHz` : undefined;
  const signal =
    cell.rsrp != null
      ? [`${cell.rsrp} dBm`, cell.rsrq != null ? `RSRQ ${cell.rsrq}` : undefined, cell.sinr != null ? `SINR ${cell.sinr}` : undefined]
          .filter(Boolean)
          .join(' · ')
      : cell.dbm != null
        ? `${cell.dbm} dBm`
        : undefined;
  return (
    <View style={styles.serving}>
      <Text style={[styles.subTitle, { color: c.textMuted }]}>{upper(t.cell.serving)}</Text>
      <Row label={t.cell.operator} value={operatorName(cell.mcc, cell.mnc)} sub={cell.mcc && cell.mnc ? `MCC ${cell.mcc} · MNC ${cell.mnc}` : undefined} />
      <Row label={t.cell.tech} value={s.tech + (cell.bandwidthKhz ? ` · ${cell.bandwidthKhz / 1000} MHz` : '')} />
      <Row label={t.cell.band} value={[s.band, freq].filter(Boolean).join(' · ') || undefined} />
      <Row label={t.cell.channel} value={cell.arfcn?.toString()} />
      <Row label={t.cell.pci} value={cell.pci?.toString()} />
      {s.enb !== undefined ? (
        <Row label={t.cell.station} value={`${s.enb} / ${s.sector}`} sub={cell.cellId != null ? `${t.cell.cellId} ${cell.cellId}` : undefined} />
      ) : (
        <Row label={t.cell.cellId} value={cell.cellId?.toString()} />
      )}
      <Row label={t.cell.tac} value={cell.tac?.toString()} />
      <Row label={t.cell.signal} value={signal} last={s.distanceM === undefined} />
      {s.distanceM !== undefined ? <Row label={t.cell.distance} value={t.cell.meters(s.distanceM)} sub={t.cell.distanceHint} last /> : null}
    </View>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  serving: { marginTop: 4 },
  subTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 12 },
});