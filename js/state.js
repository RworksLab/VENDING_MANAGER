// =============================================================
// ゲーム状態の定義・初期化・マイグレーション・更新
// 画面（views）は state を直接書き換えず、必ず update() を通す。
// =============================================================
import {
  SCHEMA_VERSION, PRODUCT_FORM, BALANCE, MACHINE_MODELS, UPGRADES, STARTER_PRODUCTS, unitCostOf, capOf,
} from './config.js';
import { uid, dateKey, clone } from './util.js';

// ---------- 生成 ----------
export function makeProduct(input, now = Date.now()) {
  return {
    id: uid('p'),
    rev: 1,                         // 編集のたびに +1。陳列中の商品はスナップショットで保持
    name: input.name,
    genre: input.genre,
    container: input.container,
    volume: input.volume,
    temp: input.temp,
    taste: { ...input.taste },
    color: input.color,
    label: normalizeLabel(input.label),
    unitCost: unitCostOf(input.container, input.volume),
    price: input.price,
    popularity: 50,                 // 0〜100（STEP4 以降で変動）
    sold: 0,
    revenue: 0,
    sample: !!input.sample,
    createdAt: now,
    updatedAt: now,
  };
}

// ラベル：柄（template）または画像に、アイコンと文字を重ねる。
// 以前の「アイコン」柄は「柄なし＋アイコンあり」に置き換える
export const normalizeLabel = (l = {}) => {
  const legacyIcon = l.template === 'icon';
  return {
    mode: l.mode === 'image' && l.image ? 'image' : 'template',
    template: legacyIcon ? 'none' : (l.template || 'band'),
    color: l.color || '#ffffff',
    image: l.image || null,
    icon: typeof l.icon === 'boolean' ? l.icon : legacyIcon,
    text: String(l.text || '').slice(0, PRODUCT_FORM.labelTextMax),
    textColor: l.textColor || '#ffffff',
    textDir: l.textDir === 'v' ? 'v' : 'h',
    textStyle: ['plain', 'ribbon', 'box', 'slant', 'outline'].includes(l.textStyle) ? l.textStyle : 'plain',
    subColor: l.subColor || '#ffffff',                                   // 柄・リボンの2色目
    pos: ['std', 'high', 'low', 'full', 'double'].includes(l.pos) ? l.pos : 'std',
    clear: !!l.clear,                                                    // 透明ボトル（ペットのみ）
    liquid: l.liquid || null,                                            // 中身の色（null はジャンルから自動）
    cap: l.cap || null,                                                  // キャップの色（null は本体に合わせる）
  };
};

// 商品の編集（仕様書 3-4）。rev を上げ、陳列中・倉庫の在庫はスナップショットのまま
export function applyProductEdit(p, input, now = Date.now()) {
  Object.assign(p, {
    name: input.name, genre: input.genre, container: input.container, volume: input.volume,
    temp: input.temp, taste: { ...input.taste }, color: input.color, label: normalizeLabel(input.label),
    unitCost: unitCostOf(input.container, input.volume), price: input.price,
  });
  p.rev += 1;
  p.updatedAt = now;
  p.sample = false;
}

// 自販機に並べるときの商品情報の写し（仕様書 3-4：編集が既存在庫に影響しない）
export function snapshotOf(p) {
  const { id, rev, name, genre, container, volume, temp, taste, color, label, unitCost } = p;
  return clone({ productId: id, rev, name, genre, container, volume, temp, taste, color, label, unitCost });
}

export function makeMachine({ name, locationId, modelId, color }, now = Date.now()) {
  const model = MACHINE_MODELS[modelId];
  return {
    id: uid('m'),
    name,
    modelId,
    color: color || model.color,
    locationId,
    upgrades: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
    slots: Array.from({ length: model.slots }, () => emptySlot()),
    totalSales: 0,
    totalUnits: 0,
    createdAt: now,
  };
}

export const emptySlot = () => ({ item: null, stock: 0, price: 0 });

