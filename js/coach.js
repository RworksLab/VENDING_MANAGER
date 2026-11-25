// =============================================================
// チュートリアル（実際に操作しながら進める）
//  1. 自販機を購入する → 2. 商品を作る → 3. 商品を仕入れる
//  → 4. 自販機に商品を並べる → 5. 販売を開始する（価格・営業開始）→ 6. 初めて商品が売れる
//  - 進み具合は state.tutorial.step に保存（途中で閉じても続きから）
//  - 画面下に案内カードを出し、次に押すところを光らせる
//  - 各ステップは「状態」を見て自動で次へ進む（どの画面から操作しても OK）
// =============================================================
import { getState, update } from './state.js';
import { openSheet, closeSheet, confirmDialog, toast, scrollPos, scrollByY, scrollMax } from './ui.js';
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
      if (h === '#buy-machine') return { text: '好きな色を選んで、設置する場所（住宅街）をタップしましょう。', target: '.pick-loc:not([disabled])', allow: ['.buy-color'] };
      if (h === '#shop') return { text: '「自販機を購入」の「購入する」をタップしましょう。', target: 'a.buy-btn[href="#buy-machine"]' };
      return { text: 'まずは最初の自販機を買いましょう。ショップへ行きます。', go: ['#shop', 'ショップへ'], target: '.tabbar a[href="#shop"]' };
    case 'product': {
      if (h !== '#product-new') return { text: '自販機で売るオリジナルドリンクを作りましょう。', go: ['#product-new', '商品開発へ'], target: '.tabbar a[href="#products"]' };
      const tab = $('.ptabs [aria-selected="true"]')?.dataset.tab || 'basic';
      const name = $('[data-field="name"]');
      const form = ['#panel'];   // 入力欄・選択肢は自由にさわれる
      if (tab === 'basic') return name && !name.value.trim()
        ? { text: '商品名を入力しましょう。', target: '[data-field="name"]' }
        : { text: 'ボトル・缶、容量、HOT・COLDを選んだら、「味」タブへ。', target: '.ptabs [data-tab="taste"]', allow: form };
      if (tab === 'taste') return { text: '味を決めたら、「デザイン」タブへ。', target: '.ptabs [data-tab="design"]', allow: form };
      if (tab === 'design') return { text: '色とラベルを決めましょう。できたら「開発する！」。', target: '.pe-actions button[type="submit"]', allow: [...form, '.ptabs'] };
      return { text: '準備ができたら「開発する！」で完成です。', target: '.pe-actions button[type="submit"]', allow: [...form, '.ptabs'] };
    }
    case 'stock': {
      if (h !== '#warehouse') return { text: '作った商品を倉庫に仕入れましょう。', go: ['#warehouse', '倉庫へ'], target: '.tabbar a[href="#warehouse"]' };
      if ($('[data-buy-go]')) return { text: '数量を確かめて「購入する」をタップ。', target: '[data-buy-go]' };
      if (!$('.bgrid')) return { text: '「仕入れ」タブを開きましょう。', target: '.page-seg [data-tab="buy"]' };
      if ($('.cart-bar')) return { text: '仕入れる数が決まったら、下のカートを開きましょう。', target: '.cart-bar', allow: ['.bgrid'] };
      return { text: '作った商品の「＋」で、仕入れる数を決めましょう。', target: '.bcard .mini-step [data-d="1"]', allow: ['.bgrid'] };
    }
    case 'refill': {
      if (!m) return null;
      if (h === `#refill-${m.id}`) return $('.rp-lot')
        ? { text: '枠を選んで、倉庫の商品をタップ。+1・+5・満タンで数量を変えられます。', target: '.rp-lot', allow: ['.sg', '.rp'] }
        : { text: '「+1」「+5」「満タン」で数量を決めて補充しましょう。', target: '.rp-btn.main', allow: ['.sg', '.rp'] };
      if (h === mh) return { text: '「補充・回収」をタップしましょう。', target: 'a.sb-refill' };
      return { text: '自販機を選んで、倉庫の商品を並べましょう。', go: [mh, '自販機へ'] };
    }
    case 'price': {
      if (!m) return null;
      if (h === `#price-${m.id}`) return { text: '＋−で販売価格を決めて「保存する」。今の価格でよければ「この価格で決定」でOK。', target: '[data-save]:not([disabled])', allow: ['#op'], action: ['この価格で決定', () => setStep('open', { go: mh })] };
      if (h === mh) return { text: '「価格変更」をタップして、販売価格を決めましょう。', target: '.stage-btns a.yellow' };
      return { text: '販売価格を決めましょう。', go: [mh, '自販機へ'] };
    }
    case 'open':
      if (!m) return null;
      if (h === mh) return { text: '準備完了！「営業開始」をタップしましょう。', target: '#open-btn' };
      return { text: '自販機の営業を始めましょう。', go: [mh, '自販機へ'] };
    case 'firstSale':
      return { text: 'お客さんが来るのを待っています…', wait: true, block: true };
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

// ---------- 案内カード・暗幕（押すところ以外は暗く、さわれない） ----------
let bar = null, dim = null, holes = [], loop = 0, scrolledKey = '';

