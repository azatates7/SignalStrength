import { median, parseServerTiming, pingStats } from '../cloudflare';

describe('parseServerTiming', () => {
  it('Cloudflare sunucu süresini okur', () => {
    expect(parseServerTiming('cfRequestDuration;dur=12.5')).toBe(12.5);
    expect(parseServerTiming('cfL4;desc="?proto=TCP", cfRequestDuration;dur=3')).toBe(3);
  });

  it('başlık yoksa veya tanınmıyorsa 0', () => {
    expect(parseServerTiming(null)).toBe(0);
    expect(parseServerTiming('')).toBe(0);
    expect(parseServerTiming('cache;dur=5')).toBe(0);
  });
});

describe('median', () => {
  it('tek / çift sayıda örnek ve boş liste', () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 40, 20, 30])).toBe(25);
    expect(median([])).toBe(0);
  });

  it('girdiyi değiştirmez', () => {
    const xs = [3, 1, 2];
    median(xs);
    expect(xs).toEqual([3, 1, 2]);
  });
});

describe('pingStats', () => {
  it('ping = ortanca, jitter = ardışık farkların ortalaması', () => {
    expect(pingStats([20, 30, 25])).toEqual({ pingMs: 25, jitterMs: 7.5 });
  });

  it('tek bir aşırı değer ping\'i bozmaz', () => {
    expect(pingStats([20, 21, 400, 22, 20]).pingMs).toBe(21);
  });

  it('tek örnekte jitter 0', () => {
    expect(pingStats([42])).toEqual({ pingMs: 42, jitterMs: 0 });
  });
});