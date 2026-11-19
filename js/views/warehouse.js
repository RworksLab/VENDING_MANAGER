// =============================================================
// 倉庫・仕入れ画面（仕様書 5章）：在庫 / 仕入れ / 履歴
// =============================================================
import { getState, machineSummary } from '../state.js';
import { purchase, lots } from '../actions.js';
import { salePrice, costRate } from '../events.js';
import { drinkSVG, machineSVG } from '../render/art.js';
import { icon, ill } from '../icons.js';
import { esc, num, yen, fmtDateTime } from '../util.js';
import { toast, openSheet, closeSheet } from '../ui.js';
import { pageHead } from './parts.js';
import { se } from '../audio.js';

const ui = { tab: 'stock', cart: {} };
const BUY_MAX = 999;   // 1品あたりの購入数の上限（3桁）

const unitOf = (s, p) => salePrice(s, p.unitCost);   // 仕入れ応援セール中は割引価格
const cartTotal = (s) => Object.entries(ui.cart).reduce((a, [id, q]) => { const p = s.products.find((x) => x.id === id); return a + (p ? unitOf(s, p) : 0) * q; }, 0);
const cartQty = () => Object.values(ui.cart).reduce((a, b) => a + b, 0);

function stockTab(s) {
  const list = lots(s);
  const rows = list.map((l) => {
    const p = s.products.find((x) => x.id === l.snap.productId);
    const old = !p || p.rev !== l.snap.rev;
    return `<div class="wh-row">
      <span class="wh-art">${drinkSVG(l.snap)}</span>
      <span class="wh-main"><b>${esc(l.snap.name)}${old ? '<em class="tag">旧仕様</em>' : ''}</b><small>仕入れ単価 ${yen(l.unitCost)}</small></span>
      <span class="wh-qty">${num(l.qty)}<em>本</em></span>
    </div>`;
  }).join('');
  const machines = s.machines.map((m) => {
    const x = machineSummary(m);
    return `<a class="wh-mach" href="#refill-${m.id}">
      <span class="wh-mach-art">${machineSVG(m, { compact: true })}</span>
      <span><b>${esc(m.name)}</b><small>在庫 ${num(x.stock)} / ${num(x.capacity)}</small></span>
      <span class="wh-mach-go">${icon('refill')}補充</span>
    </a>`;
  }).join('');
  return `
    ${list.length ? `<section class="wcard"><div class="wh-list">${rows}</div></section>`
      : `<section class="wcard wh-empty">${ill('box')}<b>倉庫は空です</b><button class="btn primary" data-tab="buy">${icon('plus')}仕入れる</button></section>`}
    <h2 class="sec-ttl">自販機へ補充</h2>
    <div class="wh-machs">${machines}</div>`;
}

// 仕入れ：3列の商品グリッド → 「カート」で追加 → カート画面で数量を調整して購入
function buyTab(s) {
  if (!s.products.length) return `<section class="wcard wh-empty">${ill('cup')}<b>商品がありません</b><a class="btn primary" href="#product-new">${icon('flask')}商品を開発する</a></section>`;
  const cards = s.products.map((p) => {
    const q = ui.cart[p.id] || 0;
    return `<div class="bcard ${q ? 'in' : ''}">
      <span class="bcard-art ${p.temp}">${drinkSVG(p)}</span>
      <b class="bcard-name">${esc(p.name)}</b>
      <span class="bcard-cost">${unitOf(s, p) < p.unitCost ? `<s>${yen(p.unitCost)}</s>` : ''}${yen(unitOf(s, p))}<small>/本</small></span>
      <div class="mini-step" data-card="${p.id}">
        <button type="button" data-d="-1" aria-label="${esc(p.name)}を1本減らす" ${q ? '' : 'disabled'}>−</button>
        <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" value="${q}" aria-label="${esc(p.name)}の本数">
        <button type="button" data-d="1" aria-label="${esc(p.name)}を1本増やす" ${q >= BUY_MAX ? 'disabled' : ''}>＋</button>
      </div>
    </div>`;
  }).join('');
  const sale = costRate(s) < 1 ? `<p class="sale-banner">仕入れ応援セール中！ 仕入れ単価 ${Math.round((1 - costRate(s)) * 100)}%オフ</p>` : '';
  return `${sale}<div class="bgrid">${cards}</div>${cartBar(s)}`;
}

function cartBar(s) {
  const n = Object.keys(ui.cart).length;
  if (!n) return '<div id="cart-bar"></div>';
  const total = cartTotal(s);
  return `<button class="cart-bar" id="cart-bar" data-cart>
    <span class="cart-ic">${icon('cart')}<i>${n}</i></span>
    <span><small>カート ${n}品・${num(cartQty())}本</small><b class="${total > s.money ? 'warn-t' : ''}">${yen(total)}</b></span>
    <em>カートを見る ›</em>
  </button>`;
}

