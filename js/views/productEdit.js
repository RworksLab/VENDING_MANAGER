// =============================================================
// 商品開発（新規作成・編集）画面  #product-new / #product-edit-<id>
// 入力中の内容は drafts に保持し、タブを移動しても消えない。
// =============================================================
import {
  CONTAINERS, TEMPS, TASTES, GENRES, LABEL_TEMPLATES, LABEL_POSITIONS, TEXT_STYLES, PRODUCT_FORM, fairPrice, priceHintOf, unitCostOf, findGenre,
} from '../config.js';
import { getState, update, makeProduct, applyProductEdit } from '../state.js';
import { drinkSVG, LIQUID_BY_GENRE } from '../render/art.js';
import { normalizeLabel } from '../state.js';
import { fileToDataURL, storeImage, collectGarbage, getImage } from '../images.js';
import { yen, esc, clone } from '../util.js';
import { toast, confirmDialog } from '../ui.js';
import { icon } from '../icons.js';
import { pageHead } from './parts.js';
import { se } from '../audio.js';

const drafts = {}; // key: 'new' | productId
const tabs = {};   // key -> 表示中のタブ
const TABS = [['basic', '基本', 'bottle'], ['taste', '味', 'drop'], ['design', 'デザイン', 'palette'], ['text', '文字', 'edit'], ['price', '価格', 'yen']];
export const draftImages = () => Object.values(drafts).map((d) => d.label.image);

/** 複製など、外から新規作成の下書きを用意する */
export function startNewFrom(p) {
  const d = clone(PRODUCT_FORM.defaults);
  if (p) {
    Object.assign(d, clone({
      name: `${p.name}`.slice(0, PRODUCT_FORM.nameMax - 3) + 'コピー', genre: p.genre, container: p.container,
      volume: p.volume, temp: p.temp, taste: p.taste, color: p.color, label: p.label, price: p.price,
    }));
  }
  drafts.new = d;
}

function draftFor(key) {
  if (drafts[key]) return drafts[key];
  const d = draftForRaw(key);
  if (d) d.label = normalizeLabel(d.label);
  return d;
}

function draftForRaw(key) {
  if (key === 'new') { startNewFrom(null); return drafts.new; }
  const p = getState().products.find((x) => x.id === key);
  if (!p) return null;
  drafts[key] = clone({
    name: p.name, genre: p.genre, container: p.container, volume: p.volume, temp: p.temp,
    taste: p.taste, color: p.color, label: p.label, price: p.price,
  });
  return drafts[key];
}

// 項目 → 描き直す部分
const LABEL_PART = { 'label.mode': 'labelBody', 'label.template': 'labelBody', 'label.color': 'labelBody', 'label.icon': 'icon', 'label.textDir': 'textDir', 'label.textColor': 'textColor', 'label.clear': 'clear', 'label.liquid': 'liquid', 'label.cap': 'cap', 'label.pos': 'pos', 'label.subColor': 'sub', 'label.textStyle': 'textStyle' };

// ---------- 部品 ----------
const chips = (field, opts, cur) => opts.map(([v, t]) =>
  `<button type="button" class="opt" data-set="${field}" data-val="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${esc(t)}</button>`).join('');

const swatches = (field, cur) => PRODUCT_FORM.colorPresets.map((c) =>
  `<button type="button" class="sw" style="--c:${c}" data-set="${field}" data-val="${c}" aria-pressed="${c === cur}" aria-label="${c}"></button>`).join('')
  + `<label class="sw custom" aria-label="自由に選ぶ"><input type="color" data-field="${field}" value="${cur}"><span>＋</span></label>`;

const priceHint = (d) => { const f = fairPrice(d.genre, d.volume); return `適正価格の目安 ${yen(f)}（置き場所で変わります）<br>${priceHintOf(d.price, f)}`; };
const LEVELS = [[0, 'なし'], [1, '弱'], [2, '中'], [3, '強']];

function previewHTML(d) {
  const cost = unitCostOf(d.container, d.volume);
  const margin = d.price - cost;
  return `
    <div class="pv-art ${d.temp}">${drinkSVG({ ...d, name: d.name || '新商品' })}</div>
    <div class="pv-info">
      <b class="pv-name">${esc(d.name || '名前未定')}</b>
      <span class="tdot ${d.temp}">${TEMPS[d.temp]}</span>
      <span class="pv-price">${yen(d.price)}</span>
      <span class="pv-margin">利益 <b class="${margin < 0 ? 'warn-t' : 'ok-t'}">${margin >= 0 ? '+' : ''}${yen(margin)}</b></span>
    </div>`;
}

