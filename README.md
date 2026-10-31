# Sinyal Ölçer (Signal Strength)

Telefonun o anki mobil şebeke çekim gücünü **internet bağlantısı gerektirmeden** gösteren, bağlantı varsa **hız testi** de yapabilen Android uygulaması. React Native (Expo) ile yazıldı. Sinyal ve bağlantı bilgisi, Kotlin ile yazılmış yerel bir native modül üzerinden doğrudan Android'den okunuyor.

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
- **Hız testi:** Wi-Fi veya mobil veri bağlıysa ping, indirme ve yükleme hızını ölçer. Bağlantı tipi, servis sağlayıcı ve test sunucusunun konumu da gösterilir. Ölçüm Cloudflare sunucularıyla yapılır.
- **Otomatik başlayan test:** "Hız Testi" sekmesi açılınca test kendiliğinden başlar. Dakikada en fazla 3 test yapılabilir.
- **İki sekme:** "Bağlantı Kontrol" (sinyal) ve "Hız Testi". Sekmeler arasında sola / sağa kaydırarak geçilebilir.
- **Bağlantı değişince yeni test:** Wi-Fi ile mobil ağ arasında geçişte ve bağlantı geri geldiğinde hız testi kendiliğinden tekrarlanır. Bağlantı kopunca değerler temizlenir.
- **Türkçe / İngilizce:** Uygulama telefon dilinde açılır (Türkçe değilse İngilizce). Üst paneldeki dil butonu o anki dili gösterir (Türkçe → "TR", İngilizce → "EN"); dokununca bütün metinler anında diğer dile geçer ve seçim hatırlanır. Ana ekrandaki uygulama adı telefon diline göre "Sinyal Ölçer" / "Signal Strength" olur.
- **Son test zamanı:** "Tekrar Test Et" butonunun altında son testin tarihi ve saati görünür.
- **Tek dokunuşla tema:** Üst paneldeki buton o anki temayı gösterir (koyu temada 🌙, açık temada ☀️); dokununca açık ve koyu tema arasında geçiş yapar. Uzun basınca telefonun temasına döner. Seçim hatırlanır.
- **Gereksiz izin istemez:** Telefon izni gerekmez. Konum izni yalnızca Wi-Fi adını görmek için, kullanıcı "Göster"e dokunduğunda istenir (Android bunu zorunlu tutuyor). Sinyal sekmesi internet kullanmaz. İnternet yalnızca kullanıcı hız testini başlattığında kullanılır. Uygulama hiçbir veri toplamaz veya saklamaz.
- **Mobil veride veri koruması:** Hız testi mobil veride kendiliğinden başlamaz. Ne kadar veri kullanacağını anlatan bir bilgi kutusu gösterilir, test kullanıcı başlatınca çalışır ve en fazla yaklaşık 100 MB kullanır. Wi-Fi'de test otomatik başlar.
- **Çift SIM desteği:** Sinyal, teknoloji ve operatör, mobil verinin kullanıldığı SIM'den okunur. Veri SIM'i değiştirilince uygulama yeni SIM'e geçer.
- **Canlı bağlantı bilgisi:** Hız Testi kartındaki `Turkcell · 4G (LTE)` bilgisi sinyal değiştikçe güncellenir (ör. 4G → 5G geçişi hemen görünür).
- **Pil dostu:** Uygulama arka plandayken sinyal ve ağ dinleyicileri durur, öne gelince güncel değer okunup yeniden başlar.
- **Gizlilik politikası:** Sayfa altındaki "Gizlilik politikası" bağlantısı [PRIVACY.md](PRIVACY.md) dosyasını açar.
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
| Hız testi | Cloudflare (`speed.cloudflare.com`), ölçüm yöntemi Cloudflare'in açık kaynak [`@cloudflare/speedtest`](https://github.com/cloudflare/speedtest) kütüphanesini izler |
| Ek bağımlılık | Yok. Sadece `expo`, `expo-status-bar`, `expo-splash-screen` ve `expo-system-ui` kullanılıyor. |

## Proje yapısı

