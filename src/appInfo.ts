// Sürüm ve gizlilik politikası tarihi TEK YERDEN gelir: app.json
//   expo.version                    → "10.0.0"  (ekranda "v10.0")
//   expo.extra.privacyPolicyDate    → "2026-11" (ekranda "Kasım 2026" / "November 2026")
// Ad seçili dile göre gelir (src/i18n/strings.ts → appName). Ana ekrandaki (launcher) ad telefon diline göre app.json "locales" ile ayarlanır.
import { expo } from '../app.json';

export const APP_VERSION = `v${expo.version.split('.').slice(0, 2).join('.')}`;

// Ör. "Sinyal Ölçer v?.?" / "Signal Strength v?.?"
export const appFooter = (appName: string) => `${appName} ${APP_VERSION}`;

const MONTHS = {
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** "2026-11" → "Kasım 2026" / "November 2026" (scripts/build-privacy-page.mjs aynı biçimi kullanır) */
export function formatMonth(yyyyMm: string, lang: 'tr' | 'en'): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const name = MONTHS[lang][m - 1];
  return name && y ? `${name} ${y}` : yyyyMm;
}

export const PRIVACY_POLICY_DATE: string = expo.extra.privacyPolicyDate;