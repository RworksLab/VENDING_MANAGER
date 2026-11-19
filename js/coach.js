// =============================================================
// チュートリアル（実際に操作しながら進める）
//  1. 自販機を購入する → 2. 商品を作る → 3. 商品を仕入れる
//  → 4. 自販機に商品を並べる → 5. 販売を開始する（価格・営業開始）→ 6. 初めて商品が売れる
//  - 進み具合は state.tutorial.step に保存（途中で閉じても続きから）
//  - 画面下に案内カードを出し、次に押すところを光らせる
//  - 各ステップは「状態」を見て自動で次へ進む（どの画面から操作しても OK）
// =============================================================
import { getState, update } from './state.js';
import { openSheet, closeSheet, confirmDialog, toast } from './ui.js';
import { tutorialSale } from './actions.js';
import { yen } from './util.js';
import { coin } from './icons.js';
import { se } from './audio.js';

const ORDER = ['buy', 'product', 'stock', 'refill', 'price', 'open', 'firstSale', 'done'];
const NO = { buy: 1, product: 2, stock: 3, refill: 4, price: 5, open: 5, firstSale: 6 };
const TITLE = {
  buy: '自販機を購入する', product: '商品を作る', stock: '商品を仕入れる', refill: '自販機に商品を並べる',
  price: '販売を開始する', open: '販売を開始する', firstSale: '初めて商品が売れる',
};

export const tutorialStep = (s = getState()) => s?.tutorial?.step || 'done';
export const inTutorial = (s = getState()) => tutorialStep(s) !== 'done';
const firstMachine = (s) => s.machines[0];
const hash = () => location.hash || '#home';
const $ = (sel) => document.querySelector(sel);

// ---------- ステップごとの案内（今いる画面に合わせて変える） ----------
function guide(s) {
  const step = tutorialStep(s);
  const h = hash();
  const m = firstMachine(s);
  const mh = m ? `#machine-${m.id}` : '#machines';
  switch (step) {
    case 'buy':
      if (h === '#buy-machine') return { text: '好きな色を選んで、設置する場所（住宅街）をタップしましょう。', target: '.pick-loc:not([disabled])' };
      if (h === '#shop') return { text: '「自販機を購入」の「購入する」をタップしましょう。', target: 'a.buy-btn[href="#buy-machine"]' };
      return { text: 'まずは最初の自販機を買いましょう。ショップへ行きます。', go: ['#shop', 'ショップへ'], target: '.tabbar a[href="#shop"]' };
    case 'product': {
      if (h !== '#product-new') return { text: '自販機で売るオリジナルドリンクを作りましょう。', go: ['#product-new', '商品開発へ'] };
      const tab = $('.ptabs [aria-selected="true"]')?.dataset.tab || 'basic';
      const name = $('[data-field="name"]');
      if (tab === 'basic') return name && !name.value.trim()
        ? { text: '商品名を入力しましょう。', target: '[data-field="name"]' }
        : { text: 'ボトル・缶、容量、HOT・COLDを選んだら、「味」タブへ。', target: '.ptabs [data-tab="taste"]' };
      if (tab === 'taste') return { text: '味を決めたら、「デザイン」タブへ。', target: '.ptabs [data-tab="design"]' };
      if (tab === 'design') return { text: '色とラベルを決めましょう。できたら「開発する！」。', target: '.pe-actions button[type="submit"]' };
      return { text: '準備ができたら「開発する！」で完成です。', target: '.pe-actions button[type="submit"]' };
    }
    case 'stock': {
      if (h !== '#warehouse') return { text: '作った商品を倉庫に仕入れましょう。', go: ['#warehouse', '倉庫へ'], target: '.tabbar a[href="#warehouse"]' };
      if ($('[data-buy-go]')) return { text: '数量を確かめて「購入する」をタップ。', target: '[data-buy-go]' };
      if (!$('.bgrid')) return { text: '「仕入れ」タブを開きましょう。', target: '[data-tab="buy"]' };
      if ($('.cart-bar')) return { text: '仕入れる数が決まったら、下のカートを開きましょう。', target: '.cart-bar' };
      return { text: '作った商品の「＋」で、仕入れる数を決めましょう。', target: '.bcard .mini-step [data-d="1"]' };
    }
    case 'refill': {
      if (!m) return null;
      if (h === `#refill-${m.id}`) return $('.rp-lot')
        ? { text: '枠を選んで、倉庫の商品をタップ。+1・+5・満タンで数量を変えられます。', target: '.rp-lot' }
        : { text: '「+1」「+5」「満タン」で数量を決めて補充しましょう。', target: '.rp-btn.main' };
      if (h === mh) return { text: '「補充・回収」をタップしましょう。', target: 'a.bbtn.blue' };
      return { text: '自販機を選んで、倉庫の商品を並べましょう。', go: [mh, '自販機へ'] };
    }
    case 'price': {
      if (!m) return null;
      if (h === `#price-${m.id}`) return { text: '＋−で販売価格を決めて「保存する」。今の価格でよければ「この価格で決定」でOK。', target: '[data-save]:not([disabled])', action: ['この価格で決定', () => setStep('open', { go: mh })] };
      if (h === mh) return { text: '「価格変更」をタップして、販売価格を決めましょう。', target: 'a.bbtn.yellow' };
      return { text: '販売価格を決めましょう。', go: [mh, '自販機へ'] };
    }
    case 'open':
      if (!m) return null;
      if (h === mh) return { text: '準備完了！「営業開始」をタップしましょう。', target: '#open-btn' };
      return { text: '自販機の営業を始めましょう。', go: [mh, '自販機へ'] };
    case 'firstSale':
      return { text: 'お客さんが来るのを待っています…', wait: true };
    default: return null;
  }
}

