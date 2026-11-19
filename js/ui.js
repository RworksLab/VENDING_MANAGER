// 共通UI：ボトムシート・確認ダイアログ・トースト
import { esc } from './util.js';

const root = () => document.getElementById('overlay');

export function openSheet(html, { onMount } = {}) {
  const el = root();
  el.innerHTML = `<div class="scrim" data-close></div>
    <section class="sheet" role="dialog" aria-modal="true">
      <button class="sheet-x" data-close aria-label="閉じる">×</button>${html}</section>`;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('open'));
  el.onclick = (e) => { if (e.target.closest('[data-close]')) closeSheet(); };
  onMount?.(el.querySelector('.sheet'));
}

export function closeSheet() {
  const el = root();
  el.classList.remove('open');
  el.hidden = true;
  el.innerHTML = '';
}

export function confirmDialog({ title, body, ok = 'OK', danger = false }) {
  return new Promise((resolve) => {
    openSheet(`<h2 class="sheet-title">${esc(title)}</h2><p class="muted">${esc(body)}</p>
      <div class="row-btns"><button class="btn ghost" data-v="0">キャンセル</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" data-v="1">${esc(ok)}</button></div>`, {
      onMount(s) {
        s.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {
          closeSheet(); resolve(b.dataset.v === '1');
        }));
      },
    });
  });
}

let toastTimer;
export function toast(text) {
  const t = document.getElementById('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
