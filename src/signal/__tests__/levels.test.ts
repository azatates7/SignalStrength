import type { SignalReading } from '../../../modules/signal-strength';
import { networkTechLabel, qualityKey, techLabel, toScore } from '../Levels';

const reading = (r: Partial<SignalReading>): SignalReading => ({ available: true, timestamp: 0, ...r });

describe('toScore', () => {
  it('sinyal yoksa 0', () => {
    expect(toScore(null)).toBe(0);
    expect(toScore(reading({ available: false, dbm: -80 }))).toBe(0);
  });

  it('LTE için dBm → 0-100 (-125 = 0, -75 = 100)', () => {
    expect(toScore(reading({ technology: 'LTE', dbm: -81 }))).toBe(88);
    expect(toScore(reading({ technology: 'LTE', dbm: -100 }))).toBe(50);
  });

  it('aralık dışını 0 ve 100 ile sınırlar', () => {
    expect(toScore(reading({ technology: 'LTE', dbm: -140 }))).toBe(0);
    expect(toScore(reading({ technology: 'LTE', dbm: -50 }))).toBe(100);
  });

  it('teknolojiye göre farklı aralık kullanır (GSM: -110 … -60)', () => {
    expect(toScore(reading({ technology: 'GSM', dbm: -85 }))).toBe(50);
  });

  it('Android 9 (dBm yok): 0-4 seviyesini ölçekler', () => {
    expect(toScore(reading({ dbm: null, systemLevel: 3 }))).toBe(75);
    expect(toScore(reading({ dbm: null }))).toBe(0);
  });
});

describe('qualityKey', () => {
  it.each([
    [0, 'none'],
    [1, 'veryPoor'],
    [20, 'veryPoor'],
    [21, 'poor'],
    [40, 'poor'],
    [60, 'fair'],
    [80, 'good'],
    [81, 'excellent'],
    [100, 'excellent'],
  ])('%i puan → %s', (score, key) => {
    expect(qualityKey(score)).toBe(key);
  });
});

describe('techLabel', () => {
  it('bilinen teknolojiler ve bilinmeyen', () => {
    expect(techLabel('LTE', '?')).toBe('4G (LTE)');
    expect(techLabel('NR', '?')).toBe('5G');
    expect(techLabel('UNKNOWN', 'Bilinmiyor')).toBe('Bilinmiyor');
  });
});

describe('networkTechLabel', () => {
  it('5G türü', () => {
    expect(networkTechLabel({ technology: 'NR', nrMode: 'SA' }, '?')).toBe('5G SA');
    expect(networkTechLabel({ technology: 'NR', nrMode: 'NSA' }, '?')).toBe('5G NSA');
    expect(networkTechLabel({ technology: 'NR', nrMode: 'NSA', nrAdvanced: true }, '?')).toBe('5G+ NSA');
    expect(networkTechLabel({ technology: 'NR' }, '?')).toBe('5G');
  });

  it('4G: 5G hazır ve 4.5G', () => {
    expect(networkTechLabel({ technology: 'LTE', nrMode: 'NSA' }, '?')).toBe('4G (LTE) · 5G NSA');
    expect(networkTechLabel({ technology: 'LTE', lteAdvanced: 'LTE-A' }, '?')).toBe('4.5G (LTE-A)');
    expect(networkTechLabel({ technology: 'LTE', lteAdvanced: 'LTE-A Pro' }, '?')).toBe('4.5G (LTE-A Pro)');
    expect(networkTechLabel({ technology: 'LTE' }, '?')).toBe('4G (LTE)');
  });

  it('diğerleri', () => {
    expect(networkTechLabel({ technology: 'WCDMA' }, '?')).toBe('3G (WCDMA)');
    expect(networkTechLabel({}, 'Bilinmiyor')).toBe('Bilinmiyor');
  });
});