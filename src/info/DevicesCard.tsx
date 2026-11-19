// src/info/DevicesCard.tsx
// "Ağdaki cihazlar": Wi-Fi ağındaki cihazları tarar (~15 sn, yalnızca dokununca). Önceki taramada
// görülmeyenler "Yeni" olarak işaretlenir; bilinen cihaz anahtarları telefonda saklanır.
// Mantık devices.ts'te, tarama native tarafta (LanScanner.kt).
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import SignalStrength, { type LanScanResult } from '../../modules/signal-strength';
import { useI18n } from '../i18n';
import { useTheme } from '../Theme';
import { Button, Card, Note, Row } from '../ui/UI';
import { haptic } from '../ui/Haptics';
import { KNOWN_KEY, describeDevices, mergeKnown, parseKnown, type Device } from './Devices';

function loadKnown(): string[] | undefined {
  try {
    return parseKnown(SignalStrength?.getStoredString?.(KNOWN_KEY));
  } catch {
    return undefined;
  }
}
function saveKnown(keys: string[]) {
  try {
    SignalStrength?.setStoredString?.(KNOWN_KEY, JSON.stringify(keys));
  } catch {
    // Kaydedilemese de liste ekranda kalır
  }
}

export function DevicesCard() {
  const { colors: c, tone } = useTheme();
  const { t } = useI18n();
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<LanScanResult['status']>();
  const [devices, setDevices] = useState<Device[]>();
  const [truncated, setTruncated] = useState(false);

  const scan = async () => {
    if (!SignalStrength?.scanLan) return setStatus('error');
    setScanning(true);
    try {
      const r = await SignalStrength.scanLan();
      setStatus(r.status);
      if (r.status === 'ok') {
        const known = loadKnown();
        const list = describeDevices(r.devices, known);
        setDevices(list);
        setTruncated(r.truncated);
        saveKnown(mergeKnown(known, list));
        haptic(list.some((d) => d.isNew) ? 'error' : 'success');
      }
    } catch {
      setStatus('error');
    } finally {
      setScanning(false);
    }
  };

  const fresh = devices?.filter((d) => d.isNew).length ?? 0;
  return (
    <Card title={t.devices.title} desc={t.devices.desc}>
      {status === 'noWifi' ? <Note>{t.devices.noWifi}</Note> : null}
      {status === 'error' ? <Note>{t.devices.failed}</Note> : null}

      {devices ? (
        <>
          <Text style={[styles.summary, { color: fresh ? tone('#f59e0b') : c.textSoft }]}>{t.devices.found(devices.length, fresh)}</Text>
          {devices.map((d, i) => (
            <Row
              key={`${d.ip}-${d.key}`}
              label={d.name ?? (d.kind !== 'unknown' ? t.devices.kind[d.kind] : t.devices.unknownName)}
              value={d.ip}
              sub={[d.isNew ? `● ${t.devices.isNew}` : undefined, d.name && d.kind !== 'unknown' ? t.devices.kind[d.kind] : undefined]
                .filter(Boolean)
                .join(' · ') || undefined}
              last={i === devices.length - 1}
            />
          ))}
          {truncated ? <Note>{t.devices.truncated}</Note> : null}
        </>
      ) : null}

      <View style={styles.buttons}>
        <Button primary={!devices} label={scanning ? t.devices.scanning : devices ? t.devices.rescan : t.devices.scan} onPress={scan} disabled={scanning} />
        {scanning ? <ActivityIndicator color={c.textMuted} /> : null}
      </View>
      <Note>{t.devices.note}</Note>
    </Card>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  summary: { fontSize: 13, fontWeight: '600', marginTop: 4, marginBottom: 2 },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});