// src/i18n/strings.ts
// Uygulamadaki bütün kullanıcı metinleri (Türkçe / İngilizce).
// Yeni metin eklerken iki dile de eklenmeli; TypeScript eksik olanı hata olarak gösterir.

export type Lang = 'tr' | 'en';

export type RatingKey = 'excellent' | 'good' | 'fair' | 'poor';
export type QualityKey = 'none' | 'veryPoor' | 'poor' | 'fair' | 'good' | 'excellent';
export type MetricKey = 'rsrp' | 'rsrq' | 'sinr' | 'systemLevel';
export type NetTypeKey = 'wifi' | 'cellular' | 'ethernet' | 'vpn' | 'other' | 'none';
export type PhaseKey = 'meta' | 'ping' | 'download' | 'upload';

const tr = {
  appName: 'Sinyal Ölçer',
  common: {
    error: 'Bir hata oluştu',
    unknown: 'Bilinmiyor',
  },
  header: {
    toLight: 'Açık temaya geç',
    toDark: 'Koyu temaya geç',
    switchLanguage: 'Switch to English', // Butona dokununca geçilecek dilde yazılır
  },
  tabs: { signal: 'Bağlantı Kontrol', speed: 'Hız Testi' },
  rating: { excellent: 'Mükemmel', good: 'İyi', fair: 'Orta', poor: 'Zayıf' } satisfies Record<RatingKey, string>,
  quality: {
    none: 'Sinyal yok',
    veryPoor: 'Çok zayıf',
    poor: 'Zayıf',
    fair: 'Orta',
    good: 'İyi',
    excellent: 'Mükemmel',
  } satisfies Record<QualityKey, string>,
  signal: {
    androidOnly: 'Şu an yalnızca Android destekleniyor',
    reading: 'Okunuyor…',
    noService: 'Şebeke yok (SIM yok / uçak modu)',
    noData: 'Sinyal bilgisi alınamadı',
    unsupportedOs: 'Bu uygulama Android 9 ve üzeri sürümlerde çalışır',
    details: 'Detaylar',
  },
  metrics: {
    rsrp: {
      title: 'Sinyal gücü',
      techName: 'RSRP',
      description: 'Baz istasyonundan telefona ulaşan sinyalin gücü. Değer eksi olur; sıfıra ne kadar yakınsa sinyal o kadar güçlüdür.',
      ideal: 'İdeal: −80 dBm ve üzeri · Zayıf: −100 dBm altı',
    },
    rsrq: {
      title: 'Sinyal kalitesi',
      techName: 'RSRQ',
      description: 'Sinyalin ne kadar temiz olduğunu gösterir. Sinyal güçlü olsa bile kalabalık ya da girişimli ortamlarda kalite düşebilir.',
      ideal: 'İdeal: −10 dB ve üzeri · Zayıf: −20 dB altı',
    },
    sinr: {
      title: 'Parazit oranı',
      techName: 'SINR',
      description: 'Sinyalin çevredeki parazit ve gürültüye göre ne kadar baskın olduğu. Yüksek değer daha hızlı ve kesintisiz bağlantı demektir.',
      ideal: 'İdeal: 20 dB ve üzeri · Zayıf: 0 dB altı',
    },
    systemLevel: {
      title: 'Telefonun çubuk göstergesi',
      techName: 'Android seviyesi',
      description: "Telefonun üst çubuğunda gördüğünüz sinyal çubuğu sayısı. Üstteki 0–100 puan aynı sinyali doğrudan dBm'den hesapladığı için daha hassastır.",
      ideal: 'İdeal: 3–4 çubuk · Zayıf: 0–1 çubuk',
    },
  } satisfies Record<MetricKey, { title: string; techName: string; description: string; ideal: string }>,
  net: {
    wifi: 'Wi-Fi',
    cellular: 'Mobil Ağ',
    ethernet: 'Ethernet',
    vpn: 'VPN',
    other: 'Diğer',
    none: 'Bağlantı yok',
  } satisfies Record<NetTypeKey, string>,
  phase: {
    meta: 'Sunucu bulunuyor…',
    ping: 'Ping ölçülüyor…',
    download: 'İndirme hızı ölçülüyor…',
    upload: 'Yükleme hızı ölçülüyor…',
  } satisfies Record<PhaseKey, string>,
  speed: {
    gaugeDownload: 'İndirme hızı',
    gaugeFailed: 'Test tamamlanamadı',
    noInternet: 'İnternet bağlantısı yok',
    waitGauge: (s: number) => `Yeni test için ${s} sn bekleyin`,
    tapToStart: 'Testi başlatmak için butona dokunun',
    ping: 'Ping',
    download: 'İndirme',
    upload: 'Yükleme',
    notMeasured: 'Ölçülemedi',
    stop: 'Durdur',
    wait: (s: number) => `Bekleyin (${s} sn)`,
    retest: 'Tekrar Test Et',
    start: 'Testi Başlat',
    lastTest: (when: string) => `Son test: ${when}`,
    rateLimit: (n: number) => `Dakikada en fazla ${n} test yapılabilir.`,
    failed: (msg: string) => `Test tamamlanamadı: ${msg}`,
    uploadFailed: (msg: string) => `Yükleme ölçülemedi: ${msg}`,
    dataUsed: (mb: number) => `Bu test yaklaşık ${mb} MB veri kullandı.`,
    meteredNote: (mb: number) => `Kotalı bağlantıdasınız (mobil veri). Test en fazla yaklaşık ${mb} MB veri kullanır.`,
    explainPing: "Bağlantının tepki süresi. Oyun ve görüntülü görüşmede düşük olması iyidir. ± değeri, ping'in ne kadar dalgalandığını gösterir. İdeal: 20 ms altı.",
    explainDownload: 'İnternetten veri alma hızı: video izleme, sayfa açma, dosya indirme. İdeal: 25 Mbps ve üzeri.',
    explainUpload: 'İnternete veri gönderme hızı: fotoğraf/video paylaşma, görüntülü görüşme. İdeal: 10 Mbps ve üzeri.',
    source: 'Ölçüm sunucusu: Cloudflare (speed.cloudflare.com)',
  },
  conn: {
    infoFailed: (e: string) => `Bağlantı bilgisi alınamadı: ${e}`,
    connected: 'İnternete bağlı',
    notValidated: 'Ağa bağlı, internet erişimi doğrulanmadı',
    type: 'Bağlantı tipi',
    wifiName: 'Wi-Fi adı',
    isp: 'Servis sağlayıcı',
    server: 'Sunucu konumu',
    failed: 'Alınamadı',
    loading: 'Alınıyor…',
    reading: 'Okunuyor…',
    retry: 'Tekrar dene',
    locationOffHint: 'Ad alınamadı. Konum kapalıysa açıp tekrar deneyin',
    show: 'Göster',
    openSettings: 'Ayarlardan izin ver',
    locationHint: 'Android bunun için konum izni istiyor',
  },
  errors: {
    connection: 'Bağlantı hatası',
    timeout: 'Sunucu yanıt vermedi (zaman aşımı)',
    rejected: (phase: string, size: string, status: number) =>
      `${phase} isteği (${size}) sunucu tarafından reddedildi (HTTP ${status})`,
  },
};

