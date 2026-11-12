// Yeni kartların ortak parçaları: kart, başlık, satır, ikincil buton, seçenek düğmesi.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../Theme';

export function Card({ title, desc, children, style }: { title: string; desc?: string; children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.card }, style]}>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {desc ? <Text style={[styles.desc, { color: c.textSoft }]}>{desc}</Text> : null}
      {children}
    </View>
  );
}

export function Row({ label, value, sub, last }: { label: string; value?: string; sub?: string; last?: boolean }) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomColor: c.barOff, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      <View style={styles.right}>
        <Text style={[styles.value, { color: value ? c.text : c.textFaint }]} selectable>
          {value ?? '—'}
        </Text>
        {sub ? <Text style={[styles.sub, { color: c.textFaint }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export function Button({ label, onPress, disabled, primary }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? c.accent : c.background, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
      ]}
      accessibilityRole="button"
    >
      <Text style={[styles.buttonText, { color: primary ? c.onAccent : c.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, disabled }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, { backgroundColor: selected ? c.accent : c.background, opacity: disabled ? 0.5 : 1 }]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, { color: selected ? c.onAccent : c.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Note({ children, center }: { children: ReactNode; center?: boolean }) {
  const { colors: c } = useTheme();
  return <Text style={[styles.note, center && styles.center, { color: c.textFaint }]}>{children}</Text>;
}

// Yalnızca yerleşim; renkler temadan geliyor
export const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  desc: { fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9 },
  label: { fontSize: 14, flexShrink: 1 },
  right: { alignItems: 'flex-end', flexShrink: 1 },
  value: { fontSize: 14, fontWeight: '600', textAlign: 'right', fontVariant: ['tabular-nums'] },
  sub: { fontSize: 11, marginTop: 2, textAlign: 'right' },
  button: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', marginTop: 10, flexGrow: 1 },
  buttonText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 14, fontWeight: '600' },
  note: { fontSize: 12, marginTop: 8 },
  center: { textAlign: 'center' },
});