// ---------- 状態を見て次のステップへ ----------
function setStep(step, { go } = {}) {
  update((s) => { s.tutorial = { ...(s.tutorial || {}), step }; });
  if (go) location.hash = go;
}

function advance(s) {
  const step = tutorialStep(s);
  const m = firstMachine(s);
  if (step === 'buy' && m) { se('success'); setStep('product'); return true; }
  if (step === 'product' && s.products.length) { setStep('stock'); return true; }
  if (step === 'stock' && Object.values(s.warehouse).some((w) => w.qty > 0)) { toast('商品が倉庫に追加されました'); setStep('refill'); return true; }
  if (step === 'refill' && m?.slots.some((sl) => sl.stock > 0)) { se('success'); setStep('price'); return true; }
  if (step === 'price' && s.tutorial.priced) { setStep('open'); return true; }
  if (step === 'open' && m?.open) { setStep('firstSale'); return true; }
  return false;
}

/** 価格変更ページで保存したとき（チュートリアル中のみ意味がある） */
export function notePriced() {
  if (tutorialStep() === 'price') update((s) => { s.tutorial.priced = true; });
}

// ---------- 初めての販売 ----------
let saleTimer = null;
function scheduleFirstSale() {
  if (saleTimer) return;
  saleTimer = setTimeout(() => {
    saleTimer = null;
    const r = tutorialSale();
    if (!r) return;
    se('coin');
    openSheet(`<div class="welcome coach-done">
      ${coin('wb-coin')}
      <h2 class="sheet-title">初めて商品が売れました！</h2>
      <p class="muted">「${r.name}」が売れました。自販機の詳細で売上を確認できます</p>
      <div class="wb-nums"><div><small>販売本数</small><b>${r.units}<em>本</em></b></div><div><small>売上</small><b>+${yen(r.sales)}</b></div></div>
      <button class="btn primary wide" id="coach-finish">チュートリアル完了</button></div>`, {
      onMount(sheet) {
        sheet.querySelector('#coach-finish').addEventListener('click', finish);
        sheet.querySelector('.sheet-x')?.addEventListener('click', finish);
      },
    });
  }, 3500);
}

function finish() {
  if (!inTutorial()) return;
  closeSheet();
  setStep('done');
  se('success');
  toast('チュートリアル完了！ 自販機経営をはじめましょう');
}

async function skip() {
  if (!(await confirmDialog({ title: 'チュートリアルをスキップしますか？', body: 'あとから設定の「遊び方を見る」で流れを確認できます。', ok: 'スキップ' }))) return;
  update((s) => { s.tutorial = { step: 'done' }; s.machines.forEach((m) => { m.open = true; }); });
}

// ---------- 画面下の案内カードと光らせる場所 ----------
let bar = null, lastTarget = null, scrolledKey = '';

function paint() {
  const s = getState();
  if (!s) return;
  if (inTutorial(s) && advance(s)) return;   // 進んだら update → 再描画で呼ばれ直す
  document.querySelectorAll('.coach-target').forEach((el) => el.classList.remove('coach-target'));
  const g = inTutorial(s) ? guide(s) : null;
  document.body.classList.toggle('coaching', !!g);
  if (!g) { bar?.remove(); bar = null; return; }
  const step = tutorialStep(s);
  if (step === 'firstSale') scheduleFirstSale();
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'coach';
    bar.setAttribute('role', 'status');
    document.body.appendChild(bar);
    bar.addEventListener('click', (e) => {
      if (e.target.closest('[data-coach-skip]')) skip();
      const a = e.target.closest('[data-coach-act]');
      if (a && bar._act) bar._act();
    });
  }
  bar._act = g.action?.[1] || null;
  bar.innerHTML = `<div class="coach-head"><span class="coach-no">STEP ${NO[step]}/6</span><b>${TITLE[step]}</b>
      <button type="button" class="coach-skip" data-coach-skip>スキップ</button></div>
    <p class="coach-text">${g.wait ? '<span class="coach-dots"><i></i><i></i><i></i></span>' : ''}${g.text}</p>
    ${g.go || g.action ? `<div class="coach-btns">
      ${g.go ? `<a class="btn primary" href="${g.go[0]}">${g.go[1]}</a>` : ''}
      ${g.action ? `<button type="button" class="btn" data-coach-act>${g.action[0]}</button>` : ''}</div>` : ''}`;
  document.documentElement.style.setProperty('--coach-h', `${bar.offsetHeight + 10}px`);   // 案内カードのぶん画面を下げる
  const el = g.target && document.querySelector(g.target);
  if (el) {
    el.classList.add('coach-target');
    const key = `${step}|${hash()}|${g.target}`;
    if (key !== scrolledKey && el !== lastTarget) {
      scrolledKey = key;
      const r = el.getBoundingClientRect();
      if (r.top < bar.getBoundingClientRect().bottom + 10 || r.bottom > innerHeight - 90) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }
  lastTarget = el;
}

let raf = 0;
const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); };

export function initCoach(subscribe) {
  subscribe(schedule);
  addEventListener('hashchange', schedule);
  // 画面の一部だけ描き直す操作（タブ切り替え・カートなど）にもついていく
  const mo = new MutationObserver((list) => {
    if (list.every((r) => bar && bar.contains(r.target))) return;
    schedule();
  });
  ['view', 'overlay'].forEach((id) => { const el = document.getElementById(id); if (el) mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected', 'hidden'] }); });
  document.addEventListener('input', schedule, true);
  schedule();
}
