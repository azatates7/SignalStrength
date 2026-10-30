// src/speedtest/rateLimit.ts
// Hız testi sınırı: 1 dakika içinde en fazla 3 test (kayan pencere).
// Sınır uygulama açık kaldığı sürece geçerlidir; uygulama tamamen kapatılınca sıfırlanır.

export const MAX_TESTS = 3;
export const WINDOW_MS = 60_000;

const starts: number[] = [];

function prune(now: number) {
  while (starts.length && now - starts[0] >= WINDOW_MS) starts.shift();
}

/** Yeni test için kaç ms beklenmeli (0 = hemen başlatılabilir) */
export function waitMs(now = Date.now()): number {
  prune(now);
  return starts.length < MAX_TESTS ? 0 : starts[0] + WINDOW_MS - now;
}

/** Bir testin başladığını kaydet */
export function recordStart(now = Date.now()) {
  prune(now);
  starts.push(now);
}