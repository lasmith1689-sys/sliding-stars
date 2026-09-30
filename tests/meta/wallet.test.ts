import { emptyWallet, earn, canBuy, buy, useCharge, loadWallet, saveWallet } from '../../src/meta/wallet';

test('starter wallet has coins and a couple of charges', () => {
  const w = emptyWallet();
  expect(w.coins).toBe(300);
  expect(w.inventory.demo).toBe(1);
});

test('earning adds coins', () => {
  expect(earn(emptyWallet(), 150).coins).toBe(450);
});

test('buying spends coins and grants a charge only when affordable', () => {
  let w = emptyWallet(); // 300 coins
  expect(canBuy(w, 'wormhole')).toBe(true); // 200
  w = buy(w, 'wormhole');
  expect(w.coins).toBe(100);
  expect(w.inventory.wormhole).toBe(2);
  expect(canBuy(w, 'tractor')).toBe(false); // 400 > 100
  expect(buy(w, 'tractor')).toEqual(w); // unaffordable → unchanged
});

test('using a charge decrements it, never below zero', () => {
  let w = { coins: 0, inventory: { demo: 1, wormhole: 0, tractor: 0 } };
  w = useCharge(w, 'demo');
  expect(w.inventory.demo).toBe(0);
  expect(useCharge(w, 'wormhole').inventory.wormhole).toBe(0);
});

test('save/load round-trips through injected storage', () => {
  const store: Record<string, string> = {};
  const fake = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } };
  const w = earn(emptyWallet(), 75);
  saveWallet(w, fake as unknown as Storage);
  expect(loadWallet(fake as unknown as Storage)).toEqual(w);
});
