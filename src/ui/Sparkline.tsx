// Ek kütüphane kullanmadan basit çizgi grafik: her iki nokta arası döndürülmüş ince bir çizgi.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

export function Sparkline({
  values,
  color,
  gridColor,
  height = 64,
  minSpan = 10, // dBm: değerler az oynasa da grafik aşırı büyütülmesin
}: {
  values: number[];
  color: string;
  gridColor: string;
  height?: number;
  minSpan?: number;
}) {
  const [width, setWidth] = useState(0);
  if (values.length < 2) return null;

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < minSpan) {
    const mid = (max + min) / 2;
    min = mid - minSpan / 2;
    max = mid + minSpan / 2;
  }
  const pad = 4;
  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => pad + (1 - (v - min) / (max - min)) * (height - pad * 2);

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={[styles.grid, { top: height / 2, backgroundColor: gridColor }]} />
      {width > 0
        ? values.slice(1).map((v, k) => {
            const x1 = x(k);
            const y1 = y(values[k]);
            const x2 = x(k + 1);
            const y2 = y(v);
            const len = Math.hypot(x2 - x1, y2 - y1);
            const angle = Math.atan2(y2 - y1, x2 - x1);
            return (
              <View
                key={k}
                style={[
                  styles.segment,
                  {
                    backgroundColor: color,
                    width: len + 1, // birleşim yerlerinde boşluk kalmasın
                    left: (x1 + x2) / 2 - (len + 1) / 2,
                    top: (y1 + y2) / 2 - 1,
                    transform: [{ rotate: `${angle}rad` }],
                  },
                ]}
              />
            );
          })
        : null}
    </View>
  );
}

// Yalnızca yerleşim; renkler parametre olarak geliyor
const styles = StyleSheet.create({
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  segment: { position: 'absolute', height: 2, borderRadius: 1 },
});