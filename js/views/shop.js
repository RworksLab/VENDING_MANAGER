// =============================================================
// ショップ・自販機の購入・設置場所の変更・設備強化（仕様書 7章・8章・13-5）
// すべて別ページ：#shop / #buy-machine / #move-<id> / #upgrade-<id>
// =============================================================
import { getState } from '../state.js';
import { MACHINE_COLORS, MACHINE_MODELS, LOCATIONS, BALANCE, TRAFFIC_WORD, UPGRADES, upgradeCost, findLocation, SHOP, UPKEEP } from '../config.js';
import {
  canUnlock, unlockLocation, buyMachine, relocate, buyUpgrade, machinePriceAt, relocateCost,
} from '../actions.js';
import { upkeepOf } from '../sim.js';
import { machineSVG } from '../render/art.js';
import { icon, ill } from '../icons.js';
import { esc, yen } from '../util.js';
import { toast, confirmDialog } from '../ui.js';
import { pageHead, locPill } from './parts.js';
import { se } from '../audio.js';

const locLine = (l) => `<span class="loc-info"><small>人通り ${TRAFFIC_WORD[l.traffic]}・維持費 ${yen(l.upkeepPerDay)}/日</small><small>相性：${esc(l.likes)}</small></span>`;

// ---------- ショップ ----------
export function renderShop(s) {
  const full = s.machines.length >= BALANCE.maxMachines;
  const cheapest = Math.min(...s.unlockedLocations.map(machinePriceAt));
  const locs = LOCATIONS.map((l) => {
    const open = s.unlockedLocations.includes(l.id);
    const c = canUnlock(s, l.id);
    return `<li class="shop-loc ${open ? 'open' : ''}">
      <span class="sl-name">${ill('pin')}<b>${esc(l.name)}</b></span>
      ${locLine(l)}
      ${open ? `<em class="tag green-t">${icon('check')}解放済み</em>`
        : `<button class="buy-btn" data-unlock="${l.id}" ${c.ok ? '' : 'disabled'}>${c.ok ? `解放 ${yen(l.unlockCost)}` : `${icon('lock')}${yen(l.unlockCost)}`}</button>
           ${c.ok ? '' : `<small class="sl-req">${esc(c.reason)}</small>`}`}
    </li>`;
  }).join('');
  const machines = s.machines.map((m) => {
    const total = Object.values(m.upgrades).reduce((a, b) => a + b, 0);
    return `<a class="shop-mach" href="#upgrade-${m.id}"><span class="sm-art">${machineSVG(m, { compact: true })}</span>
      <span><b>${esc(m.name)}</b><small>${esc(findLocation(m.locationId).name)}・強化 Lv${total}</small></span>${icon('back', 'chev')}</a>`;
  }).join('');

  return `${pageHead({ title: 'ショップ', ic: 'cart' })}
  <section class="wcard">
    <h2 class="wtitle">${ill('machine')}自販機を購入</h2>
    <div class="shop-buy">
      <span><b>${s.machines.length} / ${BALANCE.maxMachines}台</b><small>${full ? '上限まで所有しています' : `本体＋設置費用 ${yen(cheapest)}〜`}</small></span>
      ${full ? '<button class="buy-btn" disabled>上限です</button>' : '<a class="buy-btn" href="#buy-machine">購入する</a>'}
    </div>
  </section>
  <section class="wcard">
    <h2 class="wtitle">${ill('pin')}設置場所</h2>
    <ul class="shop-locs">${locs}</ul>
  </section>
  <section class="wcard">
    <h2 class="wtitle">${ill('star')}設備強化</h2>
    <div class="shop-machs">${machines}</div>
  </section>`;
}

export function mountShop(el) {
  el.querySelectorAll('[data-unlock]').forEach((b) => b.addEventListener('click', async () => {
    const l = findLocation(b.dataset.unlock);
    if (!(await confirmDialog({ title: `${l.name}を解放しますか？`, body: `${yen(l.unlockCost)} を支払います。解放すると自販機を設置できるようになります。`, ok: '解放する' }))) return;
    if (unlockLocation(l.id)) { se('success'); toast(`${l.name}を解放しました`); } else se('error');
  }));
}

// ---------- 設置場所を選ぶ（購入・移設で共用） ----------
function locPicker(s, { exclude, costOf }) {
  return s.unlockedLocations.filter((id) => id !== exclude).map((id) => {
    const l = findLocation(id);
    const cost = costOf(id);
    const short = cost > s.money;
    return `<button class="pick-loc" data-loc="${id}" ${short ? 'disabled' : ''}>
      <span class="sl-name">${ill('pin')}<b>${esc(l.name)}</b></span>
      ${locLine(l)}
      <span class="pick-cost ${short ? 'warn-t' : ''}">${yen(cost)}${short ? '<small>所持金不足</small>' : ''}</span>
    </button>`;
  }).join('') || '<p class="empty">選べる設置場所がありません。ショップで新しい場所を解放してください。</p>';
}

// 購入画面で選んでいる色（画面を離れても次に開いたとき同じ色）
let buyColor = MACHINE_COLORS[0].hex;
const previewSVG = (color) => machineSVG({ name: '新しい自販機', modelId: 'standard', color, upgrades: {},
  slots: Array.from({ length: MACHINE_MODELS.standard.slots }, () => ({ item: null, stock: 0, price: 0 })) });

