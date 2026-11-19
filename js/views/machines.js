import { machineSummary } from '../state.js';
import { findLocation, TRAFFIC_WORD, BALANCE } from '../config.js';
import { machineSVG, drinkSVG } from '../render/art.js';
import { icon, ill, coin, weatherIcon } from '../icons.js';
import { effectsForLocation } from '../events.js';
import { yen, num, esc, fmtDateTime } from '../util.js';
import { pageHead, locPill } from './parts.js';
import { expectedPerHour, isDown, upkeepOf } from '../sim.js';
import { openMachine } from '../actions.js';
import { toast } from '../ui.js';
import { se } from '../audio.js';

const yesterdayDiff = (s, id) => {
  const prev = s.dailyHistory[s.dailyHistory.length - 1];
  const p = id ? prev?.byMachine?.[id]?.sales : prev?.sales;
  const t = id ? s.today.byMachine[id]?.sales || 0 : s.today.sales;
  if (!p) return '';
  const d = Math.round(((t - p) / p) * 100);
  return `<span class="diff ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${d >= 0 ? '+' : ''}${d}%</span>`;
};

/** 売上状況パネル（ホームと詳細で共用） */
export function salesPanel(s, m) {
  const x = m ? machineSummary(m) : s.machines.map(machineSummary).reduce((a, b) => ({ stock: a.stock + b.stock, capacity: a.capacity + b.capacity }), { stock: 0, capacity: 0 });
  const sales = m ? s.today.byMachine[m.id]?.sales || 0 : s.today.sales;
  const pct = x.capacity ? Math.round((x.stock / x.capacity) * 100) : 0;
  return `<section class="wcard sales-card">
    <h2 class="wtitle">${ill('barsBlue')}売上状況</h2>
    <div class="kpi">${coin('kpi-ic')}<div><small>本日の売上</small><b>${num(sales)}<em>円</em></b>${yesterdayDiff(s, m?.id)}</div></div>
    <div class="kpi">${ill('box', 'kpi-ic')}<div><small>現在の在庫</small><b>${num(x.stock)}<em>本</em> <span class="of">/ ${num(x.capacity)}<em>本</em></span></b></div></div>
    <div class="bar ${pct < 25 ? 'low' : ''}"><i style="width:${pct}%"></i></div>
  </section>`;
}

export function renderList(s) {
  const cards = s.machines.map((m) => {
    const x = machineSummary(m);
    const today = s.today.byMachine[m.id]?.sales || 0;
    const pct = x.capacity ? Math.round((x.stock / x.capacity) * 100) : 0;
    return `
    <a class="mcard wcard" href="#machine-${m.id}">
      <div class="mcard-art">${machineSVG(m, { compact: true })}</div>
      <div class="mcard-body">
        <b class="mcard-name">${esc(m.name)}</b>
        ${locPill(findLocation(m.locationId).name)}
        <div class="mcard-nums"><span><small>本日</small>${yen(today)}</span><span><small>累計</small>${yen(m.totalSales)}</span></div>
        <div class="bar ${pct < 25 ? 'low' : ''}"><i style="width:${pct}%"></i></div>
        <div class="mcard-foot"><span>${num(x.stock)} / ${num(x.capacity)}本</span>${x.soldOut ? `<span class="tag red">売切 ${x.soldOut}</span>` : ''}</div>
      </div>
    </a>`;
  }).join('');

  return `${pageHead({ title: '自販機', ic: 'machine', right: `<span class="loc-pill">${ill('shop')}${s.machines.length} / ${BALANCE.maxMachines}</span>` })}
  <div class="mlist">${cards}
    ${s.machines.length < BALANCE.maxMachines ? `<a class="mcard add" href="#buy-machine">${icon('plus')}<span>自販機を購入する</span>${icon('back', 'chev')}</a>` : ''}
  </div>`;
}

