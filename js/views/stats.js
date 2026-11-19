// =============================================================
// 経営ページ  #stats（仕様書 10章・13-6）
// 本日の収支、直近7日間、累計、商品別・自販機別ランキング
// =============================================================
import { findLocation } from '../config.js';
import { upkeepOf } from '../sim.js';
import { drinkSVG, machineSVG } from '../render/art.js';
import { ill } from '../icons.js';
import { esc, num, yen, dateKey } from '../util.js';
import { pageHead } from './parts.js';
import { getState } from '../state.js';
import { achievementList, claimAchievement } from '../rewards.js';
import { toast } from '../ui.js';
import { se } from '../audio.js';
import { coin } from '../icons.js';

function week(s) {
  const map = Object.fromEntries(s.dailyHistory.map((d) => [d.date, d]));
  map[s.today.date] = s.today;
  const days = Array.from({ length: 7 }, (_, i) => {
    const t = Date.now() - (6 - i) * 864e5;
    const d = map[dateKey(t)] || {};
    const sales = d.sales || 0;
    return { label: i === 6 ? '今日' : `${new Date(t).getDate()}日`, sales, profit: sales - (d.cost || 0) - (d.upkeep || 0) };
  });
  const max = Math.max(1, ...days.map((d) => d.sales));
  return `<div class="week" role="img" aria-label="直近7日間の売上">${days.map((d, i) => `
    <div class="wk ${i === 6 ? 'today' : ''}"><span class="wk-v">${d.sales ? num(d.sales) : ''}</span>
      <span class="wk-bar"><i style="height:${Math.max(3, Math.round((d.sales / max) * 100))}%"></i></span><small>${d.label}</small></div>`).join('')}
  </div>`;
}

export function render(s) {
  const t = s.today;
  const todayProfit = t.sales - (t.cost || 0) - (t.upkeep || 0);
  const st = s.stats;
  const profit = st.totalSales - (st.totalCost || 0) - (st.totalUpkeep || 0);
  const upDay = s.machines.reduce((a, m) => a + upkeepOf(m).total, 0);

  const prods = [...s.products].filter((p) => p.sold).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const machs = [...s.machines].sort((a, b) => b.totalSales - a.totalSales);
  const rank = (i) => `<span class="rk rk${i + 1}">${i + 1}</span>`;

  return `${pageHead({ title: '経営', ic: 'chart', back: '#home' })}
  <div class="op-page">
    <section class="wcard">
      <h2 class="wtitle">${ill('barsBlue')}本日の収支</h2>
      <div class="pl">
        <div><small>売上</small><b>${yen(t.sales)}</b></div>
        <div><small>仕入れ</small><b>−${yen(t.cost || 0)}</b></div>
        <div><small>維持費</small><b>−${yen(t.upkeep || 0)}</b></div>
        <div class="pl-total"><small>利益</small><b class="${todayProfit < 0 ? 'warn-t' : 'ok-t'}">${yen(todayProfit)}</b></div>
      </div>
      <p class="muted small">維持費は全${s.machines.length}台で 1日 ${yen(upDay)}（10分ごとに日割りで差し引き）</p>
    </section>
    ${achievementsSection(s)}
    <section class="wcard">
      <h2 class="wtitle">${ill('bars')}直近7日間の売上</h2>
      ${week(s)}
    </section>
    <section class="wcard">
      <h2 class="wtitle">${ill('star')}累計</h2>
      <ul class="rows">
        <li><span>売上</span><b>${yen(st.totalSales)}</b></li>
        <li><span>販売本数</span><b>${num(st.totalUnits)}本</b></li>
        <li><span>仕入れ原価</span><b>−${yen(st.totalCost || 0)}</b></li>
        <li><span>維持費</span><b>−${yen(st.totalUpkeep || 0)}</b></li>
        <li><span>営業利益</span><b class="${profit < 0 ? 'warn-t' : 'ok-t'}">${yen(profit)}</b></li>
        <li><span>設備投資（自販機・場所・強化）</span><b>${yen(st.totalInvest || 0)}</b></li>
        <li><span>営業日数</span><b>${s.dailyHistory.length + 1}日目</b></li>
      </ul>
    </section>
    <section class="wcard">
      <h2 class="wtitle">${ill('cup')}商品別 売上ランキング</h2>
      ${prods.length ? `<ol class="rank">${prods.map((p, i) => `<li>${rank(i)}<span class="rk-art">${drinkSVG(p)}</span>
        <span class="rk-main"><b>${esc(p.name)}</b><small>${num(p.sold)}本</small></span><b>${yen(p.revenue)}</b></li>`).join('')}</ol>`
        : '<p class="muted small">まだ販売がありません</p>'}
    </section>
    <section class="wcard">
      <h2 class="wtitle">${ill('machine')}自販機別 売上ランキング</h2>
      <ol class="rank">${machs.map((m, i) => `<li>${rank(i)}<span class="rk-art mach">${machineSVG(m, { compact: true })}</span>
        <span class="rk-main"><b>${esc(m.name)}</b><small>${esc(findLocation(m.locationId).name)}・${num(m.totalUnits)}本</small></span><b>${yen(m.totalSales)}</b></li>`).join('')}</ol>
    </section>
  </div>`;
}