function sections(d) {
  const tpls = LABEL_TEMPLATES.map((t) => `
    <button type="button" class="tpl" data-set="label.template" data-val="${t.id}" aria-pressed="${d.label.mode === 'template' && d.label.template === t.id}">
      ${drinkSVG({ ...d, name: '', label: { ...d.label, mode: 'template', template: t.id, icon: false, text: '', pos: 'std' } }, { name: false })}<span>${t.name}</span></button>`).join('');
  const img = getImage(d.label.image);
  return {
    container: chips('container', Object.entries(CONTAINERS).map(([k, v]) => [k, v.name]), d.container),
    volume: chips('volume', CONTAINERS[d.container].volumes.map((v) => [v, `${v}ml`]), d.volume),
    temp: chips('temp', Object.entries(TEMPS), d.temp),
    genre: chips('genre', GENRES.map((g) => [g.id, g.name]), d.genre),
    taste: TASTES.map((t) => `<div class="taste-row"><span>${t.name}</span><div class="seg">${chips(`taste.${t.id}`, LEVELS, d.taste[t.id])}</div></div>`).join(''),
    color: swatches('color', d.color),
    mode: chips('label.mode', [['template', 'テンプレート'], ['image', '画像']], d.label.mode),
    labelBody: d.label.mode === 'template'
      ? `<div class="tpl-grid">${tpls}</div><h3 class="lbl">ラベルの色</h3><div class="swatches">${swatches('label.color', d.label.color)}</div>`
      : `<div class="upload">
          ${img ? `<img src="${img}" alt="ラベル画像">` : '<div class="upload-empty">画像なし</div>'}
          <div><label class="btn">${icon('image')}<input type="file" accept="image/*" data-upload hidden>${img ? '変更' : '画像を選ぶ'}</label>
          ${img ? `<button type="button" class="btn ghost" data-remove-image>${icon('trash')}外す</button>` : ''}
          </div>
        </div>`,
    clear: d.container === 'pet' ? chips('label.clear', [['0', '色つき'], ['1', '透明']], d.label.clear ? '1' : '0') : '',
    liquid: d.container === 'pet' && d.label.clear
      ? `<h3 class="lbl">中身の色</h3><div class="swatches">${swatches('label.liquid', d.label.liquid || LIQUID_BY_GENRE[d.genre] || '#cfe6c8')}</div>` : '',
    cap: d.container === 'pet'
      ? `<h3 class="lbl">キャップの色</h3><div class="swatches"><button type="button" class="sw auto" data-set="label.cap" data-val="" aria-pressed="${!d.label.cap}" aria-label="本体に合わせる">自動</button>${swatches('label.cap', d.label.cap || '#ffffff').replace(/aria-pressed="true"/g, d.label.cap ? 'aria-pressed="true"' : 'aria-pressed="false"')}</div>` : '',
    pos: chips('label.pos', LABEL_POSITIONS, d.label.pos),
    sub: LABEL_TEMPLATES.find((t) => t.id === d.label.template)?.sub || d.label.textStyle === 'ribbon'
      ? `<h3 class="lbl">サブカラー<small>柄・リボンの2色目</small></h3><div class="swatches">${swatches('label.subColor', d.label.subColor)}</div>` : '',
    textStyle: chips('label.textStyle', TEXT_STYLES, d.label.textStyle),
    icon: chips('label.icon', [['0', 'なし'], ['1', 'あり']], d.label.icon ? '1' : '0'),
    iconNote: d.label.icon && d.label.mode === 'image' ? '<p class="muted small">アイコンの丸はラベルの色になります</p>' : '',
    textDir: chips('label.textDir', [['h', '横書き'], ['v', '縦書き']], d.label.textDir),
    textColor: swatches('label.textColor', d.label.textColor),
    priceInfo: `<span class="hint">${priceHint(d)}</span>`,
  };
}