export function renderDetail(s, id) {
  const m = s.machines.find((x) => x.id === id);
  if (!m) return `<p class="empty">見つかりません <a href="#machines">戻る</a></p>`;
  const x = machineSummary(m);
  const loc = findLocation(m.locationId);

  const slots = m.slots.map((sl, i) => sl.item ? `
    <div class="slot ${sl.stock === 0 ? 'out' : ''}">
      <div class="slot-art">${drinkSVG(sl.item)}</div>
      <div class="slot-bar"><i style="width:${Math.round((sl.stock / x.cap) * 100)}%"></i></div>
      <b>${sl.stock === 0 ? '売切' : sl.stock}</b>
      <small class="slot-rate">${sl.stock ? `約${expectedPerHour(m, i, Date.now(), s).toFixed(1)}本/時` : '補充してください'}</small>
    </div>` : '<div class="slot empty"><div class="slot-art"></div><b>空き</b></div>').join('');
  const log = s.salesLog.filter((l) => l.machineId === m.id).slice(0, 8);

  const down = isDown(m) ? `<p class="down-bar">${icon('alert')}${esc(m.downReason || 'トラブル')}のため販売停止中（${new Date(m.downUntil).getHours()}:${String(new Date(m.downUntil).getMinutes()).padStart(2, '0')}ごろ復旧）</p>` : '';
  const up = upkeepOf(m);
  const ev = effectsForLocation(s, m.locationId);
  const evRow = `<a class="ev-row" href="#events">${weatherIcon(ev.weather.id)}<b>${esc(ev.weather.name)}</b>
    ${ev.events.map((e) => `<em class="chip-ev ${e.scale}">${esc(e.name)}</em>`).join('')}
    <span class="ev-traffic ${ev.traffic > 1.01 ? 'up' : ev.traffic < 0.99 ? 'down' : ''}">${ev.traffic > 1.01 ? '人通り↑' : ev.traffic < 0.99 ? '人通り↓' : ''}</span></a>`;
  const closed = m.open === false ? `<div class="closed-bar"><span>${icon('alert')}営業していません</span><button class="btn primary" id="open-btn" data-open="${m.id}">営業開始</button></div>` : '';
  return `${pageHead({ title: '自販機詳細', ic: 'machine', back: '#machines', right: locPill(loc.name + 'エリア') })}
  ${down}${closed}${evRow}
  <div class="detail">
    <div class="stage"><div class="stage-machine">${machineSVG(m)}</div></div>
    <div class="detail-side">
      ${salesPanel(s, m)}
      <div class="bbtns">
        <a class="bbtn blue" href="#refill-${m.id}"><span class="bbtn-ic">${icon('refill')}</span>補充・回収</a>
        <a class="bbtn green" href="#arrange-${m.id}"><span class="bbtn-ic">${icon('swap')}</span>並び替え</a>
        <a class="bbtn yellow" href="#price-${m.id}"><span class="bbtn-ic">${icon('yen')}</span>価格変更</a>
        <a class="bbtn purple" href="#upgrade-${m.id}"><span class="bbtn-ic">${icon('bolt')}</span>設備強化</a>
      </div>
    </div>
  </div>
  <section class="wcard info-strip">
    <div>${ill('pin')}<span><small>設置場所</small><b>${esc(loc.name)}</b></span></div>
    <div>${ill('people')}<span><small>人通り</small><b>${TRAFFIC_WORD[loc.traffic]}</b></span></div>
    <div>${ill('star')}<span><small>相性の良い商品</small><b>${esc(loc.likes)}</b></span></div>
    <div class="upkeep-line">${coin('mini-coin')}<span><small>維持費</small><b>${yen(up.total)}/日</b></span></div>
    <a class="chg-btn" href="#move-${m.id}">${icon('pin')}設置場所の変更</a>
  </section>
  <section class="wcard">
    <h2 class="wtitle">${ill('box')}商品ごとの在庫</h2>
    <div class="slots">${slots}</div>
  </section>
  <section class="wcard">
    <h2 class="wtitle">${ill('bars')}直近の販売</h2>
    ${log.length ? `<ul class="hist">${log.map((l) => `<li><time>${fmtDateTime(l.at)}</time><span><b>${num(l.units)}本</b></span><b class="ok-t">+${yen(l.sales)}</b></li>`).join('')}</ul>`
      : '<p class="muted small">まだ販売はありません。10分ごとに売上が入ります。</p>'}
  </section>`;
}


export function mountDetail(el) {
  el.querySelector('#open-btn')?.addEventListener('click', (e) => {
    openMachine(e.currentTarget.dataset.open);
    se('success');
    toast('営業を開始しました');
  });
}
