// "Sinyal kötü mü?": mobil ağ ayarları ve uçak modu sayfalarına kısayol.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import SignalStrength from '../../modules/signal-strength/Index';
import { useI18n } from '../i18n/Index';
import { Button, Card, Note } from '../ui/UI';

export function ShortcutsCard() {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const open = (kind: 'mobile' | 'airplane') => {
    let ok = false;
    try {
      ok = SignalStrength?.openSystemSettings(kind) ?? false;
    } catch {
      ok = false;
    }
    setFailed(!ok);
  };
  return (
    <Card title={t.shortcuts.title} desc={t.shortcuts.desc}>
      <View style={styles.row}>
        <Button label={t.shortcuts.mobile} onPress={() => open('mobile')} />
        <Button label={t.shortcuts.airplane} onPress={() => open('airplane')} />
      </View>
      {failed ? <Note>{t.shortcuts.failed}</Note> : null}
    </Card>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' } });