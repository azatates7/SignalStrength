# Sinyal Ölçer

Telefonun o anki mobil şebeke çekim gücünü **internet bağlantısı gerektirmeden** gösteren Android uygulaması. React Native (Expo) ile yazıldı. Sinyal, Kotlin ile yazılmış yerel bir native modül üzerinden doğrudan Android'den okunuyor.

<p align="center">
  <img src="docs/screenshots/koyu-tema.png" width="280" alt="Koyu tema" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/acik-tema.png" width="280" alt="Açık tema" />
</p>

## Özellikler

- **Anlık sinyal gücü (dBm):** Sinyal değiştikçe ekran kendiliğinden güncellenir.
- **0–100 sinyal puanı:** Android'in 0–4 çubuk göstergesi yerine dBm değerinden hesaplanan, çok daha hassas bir puan. Ekranda 10 çubukla gösterilir.
- **Operatör ve bağlantı teknolojisi:** Örneğin `TURKCELL · 4G (LTE)`. 5G, 4G, 3G ve 2G desteklenir.
- **Herkesin anlayacağı detaylar:** RSRP, RSRQ ve SINR değerleri sade bir açıklama, ideal aralık ve renkli bir durum etiketiyle (Mükemmel / İyi / Orta / Zayıf) gösterilir.
- **Telefonun çubuk göstergesi:** Android'in 0–4 seviyesi, telefonun üst çubuğuna benzeyen küçük bir simgeyle gösterilir.
- **Açık / koyu tema:** Sistem, Açık ve Koyu seçenekleri. Seçim uygulama kapansa da hatırlanır.
- **İzin istemez, internet kullanmaz:** Konum, telefon ya da internet izni gerekmez. Uygulama hiçbir veri toplamaz veya göndermez.
- **Çökme yerine anlaşılır hata ekranı:** Beklenmedik bir hata olursa uygulama kapanmak yerine hatayı ekranda gösterir.

## Platform desteği

