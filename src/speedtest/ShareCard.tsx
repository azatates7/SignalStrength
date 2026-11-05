// Paylaşılan resim: test sonucu kartı. Ekranın dışında çizilir, "Sonucu paylaş"a dokununca react-native-view-shot ile PNG'ye çevrilip expo-sharing ile paylaşılır, IP adresi ve Wi-Fi adı karta eklenmez.
import type { Ref } from 'react';
import { StyleSheet, Text, View, type ViewInstance } from 'react-native';
import { useI18n } from '../i18n/Index';
import { useTheme } from '../Theme';
import { formatDateTime, formatMbps } from './Format';
import type { HistoryEntry } from './History';

export const SHARE_CARD_WIDTH = 360;

export function ShareCard({ entry, viewRef }: { entry: HistoryEntry; viewRef: Ref<ViewInstance> }) {
  const { colors: c } = useTheme();
  const { t, lang, locale } = useI18n();
  const context = [entry.isp, t.net[entry.type] + (entry.vpn ? ' (VPN)' : '')].filter(Boolean).join(' · ');

  return (
    // Ekranda görünmez ama çizilir (collapsable={false}: Android görünümü ortadan kaldırmasın)
    <View style={styles.offscreen} pointerEvents="none">
      <View ref={viewRef} collapsable={false} style={[styles.card, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <Text style={[styles.app, { color: c.text }]}>{t.appName}</Text>
          <Text style={[styles.heading, { color: c.textMuted }]}>{t.speed.shareHeading}</Text>
        </View>

        <View style={[styles.main, { backgroundColor: c.card }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>{t.speed.download}</Text>
          <Text style={[styles.big, { color: c.text }]}>
            {formatMbps(entry.downloadMbps, lang)}
            <Text style={[styles.bigUnit, { color: c.textMuted }]}> Mbps</Text>
          </Text>
        </View>

        <View style={styles.tiles}>
          <View style={[styles.tile, { backgroundColor: c.card }]}>
            <Text style={[styles.label, { color: c.textMuted }]}>{t.speed.upload}</Text>
            <Text style={[styles.tileValue, { color: c.text }]}>
              {formatMbps(entry.uploadMbps, lang)}
              <Text style={[styles.tileUnit, { color: c.textMuted }]}> Mbps</Text>
            </Text>
          </View>
          <View style={[styles.tile, { backgroundColor: c.card }]}>
            <Text style={[styles.label, { color: c.textMuted }]}>{t.speed.ping}</Text>
            <Text style={[styles.tileValue, { color: c.text }]}>
              {Math.round(entry.pingMs)}
              <Text style={[styles.tileUnit, { color: c.textMuted }]}> ms</Text>
            </Text>
          </View>
        </View>

        <Text style={[styles.context, { color: c.textSoft }]}>{context}</Text>
        <Text style={[styles.footer, { color: c.textFaint }]}>
          {formatDateTime(entry.at, locale)} · Cloudflare
        </Text>
        <View style={[styles.accent, { backgroundColor: c.accent }]} />
      </View>
    </View>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -10000, top: 0 },
  card: { width: SHARE_CARD_WIDTH, padding: 20, paddingBottom: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  app: { fontSize: 20, fontWeight: '700' },
  heading: { fontSize: 14, fontWeight: '600' },
  main: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600' },
  big: { fontSize: 56, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bigUnit: { fontSize: 20, fontWeight: '500' },
  tiles: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  tile: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  tileValue: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: 2 },
  tileUnit: { fontSize: 14, fontWeight: '500' },
  context: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  footer: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  accent: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 },
});