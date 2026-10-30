// src/speedtest/cloudflare.ts
// Cloudflare'in hız testi sunucularıyla (speed.cloudflare.com) ping / indirme / yükleme ölçümü.
// Uç noktalar ve süre hesabı Cloudflare'in açık kaynak @cloudflare/speedtest (MIT) kütüphanesini izler.

const BASE = 'https://speed.cloudflare.com';

export type Phase = 'meta' | 'ping' | 'download' | 'upload';

export type ConnectionMeta = {
  isp?: string;         // Servis sağlayıcı (marka adı), ör. "D-SMART"
  ispRaw?: string;      // Ağın kayıtlı adı, ör. "DOL ATAKOY - VAE ADSL DYNAMIC"
  asn?: number;         // Ağ numarası, ör. 12978
  serverCity?: string;  // Test sunucusunun şehri
  serverCode?: string;  // Sunucu kodu (IATA), ör. "IST"
  serverCountry?: string;
};

export type SpeedResult = {
  pingMs: number;
  jitterMs: number;
  downloadMbps: number;
  uploadMbps?: number;  // Yükleme ölçülemezse boş kalır
  uploadError?: SpeedErrorInfo; // Yükleme neden ölçülemedi
  bytesUsed: number; // Test boyunca harcanan veri (indirme + yükleme)
};

export type Progress = {
  phase: Phase;
  mbps?: number;   // O anki hız (indirme/yükleme sırasında)
  pingMs?: number;
  partial?: Partial<SpeedResult>;
};

/** Sunucu isteği reddetti (403, 429 ...) */
export class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

/** Hata bilgisi; ekrandaki metin dile göre src/i18n/strings.ts → errors ile üretilir */
export type SpeedErrorInfo = {
  code: 'connection' | 'timeout' | 'rejected' | 'unknown';
  phase?: 'download' | 'upload';
  bytes?: number;
  status?: number;
  message?: string; // code === 'unknown' için ham mesaj
};

export class SpeedError extends Error {
  constructor(public info: SpeedErrorInfo) {
    super(info.message ?? info.code);
  }
}

export const toErrorInfo = (e: unknown): SpeedErrorInfo =>
  e instanceof SpeedError ? e.info : { code: 'unknown', message: e instanceof Error ? e.message : String(e) };

export class TestCancelled extends Error {
  constructor() {
    super('Test durduruldu');
  }
}

/** Testi dışarıdan durdurmak için */
export class CancelToken {
  cancelled = false;
  current?: XMLHttpRequest;
  cancel() {
    this.cancelled = true;
    this.current?.abort();
  }
}


type Timed = {
  status: number;
  tSend: number;
  tHeaders: number;
  tEnd: number;
  serverMs: number; // Sunucunun isteği işleme süresi (Server-Timing başlığından)
};

const now = () => performance.now();

function parseServerTiming(header: string | null): number {
  if (!header) return 0;
  const m = header.match(/(?:^|,\s*)cfReq(?:uest)?Dur(?:ation)?;\s*dur=([0-9.]+)/i);
  return m ? Number(m[1]) : 0;
}

