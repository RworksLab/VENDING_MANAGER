// 画面共通の部品
import { icon } from '../icons.js';
import { esc } from '../util.js';

/**
 * 画面見出し。タブのトップ画面は大きすぎない文字だけの見出し、
 * 下の階層の画面は「‹ 戻る」＋見出し。ic は互換のため受け取るが表示しない
 */
export function pageHead({ title, back, right = '' }) {
  return `<div class="phead ${back ? 'sub' : 'top'}">
    ${back ? `<a class="back-btn" href="${back}" aria-label="戻る">${icon('back')}</a>` : ''}
    <h1 class="ph-title">${esc(title)}</h1>
    ${right ? `<div class="phead-right">${right}</div>` : ''}
  </div>`;
}

export const locPill = (name) => `<span class="loc-pill">${icon('pin')}${esc(name)}</span>`;

/** 色付きの大きな操作ボタン。locked は準備中 */
export const bigBtn = ({ color, ic, label, href, locked }) => locked
  ? `<button class="bbtn ${color}" disabled><span class="bbtn-ic">${icon(ic)}</span>${label}<em>${icon('lock')}</em></button>`
  : `<a class="bbtn ${color}" href="${href}"><span class="bbtn-ic">${icon(ic)}</span>${label}</a>`;
