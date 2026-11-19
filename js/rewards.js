// =============================================================
// 報酬：実績の達成チェックと受け取り、所持金ピンチのときの経営支援金
// =============================================================
import { ACHIEVEMENTS, SUPPORT, SHOP, findLocation, upgradeCost, UPGRADES } from './config.js';
import { getState, update, addNotice } from './state.js';

const box = (s) => s.achievements || { claimed: [], notified: [] };

/** 実績ごとの状態：done（達成）/ claimed（受取済）/ value（進み具合） */
export function achievementList(s = getState()) {
  const a = box(s);
  return ACHIEVEMENTS.map((x) => {
    const value = Math.max(0, x.value(s) || 0);
    return { ...x, value: Math.min(value, x.goal), done: value >= x.goal, claimed: a.claimed.includes(x.id) };
  });
}

export const claimableCount = (s = getState()) => achievementList(s).filter((x) => x.done && !x.claimed).length;

/** 報酬を受け取る。受け取った金額を返す */
export function claimAchievement(id) {
  const x = achievementList().find((a) => a.id === id);
  if (!x || !x.done || x.claimed) return 0;
  update((s) => {
    s.achievements = box(s);
    s.achievements.claimed.push(id);
    s.money += x.reward;
    s.stats.totalRewards = (s.stats.totalRewards || 0) + x.reward;
  });
  return x.reward;
}

/** 新しく達成した実績をお知らせに出す（状態が変わるたびに呼ぶ） */
export function noticeNewAchievements() {
  const s = getState();
  if (!s || s.tutorial?.step && s.tutorial.step !== 'done') return;   // チュートリアル中は出さない
  const a = box(s);
  const fresh = achievementList(s).filter((x) => x.done && !x.claimed && !a.notified.includes(x.id));
  if (!fresh.length) return;
  update((st) => {
    st.achievements = box(st);
    fresh.forEach((x) => {
      st.achievements.notified.push(x.id);
      addNotice(st, `実績「${x.name}」を達成！ 経営ページで報酬 ¥${x.reward.toLocaleString('ja-JP')} を受け取れます`, { type: 'sales', target: '#stats' });
    });
  });
}

// ---------- 経営支援金 ----------
const stockTotal = (s) => s.machines.reduce((a, m) => a + m.slots.reduce((b, sl) => b + (sl.stock || 0), 0), 0)
  + Object.values(s.warehouse).reduce((a, w) => a + (w.qty || 0), 0);

/** 支援金を受け取れるか（受け取れる額 / 0） */
export function supportAvailable(s = getState()) {
  if (!s || (s.tutorial?.step && s.tutorial.step !== 'done')) return 0;
  if (s.support?.date === s.today.date) return 0;                 // 1日1回
  const pinch = s.money < 0 || (s.money < SUPPORT.trigger && stockTotal(s) < SUPPORT.stockLow);
  if (!pinch) return 0;
  return SUPPORT.amount + Math.max(0, -s.money);
}

export function claimSupport() {
  const amt = supportAvailable();
  if (!amt) return 0;
  update((s) => {
    s.money += amt;                                              // 借金をなくしたうえで amount 円
    s.support = { date: s.today.date, count: (s.support?.count || 0) + 1 };
    s.stats.totalSupport = (s.stats.totalSupport || 0) + amt;
    addNotice(s, `経営支援金 ¥${amt.toLocaleString('ja-JP')} を受け取りました`);
  });
  return amt;
}

// ---------- バランス調整の補填（2026/11/19〜20 の値段変更） ----------
//  すでに遊んでいた人に一度だけ：今の値段で買い直した額より多く払っていた分を返し、お詫びを一律で渡す
export const COMPENSATION = { id: '2026-11-20', bonus: 20000, newFlowSince: Date.parse('2026-11-19T12:30:00Z') };

/** 今持っている自販機・場所・強化を、今の値段で買い直したときの額 */
function costAtNewPrices(s) {
  const firstBought = (s.clock?.createdAt || 0) >= COMPENSATION.newFlowSince;   // チュートリアルで1台目を買った人
  const ms = [...s.machines].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  let total = 0;
  ms.forEach((m, i) => {
    if (i === 0 && !firstBought) return;                                         // 昔は1台目が無料だった
    total += SHOP.machinePrices[Math.min(i, SHOP.machinePrices.length - 1)] + findLocation(m.locationId).installCost;
    for (const u of UPGRADES) for (let lv = 0; lv < (m.upgrades?.[u.id] || 0); lv++) total += upgradeCost(u.id, lv);
  });
  if (!firstBought && ms[0]) for (const u of UPGRADES) for (let lv = 0; lv < (ms[0].upgrades?.[u.id] || 0); lv++) total += upgradeCost(u.id, lv);
  total += s.unlockedLocations.filter((id) => id !== 'residential').reduce((a, id) => a + findLocation(id).unlockCost, 0);
  return total;
}

/** 補填の対象なら金額の内訳を返す（対象外は null） */
export function compensationFor(s = getState()) {
  if (!s || s.meta?.compensation === COMPENSATION.id) return null;
  if (!s.machines.length || (s.tutorial?.step && s.tutorial.step !== 'done')) return null;
  const refund = Math.max(0, Math.round(((s.stats.totalInvest || 0) - costAtNewPrices(s)) / 100) * 100);
  return { refund, bonus: COMPENSATION.bonus, total: refund + COMPENSATION.bonus };
}

export function claimCompensation() {
  const c = compensationFor();
  if (!c) return null;
  update((s) => {
    s.meta.compensation = COMPENSATION.id;
    s.money += c.total;
    addNotice(s, `バランス調整の補填 ¥${c.total.toLocaleString('ja-JP')} を受け取りました（払い戻し ¥${c.refund.toLocaleString('ja-JP')}＋お詫び ¥${c.bonus.toLocaleString('ja-JP')}）`);
  });
  return c;
}