function request(
  method: 'GET' | 'POST',
  url: string,
  token: CancelToken,
  body?: string,
  // Canlı hız için: o ana kadar aktarılan bayt ve aktarımın başlangıcından beri geçen süre
  onLoaded?: (loadedBytes: number, elapsedMs: number) => void,
): Promise<Timed> {
  return new Promise((resolve, reject) => {
    if (token.cancelled) return reject(new TestCancelled());
    const xhr = new XMLHttpRequest();
    token.current = xhr;
    let tHeaders = 0;
    let tSend = 0;
    xhr.open(method, url);
    xhr.setRequestHeader('Referer', `${BASE}/`);
    // React Native (Android), gövdeli istekte Content-Type yoksa isteği hiç göndermez
    // ve bunu genel bir "bağlantı hatası" olarak bildirir
    if (body !== undefined) xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
    // İndirilen veri JS belleğine alınmasın diye blob olarak tutulur
    if (method === 'GET') xhr.responseType = 'blob';
    xhr.timeout = 30000;
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 2 && !tHeaders) tHeaders = now();
    };
    if (onLoaded) {
      // İndirmede akış başlıklar gelince başlar; yüklemede gönderimle başlar
      xhr.onprogress = (e) => onLoaded(e.loaded, now() - (tHeaders || tSend));
      if (xhr.upload) xhr.upload.onprogress = (e) => onLoaded(e.loaded, now() - tSend);
    }
    xhr.onload = () => {
      const tEnd = now();
      const blob = xhr.response as { close?: () => void } | null;
      blob?.close?.(); // Native taraftaki indirilen veriyi hemen serbest bırak
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new HttpError(xhr.status));
        return;
      }
      resolve({
        status: xhr.status,
        tSend,
        tHeaders: tHeaders || tEnd,
        tEnd,
        serverMs: parseServerTiming(xhr.getResponseHeader('server-timing')),
      });
    };
    xhr.onerror = () => reject(token.cancelled ? new TestCancelled() : new SpeedError({ code: 'connection' }));
    xhr.ontimeout = () => reject(new SpeedError({ code: 'timeout' }));
    xhr.onabort = () => reject(new TestCancelled());
    tSend = now();
    xhr.send(body ?? null);
  });
}

// Cloudflare ağın kayıtlı (AS) adını verir: D-Smart için "DOL ATAKOY - VAE ADSL DYNAMIC" gibi.
// Türkiye'deki yaygın sağlayıcılar için kullanıcının tanıdığı marka adı gösterilir.
const BRAND_BY_ASN: Record<number, string> = {
  9121: 'Türk Telekom',
  12978: 'D-SMART',
  12735: 'TurkNet',
  15897: 'Vodafone',
  16135: 'TURKCELL',
  20978: 'Türk Telekom Mobil',
  34984: 'Superonline',
  47524: 'Türksat Kablonet',
};

export async function fetchMeta(): Promise<ConnectionMeta> {
  const res = await fetch(`${BASE}/meta`, { headers: { Referer: `${BASE}/` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  // "colo" bazı sürümlerde metin ("IST"), bazılarında nesne ({ iata, city, cca2 })
  const colo = typeof j.colo === 'string' ? { iata: j.colo } : (j.colo ?? {});
  const code: string | undefined = colo.iata;
  const asn = typeof j.asn === 'number' ? j.asn : Number(j.asn) || undefined;
  return {
    isp: (asn && BRAND_BY_ASN[asn]) || j.asOrganization,
    ispRaw: j.asOrganization,
    asn,
    serverCode: code,
    serverCity: colo.city, // Türkçe/İngilizce ad ekranda sunucu kodundan üretilir (cityName)
    serverCountry: colo.cca2,
  };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
};

// Kısa ölçümler bağlantı kurma gecikmesinden etkilenir; uzun ölçümlerin üst %10'u gerçek hıza yakındır
const percentile90 = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.9))] ?? 0;
};

async function measurePing(token: CancelToken, onProgress: (p: Progress) => void) {
  const samples: number[] = [];
  for (let i = 0; i < 11; i++) {
    const r = await request('GET', `${BASE}/__down?bytes=0`, token);
    if (i === 0) continue; // İlk istek bağlantı kurulumunu içerir, sayılmaz
    samples.push(Math.max(0, r.tHeaders - r.tSend - r.serverMs));
    onProgress({ phase: 'ping', pingMs: median(samples) });
  }
  const pingMs = median(samples);
  let jitter = 0;
  for (let i = 1; i < samples.length; i++) jitter += Math.abs(samples[i] - samples[i - 1]);
  return { pingMs, jitterMs: samples.length > 1 ? jitter / (samples.length - 1) : 0 };
}

// Boyutlar küçükten büyüğe denenir; bir aktarım ~1 sn'yi geçince daha büyüğüne geçilmez.
// Cloudflare 25 MB'ın üzerindeki istekleri (ör. 100 MB) HTTP 403 ile reddediyor; en büyük boyut 25 MB.
// Çok hızlı bağlantılarda 25 MB 1 sn'den kısa sürerse aynı boyut süre dolana kadar tekrarlanır.
const DOWN_SIZES = [1e5, 1e6, 1e7, 2.5e7];
const UP_SIZES = [1e5, 1e6, 1e7, 2.5e7];
const REPS = 3;
const REPS_LARGEST = 8;
const ENOUGH_MS = 1000;
const PHASE_BUDGET_MS = 10000;


