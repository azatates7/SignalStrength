import type { HistoryEntry } from '../History';
import { averagesByType, downloadTrend } from '../Summary';

const e = (at: number, type: HistoryEntry['type'], down: number, up: number | undefined, ping: number): HistoryEntry => ({
  at,
  type,
  downloadMbps: down,
  uploadMbps: up,
  pingMs: ping,
});

// Geçmiş yeniden eskiye tutulur
const list = [e(4, 'wifi', 200, 40, 10), e(3, 'cellular', 50, 10, 30), e(2, 'wifi', 100, undefined, 20), e(1, 'cellular', 30, 20, 50)];

describe('averagesByType', () => {
  it('Wi-Fi ve mobil ayrı ortalanır', () => {
    const a = averagesByType(list);
    expect(a.wifi).toEqual({ count: 2, downloadMbps: 150, uploadMbps: 40, pingMs: 15 });
    expect(a.cellular).toEqual({ count: 2, downloadMbps: 40, uploadMbps: 15, pingMs: 40 });
  });

  it('o tipte test yoksa undefined', () => {
    expect(averagesByType([list[0]]).cellular).toBeUndefined();
    expect(averagesByType([])).toEqual({ wifi: undefined, cellular: undefined });
  });
});

describe('downloadTrend', () => {
  it('eskiden yeniye sıralar ve girdiyi değiştirmez', () => {
    expect(downloadTrend(list)).toEqual([30, 100, 50, 200]);
    expect(list[0].at).toBe(4);
  });
});