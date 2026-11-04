import { STRINGS } from '../../i18n/strings';
import { buildShareText } from '../share';

const base = { at: Date.UTC(2026, 10, 4, 11, 5), type: 'wifi' as const, isp: 'D-SMART', pingMs: 12.4, downloadMbps: 245.3, uploadMbps: 38.2 };

describe('buildShareText', () => {
  it('Türkçe metin: değerler, sağlayıcı ve bağlantı tipi', () => {
    const lines = buildShareText(base, STRINGS.tr, 'tr', 'tr-TR').split('\n');
    expect(lines[0]).toBe('Sinyal Ölçer · Hız testi');
    expect(lines[1]).toBe('İndirme 245 Mbps · Yükleme 38 Mbps · Ping 12 ms');
    expect(lines[2].startsWith('D-SMART · Wi-Fi · ')).toBe(true);
  });

  it('İngilizce metin, VPN ve yükleme ölçülemediyse', () => {
    const text = buildShareText({ ...base, uploadMbps: undefined, vpn: true, downloadMbps: 8.46 }, STRINGS.en, 'en', 'en-US');
    expect(text).toContain('Download 8.5 Mbps · Ping 12 ms');
    expect(text).not.toContain('Upload');
    expect(text).toContain('Wi-Fi (VPN)');
  });

  it('IP adresi veya Wi-Fi adı içermez', () => {
    const text = buildShareText(base, STRINGS.tr, 'tr', 'tr-TR');
    expect(text).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });
});