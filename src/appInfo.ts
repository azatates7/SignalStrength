// src/appInfo.ts
// Uygulama içindeki ad ve sürüm yazısı. Ad seçili dile göre gelir (src/i18n/strings.ts → appName).
// Ana ekrandaki (launcher) ad telefon diline göre app.json "locales" ile ayarlanır.
import { expo } from '../app.json';

export const APP_VERSION = `v${expo.version.split('.').slice(0, 2).join('.')}`;

// Ör. "Sinyal Ölçer v4.0" / "Signal Strength v4.0"
export const appFooter = (appName: string) => `${appName} ${APP_VERSION}`;