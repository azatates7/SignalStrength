import POLICY from '../policy.json';

type Block = Record<string, unknown>;
const kinds = (blocks: Block[]) => blocks.map((b) => Object.keys(b)[0]);

describe('gizlilik politikası metni', () => {
  it('Türkçe ve İngilizce aynı yapıda (bölüm atlanmamış)', () => {
    expect(kinds(POLICY.en.blocks)).toEqual(kinds(POLICY.tr.blocks));
    expect(POLICY.en.meta.length).toBe(POLICY.tr.meta.length);
  });

  it('iletişim e-posta ile; GitHub bağlantısı yok', () => {
    for (const lang of [POLICY.tr, POLICY.en]) {
      const text = JSON.stringify(lang);
      expect(text).toMatch(/[\w.+-]+@[\w-]+\.\w+/);
      expect(text).not.toMatch(/github\.com/i);
    }
  });
});