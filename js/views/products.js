import { update, getState } from '../state.js';
import { CONTAINERS, TEMPS, TASTES, findGenre } from '../config.js';
import { drinkSVG } from '../render/art.js';
import { yen, esc } from '../util.js';
import { icon } from '../icons.js';
import { pageHead } from './parts.js';
import { openSheet, closeSheet, confirmDialog, toast } from '../ui.js';
import { startNewFrom, draftImages } from './productEdit.js';
import { collectGarbage } from '../images.js';
import { se } from '../audio.js';

const spec = (p) => `${findGenre(p.genre).name}・${CONTAINERS[p.container].name} ${p.volume}ml`;

export function render(s) {
  const cards = s.products.map((p) => `
    <button class="pcard" data-pid="${p.id}">
      <div class="pcard-art ${p.temp}">${drinkSVG(p)}<span class="tdot ${p.temp}">${TEMPS[p.temp]}</span></div>
      <b class="pcard-name">${esc(p.name)}</b>
      <span class="pcard-price">${yen(p.price)}</span>
    </button>`).join('');

  return `
  ${pageHead({ title: '商品開発', ic: 'cup', right: `<span class="loc-pill">${s.products.length}品</span>` })}
  <div class="pgrid">
    <a class="pcard add" href="#product-new"><span class="add-ic">${icon('flask')}</span><b>新しく開発</b></a>
    ${cards}
  </div>`;
}

export function mount(el) {
  el.querySelectorAll('[data-pid]').forEach((b) => b.addEventListener('click', () => showDetail(b.dataset.pid)));
}

function showDetail(id) {
  const s = getState();
  const p = s.products.find((x) => x.id === id);
  if (!p) return;
  const margin = p.price - p.unitCost;
  const onShelf = s.machines.some((m) => m.slots.some((sl) => sl.item?.productId === p.id));
  openSheet(`
    <div class="pd">
      <div class="pd-art ${p.temp}">${drinkSVG(p)}</div>
      <div class="pd-head">
        <h2 class="sheet-title">${esc(p.name)}</h2>
        <div class="pd-tags"><span class="tdot ${p.temp}">${TEMPS[p.temp]}</span><span class="pill">${spec(p)}</span></div>
        <div class="pd-nums">
          <span><small>仕入れ</small>${yen(p.unitCost)}</span>
          <span><small>価格</small>${yen(p.price)}</span>
          <span><small>利益</small><b class="${margin < 0 ? 'warn-t' : 'ok-t'}">${yen(margin)}</b></span>
        </div>
      </div>
    </div>
    <div class="taste">${TASTES.map((t) => `<div><span>${t.name}</span><i>${[0, 1, 2].map((k) => `<b class="${p.taste[t.id] > k ? 'on' : ''}"></b>`).join('')}</i></div>`).join('')}</div>
    <div class="pd-stats">
      <span>${icon('star')}<b>${p.popularity}</b></span>
      <span>${icon('bottle')}<b>${p.sold}</b>本</span>
      <span>${icon('yen')}<b>${yen(p.revenue)}</b></span>
    </div>
    <div class="icon-btns">
      <button class="ibtn" data-edit>${icon('edit')}編集</button>
      <button class="ibtn" data-dup>${icon('copy')}複製</button>
      <button class="ibtn danger" data-del>${icon('trash')}削除</button>
    </div>`, {
    onMount(sheet) {
      sheet.querySelector('[data-edit]').addEventListener('click', () => { closeSheet(); location.hash = `#product-edit-${p.id}`; });
      sheet.querySelector('[data-dup]').addEventListener('click', () => { closeSheet(); startNewFrom(p); location.hash = '#product-new'; });
      sheet.querySelector('[data-del]').addEventListener('click', async () => {
        closeSheet();
        const ok = await confirmDialog({
          title: `「${p.name}」を削除しますか？`,
          body: onShelf ? '自販機に並んでいる分と販売履歴はそのまま残ります。商品一覧からのみ削除され、元に戻せません。' : '商品一覧から削除します。元に戻せません。',
          ok: '削除する', danger: true,
        });
        if (!ok) return;
        update((st) => {
          st.products = st.products.filter((x) => x.id !== p.id);
          // 倉庫在庫・陳列中の商品はスナップショット付きで保持されるため削除しない
          collectGarbage(st, draftImages());
        });
        se('recall');
        toast('商品を削除しました');
      });
    },
  });
}
