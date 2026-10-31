# Gizlilik Politikası — Sinyal Ölçer

*English version below.*

**Yürürlük tarihi:** 31 Ekim 2026
**Uygulama:** Sinyal Ölçer (Signal Strength), Android
**Geliştirici:** Azat Ateş
**İletişim:** https://github.com/azatates7/SignalStrength/issues

Sinyal Ölçer, telefonunuzun mobil şebeke çekim gücünü gösteren ve isteğe bağlı olarak internet hız testi yapan bir uygulamadır. Bu politika, uygulamanın hangi bilgilere eriştiğini, bunları nasıl kullandığını ve kimlerle paylaştığını açıklar.

## Özet

- Hesap oluşturma, giriş, reklam veya analiz (istatistik) aracı **yoktur**.
- Geliştirici olarak sizinle ilgili **hiçbir veriyi toplamıyor, saklamıyor ve satmıyoruz**.
- Ölçümler telefonunuzda gösterilir, bir sunucuya kaydedilmez.
- İnternet yalnızca hız testi için ve test sunucusuyla (Cloudflare) iletişim kurmak için kullanılır.

## Uygulamanın eriştiği bilgiler

### 1. Mobil şebeke ve sinyal bilgisi
Sinyal gücü (dBm, RSRP, RSRQ, SINR), bağlantı teknolojisi (2G/3G/4G/5G) ve operatör adı Android'den okunur. Bu bilgiler **yalnızca ekranda gösterilir**; telefonunuzdan dışarı gönderilmez ve saklanmaz. Çift SIM'li telefonlarda mobil verinin kullanıldığı SIM'in bilgisi okunur.

### 2. Bağlantı bilgisi
Wi-Fi'ye mi mobil veriye mi bağlı olduğunuz ve bağlantının kotalı (mobil veri) olup olmadığı Android'den okunur. Bu bilgi, hız testinin mobil veride kendiliğinden başlamaması ve ekranda bağlantı tipinin gösterilmesi için kullanılır. Telefonunuzdan dışarı gönderilmez.

### 3. Wi-Fi ağ adı ve konum izni (isteğe bağlı)
Android, bağlı olduğunuz Wi-Fi ağının adını (SSID) yalnızca konum izni verilmiş uygulamalara gösterir. Bu nedenle uygulama, **yalnızca siz "Göster"e dokunduğunuzda** konum izni ister.

- Konum izni **sadece Wi-Fi adını ekranda göstermek için** kullanılır.
- Uygulama konumunuzu (GPS, koordinat, adres) **okumaz, kaydetmez ve hiçbir yere göndermez**.
- İzni vermeseniz de uygulamanın diğer tüm özellikleri çalışır.
- İzni istediğiniz zaman telefonunuzun Ayarlar > Uygulamalar bölümünden geri alabilirsiniz.

### 4. İnternet hız testi ve Cloudflare
Hız testi, Cloudflare, Inc.'in hız testi sunucularıyla (speed.cloudflare.com) yapılır. Test sırasında:

- Telefonunuz Cloudflare'e ölçüm için veri gönderir ve alır. Her internet bağlantısında olduğu gibi Cloudflare, **IP adresinizi** ve isteğin teknik bilgilerini (zaman, istek boyutu gibi) görür.
- Cloudflare'den servis sağlayıcınızın adı (ör. D-SMART, Turkcell) ve test sunucusunun konumu alınır ve **yalnızca ekranda gösterilir**.
- Test sonuçları (ping, indirme, yükleme) **yalnızca telefonunuzda, uygulama açıkken** tutulur; uygulama kapanınca silinir ve hiçbir sunucuya kaydedilmez.

Cloudflare'in bu bilgileri nasıl işlediği Cloudflare'in kendi gizlilik politikasına tabidir: https://www.cloudflare.com/privacypolicy/

Hız testi Wi-Fi'de "Hız Testi" sekmesi açıldığında kendiliğinden başlar. **Mobil veride kendiliğinden başlamaz**, siz başlatırsınız; bir test mobil verinizden en fazla yaklaşık 100 MB kullanabilir.

## Telefonda saklanan bilgiler