export type Strings = typeof tr;

const en: Strings = {
  appName: 'Signal Strength',
  common: {
    error: 'Something went wrong',
    unknown: 'Unknown',
  },
  header: {
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
    switchLanguage: 'Türkçeye geç',
  },
  tabs: { signal: 'Connection', speed: 'Speed Test' },
  rating: { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor' },
  quality: {
    none: 'No signal',
    veryPoor: 'Very poor',
    poor: 'Poor',
    fair: 'Fair',
    good: 'Good',
    excellent: 'Excellent',
  },
  signal: {
    androidOnly: 'Only Android is supported for now',
    reading: 'Reading…',
    noService: 'No network (no SIM / airplane mode)',
    noData: 'Signal information unavailable',
    unsupportedOs: 'This app requires Android 9 or later',
    details: 'Details',
  },
  metrics: {
    rsrp: {
      title: 'Signal strength',
      techName: 'RSRP',
      description: 'Strength of the signal reaching your phone from the cell tower. Values are negative; the closer to zero, the stronger the signal.',
      ideal: 'Ideal: −80 dBm or higher · Poor: below −100 dBm',
    },
    rsrq: {
      title: 'Signal quality',
      techName: 'RSRQ',
      description: 'How clean the signal is. Even a strong signal can have low quality in crowded or noisy areas.',
      ideal: 'Ideal: −10 dB or higher · Poor: below −20 dB',
    },
    sinr: {
      title: 'Signal-to-noise',
      techName: 'SINR',
      description: 'How much the signal stands out from surrounding interference and noise. Higher means faster, more stable connections.',
      ideal: 'Ideal: 20 dB or higher · Poor: below 0 dB',
    },
    systemLevel: {
      title: 'Phone signal bars',
      techName: 'Android level',
      description: 'The number of signal bars shown in your status bar. The 0–100 score above is calculated directly from dBm, so it is more precise.',
      ideal: 'Ideal: 3–4 bars · Poor: 0–1 bars',
    },
  },
  net: {
    wifi: 'Wi-Fi',
    cellular: 'Mobile Network',
    ethernet: 'Ethernet',
    vpn: 'VPN',
    other: 'Other',
    none: 'No connection',
  },
  phase: {
    meta: 'Finding server…',
    ping: 'Measuring ping…',
    download: 'Measuring download speed…',
    upload: 'Measuring upload speed…',
  },
  speed: {
    gaugeDownload: 'Download speed',
    gaugeFailed: 'Test could not be completed',
    noInternet: 'No internet connection',
    waitGauge: (s) => `Wait ${s} s for a new test`,
    tapToStart: 'Tap the button to start the test',
    ping: 'Ping',
    download: 'Download',
    upload: 'Upload',
    notMeasured: 'Not measured',
    stop: 'Stop',
    wait: (s) => `Wait (${s} s)`,
    retest: 'Test Again',
    start: 'Start Test',
    lastTest: (when) => `Last test: ${when}`,
    rateLimit: (n) => `You can run at most ${n} tests per minute.`,
    failed: (msg) => `Test could not be completed: ${msg}`,
    uploadFailed: (msg) => `Upload could not be measured: ${msg}`,
    dataUsed: (mb) => `This test used about ${mb} MB of data.`,
    meteredNote: (mb) => `You are on a metered connection (mobile data). The test uses at most about ${mb} MB.`,
    explainPing: 'Response time of the connection. Lower is better for gaming and video calls. The ± value shows how much the ping varies. Ideal: below 20 ms.',
    explainDownload: 'How fast you receive data: watching videos, opening pages, downloading files. Ideal: 25 Mbps or higher.',
    explainUpload: 'How fast you send data: sharing photos/videos, video calls. Ideal: 10 Mbps or higher.',
    source: 'Test server: Cloudflare (speed.cloudflare.com)',
  },
  conn: {
    infoFailed: (e) => `Could not read connection info: ${e}`,
    connected: 'Connected to the internet',
    notValidated: 'Connected to network, internet access not verified',
    type: 'Connection type',
    wifiName: 'Wi-Fi name',
    isp: 'Service provider',
    server: 'Server location',
    failed: 'Unavailable',
    loading: 'Loading…',
    reading: 'Reading…',
    retry: 'Try again',
    locationOffHint: 'Name unavailable. If location is off, turn it on and try again',
    show: 'Show',
    openSettings: 'Allow in Settings',
    locationHint: 'Android requires location permission for this',
  },
  errors: {
    connection: 'Connection error',
    timeout: 'Server did not respond (timeout)',
    rejected: (phase, size, status) => `${phase} request (${size}) was rejected by the server (HTTP ${status})`,
  },
};

export const STRINGS: Record<Lang, Strings> = { tr, en };

// Tarih/saat biçimi için yerel ayar
export const LOCALE: Record<Lang, string> = { tr: 'tr-TR', en: 'en-GB' };

// Test sunucusu (Cloudflare merkezi) şehir adları
const CITY: Record<string, { tr: string; en: string }> = {
  IST: { tr: 'İstanbul', en: 'Istanbul' },
  ESB: { tr: 'Ankara', en: 'Ankara' },
  ADB: { tr: 'İzmir', en: 'Izmir' },
  FRA: { tr: 'Frankfurt', en: 'Frankfurt' },
  AMS: { tr: 'Amsterdam', en: 'Amsterdam' },
  SOF: { tr: 'Sofya', en: 'Sofia' },
  OTP: { tr: 'Bükreş', en: 'Bucharest' },
  VIE: { tr: 'Viyana', en: 'Vienna' },
  LHR: { tr: 'Londra', en: 'London' },
  CDG: { tr: 'Paris', en: 'Paris' },
  MXP: { tr: 'Milano', en: 'Milan' },
  ATH: { tr: 'Atina', en: 'Athens' },
  TLV: { tr: 'Tel Aviv', en: 'Tel Aviv' },
};

export const cityName = (code: string | undefined, lang: Lang) => (code ? CITY[code]?.[lang] : undefined);