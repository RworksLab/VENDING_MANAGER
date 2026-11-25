// =============================================================
// 価格変更ページ  #price-<自販機ID>（仕様書 6-4・9-2）
// 価格を動かすと「1本の利益」と「1時間あたりの売れ行きの目安」がその場で変わる
// =============================================================
import { getState, update } from '../state.js';
import { PRODUCT_FORM, priceHintOf, findLocation } from '../config.js';
import { expectedPerHour, refPrice, crowdAt, toleranceOf } from '../sim.js';
import { drinkSVG } from '../render/art.js';
import { esc, yen } from '../util.js';
import { toast, scrollPos, scrollToY } from '../ui.js';
import { pageHead, locPill } from './parts.js';
import { se } from '../audio.js';
import { notePriced } from '../coach.js';

const clamp = (v) => Math.min(PRODUCT_FORM.priceMax, Math.max(PRODUCT_FORM.priceMin, Math.round(Number(v) || 0)));
const ui = { id: null, draft: {}, same: true };

export function render(s, id) {
  const m = s.machines.find((x) => x.id === id);
  if (!m) return '<p class="empty">自販機が見つかりません <a href="#machines">戻る</a></p>';
  if (ui.id !== id) { ui.id = id; ui.draft = {}; }
  const tol = toleranceOf(crowdAt(m, Date.now(), s));
  const crowdNote = tol > 1.03 ? `今は人通りが多く、適正価格より${Math.round((tol - 1) * 100)}%ほど高くても売れやすい時間です`
    : tol < 0.97 ? '今は人通りが少なく、適正価格より少し安いほうが売れやすい時間です' : '今の人通りはふつうです';
  const rows = m.slots.map((sl, i) => {
    if (!sl.item) return '';
    const price = ui.draft[i] ?? sl.price;
    const trial = { ...m, slots: m.slots.map((x, j) => (j === i ? { ...x, price } : x)) };
    const per = expectedPerHour(trial, i, Date.now(), s);
    const margin = price - (sl.item.unitCost || 0);
    const fair = refPrice(sl.item, findLocation(m.locationId));
    return `<div class="pr-row ${ui.draft[i] !== undefined ? 'changed' : ''}">
      <span class="rf-art">${drinkSVG(sl.item)}</span>
      <span class="rf-main"><b>${esc(sl.item.name)}<em class="pr-pos">スロット${i + 1}</em></b>
        <small>利益 <span class="${margin < 0 ? 'warn-t' : 'ok-t'}">${yen(margin)}</span>/本・目安 ${per.toFixed(1)}本/時</small>
        <small class="pr-hint">適正 ${yen(fair)}・${priceHintOf(price, fair)}</small></span>
      <div class="stepper" data-price="${i}">
        <button type="button" class="st-btn" data-d="-10" aria-label="10円下げる">−</button>
        <input class="st-inp pr-inp" type="text" inputmode="numeric" maxlength="3" value="${price}" aria-label="${esc(sl.item.name)}の価格">
        <button type="button" class="st-btn" data-d="10" aria-label="10円上げる">＋</button>
      </div>
    </div>`;
  }).join('');
  const changed = Object.keys(ui.draft).length;
  return `${pageHead({ title: '価格変更', ic: 'machine', back: `#machine-${id}`, right: locPill(`${m.name}・${findLocation(m.locationId).name}`) })}
  <div class="op-page" id="op">
    <p class="pr-crowd ${tol > 1.03 ? 'up' : tol < 0.97 ? 'down' : ''}">${crowdNote}</p>
    <label class="chk pr-same"><input type="checkbox" data-same ${ui.same ? 'checked' : ''}>同じ商品のスロットにもまとめて適用</label>
    <section class="wcard list-card"><div class="rf-list">${rows || '<p class="empty">陳列中の商品がありません</p>'}</div></section>
    <div class="page-foot">
      <span><small>変更</small><b>${changed}<em>か所</em></b></span>
      <a class="btn ghost" href="#machine-${id}">やめる</a>
      <button class="btn primary" data-save ${changed ? '' : 'disabled'}>保存する</button>
    </div>
  </div>`;
}

export function mount(el, s, id) {
  const box = el.querySelector('#op');
  if (!box) return;
  const redraw = () => { const y = scrollPos(); el.innerHTML = render(getState(), id); mount(el, getState(), id); scrollToY(y); };
  const setPrice = (i, v) => {
    const m = getState().machines.find((x) => x.id === id);
    const p = clamp(v);
    const targets = ui.same ? m.slots.map((x, j) => (x.item && x.item.productId === m.slots[i].item.productId ? j : -1)).filter((j) => j >= 0) : [i];
    targets.forEach((j) => { if (p === m.slots[j].price) delete ui.draft[j]; else ui.draft[j] = p; });
  };
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const st = b.closest('[data-price]');
    if (st) { setPrice(Number(st.dataset.price), (Number(st.querySelector('input').value) || 0) + Number(b.dataset.d)); return redraw(); }
    if ('save' in b.dataset) {
      const n = Object.keys(ui.draft).length;
      const draft = ui.draft;
      ui.draft = {};
      location.hash = `#machine-${id}`;
      update((stt) => {
        const m = stt.machines.find((x) => x.id === id);
        Object.entries(draft).forEach(([i, p]) => { if (m.slots[i]?.item) m.slots[i].price = p; });
      });
      se('confirm');
      notePriced();
      toast(`${n}か所の価格を変更しました`);
    }
  });
  box.addEventListener('input', (e) => { if (e.target.matches('.pr-inp')) e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 3); });
  box.addEventListener('change', (e) => {
    if (e.target.matches('[data-same]')) { ui.same = e.target.checked; return; }
    const st = e.target.closest('[data-price]');
    if (st) { setPrice(Number(st.dataset.price), e.target.value); redraw(); }
  });
}
