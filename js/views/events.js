// =============================================================
// イベントカレンダー  #events（仕様書 11-9）
// 今日の天気とイベント（効果つき）、7日先までの予定（予告されたものだけ）
// =============================================================
import { SCALE_NAME } from '../config.js';
import { dayInfo, visibleEvents, describe, daysBetween } from '../events.js';
import { weatherIcon, ill } from '../icons.js';
import { esc, dateKey } from '../util.js';
import { pageHead } from './parts.js';

const WD = ['日', '月', '火', '水', '木', '金', '土'];
const md = (key) => { const [, m, d] = key.split('-').map(Number); return `${m}/${d}`; };
const wd = (key) => { const [y, m, d] = key.split('-').map(Number); return WD[new Date(y, m - 1, d).getDay()]; };
const effList = (fx) => describe(fx).map((e) => `<li class="${e.up ? 'up' : 'down'}">${e.up ? '▲' : '▼'} ${esc(e.text)}</li>`).join('');

function eventCard(e, today) {
  const period = e.start === e.end ? '' : `${md(e.start)}〜${md(e.end)}`;
  const left = daysBetween(today, e.end);
  return `<article class="ev-card ${e.scale}">
    <div class="ev-top"><span class="ev-scale">${SCALE_NAME[e.scale]}</span><span class="ev-kind">${esc(e.kind)}</span>
      ${period ? `<span class="ev-period">${period}${left > 0 ? `（あと${left}日）` : '（最終日）'}</span>` : ''}</div>
    <b class="ev-name">${esc(e.name)}${e.target ? `<small>：${esc(e.target)}</small>` : ''}</b>
    <ul class="ev-fx">${effList(e.effects)}</ul>
  </article>`;
}

export function render(s) {
  const seed = s.events.seed;
  const today = s.today.date || dateKey();
  const info = dayInfo(seed, today);
  const todays = visibleEvents(info, today);
  const wxFx = effList(info.weather.effects);
  const upcoming = Array.from({ length: 7 }, (_, i) => {
    const key = dateKey(new Date(today.replace(/-/g, '/')).getTime() + (i + 1) * 864e5);
    const d = dayInfo(seed, key);
    const evs = visibleEvents(d, today).filter((e) => e.start === key || i === 0 || e.start > today);
    return `<li class="up-day">
      <span class="ud-date"><b>${md(key)}</b><small class="${['日', '土'].includes(wd(key)) ? 'we' : ''}">${wd(key)}</small></span>
      <span class="ud-wx">${weatherIcon(d.weather.id)}<small>${esc(d.weather.name)}</small></span>
      <span class="ud-evs">${evs.length ? evs.map((e) => `<em class="chip-ev ${e.scale}">${esc(e.name)}${e.start <= today ? '（開催中）' : ''}</em>`).join('') : '<small class="muted">予定なし</small>'}</span>
    </li>`;
  }).join('');

  return `${pageHead({ title: 'イベント', ic: 'calendar', back: '#home' })}
  <div class="op-page">
    <section class="wcard today-ev">
      <div class="te-head">
        <span class="te-date"><b>${md(today)}</b><small>${wd(today)}曜日</small></span>
        <span class="te-wx">${weatherIcon(info.weather.id, 'big')}<b>${esc(info.weather.name)}</b></span>
      </div>
      ${wxFx ? `<ul class="ev-fx wx-fx">${wxFx}</ul>` : '<p class="muted small">天気による影響はありません</p>'}
    </section>
    <h2 class="sec-ttl">本日のイベント</h2>
    ${todays.length ? todays.map((e) => eventCard(e, today)).join('') : `<section class="wcard wh-empty">${ill('calendar')}<b>本日のイベントはありません</b></section>`}
    <h2 class="sec-ttl">今後の予定</h2>
    <section class="wcard"><ul class="up-list">${upcoming}</ul></section>
    <p class="muted small">大きなイベントは数日前から予告されます。予告のないイベントが当日に起きることもあります。</p>
  </div>`;
}
