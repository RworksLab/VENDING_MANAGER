// =============================================================
// 販売シミュレーション（仕様書 2章・9章）
// 最後に計算した時刻（clock.lastSimAt）から現在までを tickMinutes 刻みで計算する。
//  - 端末の時計を戻した場合：lastSimAt より前には戻らないので売上は増えない
//  - 長時間の放置：maxOfflineHours を超える分は計算しない（時計を進める不正の上限にもなる）
// 販売数 ＝ 基本 × 人通り(場所×時間帯) × ジャンル相性 × 時間帯 × 季節(HOT/COLD) × 価格 × 人気度 × 陳列位置 × ゆらぎ
// =============================================================
import {
  SIM, HOURLY_TRAFFIC, TIME_BANDS, LOCATION_GENRE, NIGHT_LOCATION, SEASON_TEMP,
  findLocation, fairPrice, slotBonusOf, BALANCE, capOf, upgradeOf, UPKEEP, TROUBLE, NOTIFY, LOCATIONS, SUPPORT,
} from './config.js';
import { update, getState, addNotice } from './state.js';
import { dateKey, yen as yenText } from './util.js';
import { factorsAt } from './events.js';

const TICK = SIM.tickMinutes * 60 * 1000;

/** 適正価格（ジャンル・内容量・場所で決まる） */
export const refPrice = (item, loc) => fairPrice(item.genre, item.volume, loc.spendMul);
/** 価格による売れ行きの倍率。適正価格より高いと急に落ちる */
export const priceFactor = (price, item, loc) => {
  const r = refPrice(item, loc) / Math.max(10, price);
  return Math.min(3, r ** (r >= 1 ? SIM.priceElasticityLow : SIM.priceElasticityHigh));
};

/** 1スロットの期待販売数（本/時）。乱数なし。画面の目安表示にも使う */
export function expectedPerHour(m, slotIndex, at = Date.now(), s = getState()) {
  const sl = m.slots[slotIndex];
  if (!sl?.item) return 0;
  const loc = findLocation(m.locationId);
  const d = new Date(at);
  const h = d.getHours();
  const g = sl.item.genre;
  const night = h >= 22 || h < 6;
  const traffic = HOURLY_TRAFFIC[h] * loc.trafficMul * (night ? NIGHT_LOCATION[loc.id] ?? 1 : 1);
  const affinity = LOCATION_GENRE[loc.id]?.[g] ?? 1;
  const band = TIME_BANDS.find((b) => h >= b.from && h < b.to)?.genres?.[g] ?? 1;
  const season = SEASON_TEMP[sl.item.temp]?.[d.getMonth()] ?? 1;
  const pop = s.products.find((p) => p.id === sl.item.productId)?.popularity ?? 50;
  const popF = 0.8 + pop / 250;
  // 天候・イベント（仕様書 11章）
  const fx = factorsAt(s, at);
  const event = fx.traffic(loc.id) * fx.sales(loc.id) * fx.genre(g) * fx.temp(sl.item.temp)
    * (h >= 18 && h < 22 ? fx.evening(loc.id) : 1) * ((m.upgrades?.ecash || 0) > 0 ? fx.ecash : 1);
  return SIM.basePerHour * traffic * affinity * band * season * priceFactor(sl.price, sl.item, loc) * popF
    * slotBonusOf(m.modelId, slotIndex, sl.item) * upgradeFactor(m) * event;
}

const lv = (m, id) => m.upgrades?.[id] || 0;
/** 設備強化による売れ行きの倍率（電子マネー・高速販売・広告） */
export const upgradeFactor = (m) => (1 + lv(m, 'ecash') * upgradeOf('ecash').per)
  * (1 + lv(m, 'speed') * upgradeOf('speed').per) * (1 + lv(m, 'ad') * upgradeOf('ad').per);

/** 1台の維持費（円/日）の内訳 */
export function upkeepOf(m, at = Date.now(), s = getState()) {
  const elecRate = s ? factorsAt(s, at).elec : 1;   // 電気代割引イベント
  const electricity = UPKEEP.electricityPerDay * Math.max(0, 1 - lv(m, 'cooling') * upgradeOf('cooling').per) * elecRate;
  const place = findLocation(m.locationId).upkeepPerDay;
  const maintenance = Object.values(m.upgrades || {}).reduce((a, b) => a + b, 0) * UPKEEP.maintenancePerLevel;
  return { electricity: Math.round(electricity), place, maintenance, total: Math.round(electricity + place + maintenance) };
}

