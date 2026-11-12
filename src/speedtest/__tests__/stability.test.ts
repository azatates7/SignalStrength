import { stabilityStats } from '../Stability';

describe('stabilityStats', () => {
  it('kararlı bağlantı', () => {
    const s = stabilityStats([20, 22, 21, 20, 23, 21]);
    expect(s.lost).toBe(0);
    expect(s.medianMs).toBe(21);
    expect(s.maxMs).toBe(23);
    expect(s.jitterMs).toBeCloseTo((2 + 1 + 1 + 3 + 2) / 5);
    expect(s.verdict).toBe('good');
  });

  it('kayıp istekler sayılır, istatistiklere katılmaz', () => {
    const s = stabilityStats([20, null, 22, null, 21]);
    expect(s.sent).toBe(5);
    expect(s.lost).toBe(2);
    expect(s.lossPct).toBe(40);
    expect(s.verdict).toBe('poor');
  });

  it('dalgalanma orta düzeydeyse "fair"', () => {
    const s = stabilityStats([20, 45, 20, 45, 20, 45]);
    expect(s.jitterMs).toBe(25);
    expect(s.verdict).toBe('fair');
  });

  it('hiç yanıt yoksa "poor", değerler boş', () => {
    const s = stabilityStats([null, null]);
    expect(s.medianMs).toBeUndefined();
    expect(s.verdict).toBe('poor');
  });
});

describe('kayıp eşikleri', () => {
  it('30 istekte 1 kayıp "fair", 2 kayıp "poor"', () => {
    const base = Array.from({ length: 30 }, () => 20);
    expect(stabilityStats([...base.slice(1), null]).verdict).toBe('fair');
    expect(stabilityStats([...base.slice(2), null, null]).verdict).toBe('poor');
  });
});