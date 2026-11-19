// =============================================================
// 陳列の並び替えページ  #arrange-<自販機ID>
// 1つ目をタップ → 2つ目をタップで入れ替え。位置ごとの「おすすめ」に合うと ✓
// =============================================================
import { getState } from '../state.js';
import { swapSlots } from '../actions.js';
import { MACHINE_MODELS, slotMatches, findLocation } from '../config.js';
import { slotGrid } from './slotgrid.js';
import { pageHead, locPill } from './parts.js';
import { se } from '../audio.js';

const ui = { id: null, picked: null };

export function render(s, id) {
  const m = s.machines.find((x) => x.id === id);
  if (!m) return '<p class="empty">自販機が見つかりません <a href="#machines">戻る</a></p>';
  if (ui.id !== id) { ui.id = id; ui.picked = null; }
  const hints = MACHINE_MODELS[m.modelId].slotHints || [];
  const matched = m.slots.filter((sl, i) => slotMatches(m.modelId, i, sl.item)).length;
  return `${pageHead({ title: '並び替え', ic: 'machine', back: `#machine-${id}`, right: locPill(`${m.name}・${findLocation(m.locationId).name}`) })}
  <div class="op-page" id="op">
    <p class="ar-help">${ui.picked === null ? '動かしたい商品をタップ' : '入れ替え先をタップ（同じ所をもう一度で取り消し）'}</p>
    ${slotGrid(m, { selected: ui.picked, target: true, price: true })}
    ${hints.length ? `<div class="ar-tip"><b>おすすめの並べ方 ${matched}/${hints.length}</b>
      <span>各位置の上に書かれた商品を置くと、その場所で売れやすくなります。目線の高さの上段は全体的に売れやすく、右下はHOTのコーヒー、右上はエナジードリンクがよく売れます。</span></div>` : ''}
    <a class="btn primary wide done-btn" href="#machine-${id}">完了</a>
  </div>`;
}

export function mount(el, s, id) {
  const box = el.querySelector('#op');
  if (!box) return;
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cell]');
    if (!b) return;
    const i = Number(b.dataset.cell);
    if (ui.picked === null) {
      ui.picked = i;
      const y = scrollY; el.innerHTML = render(getState(), id); mount(el, getState(), id); scrollTo(0, y);
      return;
    }
    const from = ui.picked;
    ui.picked = null;
    if (from !== i) { se('swap'); swapSlots(id, from, i); }   // 保存と同時に画面が描き直される
    else { const y = scrollY; el.innerHTML = render(getState(), id); mount(el, getState(), id); scrollTo(0, y); }
  });
}
