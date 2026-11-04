import { pushSample, wifiBand, wifiChannel, wifiStandardLabel } from '../wifi';

describe('wifiBand / wifiChannel', () => {
  it.each([
    [2412, '2.4 GHz', 1],
    [2437, '2.4 GHz', 6],
    [2484, '2.4 GHz', 14],
    [5180, '5 GHz', 36],
    [5745, '5 GHz', 149],
    [5955, '6 GHz', 1],
    [6115, '6 GHz', 33],
  ])('%i MHz → %s, kanal %i', (f, band, ch) => {
    expect(wifiBand(f)).toBe(band);
    expect(wifiChannel(f)).toBe(ch);
  });

  it('bilinmeyen / boş frekans', () => {
    expect(wifiBand(null)).toBeUndefined();
    expect(wifiChannel(undefined)).toBeUndefined();
    expect(wifiBand(60480)).toBeUndefined(); // 60 GHz (802.11ad) gösterilmez
  });
});

describe('wifiStandardLabel', () => {
  it('Android standart kodları', () => {
    expect(wifiStandardLabel(4)).toBe('Wi-Fi 4 (802.11n)');
    expect(wifiStandardLabel(5)).toBe('Wi-Fi 5 (802.11ac)');
    expect(wifiStandardLabel(6, 5180)).toBe('Wi-Fi 6 (802.11ax)');
    expect(wifiStandardLabel(6, 5955)).toBe('Wi-Fi 6E (802.11ax)');
    expect(wifiStandardLabel(8)).toBe('Wi-Fi 7 (802.11be)');
    expect(wifiStandardLabel(0)).toBeUndefined();
    expect(wifiStandardLabel(null)).toBeUndefined();
  });
});

describe('pushSample', () => {
  it('sona ekler ve en fazla max örnek tutar', () => {
    expect(pushSample([1, 2], 3, 5)).toEqual([1, 2, 3]);
    expect(pushSample([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
  });

  it('girdiyi değiştirmez', () => {
    const xs = [1, 2, 3];
    pushSample(xs, 4, 3);
    expect(xs).toEqual([1, 2, 3]);
  });
});