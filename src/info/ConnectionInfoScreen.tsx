// "Bağlantı Bilgisi" sekmesi: yerel IP, modem (ağ geçidi) IP, dış IP, DNS, statik IP, Wi-Fi sinyali ve VPN durumu.
// Yerel bilgiler internet kullanmadan Android'den okunur; dış IP, sekme açıkken Cloudflare'in meta isteğinden (~1 KB, hız testi sekmesindekiyle aynı) alınır.
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import SignalStrength, { type IpInfo } from '../../modules/signal-strength/Index';
import { AppFooter } from '../AppFooter';
import { useI18n, type Strings } from '../i18n/Index';
import { fetchMeta } from '../speedtest/Cloudflare';
import { useNetwork } from '../speedtest/UseNetwork';
import { WifiCard } from '../signal/WifiCard';
import { NetTestCard } from './NetTestCard';
import { useSampleHistory } from '../signal/UseSampleHistory';
import { useWifiSignal } from '../signal/UseWifiSignal';
import { useTheme } from '../Theme';

function readIpInfo(): IpInfo {
  try {
    return SignalStrength?.getIpInfo() ?? { available: false };
  } catch {
    return { available: false };
  }
}

function staticText(info: IpInfo, t: Strings) {
  switch (info.assignment) {
    case 'static':
      return t.ipinfo.staticYes;
    case 'dhcp':
      return t.ipinfo.staticNo;
    case 'carrier':
      return t.ipinfo.staticCarrier;
    default:
      return undefined;
  }
}

export function ConnectionInfoScreen({ active }: { active: boolean }) {
  const { colors: c, tone } = useTheme();
  const { t, upper } = useI18n();
  const { info } = useNetwork();
  const [ip, setIp] = useState<IpInfo>(readIpInfo);
  const [publicIp, setPublicIp] = useState<string>();
  const [publicFailed, setPublicFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const connKey = `${info.type}${info.vpn ? '+vpn' : ''}`;
  // Wi-Fi'ye bağlıyken Wi-Fi sinyali (2 sn'de bir okunur) ve son 2 dakikanın grafiği
  const wifi = useWifiSignal(info.type === 'wifi');
  const wifiHistory = useSampleHistory(wifi?.rssi);

  // Ağ değişince (Wi-Fi ↔ mobil, VPN aç/kapa) yerel bilgiler yeniden okunur, dış IP sıfırlanır
  useEffect(() => {
    setIp(readIpInfo());
    setPublicIp(undefined);
    setPublicFailed(false);
  }, [connKey, info.connected]);

  // Dış IP: yalnızca sekme açıkken ve internet varken, ağ başına bir kez
  useEffect(() => {
    if (!active || !info.connected || publicIp) return;
    let alive = true;
    fetchMeta()
      .then((m) => alive && (setPublicIp(m.clientIp), setPublicFailed(!m.clientIp)))
      .catch(() => alive && setPublicFailed(true));
    return () => {
      alive = false;
    };
  }, [active, info.connected, connKey, publicIp, reload]);

  // Sekmeye her gelişte yerel bilgiler tazelenir (ucuz, internet kullanmaz)
  useEffect(() => {
    if (active) setIp(readIpInfo());
  }, [active]);

  const refresh = useCallback(() => {
    setIp(readIpInfo());
    setPublicIp(undefined);
    setPublicFailed(false);
    setReload((n) => n + 1);
  }, []);

  const connected = info.connected && ip.available;
  const none = connected ? undefined : t.net.none;
  const pending = publicFailed ? t.conn.failed : info.connected ? t.conn.loading : t.net.none;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.cardTitle, { color: c.text }]}>{t.ipinfo.ipTitle}</Text>
        <Row label={t.conn.type} value={t.net[info.type]} />
        <Row label={t.ipinfo.localIp} value={connected ? (ip.ipv4 ?? undefined) : undefined} placeholder={none} />
        {connected && ip.ipv6 ? <Row label={t.ipinfo.ipv6} value={ip.ipv6} /> : null}
        <Row
          label={t.ipinfo.gateway}
          value={connected ? (ip.gateway ?? (info.type === 'cellular' ? t.ipinfo.noGateway : undefined)) : undefined}
          placeholder={none}
        />
        <Row
          label={t.ipinfo.publicIp}
          value={publicIp}
          sub={info.vpn ? t.ipinfo.publicIpVpn : undefined}
          placeholder={pending}
        />
        <Row label={t.ipinfo.dns} value={connected && ip.dns?.length ? ip.dns.join('\n') : undefined} placeholder={none} />
        <Row
          label={t.ipinfo.staticIp}
          value={connected ? staticText(ip, t) : undefined}
          sub={t.ipinfo.staticHint}
          placeholder={connected ? t.common.unknown : none}
          last
        />
      </View>

      {wifi ? <WifiCard signal={wifi} history={wifiHistory} /> : null}

      <View style={[styles.card, { backgroundColor: c.card }]}>
        <View style={styles.vpnHeader}>
          <View style={[styles.dot, { backgroundColor: tone(info.vpn ? '#f59e0b' : '#22c55e') }]} />
          <Text style={[styles.cardTitle, styles.vpnTitle, { color: c.text }]}>
            {t.ipinfo.vpn}: {info.vpn ? t.ipinfo.vpnOn : t.ipinfo.vpnOff}
          </Text>
        </View>
        {info.vpn ? <Text style={[styles.note, { color: c.textSoft }]}>{t.ipinfo.vpnNote}</Text> : null}
      </View>

      <Pressable
        onPress={refresh}
        style={({ pressed }) => [styles.button, { backgroundColor: c.segment, opacity: pressed ? 0.7 : 1 }]}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, { color: c.text }]}>{t.ipinfo.refresh}</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: c.textMuted }]}>{upper(t.signal.tools)}</Text>
      <NetTestCard mode="dns" online={info.connected} systemDns={connected ? (ip.dns ?? []) : []} />
      <NetTestCard mode="service" online={info.connected} />

      <AppFooter />
    </ScrollView>
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
  sub?: string;
  placeholder?: string;
  last?: boolean;
}) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomColor: c.barOff, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.rowLabel, { color: c.textMuted }]}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, { color: value ? c.text : c.textFaint }]} selectable>
          {value ?? placeholder ?? '—'}
        </Text>
        {sub ? <Text style={[styles.sub, { color: c.textFaint }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, paddingBottom: 32 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10 },
  rowLabel: { fontSize: 14, flexShrink: 0, maxWidth: '45%' },
  rowRight: { alignItems: 'flex-end', flexShrink: 1 },
  rowValue: { fontSize: 14, fontWeight: '600', textAlign: 'right', fontVariant: ['tabular-nums'] },
  sub: { fontSize: 11, marginTop: 2, textAlign: 'right' },
  vpnHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 1, marginTop: 16, marginBottom: 10 },
  vpnTitle: { marginBottom: 0 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  note: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  button: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  buttonText: { fontSize: 16, fontWeight: '700' },
});