```
├─ App.tsx                     Üst panel, tema butonu, sekmeler, sinyal ekranı, hata ekranı
├─ index.ts                    Giriş noktası (App.tsx'i başlatır)
├─ app.json                    Uygulama adı, sürüm, paket adı, ikon ve splash ayarları
├─ assets/images/              Uygulama ikonu ve splash görselleri
├─ locales/tr.json            Ana ekrandaki Türkçe uygulama adı
├─ PRIVACY.md                  Gizlilik politikası (Türkçe / İngilizce)
├─ src/
│  ├─ appInfo.ts              Sürüm, alt bilgi yazısı, gizlilik politikası adresi
│  ├─ AppFooter.tsx           Sayfa altı: sürüm + gizlilik politikası bağlantısı
│  ├─ i18n/
│  │  ├─ strings.ts            Bütün metinler (Türkçe / İngilizce)
│  │  └─ index.tsx             Dil seçimi (LanguageProvider, useI18n)
│  ├─ theme.tsx                Açık/koyu renk paletleri, tema tercihi (ThemeProvider)
│  ├─ speedtest/
│  │  ├─ cloudflare.ts         Hız testi motoru (ping, indirme, yükleme, sunucu bilgisi)
│  │  ├─ useNetwork.ts         Aktif bağlantıyı (Wi-Fi / mobil veri) izleyen hook
│  │  └─ SpeedTestScreen.tsx   Hız testi sekmesi
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

**Gizlilik politikası:** Uygulama konum izni istediği için Play Console zorunlu tutuyor. Play Console → *Uygulama içeriği → Gizlilik politikası* alanına şu adres girilir:
`https://github.com/azatates7/SignalStrength/blob/main/PRIVACY.md` (repo herkese açık olmalı). Uygulamaya izin, sunucu veya veri saklama eklenirse `PRIVACY.md` ve *Veri güvenliği* formu da güncellenmeli.

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
| `getNetworkInfo()` / `startNetworkListening()` | Aktif bağlantının tipi (Wi-Fi, mobil veri…) ve değişiklikleri |
| `getThemePreference()` / `setThemePreference()` | Tema tercihini Android SharedPreferences'ta saklar |

5G NSA bağlantılarında LTE ve NR birlikte raporlanır. Bu durumda en yeni teknoloji (NR) seçilir.

Çift SIM'li telefonlarda okuma, `SubscriptionManager.getDefaultDataSubscriptionId()` ile bulunan mobil veri SIM'i üzerinden yapılır. Uygulama arka plana geçince dinleyiciler durdurulur, öne gelince yeniden başlatılır.

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

### Hız testi

1. **Sunucu bilgisi:** `speed.cloudflare.com/meta` adresinden servis sağlayıcı adı ve en yakın Cloudflare sunucusunun konumu alınır.
2. **Ping:** 11 küçük istek gönderilir. İlki bağlantı kurulumunu içerdiği için sayılmaz. Kalanların medyanı ping, ardışık farkların ortalaması dalgalanma (jitter) olarak gösterilir. Sunucunun işlem süresi `Server-Timing` başlığından okunup düşülür.
3. **İndirme / yükleme:** 100 KB'tan başlayarak büyüyen dosyalar aktarılır. Bir aktarım yaklaşık 1 saniyeyi geçince daha büyük boyuta geçilmez. Her yön en fazla yaklaşık 10 saniye sürer. Sonuç, anlamlı uzunluktaki ölçümlerin 90. yüzdelik değeridir.

| | Mükemmel | İyi | Orta | Zayıf |
|---|---|---|---|---|
| Ping | ≤ 20 ms | ≤ 50 ms | ≤ 100 ms | > 100 ms |
| İndirme | ≥ 100 Mbps | ≥ 25 Mbps | ≥ 5 Mbps | < 5 Mbps |
| Yükleme | ≥ 50 Mbps | ≥ 10 Mbps | ≥ 2 Mbps | < 2 Mbps |

### dBm nedir?

dBm, telefona ulaşan sinyalin gücünü 1 miliwatt'a göre ölçen bir birimdir. Değerler her zaman eksidir ve **sıfıra ne kadar yakınsa sinyal o kadar güçlüdür.** Ölçek logaritmik: her 10 dBm'lik fark, sinyal gücünde 10 kat fark demektir. Örneğin −80 dBm, −90 dBm'den 10 kat güçlüdür.

## Bilinen kısıtlar

- **Çift SIM:** Aynı anda yalnızca mobil veri SIM'inin sinyali gösterilir; diğer SIM gösterilmez.
- **Android 9:** dBm ve detay değerleri gösterilmez. Bu sürümde izin istemeyen public API'lerde bu veriler bulunmuyor.
- **Splash ekranı:** Açılış ekranı her zaman koyu. Uygulama içinde açık tema seçilse de açılışta bir an koyu ekran görünür.
- **Operatör adı:** Ad, operatörün yayınladığı haliyle gösterilir. Büyük/küçük harf operatöre göre değişebilir.
- **Hız testi sonuçları:** Ölçüm tek bir Cloudflare sunucusuna yapılır. Speedtest.net gibi farklı sunucular kullanan uygulamalarla sonuçlar birebir aynı olmayabilir.
- **Wi-Fi adı (SSID):** Android bunun için konum izni ve açık konum servisi istiyor. İzin verilmezse ad gösterilmez, test yine çalışır.

## Lisans

MIT © 2026 Azat Ateş. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.