export function renderBuyMachine(s) {
  const full = s.machines.length >= BALANCE.maxMachines;
  const named = MACHINE_COLORS.find((c) => c.hex === buyColor);
  return `${pageHead({ title: '自販機を購入', ic: 'machine', back: '#shop' })}
  <div class="op-page">
    ${full ? '<p class="note">所有できる上限に達しています</p>' : `<section class="wcard buy-color">
      <div class="bc-preview" id="bc-preview">${previewSVG(buyColor)}</div>
      <div class="bc-side"><h2 class="wtitle">本体の色<small id="bc-name">${named ? named.name : 'オリジナル'}</small></h2>
        <div class="swatches" id="bc-swatches">${MACHINE_COLORS.map((c) => `<button type="button" class="sw" style="--c:${c.hex}" data-color="${c.hex}" data-name="${c.name}" aria-pressed="${c.hex === buyColor}" aria-label="${c.name}"></button>`).join('')}
          <label class="sw custom" aria-label="自由に選ぶ"><input type="color" id="bc-custom" value="${buyColor}"><span>＋</span></label></div></div>
    </section>
    <p class="ar-help">設置する場所を選んでください（本体 ${yen(SHOP.machinePrice)} ＋ 設置費用）</p>
    <div class="pick-list">${locPicker(s, { costOf: machinePriceAt })}</div>`}
  </div>`;
}

export function mountBuyMachine(el) {
  const pick = (hex, name) => {
    buyColor = hex;
    el.querySelector('#bc-preview').innerHTML = previewSVG(hex);
    el.querySelector('#bc-name').textContent = name;
    el.querySelectorAll('#bc-swatches [data-color]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color === hex)));
  };
  el.querySelectorAll('#bc-swatches [data-color]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.color, b.dataset.name)));
  el.querySelector('#bc-custom')?.addEventListener('input', (e) => pick(e.target.value, 'オリジナル'));
  el.querySelectorAll('[data-loc]').forEach((b) => b.addEventListener('click', async () => {
    const l = findLocation(b.dataset.loc);
    const cost = machinePriceAt(l.id);
    if (!(await confirmDialog({ title: `${l.name}に設置しますか？`, body: `${yen(cost)}（本体＋設置費用）を支払います。設置後は倉庫から商品を補充してください。`, ok: '購入する' }))) return;
    const id = buyMachine(l.id, buyColor);
    if (id) { se('success'); location.hash = `#machine-${id}`; toast('自販機を設置しました'); } else se('error');
  }));
}

export function renderMove(s, id) {
  const m = s.machines.find((x) => x.id === id);
  if (!m) return '<p class="empty">自販機が見つかりません</p>';
  return `${pageHead({ title: '設置場所の変更', ic: 'machine', back: `#machine-${id}`, right: locPill(`${m.name}・${findLocation(m.locationId).name}`) })}
  <div class="op-page">
    <p class="ar-help">移設先を選んでください（移設費用は設置費用の${Math.round(SHOP.relocateRate * 100)}%）。在庫と並びはそのまま移ります。</p>
    <div class="pick-list">${locPicker(s, { exclude: m.locationId, costOf: relocateCost })}</div>
  </div>`;
}

export function mountMove(el, s, id) {
  el.querySelectorAll('[data-loc]').forEach((b) => b.addEventListener('click', async () => {
    const l = findLocation(b.dataset.loc);
    if (!(await confirmDialog({ title: `${l.name}へ移設しますか？`, body: `${yen(relocateCost(l.id))} を支払います。`, ok: '移設する' }))) return;
    if (relocate(id, l.id)) { se('success'); location.hash = `#machine-${id}`; toast(`${l.name}へ移設しました`); } else se('error');
  }));
}

// ---------- 設備強化 ----------
const effectText = (u, lv) => {
  if (u.id === 'capacity') return `+${lv * u.per}本`;
  return `${u.id === 'cooling' || u.id === 'security' ? '−' : '+'}${Math.round(lv * u.per * 100)}%`;
};

export function renderUpgrade(s, id) {
  const m = s.machines.find((x) => x.id === id);
  if (!m) return '<p class="empty">自販機が見つかりません</p>';
  const up = upkeepOf(m);
  const rows = UPGRADES.map((u) => {
    const lv = m.upgrades[u.id] || 0;
    const max = lv >= u.maxLevel;
    const cost = max ? 0 : upgradeCost(u.id, lv);
    return `<div class="up-row">
      <span class="up-main"><b>${u.name}</b><small>${u.effect}</small>
        <span class="pips">${Array.from({ length: u.maxLevel }, (_, k) => `<i class="${lv > k ? 'on' : ''}"></i>`).join('')}</span>
        <small class="up-eff">${u.unit} ${lv ? effectText(u, lv) : '±0'}${max ? '（最大）' : ` → <b>${effectText(u, lv + 1)}</b>`}</small></span>
      <button class="buy-btn" data-up="${u.id}" ${max || cost > s.money ? 'disabled' : ''}>${max ? '最大' : `Lv${lv + 1}<br>${yen(cost)}`}</button>
    </div>`;
  }).join('');
  return `${pageHead({ title: '設備強化', ic: 'machine', back: `#machine-${id}`, right: locPill(`${m.name}・${findLocation(m.locationId).name}`) })}
  <div class="op-page">
    <div class="up-preview">${machineSVG(m)}</div>
    <section class="wcard">${rows}</section>
    <p class="muted small">強化すると設備維持費が1レベルにつき1日 ${yen(UPKEEP.maintenancePerLevel)} かかります。現在の維持費：${yen(up.total)}/日（電気代 ${yen(up.electricity)}・場所代 ${yen(up.place)}・設備 ${yen(up.maintenance)}）</p>
  </div>`;
}

export function mountUpgrade(el, s, id) {
  el.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => {
    if (buyUpgrade(id, b.dataset.up)) { se('success'); toast('強化しました'); } else se('error');
  }));
}

