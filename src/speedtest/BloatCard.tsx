// src/speedtest/BloatCard.tsx
// "Yük altında gecikme" kartı: test bitince indirme / yükleme sırasındaki ping ve A+…F notu.
// Ölçüm yapılamadıysa (native modül yok, test çok kısa) kart hiç görünmez.
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { useTheme } from '../Theme';
import { Card, Row } from '../ui/UI';
import { bloatLevel, bufferbloat } from './Bufferbloat';
import type { SpeedResult } from './Cloudflare';
import { formatMs } from './Format';

const COLOR = { good: '#22c55e', fair: '#f59e0b', poor: '#ef4444' } as const;

export function BloatCard({ result }: { result: Partial<SpeedResult> }) {
  const { colors: c, tone } = useTheme();
  const { t } = useI18n();
  const bloat = bufferbloat(result);
  if (!bloat) return null;
  const level = bloatLevel(bloat.grade);
  const color = tone(COLOR[level]);
  const row = (loaded?: number, inc?: number) =>
    loaded === undefined ? undefined : `${formatMs(loaded)} ms (${t.bloat.inc(Math.round(inc ?? 0))})`;

  return (
    <Card title={t.bloat.title} desc={t.bloat.desc}>
      <View
        style={styles.gradeRow}
        accessible
        accessibilityLabel={`${t.bloat.grade}: ${bloat.grade}. ${t.bloat[level]}`}
      >
        <View style={[styles.badge, { borderColor: color }]}>
          <Text style={[styles.grade, { color }]} maxFontSizeMultiplier={1.2}>
            {bloat.grade}
          </Text>
        </View>
        <Text style={[styles.verdict, { color: c.textSoft }]}>{t.bloat[level]}</Text>
      </View>
      <Row label={t.bloat.idle} value={result.pingMs !== undefined ? `${formatMs(result.pingMs)} ms` : undefined} />
      {result.loadedDownMs !== undefined ? (
        <Row label={t.bloat.down} value={row(result.loadedDownMs, bloat.downIncreaseMs)} last={result.loadedUpMs === undefined} />
      ) : null}
      {result.loadedUpMs !== undefined ? <Row label={t.bloat.up} value={row(result.loadedUpMs, bloat.upIncreaseMs)} last /> : null}
    </Card>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6, marginBottom: 6 },
  badge: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  grade: { fontSize: 22, fontWeight: '800' },
  verdict: { flex: 1, fontSize: 13, lineHeight: 19 },
});