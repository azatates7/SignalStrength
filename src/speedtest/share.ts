// Paylaşılacak sonuç metni, ör.:
//   Sinyal Ölçer · Hız testi
//   İndirme 245 Mbps · Yükleme 38 Mbps · Ping 12 ms
//   D-SMART · Wi-Fi · 4 Kas 2026 14:05
// IP adresi ve Wi-Fi adı metne eklenmez.
import type { Lang, Strings } from '../i18n/Index';
import { formatDateTime, formatMbps } from './Format';
import type { HistoryEntry } from './History';

export function buildShareText(e: HistoryEntry, t: Strings, lang: Lang, locale: string): string {
  const values = [
    `${t.speed.download} ${formatMbps(e.downloadMbps, lang)} Mbps`,
    e.uploadMbps !== undefined ? `${t.speed.upload} ${formatMbps(e.uploadMbps, lang)} Mbps` : undefined,
    `${t.speed.ping} ${Math.round(e.pingMs)} ms`,
  ];
  const context = [e.isp, t.net[e.type] + (e.vpn ? ' (VPN)' : ''), formatDateTime(e.at, locale)];
  return [`${t.appName} · ${t.speed.shareHeading}`, values.filter(Boolean).join(' · '), context.filter(Boolean).join(' · ')].join(
    '\n',
  );
}