// Hız testi için ibreli gösterge. Ek kütüphane yok: yay, döndürülmüş küçük çizgilerden (tik),
// ibre de merkezi etrafında döndürülen bir View'dan oluşur. İbre yerel animasyonla
// (useNativeDriver) hareket eder; telefonda "Animasyonları kaldır" açıksa animasyonsuz atlar.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GAUGE_STOPS, GAUGE_SWEEP, gaugeAngle, gaugeFraction, stopLabel } from '../speedtest/Gauge';
import { useTheme } from '../Theme';

const TICKS = 48;
const TICK_W = 4;
const TICK_H = 12;

/** mbps: ibrenin göstereceği hız (yoksa 0). color: dolu tiklerin ve ibrenin rengi. */
export function SpeedGauge({ mbps, color }: { mbps?: number; color: string }) {
  const { colors: c } = useTheme();
  const { width: screen } = useWindowDimensions();
  const size = Math.min(240, screen - 96); // Dar ekranlarda küçülür
  const r = size / 2 - TICK_H / 2; // Tiklerin yarıçapı
  const cx = size / 2;
  // Yay -120° … +120°: alt uçlar merkezin r/2 altında; altına biraz pay
  const height = Math.ceil(size / 2 + r / 2 + TICK_H);

  const fraction = gaugeFraction(mbps);
  const anim = useRef(new Animated.Value(fraction)).current;
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(fraction);
      return;
    }
    const a = Animated.timing(anim, {
      toValue: fraction,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [fraction, reduceMotion, anim]);

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${-GAUGE_SWEEP / 2}deg`, `${GAUGE_SWEEP / 2}deg`],
  });
  const needle = r - TICK_H - 10; // İbre boyu
  // Ölçüm yokken (boşta / ping sırasında) ibre soluk renkte bekler
  const needleColor = mbps !== undefined && mbps > 0 ? color : c.textFaint;
  const labelR = r - TICK_H - 18; // Eşik etiketlerinin yarıçapı

  return (
    // Görsel süs: ekran okuyucu bunu atlar, hız değeri altındaki yazıdan okunur
    <View
      style={{ width: size, height }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: TICKS }, (_, i) => {
        const f = i / (TICKS - 1);
        const on = mbps !== undefined && mbps > 0 && f <= fraction;
        return (
          <View
            key={i}
            style={[
              styles.tick,
              {
                left: cx - TICK_W / 2,
                top: cx - TICK_H / 2,
                backgroundColor: on ? color : c.barOff,
                transform: [{ rotate: `${gaugeAngle(f)}deg` }, { translateY: -r }],
              },
            ]}
          />
        );
      })}

      {GAUGE_STOPS.map((v) => {
        const a = (gaugeAngle(gaugeFraction(v)) * Math.PI) / 180;
        return (
          <Text
            key={v}
            style={[
              styles.stop,
              { color: c.textFaint, left: cx + labelR * Math.sin(a) - 16, top: cx - labelR * Math.cos(a) - 7 },
            ]}
            maxFontSizeMultiplier={1.2}
          >
            {stopLabel(v)}
          </Text>
        );
      })}

      {/* İbre: boyu 2×needle olan şeffaf bir kutu, yalnızca üst yarısı boyalı; kutu merkezinden döner */}
      <Animated.View
        style={[
          styles.needleBox,
          { left: cx - 2, top: cx - needle, height: needle * 2, transform: [{ rotate }] },
        ]}
      >
        <View style={[styles.needle, { height: needle, backgroundColor: needleColor }]} />
      </Animated.View>
      <View style={[styles.hub, { left: cx - 8, top: cx - 8, backgroundColor: needleColor, borderColor: c.card }]} />
    </View>
  );
}

// Telefonun "Animasyonları kaldır" (erişilebilirlik) ayarı
function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => alive && setReduce(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}

// Yalnızca yerleşim; renkler temadan geliyor
const styles = StyleSheet.create({
  tick: { position: 'absolute', width: TICK_W, height: TICK_H, borderRadius: TICK_W / 2 },
  stop: { position: 'absolute', width: 32, fontSize: 10, textAlign: 'center', fontVariant: ['tabular-nums'] },
  needleBox: { position: 'absolute', width: 4 },
  needle: { width: 4, borderRadius: 2 },
  hub: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
});