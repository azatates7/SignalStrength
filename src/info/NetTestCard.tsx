// "DNS hız karşılaştırması" ve "Servislere gecikme" kartları (aynı bileşen, mode ile seçilir).
// Yalnızca kullanıcı başlatınca ve internet varken çalışır; sonuçlar saklanmaz.
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/Index';
import { Button, Card, Note, Row } from '../ui/UI';
import { dnsSuggestion, rankResults, runDnsTest, runServiceTest, type LatencyResult } from './NetTests';

export function NetTestCard({ mode, online, systemDns = [] }: { mode: 'dns' | 'service'; online: boolean; systemDns?: string[] }) {
  const { t } = useI18n();
  const [results, setResults] = useState<LatencyResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const cancelled = useRef(false);

  useEffect(() => () => void (cancelled.current = true), []);
  useEffect(() => {
    if (!online) cancelled.current = true;
  }, [online]);

  async function start() {
    cancelled.current = false;
    setResults([]);
    setStatus('running');
    const add = (r: LatencyResult) => setResults((xs) => [...xs, r]);
    try {
      if (mode === 'dns') await runDnsTest(systemDns, add, () => cancelled.current);
      else await runServiceTest(add, () => cancelled.current);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  const ranked = rankResults(results);
  const suggestion = mode === 'dns' && status === 'done' ? dnsSuggestion(results) : undefined;
  const hasSystem = results.some((r) => r.system && r.medianMs !== undefined);

  return (
    <Card
      title={mode === 'dns' ? t.nettest.dnsTitle : t.nettest.serviceTitle}
      desc={mode === 'dns' ? t.nettest.dnsDesc : t.nettest.serviceDesc}
    >
      {ranked.map((r, i) => (
        <Row
          key={`${r.name}-${r.detail ?? ''}`}
          label={`${i + 1}. ${r.system ? t.nettest.systemDns : r.name}`}
          value={r.medianMs !== undefined ? `${Math.round(r.medianMs)} ms` : t.nettest.noReply}
          sub={[r.detail, r.lost ? t.nettest.lost(r.lost, r.sent) : undefined].filter(Boolean).join(' · ') || undefined}
          last={i === ranked.length - 1}
        />
      ))}
      {status === 'done' && mode === 'dns' ? (
        <Note>{suggestion ? t.nettest.suggestion(suggestion.name, suggestion.privateDns) : hasSystem ? t.nettest.systemBest : ''}</Note>
      ) : null}
      {status === 'error' ? <Note>{t.nettest.failed}</Note> : null}
      <Button
        primary={status !== 'running'}
        label={status === 'running' ? t.nettest.running : status === 'done' ? t.nettest.again : t.nettest.start}
        onPress={start}
        disabled={status === 'running' || !online}
      />
      <Note center>{t.nettest.note}</Note>
    </Card>
  );
}