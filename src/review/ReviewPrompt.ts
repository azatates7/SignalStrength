// Uygulama içi değerlendirme ne zaman istensin? (saf mantık, test edilebilir)
// - İlk kez: 3. başarılı hız testinden sonra, sonuç iyiyse (indirme ≥ 10 Mbps). Kötü bir bağlantıda
//   kullanıcı sonucu uygulamaya yükleyebilir; o anda sormak düşük puan getirir.
// - Tekrar: en erken 120 gün ve 20 başarılı test sonra. Kullanıcının puan verip vermediğini Play
//   bildirmez; Play ayrıca kendi kotasıyla pencereyi çoğu zaman göstermez.
export type ReviewState = {
  successes: number; // Başarılı test sayısı
  askedAt?: number; // Son sorulduğu zaman (ms)
  askedAtCount?: number; // Sorulduğundaki başarılı test sayısı
};

export const FIRST_ASK_AFTER = 3;
export const GOOD_DOWNLOAD_MBPS = 10;
export const REASK_AFTER_DAYS = 120;
export const REASK_AFTER_TESTS = 20;
const DAY = 24 * 60 * 60 * 1000;

/** Saklanan JSON'u okur; bozuk / boşsa sıfırdan başlar */
export function parseReviewState(json: string | null | undefined): ReviewState {
  try {
    const v = json ? JSON.parse(json) : undefined;
    if (v && typeof v.successes === 'number' && v.successes >= 0) {
      return {
        successes: v.successes,
        askedAt: typeof v.askedAt === 'number' ? v.askedAt : undefined,
        askedAtCount: typeof v.askedAtCount === 'number' ? v.askedAtCount : undefined,
      };
    }
  } catch {
    // Bozuk kayıt: yok say
  }
  return { successes: 0 };
}

/** Başarılı bir testi kaydeder; yeni durumu ve şimdi sorulup sorulmayacağını döner */
export function recordSuccess(
  state: ReviewState,
  now: number,
  downloadMbps: number | undefined,
): { state: ReviewState; ask: boolean } {
  const successes = state.successes + 1;
  const good = (downloadMbps ?? 0) >= GOOD_DOWNLOAD_MBPS;
  const due =
    state.askedAt === undefined
      ? successes >= FIRST_ASK_AFTER
      : now - state.askedAt >= REASK_AFTER_DAYS * DAY && successes - (state.askedAtCount ?? 0) >= REASK_AFTER_TESTS;
  const ask = good && due;
  return {
    state: ask ? { successes, askedAt: now, askedAtCount: successes } : { ...state, successes },
    ask,
  };
}