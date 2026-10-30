// src/theme.tsx
// Açık / koyu tema renkleri ve kullanıcının tema tercihi (Sistem / Açık / Koyu).
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import SignalStrength from '../modules/signal-strength';

export type ThemeMode = 'system' | 'light' | 'dark';

export type Palette = {
  background: string;
  card: string;
  text: string;        // Ana metin
  textSoft: string;    // Açıklamalar
  textMuted: string;   // İkincil bilgiler
  textFaint: string;   // En silik (teknik ad, sürüm)
  barOff: string;      // Boş çubuk
  segment: string;     // Tema seçici arka planı
  segmentActive: string;
};

const DARK: Palette = {
  background: '#0f172a',
  card: '#1e293b',
  text: '#f8fafc',
  textSoft: '#cbd5e1',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  barOff: '#334155',
  segment: '#1e293b',
  segmentActive: '#334155',
};

const LIGHT: Palette = {
  background: '#f1f5f9',
  card: '#ffffff',
  text: '#0f172a',
  textSoft: '#334155',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  barOff: '#cbd5e1',
  segment: '#e2e8f0',
  segmentActive: '#ffffff',
};

// Durum renkleri açık zeminde yazı olarak okunmuyor; açık temada koyu tonları kullanılır
const DARKER_ON_LIGHT: Record<string, string> = {
  '#22c55e': '#15803d',
  '#84cc16': '#4d7c0f',
  '#f59e0b': '#b45309',
  '#ef4444': '#b91c1c',
};

type ThemeValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: Palette;
  /** Durum rengini (yeşil/sarı/kırmızı) temaya göre okunur hale getirir */
  tone: (color: string) => string;
};

const ThemeContext = createContext<ThemeValue | null>(null);

function readSavedMode(): ThemeMode {
  try {
    const saved = SignalStrength?.getThemePreference();
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // Telefonun ayarı: 'light' | 'dark'
  const [mode, setModeState] = useState<ThemeMode>(readSavedMode);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      SignalStrength?.setThemePreference(next);
    } catch {
      // Kaydedilemezse tercih sadece bu oturumda geçerli olur
    }
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const isDark = mode === 'system' ? system !== 'light' : mode === 'dark';
    return {
      mode,
      setMode,
      isDark,
      colors: isDark ? DARK : LIGHT,
      tone: (color) => (isDark ? color : DARKER_ON_LIGHT[color] ?? color),
    };
  }, [mode, setMode, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme, ThemeProvider içinde kullanılmalı');
  return value;
}