Uygulama, yalnızca sizin seçtiğiniz **tema** (açık/koyu) ve **dil** (Türkçe/İngilizce) tercihini telefonunuzda saklar. Bu bilgiler telefonunuzdan dışarı gönderilmez ve uygulamayı kaldırdığınızda silinir.

## Uygulamanın kullandığı izinler

| İzin | Neden |
|---|---|
| İnternet | Hız testi |
| Ağ durumunu görme | Wi-Fi / mobil veri ayrımı, bağlantı var mı |
| Wi-Fi durumunu görme | Wi-Fi ağ adını okumak |
| Konum (yaklaşık / hassas) | Yalnızca Wi-Fi adını göstermek için, siz isterseniz |

Sinyal gücünü okumak için ek bir izin gerekmez.

## Çocukların gizliliği

Uygulama 13 yaşın altındaki çocuklara yönelik değildir ve kimseden bilerek kişisel veri toplamaz.

## Değişiklikler

Bu politika değişirse güncel hali bu sayfada, yeni yürürlük tarihiyle yayınlanır.

## İletişim

Sorularınız için: https://github.com/azatates7/SignalStrength/issues

---

# Privacy Policy — Signal Strength

**Effective date:** October 31, 2026
**App:** Signal Strength (Sinyal Ölçer), Android
**Developer:** Azat Ateş
**Contact:** https://github.com/azatates7/SignalStrength/issues

Signal Strength shows your phone's mobile network signal strength and can optionally run an internet speed test. This policy explains what information the app accesses, how it is used and with whom it is shared.

## Summary

- There are **no** accounts, sign-ins, ads or analytics tools.
- As the developer, we **do not collect, store or sell any data about you**.
- Measurements are shown on your phone and are not saved to any server.
- The internet is used only for the speed test, to communicate with the test server (Cloudflare).

## Information the app accesses

### 1. Mobile network and signal information
Signal strength (dBm, RSRP, RSRQ, SINR), connection technology (2G/3G/4G/5G) and the operator name are read from Android. This information is **only displayed on screen**; it is not sent off your phone and is not stored. On dual-SIM phones, the SIM used for mobile data is read.

### 2. Connection information
Whether you are on Wi-Fi or mobile data, and whether the connection is metered (mobile data), is read from Android. It is used to keep the speed test from starting automatically on mobile data and to show the connection type. It is not sent off your phone.

### 3. Wi-Fi network name and location permission (optional)
Android only reveals the name (SSID) of the connected Wi-Fi network to apps that have location permission. The app therefore requests location permission **only when you tap "Show"**.

- Location permission is used **only to display the Wi-Fi name**.
- The app **does not read, store or send** your location (GPS, coordinates, address).
- All other features work without this permission.
- You can revoke it at any time in your phone's Settings > Apps.

### 4. Internet speed test and Cloudflare
The speed test uses Cloudflare, Inc.'s speed test servers (speed.cloudflare.com). During a test:

- Your phone sends and receives data to/from Cloudflare for the measurement. As with any internet connection, Cloudflare sees your **IP address** and technical request information (such as time and request size).
- Your service provider's name (e.g. D-SMART, Turkcell) and the test server location are obtained from Cloudflare and **only displayed on screen**.
- Test results (ping, download, upload) are kept **only on your phone while the app is open**; they are deleted when the app closes and are never saved to a server.

How Cloudflare processes this information is governed by Cloudflare's privacy policy: https://www.cloudflare.com/privacypolicy/

On Wi-Fi, the speed test starts automatically when you open the "Speed Test" tab. **On mobile data it does not start automatically**; you start it yourself, and one test can use up to about 100 MB of mobile data.

## Information stored on your phone

The app stores only your chosen **theme** (light/dark) and **language** (Turkish/English) on your phone. This is never sent off your phone and is deleted when you uninstall the app.

## Permissions used

| Permission | Why |
|---|---|
| Internet | Speed test |
| View network state | Wi-Fi / mobile data detection, connectivity |
| View Wi-Fi state | Reading the Wi-Fi network name |
| Location (approximate / precise) | Only to show the Wi-Fi name, if you choose to |

Reading signal strength requires no additional permission.

## Children's privacy

The app is not directed at children under 13 and does not knowingly collect personal data from anyone.

## Changes

If this policy changes, the updated version will be published on this page with a new effective date.

## Contact

For questions: https://github.com/azatates7/SignalStrength/issues