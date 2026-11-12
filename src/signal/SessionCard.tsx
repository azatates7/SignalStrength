// Ölçüm oturumu kartı: süre seç (1 / 5 / 10 dk), kaydı başlat, dolaşırken "Not ekle" ile yeri işaretle.
// Sonunda grafik, en zayıf / en güçlü / ortalama ve noktalara göre sıralama; XLSX / CSV dışa aktarma.
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '../i18n/Index';
import { shareRows } from '../speedtest/ExportHistory';
import { useTheme } from '../Theme';
import { Sparkline } from '../ui/Sparkline';
import { Button, Card, Chip, Note, Row } from '../ui/UI';
import { MAX_SESSION_SAMPLES, SESSION_DURATIONS, sessionRows, sessionStats, type SessionSample } from './Session';

export function SessionCard({ dbm, score, tech }: { dbm?: number | null; score: number; tech?: string }) {
  const { colors: c } = useTheme();
  const { t, upper } = useI18n();
  const [minutes, setMinutes] = useState<(typeof SESSION_DURATIONS)[number]>(5);
  const [samples, setSamples] = useState<SessionSample[]>([]);
  const [recording, setRecording] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [note, setNote] = useState<string>();
  const [exportError, setExportError] = useState(false);
  const latest = useRef({ dbm, score, tech, note });
  latest.current = { dbm, score, tech, note };

  // Saniyede bir örnek; süre dolunca kayıt durur. Arka planda örnek alınmaz.
  useEffect(() => {
    if (!recording) return;
    const limit = Math.min(minutes * 60, MAX_SESSION_SAMPLES);
    const id = setInterval(() => {
      const v = latest.current;
      if (v.dbm == null || AppState.currentState !== 'active') return;
      setSamples((s) => {
        const next = [...s, { t: Date.now(), dbm: v.dbm as number, score: v.score, tech: v.tech, note: v.note }];
        if (next.length >= limit) setRecording(false);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [recording, minutes]);

  const start = () => {
    setSamples([]);
    setNote(undefined);
    setExportError(false);
    setRecording(true);
  };
  const addNote = () => {
    const n = noteInput.trim();
    if (!n) return;
    setNote(n);
    setNoteInput('');
  };
  const exportAs = (format: 'xlsx' | 'csv') => {
    setExportError(false);
    shareRows(sessionRows(samples, t.session.columns), {
      fileBase: t.session.fileName,
      format,
      sheetName: t.session.sheet,
      dialogTitle: t.session.export,
      widths: [10, 8, 13, 12, 12, 18],
    }).catch(() => setExportError(true));
  };

  const stats = sessionStats(samples);
  const values = samples.map((s) => s.dbm);
  const fmt = (v: number) => `${Math.round(v)} dBm`;

  return (
    <Card title={t.session.title} desc={t.session.desc}>
      <View style={styles.chips}>
        {SESSION_DURATIONS.map((m) => (
          <Chip key={m} label={t.session.minutes(m)} selected={minutes === m} onPress={() => setMinutes(m)} disabled={recording} />
        ))}
      </View>

      <Button
        primary={!recording}
        label={recording ? `${t.session.stop} · ${t.session.recording(samples.length, minutes * 60)}` : t.session.start}
        onPress={recording ? () => setRecording(false) : start}
        disabled={!recording && dbm == null}
      />
      {!recording && dbm == null ? <Note>{t.session.noSignal}</Note> : null}

      {recording ? (
        <View style={styles.noteRow}>
          <TextInput
            value={noteInput}
            onChangeText={setNoteInput}
            onSubmitEditing={addNote}
            placeholder={t.session.notePlaceholder}
            placeholderTextColor={c.textFaint}
            style={[styles.input, { color: c.text, backgroundColor: c.background }]}
            returnKeyType="done"
            maxLength={30}
          />
          <View style={styles.noteButton}>
            <Button label={t.session.addNote} onPress={addNote} disabled={!noteInput.trim()} />
          </View>
        </View>
      ) : null}
      {recording && note ? <Note>{t.session.currentNote(note)}</Note> : null}

      {values.length >= 2 ? (
        <View style={styles.chart}>
          <Sparkline values={values} color={c.accent} gridColor={c.barOff} height={64} />
        </View>
      ) : null}

      {stats ? (
        <>
          <Note>{t.session.samples(stats.count)}</Note>
          <Row label={t.session.weakest} value={fmt(stats.minDbm)} />
          <Row label={t.session.strongest} value={fmt(stats.maxDbm)} />
          <Row label={t.session.average} value={`${fmt(stats.avgDbm)} · ${Math.round(stats.avgScore)}/100`} last={!stats.byNote.length} />
          {stats.byNote.length ? (
            <>
              <Text style={[styles.subTitle, { color: c.textMuted }]}>{upper(t.session.byNote)}</Text>
              {stats.byNote.map((n, i) => (
                <Row
                  key={n.note}
                  label={`${i + 1}. ${n.note}`}
                  value={`${fmt(n.avgDbm)} · ${Math.round(n.avgScore)}/100`}
                  sub={t.session.samples(n.count)}
                  last={i === stats.byNote.length - 1}
                />
              ))}
            </>
          ) : null}
          {!recording ? (
            <View style={styles.exportRow}>
              <Button label={`${t.session.export}: Excel (XLSX)`} onPress={() => exportAs('xlsx')} />
              <Button label="CSV" onPress={() => exportAs('csv')} />
            </View>
          ) : null}
          {exportError ? <Note>{t.session.exportFailed}</Note> : null}
        </>
      ) : null}
    </Card>
  );
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, marginTop: 6 },
  noteRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginTop: 10 },
  noteButton: { flexShrink: 0 },
  chart: { marginTop: 12 },
  subTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 12 },
  exportRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
});