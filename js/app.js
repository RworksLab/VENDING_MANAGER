// =============================================================
// 起動・ルーティング・タブ
// 画面は location.hash で切り替える（#home, #machines, #machine-<id> …）
// =============================================================
import {
  createInitialState, migrate, touchClock, replaceState, update, subscribe, getState, setCommitHandler, addNotice,
} from './state.js';
import { loadBest, persist } from './storage.js';
import * as home from './views/home.js';
import * as machines from './views/machines.js';
import * as products from './views/products.js';
import * as more from './views/more.js';
import * as productEdit from './views/productEdit.js';
import * as warehouse from './views/warehouse.js';
import * as refillPage from './views/refill.js';
import * as arrangePage from './views/arrange.js';
import * as pricePage from './views/price.js';
import * as shop from './views/shop.js';
import * as stats from './views/stats.js';
import { preloadImages, collectGarbage } from './images.js';
import { runSimulation } from './sim.js';
import { factorsAt, dayInfo, visibleEvents } from './events.js';
import * as eventsPage from './views/events.js';
import { SIM } from './config.js';
import { dateKey, yen, num, esc } from './util.js';
import { coin, ill } from './icons.js';
import { sceneSVG, timeOfDay } from './render/art.js';
import { closeSheet, openSheet, toast } from './ui.js';
import { registerSW, systemNotify, setBadge } from './notify.js';
import { initAudio, se } from './audio.js';
import { showTutorial } from './views/tutorial.js';
import { initUpdateCheck } from './update.js';

const TABS = [
  { id: 'home', label: 'ホーム', icon: 'home' },
  { id: 'machines', label: '自販機', icon: 'machine' },
  { id: 'products', label: '商品開発', icon: 'cup' },
  { id: 'warehouse', label: '倉庫', icon: 'warehouse' },
  { id: 'shop', label: 'ショップ', icon: 'cart' },
];