// ---------- 画面 ----------
function panel(d, tab) {
  const x = sections(d);
  switch (tab) {
    case 'taste': return `<div data-part="taste">${x.taste}</div>`;
    case 'design': return `
      ${d.container === 'pet' ? `<h3 class="lbl">ボトル</h3><div class="seg" data-part="clear">${x.clear}</div>` : ''}
      <h3 class="lbl">${d.container === 'pet' && d.label.clear ? 'ラベルの地の色' : '本体の色'}</h3><div class="swatches" data-part="color">${x.color}</div>
      <div data-part="liquid">${x.liquid}</div>
      <div data-part="cap">${x.cap}</div>
      <h3 class="lbl">ラベル</h3><div class="seg" data-part="mode">${x.mode}</div>
      <div data-part="labelBody">${x.labelBody}</div>
      <div data-part="sub">${x.sub}</div>
      <h3 class="lbl">ラベルの位置</h3><div class="opts" data-part="pos">${x.pos}</div>`;
    case 'text': return `
      <h3 class="lbl">アイコン</h3><div class="seg" data-part="icon">${x.icon}</div><div data-part="iconNote">${x.iconNote}</div>
      <h3 class="lbl">ラベルの文字<small>${PRODUCT_FORM.labelTextMax}文字まで</small></h3>
      <input class="inp" type="text" data-field="label.text" value="${esc(d.label.text)}" maxlength="${PRODUCT_FORM.labelTextMax}" placeholder="例：緑茶" autocomplete="off" aria-label="ラベルの文字">
      <div class="seg lbl-gap" data-part="textDir">${x.textDir}</div>
      <h3 class="lbl">文字のスタイル</h3><div class="opts" data-part="textStyle">${x.textStyle}</div>
      <div data-part="sub">${x.sub}</div>
      <h3 class="lbl">文字の色</h3><div class="swatches" data-part="textColor">${x.textColor}</div>`;
    case 'price': return `
      <div class="price-row">
        <button type="button" class="btn round" data-step="-1" aria-label="10円下げる">−</button>
        <label class="price-inp"><span>¥</span><input class="inp" type="number" inputmode="numeric" data-field="price" value="${d.price}"
          min="${PRODUCT_FORM.priceMin}" max="${PRODUCT_FORM.priceMax}" step="${PRODUCT_FORM.priceStep}"></label>
        <button type="button" class="btn round" data-step="1" aria-label="10円上げる">＋</button>
      </div>
      <div class="center" data-part="priceInfo">${x.priceInfo}</div>`;
    default: return `
      <input class="inp" type="text" data-field="name" value="${esc(d.name)}" maxlength="${PRODUCT_FORM.nameMax}" placeholder="商品名" autocomplete="off" aria-label="商品名">
      <h3 class="lbl">ジャンル</h3><div class="opts" data-part="genre">${x.genre}</div>
      <h3 class="lbl">容器</h3><div class="seg" data-part="container">${x.container}</div>
      <h3 class="lbl">内容量</h3><div class="opts" data-part="volume">${x.volume}</div>
      <h3 class="lbl">温度</h3><div class="seg" data-part="temp">${x.temp}</div>`;
  }
}

export function render(s, key) {
  const d = draftFor(key);
  if (!d) return `<p class="empty">見つかりません <a href="#products">戻る</a></p>`;
  const isNew = key === 'new';
  const tab = tabs[key] || 'basic';
  const p = !isNew && s.products.find((x) => x.id === key);
  const inUse = p && (s.machines.some((m) => m.slots.some((sl) => sl.item?.productId === p.id)) || s.warehouse[p.id]?.qty > 0);
  return `
  ${pageHead({ title: isNew ? '新しい商品' : '商品を編集', ic: 'cup', back: '#products' })}
  <div class="pv" id="pv">${previewHTML(d)}</div>
  <div class="ptabs" role="tablist">${TABS.map(([id, t, ic]) => `
    <button type="button" role="tab" data-tab="${id}" aria-selected="${tab === id}">${icon(ic)}<span>${t}</span></button>`).join('')}</div>
  <form class="pe" id="pe" novalidate>
    <div class="panel" id="panel">${panel(d, tab)}</div>
    ${inUse ? '<p class="note">並んでいる在庫は変更前のまま販売されます</p>' : ''}
    <div class="pe-actions">
      <button type="button" class="btn ghost" data-discard aria-label="${isNew ? 'リセット' : '変更を破棄'}">${icon(isNew ? 'restore' : 'trash')}</button>
      <button type="submit" class="btn primary">${isNew ? '開発する！' : '保存'}</button>
    </div>
  </form>`;
}

