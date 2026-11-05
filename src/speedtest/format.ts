// Hız ve tarih biçimleri (ekran, geçmiş listesi ve paylaşılan metin aynı biçimi kullanır).
import type { Lang } from '../i18n/Index';

/** 245.3 → "245", 8.46 → "8,5" (Türkçe) / "8.5" (İngilizce); bilinmiyorsa "—" */
export function formatMbps(v: number | undefined, lang: Lang) {
  if (v === undefined || !Number.isFinite(v)) return '—';
  if (v >= 10) return String(Math.round(v));
  const s = v.toFixed(1);
  return lang === 'tr' ? s.replace('.', ',') : s;
}

// Ör. "30 Eki 2026 14:05" / "30 Oct 2026, 14:05"
export function formatDateTime(ts: number, locale: string) {
  try {
    return new Date(ts).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 16).replace('T', ' ');
  }
}