// ルート名 → { tab, view }
function resolve(hash) {
  const h = hash.replace(/^#/, '') || 'home';
  if (h === 'product-new') return { tab: 'products', html: (s) => productEdit.render(s, 'new'), mount: (el, s) => productEdit.mount(el, s, 'new') };
  if (h.startsWith('product-edit-')) {
    const id = h.slice(13);
    return { tab: 'products', html: (s) => productEdit.render(s, id), mount: (el, s) => productEdit.mount(el, s, id) };
  }
  if (h.startsWith('machine-')) return { tab: 'machines', html: (s) => machines.renderDetail(s, h.slice(8)) };
  // 自販機の操作ページ（補充・回収／並び替え／価格変更）
  for (const [prefix, mod] of [['refill-', refillPage], ['arrange-', arrangePage], ['price-', pricePage],
    ['move-', { render: shop.renderMove, mount: shop.mountMove }], ['upgrade-', { render: shop.renderUpgrade, mount: shop.mountUpgrade }]]) {
    if (h.startsWith(prefix)) {
      const id = h.slice(prefix.length);
      return { tab: 'machines', html: (s) => mod.render(s, id), mount: (el, s) => mod.mount(el, s, id) };
    }
  }
  switch (h) {
    case 'machines': return { tab: 'machines', html: machines.renderList };
    case 'products': return { tab: 'products', html: products.render, mount: products.mount };
    case 'warehouse': return { tab: 'warehouse', html: warehouse.render, mount: warehouse.mount };
    // ショップは自販機に、経営・イベントはホームに統合
    case 'shop': return { tab: 'shop', html: shop.renderShop, mount: shop.mountShop };
    case 'buy-machine': return { tab: 'shop', html: shop.renderBuyMachine, mount: shop.mountBuyMachine };
    case 'stats': return { tab: 'home', html: stats.render };
    case 'events': return { tab: 'home', html: eventsPage.render };
    case 'more': case 'settings': return { tab: 'home', html: more.renderSettings, mount: more.mountSettings };
    default: return { tab: 'home', html: home.render, mount: home.mount };
  }
}

const view = document.getElementById('view');
let lastHash = null;

function render() {
  const s = getState();
  if (!s) return;
  const r = resolve(location.hash);
  // 街並みの背景は自販機詳細だけ。他の画面は無地
  const m = location.hash.startsWith('#machine-') && s.machines.find((x) => `#machine-${x.id}` === location.hash);
  renderBackdrop(m ? m.locationId : null, factorsAt(s).info.weather.id);
  const same = lastHash === location.hash;
  const y = scrollY;
  renderHud(s);
  view.innerHTML = r.html(s);
  r.mount?.(view, s);
  document.querySelectorAll('.tabbar a').forEach((a) => a.setAttribute('aria-current', a.dataset.tab === r.tab ? 'page' : 'false'));
  if (same) scrollTo(0, y); else scrollTo(0, 0);
  lastHash = location.hash;
  alignGround();
}

// 背景の地面（viewBox の y=470）を、自販機が立つ位置（.stage の下端）にそろえる
function alignGround() {
  const bg = document.getElementById('bg');
  const stage = view.querySelector('.stage');
  const k = Math.max(innerWidth / 900, 1);
  const ground = 560 - 90 * k;
  const top = stage ? stage.getBoundingClientRect().bottom + scrollY - ground : 0;
  bg.style.top = `${Math.round(top)}px`;
}
addEventListener('resize', alignGround);

function renderTabs() {
  document.querySelector('.tabbar').innerHTML = TABS.map((t) => `
    <a href="#${t.id}" data-tab="${t.id}">${ill(t.icon)}<span>${t.label}</span></a>`).join('');
}

// 背景の街並み（設置場所・時間帯が変わったときだけ描き直す）
let bgKey = '';
function renderBackdrop(locationId, weather) {
  const tod = timeOfDay();
  const key = locationId ? `${locationId}/${tod}/${weather}` : '';
  document.body.dataset.tod = tod;
  document.body.classList.toggle('scene-on', !!locationId);
  if (key === bgKey) return;
  bgKey = key;
  document.getElementById('bg').innerHTML = locationId ? sceneSVG(locationId, tod, weather) : '';
}

// ヘッダー：左にアプリタイトル、右に所持金（未読のお知らせはホームの「設定」ボタンに件数を出す）
function renderHud(s) {
  document.getElementById('hud').innerHTML = `
    <a class="hud-title" href="#home">${ill('machine')}<span>自販機マネジャー</span></a>
    <div class="hud-money">${coin()}<b>${yen(s.money).slice(1)}</b><small>円</small></div>`;
}

async function boot() {
  renderTabs();
  setCommitHandler(persist);
  let s = null;
  try { s = migrate(await loadBest()); } catch { s = null; }
  if (!s) s = createInitialState();
  touchClock(s);
  collectGarbage(s);
  replaceState(s);
  subscribe(render);
  subscribe(watchNotices);
  render();
  watchNotices(getState());
  registerSW();
  initAudio();
  initUpdateCheck();
  document.body.classList.add('ready');
  // ラベル画像は本体の後から読み込み、揃ったら描き直す
  preloadImages(s).then((got) => got && render());
  tick({ welcome: true });
  if (!getState().tutorialDone) showTutorial();   // 初めての人にはチュートリアル
  setInterval(() => tick(), 60 * 1000);   // 開いている間も1分ごとに販売を進める
}

// ---------- 通知（新しいお知らせを端末通知・トースト・バッジへ） ----------
let lastNoticeId = null;
const IMPORTANT = new Set(['soldOut', 'trouble', 'location']);
function watchNotices(s) {
  const nf = s.notifications || {};
  const enabled = (n) => nf.enabled !== false && nf[n.type] !== false;
  if (lastNoticeId === null) lastNoticeId = s.notices[0]?.id ?? '';
  const fresh = [];
  for (const n of s.notices) { if (n.id === lastNoticeId) break; fresh.push(n); }
  if (fresh.length) {
    lastNoticeId = s.notices[0].id;
    fresh.filter(enabled).reverse().forEach((n) => {
      if (document.hidden) systemNotify(n);
      else if (IMPORTANT.has(n.type)) { se('notice'); toast(n.text); }
    });
  }
  setBadge(s.notices.filter((n) => !n.read && enabled(n)).length);
}

// ---------- 販売処理の実行 ----------
function tick({ welcome = false } = {}) {
  const r = runSimulation();
  announceDay();
  if (!r.ticks) return;
  if (welcome && r.to - r.from >= SIM.welcomeBackMinutes * 60000 && r.units) showWelcome(r);
  else flashGains(r.gains);
}

// 日付が変わったら、その日の天気とイベントをお知らせに出す
function announceDay() {
  const s = getState();
  if (s.events.noticedDate === s.today.date) return;
  const info = dayInfo(s.events.seed, s.today.date);
  const evs = visibleEvents(info, s.today.date).map((e) => e.name);
  update((st) => {
    st.events.noticedDate = st.today.date;
    addNotice(st, `今日の天気は${info.weather.name}。${evs.length ? `イベント：${evs.join('・')}` : 'イベントはありません'}`, { type: 'events', target: '#events' });
  });
}

function showWelcome(r) {
  const mins = Math.round((r.to - r.from) / 60000);
  const span = mins >= 60 ? `${Math.floor(mins / 60)}時間${mins % 60 ? `${mins % 60}分` : ''}` : `${mins}分`;
  openSheet(`<div class="welcome">
    ${coin('wb-coin')}
    <h2 class="sheet-title">おかえりなさい</h2>
    <p class="muted">留守にしていた ${span} の売上です</p>
    <div class="wb-nums"><div><small>売上</small><b>+${yen(r.sales)}</b></div><div><small>販売本数</small><b>${num(r.units)}<em>本</em></b></div></div>
    ${r.soldOut.length ? `<div class="wb-out"><b>売り切れ</b>${r.soldOut.slice(0, 6).map((x) => `<span>${esc(x)}</span>`).join('')}${r.soldOut.length > 6 ? `<span>ほか${r.soldOut.length - 6}件</span>` : ''}</div>` : ''}
    <button class="btn primary wide" data-close>OK</button></div>`);
  se('welcome');
}

// マップのピンから「+¥」を浮かび上がらせる
function flashGains(gains) {
  if (location.hash.startsWith('#home') || !location.hash) {
    if (Object.values(gains).some((v) => v > 0)) se('coin');
  }
  Object.entries(gains).forEach(([id, v]) => {
    const pin = document.querySelector(`.pin[href="#machine-${id}"]`);
    if (!pin || !v) return;
    const g = document.createElement('span');
    g.className = 'gain';
    g.textContent = `+${yen(v)}`;
    pin.appendChild(g);
    setTimeout(() => g.remove(), 2200);
  });
}

addEventListener('hashchange', () => { closeSheet(); render(); });

// アプリに戻ってきたときに日付の切り替えを反映（STEP4 でここに放置分の販売処理を追加）
document.addEventListener('visibilitychange', () => {
  const s = getState();
  if (document.visibilityState !== 'visible' || !s) return;
  if (s.today.date !== dateKey()) update(touchClock);
  tick({ welcome: true });
});

boot();