async function measureBandwidth(
  dir: 'download' | 'upload',
  token: CancelToken,
  pingMs: number,
  maxBytes: number,
  onProgress: (p: Progress) => void,
) {
  const sizes = dir === 'download' ? DOWN_SIZES : UP_SIZES;
  const results: { mbps: number; ms: number }[] = [];
  const started = now();
  let used = 0;

  outer: for (const [i, size] of sizes.entries()) {
    if (used + size > maxBytes) break;
    let longest = 0;
    const reps = i === sizes.length - 1 ? REPS_LARGEST : REPS;
    for (let rep = 0; rep < reps; rep++) {
      if (now() - started > PHASE_BUDGET_MS || used + size > maxBytes) break;
      const url = `${BASE}/${dir === 'download' ? '__down' : '__up'}?bytes=${size}`;
      const body = dir === 'upload' ? payload(size) : undefined;
      let r: Timed;
      try {
        r = await request(dir === 'download' ? 'GET' : 'POST', url, token, body, (loaded, ms) => {
          if (ms > 50 && loaded > 0) onProgress({ phase: dir, mbps: (loaded * 8) / ms / 1000 });
        });
      } catch (e) {
        // Daha önce başarılı ölçüm varsa reddedilen bir istek bu aşamayı bozmasın; eldekiyle devam et
        if (!(e instanceof TestCancelled) && results.length > 0) break outer;
        if (e instanceof HttpError) {
          throw new SpeedError({ code: 'rejected', phase: dir, bytes: size, status: e.status });
        }
        throw e;
      }
      used += size;
      // İndirme: başlıklar geldikten sonra verinin akış süresi.
      // Yükleme: gönderimden yanıt başlıklarına kadar geçen süreden bir gidiş-dönüş (ping) ve sunucu süresi düşülür.
      const ms =
        dir === 'download' && r.tEnd - r.tHeaders > 5
          ? r.tEnd - r.tHeaders
          : Math.max(1, r.tHeaders - r.tSend - pingMs - r.serverMs);
      const mbps = (size * 8) / ms / 1000;
      results.push({ mbps, ms });
      longest = Math.max(longest, ms);
      onProgress({ phase: dir, mbps });
    }
    if (longest > ENOUGH_MS || now() - started > PHASE_BUDGET_MS) break;
  }

  const meaningful = results.filter((x) => x.ms >= 150).map((x) => x.mbps);
  const mbps = percentile90(meaningful.length ? meaningful : results.map((x) => x.mbps));
  return { mbps, used };
}

const payloadCache = new Map<number, string>();
function payload(size: number) {
  let p = payloadCache.get(size);
  if (!p) {
    p = '0'.repeat(size);
    payloadCache.set(size, p);
  }
  return p;
}

/**
 * Tam test: ping → indirme → yükleme.
 * maxBytesPerDirection: kotalı bağlantıda (mobil veri) harcanacak veriyi sınırlamak için.
 */
export async function runSpeedTest(
  token: CancelToken,
  onProgress: (p: Progress) => void,
  maxBytesPerDirection: number,
): Promise<SpeedResult> {
  const { pingMs, jitterMs } = await measurePing(token, onProgress);
  onProgress({ phase: 'download', partial: { pingMs, jitterMs } });

  const down = await measureBandwidth('download', token, pingMs, maxBytesPerDirection, onProgress);
  onProgress({ phase: 'upload', partial: { pingMs, jitterMs, downloadMbps: down.mbps } });

  // Yükleme başarısız olsa da ping ve indirme sonuçları kaybolmasın
  try {
    const up = await measureBandwidth('upload', token, pingMs, maxBytesPerDirection, onProgress);
    return { pingMs, jitterMs, downloadMbps: down.mbps, uploadMbps: up.mbps, bytesUsed: down.used + up.used };
  } catch (e) {
    if (e instanceof TestCancelled) throw e;
    return {
      pingMs,
      jitterMs,
      downloadMbps: down.mbps,
      uploadError: toErrorInfo(e),
      bytesUsed: down.used,
    };
  }
}