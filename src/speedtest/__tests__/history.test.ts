import { MAX_HISTORY, addEntry, parseHistory, type HistoryEntry } from '../history';

const entry = (at: number, extra: Partial<HistoryEntry> = {}): HistoryEntry => ({
  at,
  type: 'wifi',
  pingMs: 12,
  downloadMbps: 245,
  uploadMbps: 38,
  ...extra,
});

describe('addEntry', () => {
  it('yeni test en üste eklenir', () => {
    expect(addEntry([entry(1)], entry(2)).map((e) => e.at)).toEqual([2, 1]);
  });

  it(`en fazla ${MAX_HISTORY} kayıt tutulur`, () => {
    let list: HistoryEntry[] = [];
    for (let i = 0; i < MAX_HISTORY + 5; i++) list = addEntry(list, entry(i));
    expect(list).toHaveLength(MAX_HISTORY);
    expect(list[0].at).toBe(MAX_HISTORY + 4);
  });
});

describe('parseHistory', () => {
  it('kaydedilen listeyi geri okur (yeniden eskiye)', () => {
    const raw = JSON.stringify([entry(1), entry(3, { isp: 'D-SMART', vpn: true }), entry(2)]);
    const list = parseHistory(raw);
    expect(list.map((e) => e.at)).toEqual([3, 2, 1]);
    expect(list[0]).toMatchObject({ isp: 'D-SMART', vpn: true });
  });

  it('boş, bozuk veya beklenmeyen veride hata vermez', () => {
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory('')).toEqual([]);
    expect(parseHistory('{bozuk')).toEqual([]);
    expect(parseHistory('{"a":1}')).toEqual([]);
  });

  it('eksik alanlı kayıtları atlar, bilinmeyen bağlantı tipini "other" yapar', () => {
    const raw = JSON.stringify([{ at: 1 }, { ...entry(2), type: 'satellite' }, null]);
    const list = parseHistory(raw);
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe('other');
  });

  it('yükleme ölçülemediyse uploadMbps boş kalır', () => {
    const list = parseHistory(JSON.stringify([{ ...entry(1), uploadMbps: undefined }]));
    expect(list[0].uploadMbps).toBeUndefined();
  });
});