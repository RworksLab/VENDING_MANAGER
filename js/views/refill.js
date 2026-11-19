// =============================================================
// 補充・回収ページ  #refill-<自販機ID>（仕様書 5-5）
// 自販機の並びのままスロットを選び、その場で補充・回収・陳列する
// =============================================================
import { getState } from '../state.js';
import { refill, recall, planFillAll, lots, lotKey, lotQty, slotCap } from '../actions.js';
import { slotHintOf, slotMatches, findLocation } from '../config.js';
import { drinkSVG } from '../render/art.js';
import { icon } from '../icons.js';
import { esc, num } from '../util.js';
import { toast } from '../ui.js';
import { slotGrid } from './slotgrid.js';
import { pageHead, locPill } from './parts.js';
import { se } from '../audio.js';

const ui = { id: null, sel: 0 };

function panel(s, m) {
  const sl = m.slots[ui.sel];
  const cap = slotCap(m);
  const hint = slotHintOf(m.modelId, ui.sel);
  if (!sl.item) {
    const avail = lots(s);
    return `<section class="rp">
      <div class="rp-head"><b>スロット${ui.sel + 1}：空き</b>${hint ? `<small>おすすめ：${esc(hint.text)}</small>` : ''}</div>
      ${avail.length ? `<p class="rp-sub">並べる商品をタップ（最大${cap}本まで入ります）</p>
        <div class="rp-lots">${avail.map((l) => `<button class="rp-lot ${slotMatches(m.modelId, ui.sel, l.snap) ? 'rec' : ''}" data-place="${l.key}">
          ${slotMatches(m.modelId, ui.sel, l.snap) ? '<em>おすすめ</em>' : ''}
          <span class="rp-lot-art">${drinkSVG(l.snap)}</span><b>${esc(l.snap.name)}</b><small>倉庫 ${num(l.qty)}本</small></button>`).join('')}</div>`
        : '<p class="rp-sub">倉庫に在庫がありません。<a href="#warehouse">倉庫で仕入れる</a></p>'}
    </section>`;
  }
  const wh = lotQty(s, lotKey(sl.item));
  const room = cap - sl.stock;
  const canAdd = Math.min(room, wh);
  return `<section class="rp">
    <div class="rp-head"><span class="rp-art">${drinkSVG(sl.item)}</span>
      <span><b>${esc(sl.item.name)}</b><small>自販機 ${sl.stock}/${cap}本・倉庫 ${num(wh)}本${hint ? `・おすすめ：${esc(hint.text)}` : ''}</small></span></div>
    <div class="rp-row"><span class="rp-lbl">${icon('refill')}補充</span>
      <button class="rp-btn" data-add="1" ${canAdd >= 1 ? '' : 'disabled'}>+1</button>
      <button class="rp-btn" data-add="5" ${canAdd >= 1 ? '' : 'disabled'}>+5</button>
      <button class="rp-btn main" data-add="max" ${canAdd >= 1 ? '' : 'disabled'}>満タン${canAdd ? `(+${canAdd})` : ''}</button></div>
    <div class="rp-row"><span class="rp-lbl">${icon('restore')}回収</span>
      <button class="rp-btn" data-take="1" ${sl.stock ? '' : 'disabled'}>−1</button>
      <button class="rp-btn" data-take="all" ${sl.stock ? '' : 'disabled'}>すべて</button>
      <button class="rp-btn ghost" data-take="clear">空きにする</button></div>
    ${!wh && room ? '<p class="rp-sub">この商品は倉庫にありません。<a href="#warehouse">倉庫で仕入れる</a></p>' : ''}
  </section>`;
}

export function render(s, id) {
  const m = s.machines.find((x) => x.id === id);
  if (!m) return '<p class="empty">自販機が見つかりません <a href="#machines">戻る</a></p>';
  if (ui.id !== id) {   // 開いた直後は在庫が一番少ないスロットを選ぶ
    ui.id = id;
    ui.sel = m.slots.reduce((best, sl, i, arr) => (sl.item && (!arr[best].item || sl.stock < arr[best].stock) ? i : best), 0);
  }
  const fillable = planFillAll(s, m).reduce((a, p) => a + p.qty, 0);
  return `${pageHead({ title: '補充・回収', ic: 'warehouse', back: `#machine-${id}`, right: locPill(`${m.name}・${findLocation(m.locationId).name}`) })}
  <div class="op-page" id="op">
    <button class="btn wide fill-all" data-fillall ${fillable ? '' : 'disabled'}>${icon('refill')}まとめて満タン${fillable ? `（+${fillable}本）` : ''}</button>
    ${slotGrid(m, { selected: ui.sel })}
    ${panel(s, m)}
    <a class="btn primary wide done-btn" href="#machine-${id}">完了</a>
  </div>`;
}

export function mount(el, s, id) {
  const box = el.querySelector('#op');
  if (!box) return;
  const redraw = () => { const y = scrollY; el.innerHTML = render(getState(), id); mount(el, getState(), id); scrollTo(0, y); };
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const m = getState().machines.find((x) => x.id === id);
    if (b.dataset.cell !== undefined) { ui.sel = Number(b.dataset.cell); return redraw(); }
    if ('fillall' in b.dataset) { const n = refill(id, planFillAll(getState(), m)); se(n ? 'refill' : 'error'); toast(`${n}本を補充しました`); return; }
    const sl = m.slots[ui.sel];
    if (b.dataset.place) { const n = refill(id, [{ slot: ui.sel, key: b.dataset.place, qty: slotCap(m) }]); se(n ? 'refill' : 'error'); toast(`${n}本を並べました`); return; }
    if (b.dataset.add) {
      const n = refill(id, [{ slot: ui.sel, key: lotKey(sl.item), qty: b.dataset.add === 'max' ? slotCap(m) : Number(b.dataset.add) }]);
      if (n) { se('refill'); toast(`${n}本を補充しました`); } else se('error');
      return;
    }
    if (b.dataset.take) {
      const t = b.dataset.take;
      const n = recall(id, [{ slot: ui.sel, qty: t === '1' ? 1 : sl.stock, clear: t === 'clear' }]);
      se('recall');
      toast(t === 'clear' ? `空きにしました${n ? `（${n}本を倉庫へ）` : ''}` : `${n}本を倉庫に戻しました`);
    }
  });
}
