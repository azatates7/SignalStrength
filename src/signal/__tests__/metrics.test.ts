import { METRICS, rate } from '../Metrics';

describe('rate', () => {
  it.each([
    [-75, 'excellent'],
    [-80, 'excellent'], // sınır değer üst gruba dahil
    [-81, 'good'],
    [-95, 'fair'],
    [-100, 'fair'],
    [-101, 'poor'],
  ])('RSRP %i dBm → %s', (value, key) => {
    expect(rate(value, METRICS.rsrp.thresholds).key).toBe(key);
  });

  it('SINR eşikleri', () => {
    expect(rate(25, METRICS.sinr.thresholds).key).toBe('excellent');
    expect(rate(0, METRICS.sinr.thresholds).key).toBe('fair');
    expect(rate(-3, METRICS.sinr.thresholds).key).toBe('poor');
  });

  it('Android 0-4 seviyesi', () => {
    expect(rate(4, METRICS.systemLevel.thresholds).key).toBe('excellent');
    expect(rate(1, METRICS.systemLevel.thresholds).key).toBe('poor');
  });
});