function cartBody(s) {
  const lines = Object.entries(ui.cart).map(([id, q]) => ({ p: s.products.find((x) => x.id === id), q })).filter((l) => l.p);
  if (!lines.length) return `<h2 class="sheet-title">カート</h2><p class="empty">カートは空です</p>`;
  const total = cartTotal(s), short = total > s.money;
  return `<h2 class="sheet-title">カート</h2>
    <div class="cart-list">${lines.map(({ p, q }) => `
      <div class="cart-row">
        <span class="wh-art">${drinkSVG(p)}</span>
        <span class="wh-main"><b>${esc(p.name)}</b><small>${yen(unitOf(s, p))} / 本</small></span>
        <span class="cart-sub">${yen(unitOf(s, p) * q)}</span>
        <div class="stepper" data-buy="${p.id}">
          <button type="button" class="st-btn" data-d="-1" aria-label="減らす">−</button>
          <input class="st-inp" type="number" inputmode="numeric" min="0" max="${BUY_MAX}" value="${q}" aria-label="購入数">
          <button type="button" class="st-btn" data-d="1" aria-label="増やす">＋</button>
          <button type="button" class="st-max" data-d="10">+10</button>
          <button type="button" class="st-del" data-del="${p.id}" aria-label="カートから削除">${icon('trash')}</button>
        </div>
      </div>`).join('')}
    </div>
    <div class="rf-foot">
      <span><small>合計 ${num(cartQty())}本・${short ? '所持金が足りません' : `購入後 ${yen(s.money - total)}`}</small><b class="${short ? 'warn-t' : ''}">${yen(total)}</b></span>
      <button class="btn primary" data-buy-go ${!total || short ? 'disabled' : ''}>購入する</button>
    </div>`;
}

function openCart(onChange) {
  let sheet;
  const draw = () => { sheet.querySelector('.cart-body').innerHTML = cartBody(getState()); };
  const setQty = (id, v) => {
    const q = Math.max(0, Math.min(BUY_MAX, Math.floor(Number(v) || 0)));
    if (q) ui.cart[id] = q; else delete ui.cart[id];
  };
  openSheet('<div class="cart-body"></div>', {
    onMount(el) {
      sheet = el;
      draw();
      el.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.del) { delete ui.cart[b.dataset.del]; draw(); onChange(); return; }
        const box = b.closest('[data-buy]');
        if (box && b.dataset.d) { const id = box.dataset.buy; setQty(id, (ui.cart[id] || 0) + Number(b.dataset.d)); draw(); onChange(); return; }
        if ('buyGo' in b.dataset) {
          // 購入で画面が描き直されるため、先に表示を在庫タブへ切り替えておく
          const saved = ui.cart;
          ui.cart = {}; ui.tab = 'stock';
          const r = purchase(Object.entries(saved).map(([productId, qty]) => ({ productId, qty })));
          if (r.ok) { se('buy'); closeSheet(); toast(`${yen(r.total)} で仕入れました`); }
          else { se('error'); ui.cart = saved; ui.tab = 'buy'; draw(); toast(r.reason === 'money' ? '所持金が足りません' : '数量を入力してください'); }
        }
      });
      el.addEventListener('change', (e) => {
        const box = e.target.closest('[data-buy]');
        if (box) { setQty(box.dataset.buy, e.target.value); draw(); onChange(); }
      });
    },
  });
}

function historyTab(s) {
  if (!s.purchaseHistory.length) return `<section class="wcard wh-empty">${ill('box')}<b>仕入れ履歴はまだありません</b></section>`;
  return `<section class="wcard"><ul class="hist">${s.purchaseHistory.map((h) => `
    <li><time>${fmtDateTime(h.at)}</time><span><b>${esc(h.name)}</b><small>${yen(h.unitCost)} × ${num(h.qty)}本</small></span><b>−${yen(h.total)}</b></li>`).join('')}</ul></section>`;
}

export function render(s) {
  const total = lots(s).reduce((a, l) => a + l.qty, 0);
  const tabs = [['stock', '在庫'], ['buy', '仕入れ'], ['history', '履歴']];
  return `${pageHead({ title: '倉庫', ic: 'warehouse', right: `<span class="loc-pill">${ill('box')}${num(total)}本</span>` })}
  <div class="seg page-seg" role="tablist">${tabs.map(([id, t]) => `<button class="opt" data-tab="${id}" role="tab" aria-selected="${ui.tab === id}" aria-pressed="${ui.tab === id}">${t}</button>`).join('')}</div>
  <div id="wh-body">${ui.tab === 'buy' ? buyTab(s) : ui.tab === 'history' ? historyTab(s) : stockTab(s)}</div>`;
}

export function mount(el) {
  const redraw = () => { const y = scrollY; el.innerHTML = render(getState()); mount(el); scrollTo(0, y); };
  el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { ui.tab = b.dataset.tab; redraw(); }));
  const body = el.querySelector('#wh-body');   // 描画のたびに作り直される要素にだけ委譲する
  body.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const card = b.closest('[data-card]');
    if (card) { setCard(card.dataset.card, (ui.cart[card.dataset.card] || 0) + Number(b.dataset.d)); return; }
    if ('cart' in b.dataset) openCart(redraw);
  });
  // 数字入力：3桁までの半角数字だけ受け付け、入力のたびにカートへ反映（フォーカスは保ったまま）
  body.addEventListener('input', (e) => {
    const card = e.target.closest('[data-card]');
    if (!card) return;
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
    setCard(card.dataset.card, e.target.value, { keepInput: true });
  });
  body.addEventListener('focusin', (e) => { if (e.target.matches('.mini-step input')) e.target.select(); });
  body.addEventListener('focusout', (e) => {
    const card = e.target.closest('[data-card]');
    if (card) e.target.value = ui.cart[card.dataset.card] || 0;
  });

  function setCard(id, v, { keepInput = false } = {}) {
    const q = Math.max(0, Math.min(BUY_MAX, Math.floor(Number(v) || 0)));
    if (q) ui.cart[id] = q; else delete ui.cart[id];
    const box = body.querySelector(`[data-card="${id}"]`);
    const cardEl = box.closest('.bcard');
    if (!keepInput) box.querySelector('input').value = q;
    box.querySelector('[data-d="-1"]').disabled = !q;
    box.querySelector('[data-d="1"]').disabled = q >= BUY_MAX;
    cardEl.classList.toggle('in', !!q);
    body.querySelector('#cart-bar').outerHTML = cartBar(getState());
  }
}
