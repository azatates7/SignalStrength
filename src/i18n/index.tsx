// src/i18n/index.tsx
// Uygulama dili (Türkçe / İngilizce). Başlangıçta telefon dili kullanılır; kullanıcı üst
// paneldeki dil butonuyla değiştirirse seçim kaydedilir ve sonraki açılışlarda o dil gelir.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import SignalStrength from '../../modules/signal-strength';
import { LOCALE, STRINGS, type Lang, type Strings } from './strings';

export type { Lang, Strings } from './strings';

function deviceLang(): Lang {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

function initialLang(): Lang {
  try {
    const saved = SignalStrength?.getLanguagePreference();
    if (saved === 'tr' || saved === 'en') return saved;
  } catch {
    // kaydedilmiş tercih okunamazsa telefon dili
  }
  return deviceLang();
}

type I18nValue = {
  lang: Lang;
  t: Strings;
  locale: string; // Tarih biçimi için, ör. "tr-TR"
  toggleLang: () => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  const toggleLang = useCallback(() => {
    setLang((cur) => {
      const next: Lang = cur === 'tr' ? 'en' : 'tr';
      try {
        SignalStrength?.setLanguagePreference(next);
      } catch {
        // Kaydedilemezse seçim sadece bu oturumda geçerli olur
      }
      return next;
    });
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ lang, t: STRINGS[lang], locale: LOCALE[lang], toggleLang }),
    [lang, toggleLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside LanguageProvider');
  return value;
}