/** 暗幕：画面全体を覆う SVG。明るくする場所はマスクで抜く（重なっても大丈夫） */
function ensureDim() {
  if (dim) return dim;
  dim = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  dim.setAttribute('class', 'coach-dim');
  dim.setAttribute('aria-hidden', 'true');
  dim.innerHTML = '<defs><mask id="coach-mask"><rect width="100%" height="100%" fill="#fff"/><g fill="#000"></g></mask></defs><rect class="coach-shade" width="100%" height="100%" mask="url(#coach-mask)"/>';
  document.body.appendChild(dim);
  return dim;
}

let lastHoles = '';
function drawDim() {
  if (!dim) return;
  const W = innerWidth, H = innerHeight, pad = 6;
  let out = '';
  for (const el of holes) {
    if (!el.isConnected) continue;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height || b.bottom < 0 || b.top > H) continue;
    const x = b.left - pad, y = b.top - pad, w = b.width + pad * 2, h = b.height + pad * 2;
    out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="12"/>`;
  }
  if (out !== lastHoles) { lastHoles = out; dim.querySelector('mask g').innerHTML = out; }
}

// 明るい場所・案内カード以外のタップは止める（スクロールはできる）
function allowed(t) {
  if (!dim) return true;
  if (!(t instanceof Element)) return false;
  if (bar?.contains(t) || t.closest('.update-bar')) return true;
  return holes.some((h) => h.contains(t));
}
function nudge() {
  const t = document.querySelector('.coach-target');
  if (!t) return;
  t.classList.remove('coach-nudge'); void t.offsetWidth; t.classList.add('coach-nudge');
}
function guard(e) {
  if (allowed(e.target)) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.type === 'click') nudge();
}
['click', 'mousedown', 'touchend', 'keydown'].forEach((type) => document.addEventListener(type, (e) => {
  if (type === 'keydown' && !(e.key === 'Enter' || e.key === ' ')) return;
  guard(e);
}, { capture: true }));

// スクロールやアニメーションで位置が変わっても穴がついていくよう、表示中は毎フレーム合わせる
function startLoop() { if (!loop) { const f = () => { drawDim(); loop = requestAnimationFrame(f); }; loop = requestAnimationFrame(f); } }
function stopLoop() { cancelAnimationFrame(loop); loop = 0; }

function clearCoach() {
  bar?.remove(); bar = null;
  dim?.remove(); dim = null;
  holes = []; lastHoles = ''; stopLoop();
  document.body.classList.remove('coaching');
}

function paint() {
  const s = getState();
  if (!s) return;
  if (inTutorial(s) && advance(s)) return;   // 進んだら update → 再描画で呼ばれ直す
  document.querySelectorAll('.coach-target').forEach((el) => el.classList.remove('coach-target'));
  const g = inTutorial(s) ? guide(s) : null;
  if (!g) { clearCoach(); return; }
  document.body.classList.add('coaching');
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

  // 明るくする場所：押すボタン＋自由に操作してよい範囲。シートが開いているときはシート全体
  const target = g.target && document.querySelector(g.target);
  const sheet = !document.getElementById('overlay')?.hidden && document.querySelector('#overlay .sheet');
  holes = sheet ? [sheet] : [target, ...(g.allow || []).flatMap((sel) => [...document.querySelectorAll(sel)])].filter(Boolean);
  // 押すところが見つからないときは、移動ボタンのある案内カードだけ使えるように暗くする（待ち時間も同じ）
  const useDim = !!(sheet || target || g.go || g.block);
  if (useDim) { ensureDim(); drawDim(); startLoop(); } else { dim?.remove(); dim = null; lastHoles = ''; stopLoop(); }

  placeBar(target);
  if (target) {
    target.classList.add('coach-target');
    const key = `${step}|${hash()}|${g.target}`;
    if (key !== scrolledKey) {
      scrolledKey = key;
      const rb = target.getBoundingClientRect(), cb = bar.getBoundingClientRect();
      if (rb.top < cb.bottom + 10 || rb.bottom > innerHeight - 90) {
        // 案内カードに隠れない位置までスクロール
        const want = cb.bottom + (innerHeight - cb.bottom) / 2 - rb.height / 2;
        scrollByY(rb.top - want);
      }
    }
  }
}

/** 押すところが案内カードに隠れるなら、カードを画面の下に移す */
function placeBar(target) {
  if (!bar) return;
  bar.classList.remove('bottom');
  if (!target) return;
  // 押すところ・さわれる範囲のうち、いちばん上にあるもので判定する
  const tops = holes.filter((h) => h.isConnected).map((h) => h.getBoundingClientRect()).filter((r) => r.height);
  const tb = tops.reduce((a, r) => (r.top < a.top ? r : a), target.getBoundingClientRect());
  const cb = bar.getBoundingClientRect();
  const canScrollUp = scrollPos() > 0 || scrollMax() > tb.top - cb.bottom;
  if (tb.top < cb.bottom + 8 && !(canScrollUp && scrollPos() + tb.top - cb.bottom - 20 > 0)) bar.classList.add('bottom');
}

let raf = 0;
const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); };

export function initCoach(subscribe) {
  subscribe(schedule);
  addEventListener('hashchange', schedule);
  // 画面の一部だけ描き直す操作（タブ切り替え・カートなど）にもついていく
  const mo = new MutationObserver((list) => {
    if (list.every((r) => (bar && bar.contains(r.target)) || (dim && dim.contains(r.target)))) return;
    schedule();
  });
  ['view', 'overlay'].forEach((id) => { const el = document.getElementById(id); if (el) mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected', 'hidden'] }); });
  document.addEventListener('input', schedule, true);
  schedule();
}
