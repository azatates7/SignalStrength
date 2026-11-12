// Test geçmişini Excel (XLSX) veya CSV dosyası olarak paylaşır. Dosya telefonun geçici klasöründe oluşturulur ve yalnızca kullanıcının seçtiği uygulamaya gönderilir.
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import type { Strings } from '../i18n/Index';
import { formatDateTime } from './Format';
import type { HistoryEntry } from './History';
import { buildCsv, buildXlsx, type Cell } from './Xlsx';

const round1 = (v?: number) => (v === undefined ? undefined : Math.round(v * 10) / 10);

/** Tablo satırları (ilk satır başlık); sayılar sayı olarak kalır, Excel'de hesaplanabilir */
export function historyRows(entries: HistoryEntry[], t: Strings, locale: string): Cell[][] {
  const h = t.history.columns;
  return [
    [h.date, h.connection, h.vpn, h.isp, h.download, h.upload, h.ping, h.jitter],
    ...entries.map((e) => [
      formatDateTime(e.at, locale),
      t.net[e.type],
      e.vpn ? t.ipinfo.vpnOn : t.ipinfo.vpnOff,
      e.isp ?? '',
      round1(e.downloadMbps),
      round1(e.uploadMbps),
      Math.round(e.pingMs),
      e.jitterMs === undefined ? undefined : Math.round(e.jitterMs),
    ]),
  ];
}

/** Herhangi bir tabloyu XLSX / CSV dosyası olarak paylaşır (geçmiş, ölçüm oturumu) */
export async function shareRows(
  rows: Cell[][],
  opts: { fileBase: string; format: 'xlsx' | 'csv'; sheetName: string; dialogTitle: string; widths?: number[] },
) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const file = new File(Paths.cache, `${opts.fileBase}-${stamp}.${opts.format}`);
  if (file.exists) file.delete();
  file.create();
  await file.write(opts.format === 'xlsx' ? buildXlsx(rows, { sheetName: opts.sheetName, widths: opts.widths }) : buildCsv(rows));
  await Sharing.shareAsync(file.uri, {
    mimeType: opts.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
    dialogTitle: opts.dialogTitle,
  });
}

export function shareHistory(entries: HistoryEntry[], format: 'xlsx' | 'csv', t: Strings, locale: string) {
  return shareRows(historyRows(entries, t, locale), {
    fileBase: t.history.fileName,
    format,
    sheetName: t.history.title,
    dialogTitle: t.history.export,
    widths: [20, 14, 8, 18, 14, 14, 10, 10],
  });
}