| Android sürümü | Durum |
|---|---|
| 10 ve üzeri (API 29+) | Tam destek: dBm, 0–100 puan, RSRP / RSRQ / SINR |
| 9 (API 28) | Çalışır. Sadece telefonun 0–4 seviyesi okunur, 0–100 puana ölçeklenir. dBm gösterilmez. |
| 7 – 8 (API 24–27) | Kurulur, açılınca "Android 9 ve üzeri gerekli" mesajı gösterilir |
| 6 ve altı | Kurulamaz (React Native'in alt sınırı API 24) |

**iOS desteklenmiyor.** Apple, sinyal gücünü (dBm, çubuk sayısı) hiçbir public API ile vermiyor.

## Teknoloji

| | |
|---|---|
| Framework | Expo SDK 58, React Native 0.88, React 19 |
| Dil | TypeScript (arayüz), Kotlin (native modül) |
| Native API | `TelephonyManager`, `SignalStrength`, `TelephonyCallback` (Android 12+), `PhoneStateListener` (Android 9–11) |
| Ek bağımlılık | Yok. Sadece `expo`, `expo-status-bar`, `expo-splash-screen` ve `expo-system-ui` kullanılıyor. |

## Proje yapısı

```
├─ App.tsx                     Ana ekran, detay kartları, tema seçici, hata ekranı
├─ index.ts                    Giriş noktası (App.tsx'i başlatır)
├─ app.json                    Uygulama adı, sürüm, paket adı, ikon ve splash ayarları
├─ assets/images/              Uygulama ikonu ve splash görselleri
├─ src/
│  ├─ theme.tsx                Açık/koyu renk paletleri, tema tercihi (ThemeProvider)
│  └─ signal/
│     ├─ useSignalStrength.ts  Native modülü dinleyen React hook'u
│     ├─ levels.ts             dBm → 0–100 puan hesabı, teknoloji etiketleri
│     └─ metrics.ts            RSRP/RSRQ/SINR açıklamaları, ideal aralıklar, durum eşikleri
└─ modules/signal-strength/    Yerel Expo native modülü
   ├─ expo-module.config.json
   ├─ index.ts                 Modülün TypeScript arayüzü
   └─ android/src/main/java/expo/modules/signalstrength/
      └─ SignalStrengthModule.kt
```

`android/` klasörü `npx expo prebuild` ile her seferinde yeniden üretiliyor. Bu yüzden repoda tutulmuyor ve elle düzenlenmemeli.

## Kurulum

### Gereksinimler

- Node.js (LTS)
- JDK 17
- Android Studio (Android SDK ve Platform-Tools)
- `ANDROID_HOME` ortam değişkeni ve `platform-tools` klasörü PATH'te

### Projeyi çalıştırma

```bash
git clone https://github.com/azatates7/SignalStrength.git
cd SignalStrength
npm install
```

USB hata ayıklaması açık bir telefon bağlıyken geliştirme modunda çalıştırmak için:
```bash
npx expo run:android
```
JS değişiklikleri telefona anında yansır. Kotlin dosyası değiştiğinde komutu tekrar çalıştırın.

> Emülatör gerçek sinyal ölçemez. Sinyal değerleri emülatörün **Extended controls → Cellular** ekranından elle değiştirilebilir. Gerçek ölçüm için fiziksel bir cihaz gerekir.

## APK oluşturma

```bash
npx expo prebuild --clean
cd android
./gradlew assembleRelease      # Windows: .\gradlew assembleRelease
```

APK şu konumda oluşur: `android/app/build/outputs/apk/release/app-release.apk`. Telefona kopyalanıp doğrudan kurulabilir.

`prebuild --clean` adımı şu durumlarda gerekli:
- `app.json` değiştiğinde (ad, sürüm, ikon)
- Native modül (Kotlin) değiştiğinde
- Paket eklenip çıkarıldığında

Sadece `.ts` / `.tsx` dosyaları değiştiyse doğrudan `gradlew assembleRelease` çalıştırmak yeterli.

> Bu yöntemle üretilen APK debug anahtarıyla imzalanır ve test için uygundur. Play Store için aşağıdaki EAS adımlarını kullanın.

## Play Store'a yayınlama

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build -p android --profile production
```

Sonuç olarak imzalı bir `.aab` dosyası üretilir. Bu dosya Play Console'a yüklenir. EAS imza anahtarını (keystore) kendisi yönetir.

## Sürüm güncelleme

Sürüm sadece `app.json` içinde değiştirilir. Ekranın altındaki `Sinyal Ölçer v4.0` yazısı otomatik olarak buradan okunur.

```json
"version": "4.0.0",
"android": { "versionCode": 4 }
```

| Alan | Açıklama |
|---|---|
| `version` | Kullanıcının gördüğü sürüm (ekranda `v4.0` olarak gösterilir) |
| `versionCode` | Play Store'un iç sürüm numarası. **Her yeni sürümde en az 1 artmalı.** |

Değişiklikten sonra `npx expo prebuild --clean` çalıştırın.

## Nasıl çalışır

### Sinyal okuma

Native modül (`SignalStrengthModule.kt`) JS tarafına şu fonksiyonları sağlar:

| Fonksiyon / olay | Açıklama |
|---|---|
| `getCurrent()` | Anlık tek okuma |
| `startListening()` / `stopListening()` | Sinyal değiştikçe `onSignalChange` olayı gönderir |
| `getThemePreference()` / `setThemePreference()` | Tema tercihini Android SharedPreferences'ta saklar |

5G NSA bağlantılarında LTE ve NR birlikte raporlanır. Bu durumda en yeni teknoloji (NR) seçilir.

### 0–100 puan hesabı

Puan, dBm değerinin bağlantı teknolojisine göre belirlenen aralıktaki yerinden hesaplanır (`src/signal/levels.ts`):

| Teknoloji | 0 puan | 100 puan |
|---|---|---|
| 5G / 4G (RSRP) | −125 dBm | −75 dBm |
| 3G (RSCP) | −115 dBm | −65 dBm |
| 2G (RSSI) | −110 dBm | −60 dBm |

| Puan | Etiket |
|---|---|
| 0 | Sinyal yok |
| 1–20 | Çok zayıf |
| 21–40 | Zayıf |
| 41–60 | Orta |
| 61–80 | İyi |
| 81–100 | Mükemmel |

### Detay değerleri ve ideal aralıklar

| Ekrandaki ad | Teknik ad | Mükemmel | İyi | Orta | Zayıf |
|---|---|---|---|---|---|
| Sinyal gücü | RSRP | ≥ −80 dBm | −80 … −90 | −90 … −100 | < −100 dBm |
| Sinyal kalitesi | RSRQ | ≥ −10 dB | −10 … −15 | −15 … −20 | < −20 dB |
| Parazit oranı | SINR | ≥ 20 dB | 13 … 20 | 0 … 13 | < 0 dB |
| Telefonun çubuk göstergesi | Android seviyesi | 4 | 3 | 2 | 0–1 |

RSRP, RSRQ ve SINR sadece 4G ve 5G bağlantılarda ölçülür. 3G ve 2G'de bu kartlar gizlenir. Açıklama metinleri ve eşikler `src/signal/metrics.ts` dosyasından değiştirilebilir.

### dBm nedir?

dBm, telefona ulaşan sinyalin gücünü 1 miliwatt'a göre ölçen bir birimdir. Değerler her zaman eksidir ve **sıfıra ne kadar yakınsa sinyal o kadar güçlüdür.** Ölçek logaritmik: her 10 dBm'lik fark, sinyal gücünde 10 kat fark demektir. Örneğin −80 dBm, −90 dBm'den 10 kat güçlüdür.

## Bilinen kısıtlar

- **Çift SIM:** Sadece varsayılan SIM'in sinyali ve operatörü gösterilir.
- **Android 9:** dBm ve detay değerleri gösterilmez. Bu sürümde izin istemeyen public API'lerde bu veriler bulunmuyor.
- **Splash ekranı:** Açılış ekranı her zaman koyu. Uygulama içinde açık tema seçilse de açılışta bir an koyu ekran görünür.
- **Operatör adı:** Ad, operatörün yayınladığı haliyle gösterilir. Büyük/küçük harf operatöre göre değişebilir.

## Lisans

MIT. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.