export function createInitialState(now = Date.now()) {
  const products = STARTER_PRODUCTS.map((p) => makeProduct({ ...p, sample: true }, now));
  const machine = makeMachine(BALANCE.starterMachine, now);
  // お試し在庫：サンプル商品を交互に陳列
  machine.slots.forEach((slot, i) => {
    const p = products[i % products.length];
    slot.item = snapshotOf(p);
    slot.stock = BALANCE.starterStock;
    slot.price = p.price;
  });

  return {
    schema: SCHEMA_VERSION,
    money: BALANCE.initialMoney,
    stats: { totalSales: 0, totalUnits: 0, totalCost: 0, totalUpkeep: 0 },
    today: { date: dateKey(now), sales: 0, units: 0, byMachine: {} },
    dailyHistory: [],            // [{date, sales, units}]（日替わり時に today を格納）
    products,
    warehouse: {},               // { [productId]: { qty, snap } }（STEP3）
    machines: [machine],
    unlockedLocations: ['residential'],
    imageIds: [],                // 保存済みラベル画像の ID（images.js）
    purchaseHistory: [],         // STEP3
    salesLog: [],                // STEP4
    events: { calendar: {}, seed: Math.floor(Math.random() * 1e9) }, // STEP6
    notices: [
      { id: uid('n'), at: now, text: 'ようこそ！まずは商品一覧と1号機を確認してみましょう。', read: false },
    ],
    notifications: { enabled: true, soldOut: true, lowStock: true, events: true, sales: true, location: true, trouble: true },
    clock: { createdAt: now, lastSeenAt: now, lastSimAt: now, skewCount: 0 },
    meta: { savedAt: now, saveCount: 0 },
  };
}

// ---------- マイグレーション ----------
// 保存データの schema が古い場合に順番に変換する。新しい項目を追加したらここに追記。
const MIGRATIONS = {
  // v1 → v2：ラベルに mode（template / image）を追加
  1: (s) => {
    const fix = (o) => { if (o?.label) o.label = normalizeLabel(o.label); };
    s.products.forEach(fix);
    s.machines.forEach((m) => m.slots.forEach((sl) => fix(sl.item)));
    Object.values(s.warehouse).forEach((w) => fix(w.snap));
    return s;
  },
  // v2 → v3：ラベルのアイコンを柄から分け、文字を追加
  2: (s) => MIGRATIONS[1](s),
  // v3 → v4：透明ボトル・キャップ・ラベル位置・サブカラー・文字スタイル
  3: (s) => MIGRATIONS[1](s),
};

export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.schema !== 'number') return null;
  let s = raw;
  while (s.schema < SCHEMA_VERSION) {
    const step = MIGRATIONS[s.schema];
    if (!step) return null;
    s = step(s);
    s.schema += 1;
  }
  // 欠けた項目を初期値で補う（将来の追加項目への保険）
  const base = createInitialState(s.clock?.createdAt ?? Date.now());
  for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
  return s;
}

// ---------- 時刻・日替わり ----------
// 端末の時計が戻された場合は lastSeenAt を進めない（売上の巻き戻し不正対策の土台）
export function touchClock(s, now = Date.now()) {
  if (now + 5 * 60 * 1000 < s.clock.lastSeenAt) {
    s.clock.skewCount += 1;
  } else {
    s.clock.lastSeenAt = Math.max(s.clock.lastSeenAt, now);
  }
  const key = dateKey(Math.max(now, s.clock.lastSeenAt));
  if (s.today.date !== key && key > s.today.date) {
    s.dailyHistory.push({ date: s.today.date, sales: s.today.sales, units: s.today.units, byMachine: s.today.byMachine });
    if (s.dailyHistory.length > 400) s.dailyHistory.shift();
    s.today = { date: key, sales: 0, units: 0, byMachine: {} };
  }
}

// ---------- ストア ----------
let state = null;
const listeners = new Set();
let onCommit = () => {};

export const getState = () => state;
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const setCommitHandler = (fn) => { onCommit = fn; };

export function replaceState(next, { persist = true } = {}) {
  state = next;
  listeners.forEach((fn) => fn(state));
  if (persist) onCommit(state);
}

export function update(mutator) {
  mutator(state);
  state.meta.savedAt = Date.now();
  state.meta.saveCount += 1;
  listeners.forEach((fn) => fn(state));
  onCommit(state);
}

/**
 * お知らせを追加。type で通知設定と結びつけ、target でタップ時の移動先を持つ
 * type: soldOut / lowStock / sales / events / location / trouble / system
 * target: '#machine-<id>' などの画面
 */
export function addNotice(s, text, { type = 'system', target = null } = {}) {
  s.notices.unshift({ id: uid('n'), at: Date.now(), text, read: false, type, target });
  s.notices.length = Math.min(s.notices.length, BALANCE.maxNotices);
}

// ---------- 集計（画面用の読み取り専用ヘルパー） ----------
export function machineSummary(m) {
  const model = MACHINE_MODELS[m.modelId];
  const cap = capOf(m);
  const used = m.slots.filter((x) => x.item);
  const stock = used.reduce((a, x) => a + x.stock, 0);
  const soldOut = used.filter((x) => x.stock === 0).length;
  const low = used.filter((x) => x.stock > 0 && x.stock <= cap * BALANCE.lowStockRatio).length;
  const upgradeLv = Object.values(m.upgrades).reduce((a, b) => a + b, 0);
  return {
    model, cap, stock, capacity: m.slots.length * cap,
    filled: used.length, empty: m.slots.length - used.length, soldOut, low, upgradeLv,
  };
}
