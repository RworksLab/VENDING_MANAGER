// =============================================================
// 在庫の操作（仕入れ・補充・回収）。すべて検証してから update() で反映する。
// 倉庫は「商品ID@版(rev)」ごとのロットで管理する。商品を編集すると版が上がり、
// 編集前に仕入れた在庫は旧仕様のロットとして別に残る（仕様書 3-4）。
// =============================================================
import { update, getState, snapshotOf } from './state.js';
import { MACHINE_MODELS, capOf, LOCATIONS, SHOP, BALANCE, upgradeOf, upgradeCost, findLocation } from './config.js';
import { makeMachine, addNotice } from './state.js';
import { clone } from './util.js';
import { salePrice } from './events.js';

export const lotKey = (snap) => `${snap.productId}@${snap.rev}`;
export const slotCap = (m) => capOf(m);
const HISTORY_MAX = 300;

/** 倉庫のロット一覧（数量 > 0） */
export function lots(s = getState()) {
  return Object.entries(s.warehouse).filter(([, w]) => w.qty > 0).map(([key, w]) => ({ key, ...w }));
}

export const lotQty = (s, key) => s.warehouse[key]?.qty || 0;

/**
 * 仕入れ。cart = [{ productId, qty }]。所持金が足りなければ何もしない。
 * 戻り値: { ok, total, reason }
 */
export function purchase(cart) {
  const s = getState();
  const lines = cart
    .map(({ productId, qty }) => ({ p: s.products.find((x) => x.id === productId), qty: Math.floor(qty) }))
    .filter((l) => l.p && l.qty > 0);
  if (!lines.length) return { ok: false, reason: 'empty' };
  const price = (p) => salePrice(s, p.unitCost);   // 仕入れ応援セール中は割引
  const total = lines.reduce((a, l) => a + price(l.p) * l.qty, 0);
  if (total > s.money) return { ok: false, reason: 'money', total };

  update((st) => {
    const now = Date.now();
    st.money -= total;
    st.stats.totalCost = (st.stats.totalCost || 0) + total;
    for (const { p, qty } of lines) {
      const prod = st.products.find((x) => x.id === p.id);
      const snap = snapshotOf(prod);
      const key = lotKey(snap);
      const lot = st.warehouse[key] || (st.warehouse[key] = { qty: 0, snap, unitCost: prod.unitCost });
      lot.qty += qty;
      const unit = price(prod);
      st.today.cost = (st.today.cost || 0) + unit * qty;
      st.purchaseHistory.unshift({ at: now, productId: prod.id, name: prod.name, qty, unitCost: unit, total: unit * qty });
    }
    st.purchaseHistory.length = Math.min(st.purchaseHistory.length, HISTORY_MAX);
  });
  return { ok: true, total };
}

/**
 * 補充。plan = [{ slot, key, qty }]。
 * 空きスロットには key のロットを陳列し、陳列中のスロットには同じロットのみ追加できる。
 * 収納上限・倉庫の在庫を超える分は切り詰める。戻り値: 補充した本数
 */
export function refill(machineId, plan) {
  let moved = 0;
  update((st) => {
    const m = st.machines.find((x) => x.id === machineId);
    if (!m) return;
    const cap = slotCap(m);
    for (const { slot, key, qty } of plan) {
      const sl = m.slots[slot];
      const lot = st.warehouse[key];
      if (!sl || !lot || qty <= 0) continue;
      if (sl.item && lotKey(sl.item) !== key) continue;            // 別の商品は入れられない
      const n = Math.min(Math.floor(qty), cap - (sl.item ? sl.stock : 0), lot.qty);
      if (n <= 0) continue;
      if (!sl.item) {                                               // 空きスロットに陳列
        sl.item = clone(lot.snap);
        sl.stock = 0;
        sl.price = st.products.find((p) => p.id === lot.snap.productId)?.price ?? sl.price ?? 130;
      }
      sl.stock += n;
      lot.qty -= n;
      moved += n;
    }
    pruneWarehouse(st);
  });
  return moved;
}

/** 回収。plan = [{ slot, qty, clear }]。clear で在庫 0 のスロットを空きにする。戻り値: 回収した本数 */
export function recall(machineId, plan) {
  let moved = 0;
  update((st) => {
    const m = st.machines.find((x) => x.id === machineId);
    if (!m) return;
    for (const { slot, qty, clear } of plan) {
      const sl = m.slots[slot];
      if (!sl?.item) continue;
      const n = Math.min(Math.floor(qty || 0), sl.stock);
      if (n > 0) {
        const key = lotKey(sl.item);
        const lot = st.warehouse[key] || (st.warehouse[key] = { qty: 0, snap: clone(sl.item), unitCost: sl.item.unitCost });
        lot.qty += n;
        sl.stock -= n;
        moved += n;
      }
      if (clear && sl.stock === 0) { sl.item = null; sl.price = 0; }
    }
  });
  return moved;
}

