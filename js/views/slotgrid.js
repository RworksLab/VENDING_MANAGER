// 自販機の並びのままスロットを並べるグリッド（補充・回収と並び替えで共用）
import { MACHINE_MODELS, slotHintOf, slotMatches, capOf } from '../config.js';
import { drinkSVG } from '../render/art.js';
import { esc, num } from '../util.js';

/**
 * opts: selected(番号) / target(入れ替え先として強調) / hints(おすすめ表示) / price(価格表示)
 */
export function slotGrid(m, { selected = null, target = false, hints = true, price = false } = {}) {
  const model = MACHINE_MODELS[m.modelId];
  const cap = capOf(m);
  const cells = m.slots.map((sl, i) => {
    const h = hints && slotHintOf(m.modelId, i);
    const ok = h && slotMatches(m.modelId, i, sl.item);
    const pct = sl.item ? Math.round((sl.stock / cap) * 100) : 0;
    return `<button class="sg-cell ${selected === i ? 'sel' : ''} ${target && selected !== null && selected !== i ? 'target' : ''} ${sl.item && !sl.stock ? 'out' : ''}" data-cell="${i}"
      aria-label="スロット${i + 1}：${sl.item ? `${esc(sl.item.name)} 在庫${sl.stock}本` : '空き'}${h ? `。おすすめは${esc(h.text)}` : ''}" aria-pressed="${selected === i}">
      ${h ? `<span class="sg-hint ${ok ? 'ok' : ''}">${ok ? '✓ ' : ''}${esc(h.text)}</span>` : ''}
      <span class="sg-art">${sl.item ? drinkSVG(sl.item) : '<span class="sg-empty">空き</span>'}</span>
      ${sl.item ? `<span class="sg-bar"><i style="width:${pct}%"></i></span>
        <span class="sg-meta">${sl.stock ? `${sl.stock}/${cap}` : '売切'}${price ? `・${num(sl.price)}円` : ''}</span>` : '<span class="sg-meta">—</span>'}
    </button>`;
  }).join('');
  return `<div class="sg" style="grid-template-columns:repeat(${model.cols},minmax(0,1fr))">${cells}</div>`;
}
