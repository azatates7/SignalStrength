// Gizlilik politikası uygulamanın içinde, açılır pencere (pop-up) olarak gösterilir:
// - İlk açılışta kendiliğinden açılır. "Bir daha gösterme" işaretlenip kapatılırsa bir daha kendiliğinden açılmaz (seçim telefonda saklanır); işaretlenmezse sonraki açılışta yine gelir.
// - Sayfa altındaki "Gizlilik politikası" bağlantısıyla her zaman açılabilir.
// Metin: src/privacy/policy.json (Türkçe / İngilizce). Web sayfası da aynı dosyadan üretilir
// (scripts/build-privacy-page.mjs → docs/privacy/index.html).
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import SignalStrength from '../../modules/signal-strength/Index';
import { useI18n } from '../i18n/Index';
import { useTheme } from '../Theme';
import POLICY from './policy.json';

type Block = { p?: string; h2?: string; h3?: string; list?: string[]; table?: string[][] };
type Policy = { title: string; meta: string[][]; blocks: Block[] };

const PrivacyContext = createContext<{ open: () => void }>({ open: () => {} });

/** Sayfa altındaki bağlantı için: usePrivacyPolicy().open() */
export const usePrivacyPolicy = () => useContext(PrivacyContext);

function readDismissed(): boolean {
  try {
    return SignalStrength?.getPrivacyNoticeDismissed() ?? false;
  } catch {
    return false;
  }
}

export function PrivacyPolicyProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(readDismissed);
  const [visible, setVisible] = useState(() => !dismissed); // ilk açılışta kendiliğinden
  const [dontShow, setDontShow] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = () => {
    if (!dismissed && dontShow) {
      try {
        SignalStrength?.setPrivacyNoticeDismissed(true);
      } catch {
        // kaydedilemezse bir sonraki açılışta yine gösterilir; önemli değil
      }
      setDismissed(true);
    }
    setVisible(false);
  };
  const value = useMemo(() => ({ open }), [open]);

  return (
    <PrivacyContext.Provider value={value}>
      {children}
      <PrivacyDialog
        visible={visible}
        showCheckbox={!dismissed}
        dontShow={dontShow}
        onToggle={() => setDontShow((v) => !v)}
        onClose={close}
      />
    </PrivacyContext.Provider>
  );
}

function PrivacyDialog({
  visible,
  showCheckbox,
  dontShow,
  onToggle,
  onClose,
}: {
  visible: boolean;
  showCheckbox: boolean;
  dontShow: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { colors: c } = useTheme();
  const { t, lang } = useI18n();
  const policy = (POLICY as Record<string, Policy>)[lang];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose} // Android geri tuşu
    >
      <View style={[styles.backdrop, { backgroundColor: c.overlay }]}>
        <View style={[styles.dialog, { backgroundColor: c.card }]}>
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={[styles.title, { color: c.text }]}>{policy.title}</Text>
            {policy.meta.map(([k, v]) => (
              <Text key={k} style={[styles.meta, { color: c.textSoft }]}>
                <Text style={styles.bold}>{k}: </Text>
                <Inline text={v} />
              </Text>
            ))}
            {policy.blocks.map((b, i) => (
              <PolicyBlock key={i} block={b} />
            ))}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: c.segment }]}>
            {showCheckbox ? (
              <Pressable
                onPress={onToggle}
                style={styles.check}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: dontShow }}
                hitSlop={8}
              >
                <View
                  style={[
                    styles.box,
                    { borderColor: dontShow ? c.accent : c.textMuted, backgroundColor: dontShow ? c.accent : 'transparent' },
                  ]}
                >
                  {dontShow ? <Text style={[styles.tick, { color: c.onAccent }]}>✓</Text> : null}
                </View>
                <Text style={[styles.checkText, { color: c.textSoft }]}>{t.privacyDialog.dontShowAgain}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.button, { backgroundColor: c.accent, opacity: pressed ? 0.8 : 1 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, { color: c.onAccent }]}>{t.privacyDialog.ok}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PolicyBlock({ block: b }: { block: Block }) {
  const { colors: c } = useTheme();
  if (b.h2) return <Text style={[styles.h2, { color: c.text, borderTopColor: c.segment }]}>{b.h2}</Text>;
  if (b.h3) return <Text style={[styles.h3, { color: c.text }]}>{b.h3}</Text>;
  if (b.list)
    return (
      <View style={styles.block}>
        {b.list.map((item, i) => (
          <View key={i} style={styles.li}>
            <Text style={[styles.p, { color: c.textSoft }]}>•</Text>
            <Text style={[styles.p, styles.liText, { color: c.textSoft }]}>
              <Inline text={item} />
            </Text>
          </View>
        ))}
      </View>
    );
  if (b.table)
    return (
      <View style={styles.block}>
        {b.table.map((row, i) => (
          <View key={i} style={[styles.tr, { borderBottomColor: c.segment }]}>
            {row.map((cell, j) => (
              <Text key={j} style={[styles.td, i === 0 && styles.bold, { color: i === 0 ? c.textMuted : c.textSoft }]}>
                {cell}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  return (
    <Text style={[styles.p, styles.block, { color: c.textSoft }]}>
      <Inline text={b.p ?? ''} />
    </Text>
  );
}

// **kalın**, https://… bağlantıları ve e-posta adresleri (dokununca e-posta uygulaması açılır)
const TOKEN = /(\*\*[^*]+\*\*|https?:\/\/[^\s]+[^\s.,;:)]|[\w.+-]+@[\w-]+\.[\w.]+[a-z])/gi;

function Inline({ text }: { text: string }) {
  const { colors: c } = useTheme();
  const { t } = useI18n();
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (i % 2 === 0) return part;
        if (part.startsWith('**')) {
          return (
            <Text key={i} style={styles.bold}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        const url = part.includes('@') && !part.startsWith('http')
          ? `mailto:${part}?subject=${encodeURIComponent(t.appName)}`
          : part;
        return (
          <Text
            key={i}
            style={[styles.link, { color: c.accent }]}
            onPress={() => Linking.openURL(url).catch(() => {})}
            accessibilityRole="link"
          >
            {part}
          </Text>
        );
      })}
    </>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 16, paddingVertical: 48 },
  dialog: { borderRadius: 16, maxHeight: '100%', overflow: 'hidden' },
  body: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  meta: { fontSize: 14, lineHeight: 21 },
  h2: { fontSize: 16, fontWeight: '700', marginTop: 18, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  h3: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  block: { marginTop: 8 },
  p: { fontSize: 14, lineHeight: 21 },
  li: { flexDirection: 'row', gap: 8, marginTop: 4 },
  liText: { flex: 1 },
  tr: { flexDirection: 'row', gap: 12, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  td: { flex: 1, fontSize: 13, lineHeight: 19 },
  bold: { fontWeight: '700' },
  link: { textDecorationLine: 'underline' },
  footer: { padding: 16, gap: 14, borderTopWidth: StyleSheet.hairlineWidth },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tick: { fontSize: 14, fontWeight: '800', lineHeight: 16 },
  checkText: { fontSize: 15 },
  button: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
});