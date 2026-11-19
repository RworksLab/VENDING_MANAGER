// =============================================================
// チュートリアル：ゲームの流れを 5 枚のカードで紹介する
//  - 初めて起動したときに 1 回だけ表示（state.tutorialDone）
//  - 設定画面の「遊び方」からいつでも見直せる
// =============================================================
import { getState, update } from '../state.js';
import { openSheet, closeSheet } from '../ui.js';
import { drinkSVG, machineSVG } from '../render/art.js';
import { ill, coin, weatherIcon } from '../icons.js';
import { se } from '../audio.js';

const sample = (color, container, genre, label) => drinkSVG({
  name: '', color, container, volume: container === 'can' ? 350 : 500, genre,
  label: { mode: 'template', color: '#ffffff', textColor: '#ffffff', ...label },
});

function slides() {
  const m = getState().machines[0];
  return [
    {
      art: m ? `<div class="tt-mach">${machineSVG(m, { compact: true })}</div>` : ill('machine'),
      title: '自販機マネジャーへようこそ！',
      text: 'オリジナルのドリンクを作って自販機で売り、お店を大きくしていくゲームです。まずは1号機から始めましょう。',
    },
    {
      art: `<div class="tt-drinks">${sample('#2f9e44', 'pet', 'tea', { template: 'none', icon: true })}${sample('#e8453c', 'can', 'soda', { template: 'stripe' })}${sample('#f2d22e', 'can', 'juice', { template: 'dots', color: '#2f9e44' })}</div>`,
      title: '① 商品を開発する',
      text: '「商品開発」で、容器・味・ラベルのデザイン・価格を決めて、オリジナルドリンクを作ります。',
    },
    {
      art: `<div class="tt-icons">${ill('warehouse')}<span class="tt-arrow">→</span>${ill('machine')}</div>`,
      title: '② 仕入れて補充する',
      text: '「倉庫」で商品を仕入れ、自販機の詳細から「補充」で並べます。売り切れると売上が止まるので注意。',
    },
    {
      art: `<div class="tt-icons">${coin('tt-coin')}${weatherIcon('sunny')}${weatherIcon('rain')}</div>`,
      title: '③ 置いておくだけで売れる',
      text: 'アプリを閉じている間も売れ続けます。天気・季節・置き場所・時間帯で売れ行きが変わるので、合う商品を並べましょう。',
    },
    {
      art: `<div class="tt-icons">${ill('cart')}${ill('pin')}${ill('star')}</div>`,
      title: '④ お店を広げる',
      text: '「ショップ」で新しい場所を解放し、自販機を増やしたり強化したりできます。売上を伸ばしていきましょう！',
      last: true,
    },
  ];
}

/** チュートリアルを表示する。from：'boot'（初回）/ 'settings'（見直し） */
export function showTutorial() {
  const list = slides();
  let i = 0;
  const draw = (root) => {
    const sl = list[i];
    root.innerHTML = `<div class="tt">
      <div class="tt-art">${sl.art}</div>
      <h2 class="sheet-title">${sl.title}</h2>
      <p class="tt-text">${sl.text}</p>
      <div class="tt-dots" aria-hidden="true">${list.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="row-btns">
        ${i === 0 ? '<button class="btn ghost" data-skip>スキップ</button>' : '<button class="btn ghost" data-prev>戻る</button>'}
        <button class="btn primary" data-next>${sl.last ? 'はじめる！' : '次へ'}</button>
      </div>
    </div>`;
  };
  openSheet('<div id="tt-root"></div>', {
    onMount(sheet) {
      const root = sheet.querySelector('#tt-root');
      draw(root);
      root.addEventListener('click', (e) => {
        if (e.target.closest('[data-skip]')) { closeSheet(); return; }
        if (e.target.closest('[data-prev]')) { i = Math.max(0, i - 1); draw(root); return; }
        if (e.target.closest('[data-next]')) {
          if (list[i].last) { se('success'); closeSheet(); return; }
          i += 1; draw(root);
        }
      });
    },
  });
}
