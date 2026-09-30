import { POWER_UP_COST, type PowerUpKind } from '../core';

/** Persistent currency + owned power-up charges (localStorage-backed). */
export interface Wallet { coins: number; inventory: Record<PowerUpKind, number> }

const KEY = 'sliding-stars-wallet';

export function emptyWallet(): Wallet {
  return { coins: 300, inventory: { demo: 1, wormhole: 1, tractor: 0 } };
}

export function earn(w: Wallet, n: number): Wallet {
  return { ...w, coins: w.coins + Math.max(0, n) };
}

export function canBuy(w: Wallet, kind: PowerUpKind): boolean {
  return w.coins >= POWER_UP_COST[kind];
}

export function buy(w: Wallet, kind: PowerUpKind): Wallet {
  if (!canBuy(w, kind)) return w;
  return { coins: w.coins - POWER_UP_COST[kind], inventory: { ...w.inventory, [kind]: w.inventory[kind] + 1 } };
}

export function useCharge(w: Wallet, kind: PowerUpKind): Wallet {
  if (w.inventory[kind] <= 0) return w;
  return { ...w, inventory: { ...w.inventory, [kind]: w.inventory[kind] - 1 } };
}

export function loadWallet(storage: Storage = localStorage): Wallet {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return emptyWallet();
    const p = JSON.parse(raw) as Partial<Wallet>;
    const base = emptyWallet();
    return {
      coins: p.coins ?? base.coins,
      inventory: { ...base.inventory, ...(p.inventory ?? {}) },
    };
  } catch { return emptyWallet(); }
}

export function saveWallet(w: Wallet, storage: Storage = localStorage): void {
  try { storage.setItem(KEY, JSON.stringify(w)); } catch { /* ignore */ }
}