/** まとめて満タン：陳列中のスロットを、同じロットの倉庫在庫で上限まで補充する計画を作る */
export function planFillAll(s, m) {
  const cap = slotCap(m);
  const left = {};
  return m.slots.map((sl, i) => {
    if (!sl.item) return null;
    const key = lotKey(sl.item);
    left[key] ??= lotQty(s, key);
    const n = Math.min(cap - sl.stock, left[key]);
    left[key] -= n;
    return n > 0 ? { slot: i, key, qty: n } : null;
  }).filter(Boolean);
}

function pruneWarehouse(st) {
  for (const [k, w] of Object.entries(st.warehouse)) if (w.qty <= 0) delete st.warehouse[k];
}

/** 陳列の並び替え：2つのスロットの中身（商品・在庫・価格）を入れ替える（仕様書 6-4） */
export function swapSlots(machineId, a, b) {
  if (a === b) return;
  update((st) => {
    const m = st.machines.find((x) => x.id === machineId);
    if (!m || !m.slots[a] || !m.slots[b]) return;
    [m.slots[a], m.slots[b]] = [m.slots[b], m.slots[a]];
  });
}

// ---------- 経営（STEP5） ----------
export const machinePriceAt = (locationId) => SHOP.machinePrice + findLocation(locationId).installCost;
export const relocateCost = (locationId) => Math.round((findLocation(locationId).installCost * SHOP.relocateRate) / 100) * 100;

/** 設置場所の解放条件。戻り値 { ok, reason } */
export function canUnlock(s, locId) {
  const loc = findLocation(locId);
  if (s.unlockedLocations.includes(locId)) return { ok: false, reason: '解放済み' };
  if (s.stats.totalSales < loc.requiredSales) return { ok: false, reason: `累計売上 ¥${loc.requiredSales.toLocaleString()} で解放` };
  if (s.money < loc.unlockCost) return { ok: false, reason: '所持金が足りません' };
  return { ok: true };
}

export function unlockLocation(locId) {
  const s = getState();
  if (!canUnlock(s, locId).ok) return false;
  const loc = findLocation(locId);
  update((st) => {
    st.money -= loc.unlockCost;
    st.unlockedLocations.push(locId);
    st.stats.totalInvest = (st.stats.totalInvest || 0) + loc.unlockCost;
    addNotice(st, `新しい設置場所「${loc.name}」を解放しました`);
  });
  return true;
}

/** 自販機を購入して設置。戻り値：新しい自販機のID（失敗時 null） */
export function buyMachine(locId, color) {
  const s = getState();
  const cost = machinePriceAt(locId);
  if (!s.unlockedLocations.includes(locId) || s.machines.length >= BALANCE.maxMachines || s.money < cost) return null;
  let id = null;
  update((st) => {
    const n = st.machines.length + 1;
    const m = makeMachine({ name: `${n}号機`, locationId: locId, modelId: 'standard', color });
    st.machines.push(m);
    st.money -= cost;
    st.stats.totalInvest = (st.stats.totalInvest || 0) + cost;
    addNotice(st, `${m.name}を${findLocation(locId).name}に設置しました`, { target: `#machine-${m.id}` });
    id = m.id;
  });
  return id;
}

export function relocate(machineId, locId) {
  const s = getState();
  const cost = relocateCost(locId);
  const m = s.machines.find((x) => x.id === machineId);
  if (!m || m.locationId === locId || !s.unlockedLocations.includes(locId) || s.money < cost) return false;
  update((st) => {
    const mm = st.machines.find((x) => x.id === machineId);
    mm.locationId = locId;
    st.money -= cost;
    st.stats.totalInvest = (st.stats.totalInvest || 0) + cost;
    addNotice(st, `${mm.name}を${findLocation(locId).name}へ移設しました`);
  });
  return true;
}

export function buyUpgrade(machineId, upId) {
  const s = getState();
  const m = s.machines.find((x) => x.id === machineId);
  const lv = m?.upgrades[upId] ?? 0;
  const u = upgradeOf(upId);
  if (!m || lv >= u.maxLevel) return false;
  const cost = upgradeCost(upId, lv);
  if (s.money < cost) return false;
  update((st) => {
    const mm = st.machines.find((x) => x.id === machineId);
    mm.upgrades[upId] = lv + 1;
    st.money -= cost;
    st.stats.totalInvest = (st.stats.totalInvest || 0) + cost;
  });
  return true;
}
