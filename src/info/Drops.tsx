// src/info/drops.ts
// Bağlantı kopma kaydı (saf mantık). Uygulama açıkken internet gidip gelirse ne zaman ve ne kadar
// sürdüğü kaydedilir. "İnternet var" = bir ağa bağlı ve Android internete çıkılabildiğini doğrulamış.
// Uygulama arka plandayken ağ dinlenmez (pil); o aralık izlenmez, öne gelince izleme yeniden başlar.
// Kayıt yalnızca bellektedir; uygulama kapanınca silinir.
import type { NetworkInfo, NetworkType } from '../../modules/signal-strength';

export const MAX_DROPS = 50;
export const MIN_DROP_MS = 1000; // Bundan kısa kesintiler (ör. ağ değiştirirken anlık) sayılmaz

export type Drop = {
  start: number;
  end: number;
  from: NetworkType; // Kopmadan önceki bağlantı
  to: NetworkType; // Geri geldiği bağlantı (farklıysa: Wi-Fi → mobil veri gibi)
};

export type DropState = {
  watchingSince?: number; // İzlemenin başladığı an (ilk "internet var" görüldüğünde)
  down?: { since: number; from: NetworkType }; // Şu anki kopma
  lastType?: NetworkType;
  drops: Drop[]; // En yenisi başta
};

export const EMPTY_DROPS: DropState = { drops: [] };

const online = (i: NetworkInfo) => i.connected && i.validated;

/** Yeni ağ durumunu işler */
export function trackDrops(state: DropState, info: NetworkInfo, now: number): DropState {
  const up = online(info);
  if (state.watchingSince === undefined) {
    // İzleme ilk kez internet görülünce başlar; açılışta internet yoksa bu bir "kopma" sayılmaz
    return up ? { ...state, watchingSince: now, lastType: info.type } : state;
  }
  if (!up) {
    if (state.down) return state;
    return { ...state, down: { since: now, from: state.lastType ?? info.type } };
  }
  if (!state.down) return info.type === state.lastType ? state : { ...state, lastType: info.type };
  const drop: Drop = { start: state.down.since, end: now, from: state.down.from, to: info.type };
  const drops = now - drop.start >= MIN_DROP_MS ? [drop, ...state.drops].slice(0, MAX_DROPS) : state.drops;
  return { ...state, down: undefined, lastType: info.type, drops };
}

/** Uygulama arka plana geçince süren kopma bırakılır (süresi bilinemez), öne gelince izleme yeniden başlar */
export function pauseDrops(state: DropState): DropState {
  return { ...state, watchingSince: undefined, down: undefined };
}

export function dropTotals(drops: Drop[]) {
  return { count: drops.length, totalMs: drops.reduce((a, d) => a + (d.end - d.start), 0) };
}