// ---------- 実績と報酬 ----------
let showAll = false;
function achievementsSection(s) {
  const list = achievementList(s);
  const order = (x) => (x.done && !x.claimed ? 0 : !x.done ? 1 : 2);
  const sorted = [...list].sort((a, b) => order(a) - order(b) || b.value / b.goal - a.value / a.goal);
  const claimable = list.filter((x) => x.done && !x.claimed).length;
  const shown = showAll ? sorted : sorted.filter((x) => !x.claimed).slice(0, 5);
  const fmt = (x, v) => (x.unit === '円' ? yen(v) : `${num(v)}${x.unit}`);
  const rows = shown.map((x) => `<li class="ach ${x.done ? 'done' : ''} ${x.claimed ? 'claimed' : ''}">
      <span class="ach-ic">${x.done ? ill('star') : ill('lock')}</span>
      <span class="ach-main"><b>${esc(x.name)}</b><small>${esc(x.desc || `${fmt(x, x.goal)}を達成`)}</small>
        ${x.done ? '' : `<span class="bar thin"><i style="width:${Math.round((x.value / x.goal) * 100)}%"></i></span><small class="ach-prog">${fmt(x, x.value)} / ${fmt(x, x.goal)}</small>`}</span>
      ${x.claimed ? '<em class="ach-got">受取済</em>'
        : x.done ? `<button class="btn primary ach-btn" data-claim="${x.id}">${coin()}${yen(x.reward)}</button>`
          : `<span class="ach-rw">${coin()}${yen(x.reward)}</span>`}
    </li>`).join('');
  const got = list.filter((x) => x.claimed).length;
  return `<section class="wcard" id="ach">
    <h2 class="wtitle">${ill('star')}実績と報酬${claimable ? `<i class="badge">${claimable}</i>` : ''}<small class="ach-count">${got}/${list.length}</small></h2>
    <ul class="ach-list">${rows || '<li class="muted">すべて受け取りました</li>'}</ul>
    <button class="btn ghost wide" id="ach-all">${showAll ? '閉じる' : 'すべての実績を見る'}</button>
  </section>`;
}

export function mount(el) {
  el.querySelectorAll('[data-claim]').forEach((b) => b.addEventListener('click', () => {
    const amt = claimAchievement(b.dataset.claim);
    if (amt) { se('buy'); toast(`報酬 ${yen(amt)} を受け取りました`); }
  }));
  el.querySelector('#ach-all')?.addEventListener('click', () => {
    showAll = !showAll;
    el.querySelector('#ach').outerHTML = achievementsSection(getState());
    mount(el);
  });
}
