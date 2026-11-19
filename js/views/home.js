// ホーム：街マップで、配置中の自販機の稼働の様子を見る
import { getState, machineSummary } from '../state.js';
import { findLocation } from '../config.js';
import { townMap, machineStatus, miniMachine } from '../render/map.js';
import { ill, coin, weatherIcon } from '../icons.js';
import { dayInfo, visibleEvents } from '../events.js';
import { num, yen, esc } from '../util.js';
import { openSheet, toast } from '../ui.js';
import { supportAvailable, claimSupport, claimableCount, achievementList, claimAchievement } from '../rewards.js';
import { findGenre } from '../config.js';
import { se } from '../audio.js';

export function render(s) {
  const running = s.machines.filter((m) => machineStatus(m).key !== 'idle').length;
  const nf = s.notifications || {};
  const unread = s.notices.filter((n) => !n.read && nf.enabled !== false && nf[n.type] !== false).length;
  const info = dayInfo(s.events.seed, s.today.date);
  const wx = info.weather;
  const evCount = visibleEvents(info, s.today.date).length;
  const help = supportAvailable(s);
  const claim = claimableCount(s);
  return `<div class="home-page ${help ? 'has-help' : ''}">
  ${help ? `<section class="help-card">${coin()}<span><b>資金がピンチです</b><small>経営支援金 ${yen(help)} を受け取れます（1日1回）</small></span><button class="btn primary" id="help-btn">受け取る</button></section>` : ''}
  <section class="kpi-box" aria-label="本日の経営状況">
    <div>${coin()}<span><small>本日の売上</small><b>${num(s.today.sales)}<em>円</em></b></span></div>
    <div>${ill('bottle')}<span><small>販売本数</small><b>${num(s.today.units)}<em>本</em></b></span></div>
    <div>${ill('power')}<span><small>稼働中</small><b>${running}<em>/${s.machines.length}台</em></b></span></div>
  </section>
  <section class="wcard map-card">
    <div class="map-wrap">${townMap(s)}</div>
    <div class="legend">
      <span><i class="st-ok"></i>稼働中</span><span><i class="st-low"></i>残りわずか</span>
      <span><i class="st-warn"></i>売切あり</span><span><i class="st-idle"></i>停止中</span>
    </div>
  </section>
  ${goalCard(s, wx)}
  <div class="home-links">
    <button class="hlink" data-open="status">${ill('status')}<span>稼働状況</span></button>
    <a class="hlink" href="#stats">${ill('business')}<span>経営</span>${claim ? `<i class="badge">${claim}</i>` : ''}</a>
    <a class="hlink" href="#events">${weatherIcon(wx.id, 'ill')}<span>イベント</span>${evCount ? `<i class="badge blue">${evCount}</i>` : ''}</a>
    <a class="hlink" href="#notices">${ill('mail')}<span>お知らせ</span>${unread ? `<i class="badge">${unread}</i>` : ''}</a>
  </div>
  </div>`;
}

// 稼働状況は下から開くシートで確認する（経営・イベントは別ページ）
export function mount(el) {
  el.querySelector('[data-goal-claim]')?.addEventListener('click', (e) => {
    e.preventDefault();
    const amt = claimAchievement(e.currentTarget.dataset.goalClaim);
    if (amt) { se('buy'); toast(`報酬 ${yen(amt)} を受け取りました`); }
  });
  el.querySelector('#help-btn')?.addEventListener('click', () => {
    const amt = claimSupport();
    if (amt) { se('buy'); toast(`経営支援金 ${yen(amt)} を受け取りました`); }
  });
  el.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openPanel(b.dataset.open)));
}

export function openPanel(which) {
  const s = getState();
  if (which === 'status') {
    const rows = s.machines.map((m) => {
      const x = machineSummary(m);
      const st = machineStatus(m);
      const pct = x.capacity ? Math.round((x.stock / x.capacity) * 100) : 0;
      return `<a class="op-row" href="#machine-${m.id}">
        <span class="op-ic st-${st.key}">${miniMachine(m.color || '#4aa8f0')}</span>
        <span class="op-main"><b>${esc(m.name)}<small>${esc(findLocation(m.locationId).name)}</small></b>
          <span class="bar thin ${pct < 25 ? 'low' : ''}"><i style="width:${pct}%"></i></span></span>
        <span class="op-side"><span class="st-chip st-${st.key}">${st.label}</span><b>${yen(s.today.byMachine[m.id]?.sales || 0)}</b></span>
      </a>`;
    }).join('');
    openSheet(`<h2 class="sheet-title">稼働状況</h2><div class="op-list">${rows}</div>`);

  }
}

// ---------- 次の目標（実績）と、今日の天気のヒント ----------
const LOC_SHORT = { residential: '住宅街', station: '駅前', office: 'オフィス街', park: '公園', tourist: '観光地', school: '学校付近' };
function weatherTip(w) {
  const fx = w.effects || {};
  const ups = [];
  Object.entries(fx.traffic || {}).forEach(([k, v]) => { if (v > 1 && k !== 'all') ups.push(`${LOC_SHORT[k] || k}の人通り`); });
  Object.entries(fx.genre || {}).forEach(([k, v]) => { if (v > 1) ups.push(findGenre(k).name); });
  Object.entries(fx.temp || {}).forEach(([k, v]) => { if (v > 1) ups.push(k === 'hot' ? 'HOT' : 'COLD'); });
  return ups.length ? `${ups.slice(0, 3).join('・')}が好調` : '';
}

function goalCard(s, wx) {
  if (s.tutorial?.step && s.tutorial.step !== 'done') return '';
  const list = achievementList(s);
  const ready = list.find((x) => x.done && !x.claimed);
  const next = ready || list.filter((x) => !x.done).sort((a, b) => b.value / b.goal - a.value / a.goal)[0];
  const fmt = (x, v) => (x.unit === '円' ? yen(v) : `${num(v)}${x.unit}`);
  const tip = weatherTip(wx);
  const body = !next ? '<span class="gc-main"><b>すべての実績を達成しました！</b></span>'
    : `<span class="gc-main"><b>${esc(next.name)}</b>
        ${ready ? '<small>達成！ 報酬を受け取れます</small>'
          : `<span class="bar thin"><i style="width:${Math.round((next.value / next.goal) * 100)}%"></i></span><small>${fmt(next, next.value)} / ${fmt(next, next.goal)}</small>`}</span>
      ${ready ? `<button class="btn primary gc-btn" data-goal-claim="${next.id}">${coin()}${yen(next.reward)}</button>`
        : `<span class="gc-rw">${coin()}${yen(next.reward)}</span>`}`;
  return `<a class="goal-card" href="#stats">
    <span class="gc-head">${ill('star')}<b>次の目標</b><small>実績 ${list.filter((x) => x.claimed).length}/${list.length}</small></span>
    <span class="gc-row">${body}</span>
    ${tip ? `<span class="gc-tip">${weatherIcon(wx.id)}<span>${esc(wx.name)}：${esc(tip)}</span></span>` : ''}
  </a>`;
}