/** その時刻にトラブルで止まっているか */
export const isDown = (m, at = Date.now()) => (m.downUntil || 0) > at;

// 期待値を整数の本数に（端数は確率で切り上げ）＋ゆらぎ
function draw(exp) {
  const v = exp * (1 + (Math.random() * 2 - 1) * SIM.noise);
  const n = Math.floor(v);
  return n + (Math.random() < v - n ? 1 : 0);
}

// その時刻が属する日の集計先（今日・過去の日・新しい日）
function dayBucket(st, at) {
  rollDay(st, at);
  const key = dateKey(at);
  if (key === st.today.date) return st.today;
  let d = st.dailyHistory.find((x) => x.date === key);
  if (!d) {
    d = { date: key, sales: 0, units: 0, byMachine: {} };
    st.dailyHistory.push(d);
    st.dailyHistory.sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  d.byMachine ??= {};
  return d;
}

function rollDay(st, at) {
  const key = dateKey(at);
  if (st.today.date === key || key < st.today.date) return;
  st.dailyHistory.push({ date: st.today.date, sales: st.today.sales, units: st.today.units, byMachine: st.today.byMachine });
  if (st.dailyHistory.length > 400) st.dailyHistory.shift();
  st.today = { date: key, sales: 0, units: 0, byMachine: {} };
}

/**
 * 維持費：その日のぶんを貯めておき（upkeepDue）、日付が変わったら前日分をまとめて支払う。
 * 所持金が SUPPORT.debtFloor を割る分は免除する。
 */
function settleUpkeep(st, at) {
  const key = dateKey(at);
  const due = st.upkeepDue;
  if (!due) { st.upkeepDue = { date: key, amount: 0 }; return; }
  if (due.date === key || key < due.date) return;
  st.upkeepDue = { date: key, amount: 0 };
  const amt = Math.round(due.amount);
  if (!amt) return;
  const pay = Math.min(amt, Math.max(0, st.money - SUPPORT.debtFloor));
  st.money -= pay;
  st.stats.totalUpkeep = (st.stats.totalUpkeep || 0) + pay;
  const day = dayBucket(st, at);                     // 支払った日（新しい日）の支出として記録
  day.upkeep = (day.upkeep || 0) + pay;
  const [, mo, d] = due.date.split('-').map(Number);
  addNotice(st, `${mo}/${d}の維持費 ${yenText(pay)} を支払いました${pay < amt ? `（${yenText(amt - pay)} は免除）` : ''}`);
}

/** 今日の維持費の見込み（まだ支払っていないぶん） */
export const upkeepDueToday = (s = getState()) => (s.upkeepDue?.date === dateKey() ? Math.round(s.upkeepDue.amount) : 0);

/**
 * 経過時間分の販売を反映する。戻り値: { units, sales, ticks, gains: {machineId: sales}, soldOut: [..] }
 */
export function runSimulation(now = Date.now()) {
  const s = getState();
  const result = { units: 0, sales: 0, ticks: 0, gains: {}, soldOut: [], from: s.clock.lastSimAt, to: now };
  if (now < s.clock.lastSimAt + TICK) return result;           // 時計の巻き戻し・1刻み未満は何もしない

  update((st) => {
    const floor = now - SIM.maxOfflineHours * 3600 * 1000;
    let t = Math.max(st.clock.lastSimAt, floor);
    if (st.clock.lastSimAt < floor) addNotice(st, `放置が長かったため、直近${SIM.maxOfflineHours}時間分の販売だけを計算しました`);
    const lowLine = (m) => Math.floor(capOf(m) * BALANCE.lowStockRatio);
    const ticksPerDay = (24 * 60) / SIM.tickMinutes;

    while (t + TICK <= now) {
      const at = t + TICK / 2;                                    // 刻みの中央の時刻で需要を決める
      settleUpkeep(st, at);                                       // 日付が変わったら前日分の維持費を支払う
      const day = dayBucket(st, at);
      for (const m of st.machines) {
        if (m.open === false) continue;           // 営業開始前（チュートリアル中）
        // 維持費は日割りで貯めるだけ（支払いは翌日の始めにまとめて）
        st.upkeepDue.amount += upkeepOf(m, at, st).total / ticksPerDay;
        // トラブル（防犯性能で起きにくくなる）
        if (!isDown(m, at)) {
          const chance = (TROUBLE.perDayChance / ticksPerDay) * Math.max(0, 1 - lv(m, 'security') * upgradeOf('security').per);
          if (Math.random() < chance) {
            const [a, b] = TROUBLE.downHours;
            m.downUntil = at + (a + Math.random() * (b - a)) * 3600e3;
            const kind = TROUBLE.kinds[Math.floor(Math.random() * TROUBLE.kinds.length)];
            m.downReason = kind;
            addNotice(st, `${m.name}で${kind}が発生し、${new Date(m.downUntil).getHours()}時ごろまで販売が止まります`, { type: 'trouble', target: `#machine-${m.id}` });
            result.troubles = (result.troubles || 0) + 1;
          }
        }
        if (isDown(m, at)) continue;
        let mSales = 0, mUnits = 0;
        m.slots.forEach((sl, i) => {
          if (!sl.item || sl.stock <= 0) return;
          const n = Math.min(sl.stock, draw(expectedPerHour(m, i, at, st) * (SIM.tickMinutes / 60)));
          if (!n) return;
          const before = sl.stock;
          sl.stock -= n;
          const yenAmt = n * sl.price;
          mSales += yenAmt; mUnits += n;
          const p = st.products.find((x) => x.id === sl.item.productId);
          if (p) { p.sold += n; p.revenue += yenAmt; }
          if (sl.stock === 0) { result.soldOut.push(`${m.name}：${sl.item.name}`); addNotice(st, `${m.name}の「${sl.item.name}」が売り切れました`, { type: 'soldOut', target: `#refill-${m.id}` }); }
          else if (before > lowLine(m) && sl.stock <= lowLine(m)) addNotice(st, `${m.name}の「${sl.item.name}」が残りわずかです（${sl.stock}本）`, { type: 'lowStock', target: `#refill-${m.id}` });
        });
        if (!mUnits) continue;
        m.totalSales += mSales; m.totalUnits += mUnits;
        st.money += mSales;
        st.stats.totalSales += mSales; st.stats.totalUnits += mUnits;
        day.sales += mSales; day.units += mUnits;
        const bm = day.byMachine[m.id] || (day.byMachine[m.id] = { sales: 0, units: 0 });
        const step = NOTIFY.salesStep;
        if (day === st.today && Math.floor(bm.sales / step) < Math.floor((bm.sales + mSales) / step)) {
          addNotice(st, `${m.name}の本日の売上が${yenText(Math.floor((bm.sales + mSales) / step) * step)}を超えました`, { type: 'sales', target: `#machine-${m.id}` });
        }
        bm.sales += mSales; bm.units += mUnits;
        st.salesLog.unshift({ at, machineId: m.id, units: mUnits, sales: mSales });
        result.gains[m.id] = (result.gains[m.id] || 0) + mSales;
        result.units += mUnits; result.sales += mSales;
      }
      t += TICK;
      result.ticks += 1;
    }
    // 売上条件を満たした設置場所を知らせる（解放はショップで）
    st.events.unlockNotified ??= [];
    for (const l of LOCATIONS) {
      if (st.unlockedLocations.includes(l.id) || st.events.unlockNotified.includes(l.id) || !l.requiredSales || st.stats.totalSales < l.requiredSales) continue;
      st.events.unlockNotified.push(l.id);
      addNotice(st, `「${l.name}」が解放できるようになりました（ショップ）`, { type: 'location', target: '#shop' });
    }
    st.salesLog.length = Math.min(st.salesLog.length, SIM.salesLogMax);
    settleUpkeep(st, now);
    st.clock.lastSimAt = t;
    rollDay(st, now);
  });
  return result;
}
