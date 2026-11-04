// Sayfa altındaki "Sinyal Ölçer v?.?.?" ve gizlilik politikası bağlantısı (uygulama içinde açılır).
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { appFooter } from './appInfo';
import { usePrivacyPolicy } from './privacy/PrivacyPolicy';
import { useI18n } from './i18n';
import { useTheme } from './theme';

export function AppFooter({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors: c } = useTheme();
  const { t } = useI18n();
  const privacy = usePrivacyPolicy();
  return (
    <View style={[styles.wrap, style]}>
      <Text style={[styles.text, { color: c.textFaint }]}>{appFooter(t.appName)}</Text>
      <Pressable
        onPress={privacy.open}
        hitSlop={8}
        accessibilityRole="link"
      >
        <Text style={[styles.text, styles.link, { color: c.textMuted }]}>{t.privacy}</Text>
      </Pressable>
    </View>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, marginTop: 16 },
  text: { fontSize: 12, textAlign: 'center' },
  link: { textDecorationLine: 'underline' },
});