export function mount(el, s, key) {
  const d = draftFor(key);
  const form = el.querySelector('#pe');
  if (!d || !form) return;

  el.querySelectorAll('[data-tab]').forEach((t) => t.addEventListener('click', () => {
    tabs[key] = t.dataset.tab;
    el.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    form.querySelector('#panel').innerHTML = panel(d, tabs[key]);
  }));

  const refresh = (...parts) => {
    el.querySelector('#pv').innerHTML = previewHTML(d);
    const x = sections(d);
    parts.forEach((p) => { const box = form.querySelector(`[data-part="${p}"]`); if (box) box.innerHTML = x[p]; });
    const pi = form.querySelector('[data-part="priceInfo"]');
    if (pi) pi.innerHTML = x.priceInfo;
  };

  const setPath = (path, raw) => {
    const [a, b] = path.split('.');
    const val = ['volume', 'price'].includes(a) || a === 'taste' ? Number(raw) : raw;
    if (b) d[a][b] = val; else d[a] = val;
    if (a === 'container' && !CONTAINERS[val].volumes.includes(d.volume)) {
      const vs = CONTAINERS[val].volumes;
      d.volume = vs.reduce((best, v) => (Math.abs(v - d.volume) < Math.abs(best - d.volume) ? v : best), vs[0]);
    }
    if (path === 'label.template') d.label.mode = 'template';
    if (path === 'label.icon') d.label.icon = raw === '1' || raw === true;
    if (path === 'label.clear') d.label.clear = raw === '1' || raw === true;
    if (path === 'label.cap') d.label.cap = raw || null;
  };

  // ボタン類
  form.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.set) {
      const path = b.dataset.set;
      setPath(path, b.dataset.val);
      // 透明・色つきの切り替えは見出しや項目が変わるので、パネルごと描き直す
      if (path === 'label.clear') { form.querySelector('#panel').innerHTML = panel(d, tabs[key] || 'design'); refresh(); return; }
      const part = path.startsWith('taste') ? 'taste' : LABEL_PART[path] || path.split('.')[0];
      // 選択に連動して見た目が変わる部分も描き直す（テンプレート見本は容器・色に依存）
      const extra = path === 'container' ? ['volume', 'labelBody']
        : ['color', 'volume'].includes(path) || ['label.mode', 'label.template', 'label.color'].includes(path) ? ['labelBody', 'mode', 'iconNote']
        : path === 'label.icon' ? ['iconNote'] : [];
      if (path === 'label.template' || path === 'label.textStyle') extra.push('sub');
      refresh(part, ...extra);
    } else if (b.dataset.step) {
      d.price = clampPrice(d.price + Number(b.dataset.step) * PRODUCT_FORM.priceStep);
      form.querySelector('[data-field="price"]').value = d.price;
      refresh();
    } else if ('removeImage' in b.dataset) {
      d.label.image = null; d.label.mode = 'template';
      refresh('mode', 'labelBody');
    } else if ('discard' in b.dataset) {
      if (!(await confirmDialog({ title: key === 'new' ? '入力内容をリセットしますか？' : '変更を破棄しますか？', body: '入力中の内容は元に戻せません。', ok: key === 'new' ? 'リセット' : '破棄する', danger: true }))) return;
      delete drafts[key];
      update((st) => collectGarbage(st, draftImages()));
      if (key !== 'new') location.hash = '#products';
    }
  });

  // テキスト・色・価格
  form.addEventListener('input', (e) => {
    const f = e.target.dataset.field;
    if (!f) return;
    if (f === 'price') { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) d.price = n; refresh(); return; }
    setPath(f, e.target.value);
    refresh(...(f === 'color' ? ['labelBody'] : []));
  });
  form.addEventListener('change', (e) => {
    const cf = e.target.dataset.field;
    if (cf === 'color') refresh('color', 'labelBody');
    else if (cf && cf !== 'label.text' && LABEL_PART[cf]) refresh(LABEL_PART[cf]);
    if (e.target.dataset.field === 'price') { d.price = clampPrice(d.price); e.target.value = d.price; refresh(); }
  });

  // 画像アップロード
  form.addEventListener('change', async (e) => {
    if (!e.target.matches('[data-upload]')) return;
    const file = e.target.files?.[0];
    if (!file) return;
    toast('画像を読み込んでいます…');
    try {
      const id = await storeImage(await fileToDataURL(file));
      d.label.image = id; d.label.mode = 'image';
      update((st) => { st.imageIds = [...(st.imageIds || []), id]; });
      toast('ラベル画像を設定しました');
    } catch {
      toast('画像を読み込めませんでした');
    }
  });

  // 保存
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = d.name.trim();
    if (!name) {
      se('error');
      toast('商品名を入力してください');
      el.querySelector('[data-tab="basic"]').click();
      form.querySelector('[data-field="name"]')?.focus();
      return;
    }
    d.name = name;
    d.price = clampPrice(d.price);
    if (d.label.mode === 'image' && !d.label.image) d.label.mode = 'template';
    const input = clone(d);
    delete drafts[key];
    update((st) => {
      if (key === 'new') { st.products.unshift(makeProduct(input)); st.stats.developed = Math.max(st.stats.developed || 0, st.products.length - 1) + 1; }
      else { const p = st.products.find((x) => x.id === key); if (p) applyProductEdit(p, input); }
      collectGarbage(st, draftImages());
    });
    se(key === 'new' ? 'success' : 'confirm');
    toast(key === 'new' ? `「${name}」を開発しました` : '保存しました');
    location.hash = '#products';
  });
}

const clampPrice = (v) => {
  const { priceMin, priceMax } = PRODUCT_FORM;
  return Math.min(priceMax, Math.max(priceMin, Math.round(Number(v) || priceMin)));
};
