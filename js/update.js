// =============================================================
// アップデートのお知らせ
//  - 公開中の version.json を定期的に確認し、開いた時と変わっていたら
//    画面上部に「アップデートがあります」を出す。タップで最新版に更新
//  - PWA では、新しい Service Worker が待機中になったときも同じお知らせを出す
//  公開するときは version.json の version と sw.js の VERSION を上げる
// =============================================================
import { icon } from './icons.js';

const CHECK_EVERY = 10 * 60 * 1000;   // 開いている間は 10 分ごとに確認
let current = null;
let shown = false;

async function fetchVersion() {
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()).version || null;
  } catch { return null; }
}

const swReg = async () => {
  try { return await navigator.serviceWorker?.getRegistration?.(); } catch { return null; }
};

/** 新しい版が出ていないか確認する */
export async function checkForUpdate() {
  if (shown) return;
  const v = await fetchVersion();
  if (v && !current) current = v;
  else if (v && v !== current) showBanner();
  (await swReg())?.update().catch(() => {});
}

function showBanner() {
  if (shown) return;
  shown = true;
  const b = document.createElement('button');
  b.className = 'update-bar';
  b.type = 'button';
  b.innerHTML = `${icon('refresh')}<span>アップデートがあります</span><small>タップして更新</small>`;
  b.addEventListener('click', applyUpdate);
  document.body.appendChild(b);
}

async function applyUpdate(e) {
  e.currentTarget.querySelector('span').textContent = '更新しています…';
  const reg = await swReg();
  if (reg?.waiting) {
    // 待機中の新しい Service Worker に切り替えてから読み込み直す
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
    reg.waiting.postMessage({ type: 'skipWaiting' });
    setTimeout(() => location.reload(), 3000);
  } else {
    location.reload();
  }
}

export async function initUpdateCheck() {
  current = await fetchVersion();
  setInterval(checkForUpdate, CHECK_EVERY);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });
  const reg = await swReg();
  if (!reg) return;
  const hasOld = () => !!navigator.serviceWorker.controller;   // 初回のインストールでは出さない
  if (reg.waiting && hasOld()) showBanner();
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    w?.addEventListener('statechange', () => { if (w.state === 'installed' && hasOld()) showBanner(); });
  });
}
