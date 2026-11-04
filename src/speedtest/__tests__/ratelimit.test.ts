// rateLimit modül içinde durum tuttuğu için her testte modül yeniden yüklenir
type RateLimit = typeof import('../rateLimit');
let rl: RateLimit;

beforeEach(() => {
  jest.resetModules();
  rl = require('../rateLimit');
});

describe('rateLimit (1 dakikada en fazla 3 test)', () => {
  it('ilk 3 test beklemeden başlar', () => {
    for (const t of [0, 1_000, 2_000]) {
      expect(rl.waitMs(t)).toBe(0);
      rl.recordStart(t);
    }
  });

  it('4. test, ilk testin üzerinden 1 dakika geçene kadar bekler', () => {
    [0, 1_000, 2_000].forEach((t) => rl.recordStart(t));
    expect(rl.waitMs(10_000)).toBe(50_000);
    expect(rl.waitMs(59_999)).toBe(1);
  });

  it('pencere kayar: ilk test 1 dakikayı doldurunca yer açılır', () => {
    [0, 1_000, 2_000].forEach((t) => rl.recordStart(t));
    expect(rl.waitMs(60_000)).toBe(0);
    rl.recordStart(60_000);
    expect(rl.waitMs(60_500)).toBe(500); // sıradaki: 1_000 + 60_000
  });
});