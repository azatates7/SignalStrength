// Hız testi göstergesi (Speedtest tarzı): kalın bir yay, hız arttıkça renk geçişli (gradyan) dolar;
// ince, ucu parlak ve dibe doğru silikleşen bir ibre; eşik etiketleri yayın içinde, geçilenler
// belirgin. Hız değeri (children) yayın alt boşluğunda gösterilir.
// Çizim react-native-svg ile. İbre ayrı bir katmanda yerel animasyonla (useNativeDriver) döner,
// yay dolumu aynı süre ve eğriyle JS tarafında canlandırılır. Telefonda "Animasyonları kaldır"
// açıksa ikisi de animasyonsuz atlar.
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import { GAUGE_STOPS, GAUGE_SWEEP, gaugeAngle, gaugeFraction, stopLabel } from '../speedtest/Gauge';
import { useTheme } from '../Theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Yay renkleri: indirme camgöbeği → mint, yükleme mor → pembe (iki temada da okunur)
const GRADIENTS = {
  download: ['#00b4ff', '#5ef0c0'],
  upload: ['#7c3aed', '#e879f9'],
} as const;

const STROKE = 16; // Yay kalınlığı
const DURATION = 350;

/**
 * mbps: gösterilecek hız (yoksa / 0 ise ibre solda ve soluk bekler).
 * direction: yayın rengi. children: yayın altındaki boşlukta gösterilecek değer (sayı + birim).
 */
export function SpeedGauge({
  mbps,
  direction = 'download',
  children,
}: {
  mbps?: number;
  direction?: 'download' | 'upload';
  children?: ReactNode;
}) {
  const { colors: c } = useTheme();
  const { width: screen } = useWindowDimensions();
  const size = Math.min(280, screen - 72); // Dar ekranlarda küçülür
  const cx = size / 2;
  const r = size / 2 - STROKE / 2 - 2; // Yayın yarıçapı (çizginin ortası)
  const arcLen = (2 * Math.PI * r * GAUGE_SWEEP) / 360;
  // Yay yolu: saat 12'nin 120° solundan sağına, saat yönünde (büyük yay)
  const half = ((GAUGE_SWEEP / 2) * Math.PI) / 180;
  const sx = cx - r * Math.sin(half);
  const ex = cx + r * Math.sin(half);
  const ey = cx - r * Math.cos(half);
  const arcPath = `M ${sx} ${ey} A ${r} ${r} 0 1 1 ${ex} ${ey}`;
  // Yükseklik: merkez + değer yazısı için alt boşluk
  const height = Math.ceil(cx + r * 0.3 + 76);

  const active = mbps !== undefined && mbps > 0;
  const fraction = gaugeFraction(mbps);
  const reduceMotion = useReduceMotion();

  // İbre (yerel sürücü) ve yay dolumu (JS sürücü) için iki ayrı değer, aynı süre/eğri
  const needle = useRef(new Animated.Value(fraction)).current;
  const arc = useRef(new Animated.Value(fraction)).current;
  useEffect(() => {
    if (reduceMotion) {
      needle.setValue(fraction);
      arc.setValue(fraction);
      return;
    }
    const easing = Easing.out(Easing.cubic);
    const a = Animated.parallel([
      Animated.timing(needle, { toValue: fraction, duration: DURATION, easing, useNativeDriver: true }),
      Animated.timing(arc, { toValue: fraction, duration: DURATION, easing, useNativeDriver: false }),
    ]);
    a.start();
    return () => a.stop();
  }, [fraction, reduceMotion, needle, arc]);

  const rotate = needle.interpolate({
    inputRange: [0, 1],
    outputRange: [`${-GAUGE_SWEEP / 2}deg`, `${GAUGE_SWEEP / 2}deg`],
  });
  // Dolu kısım: kesik çizgi deseni yay boyunda, kaydırma (offset) azaldıkça uzar
  const dashOffset = arc.interpolate({ inputRange: [0, 1], outputRange: [arcLen, 0] });

  const [g0, g1] = GRADIENTS[direction];
  const gradId = `arc-${direction}`; // Her yön kendi gradyanı (aynı sayfada iki gösterge olursa çakışmasın)
  const labelR = r - STROKE / 2 - 16;

  // İbre (yukarı bakan hâliyle): uç yayın iç kenarına yakın ve ince, dip merkeze doğru geniş ve silik
  const tipY = cx - (r - STROKE / 2 - 4);
  const baseY = cx - r * 0.3;
  const needlePoints = `${cx - 1},${tipY} ${cx + 1},${tipY} ${cx + 5},${baseY} ${cx - 5},${baseY}`;

  return (
    <View style={{ width: size, height }}>
      {/* Görsel süs: ekran okuyucu bunu atlar; değer children içindeki yazıdan okunur */}
      <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2={size} y2="0" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={g0} />
              <Stop offset="1" stopColor={g1} />
            </LinearGradient>
          </Defs>
          {/* Boş yay */}
          <Path d={arcPath} stroke={c.barOff} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
          {/* Dolu yay */}
          <AnimatedPath
            d={arcPath}
            stroke={`url(#${gradId})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${arcLen} ${arcLen}`}
            strokeDashoffset={dashOffset}
            opacity={active ? 1 : 0}
          />
          {/* Eşik etiketleri: ibrenin geçtikleri belirgin */}
          {GAUGE_STOPS.map((v) => {
            const f = gaugeFraction(v);
            const a = (gaugeAngle(f) * Math.PI) / 180;
            const passed = active && f <= fraction + 1e-6;
            return (
              <SvgText
                key={v}
                x={cx + labelR * Math.sin(a)}
                y={cx - labelR * Math.cos(a) + 4}
                fontSize={12}
                fontFamily="sans-serif"
                fontWeight={passed ? '700' : '500'}
                fill={passed ? c.text : c.textFaint}
                textAnchor="middle"
              >
                {stopLabel(v)}
              </SvgText>
            );
          })}
        </Svg>

        {/* İbre katmanı: tam kare, merkezi göstergenin merkezi; tümüyle döner */}
        <Animated.View
          style={[styles.needleLayer, { width: size, height: size, opacity: active ? 1 : 0.35, transform: [{ rotate }] }]}
        >
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id="needleFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.text} stopOpacity={0.95} />
                <Stop offset="1" stopColor={c.text} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Polygon points={needlePoints} fill="url(#needleFill)" />
          </Svg>
        </Animated.View>
      </View>

      {/* Değer: yayın alt boşluğunda, merkezin hemen altında */}
      <View style={[styles.value, { top: cx + r * 0.12 }]}>{children}</View>
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
  needleLayer: { position: 'absolute', left: 0, top: 0 },
  value: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});