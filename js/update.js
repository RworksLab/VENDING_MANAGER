// =============================================================
// アップデートのお知らせ
//  - 公開中の version.json を定期的に確認し、開いた時と変わっていたら
//    画面上部に「アップデートがあります」を出す。タップで最新版に更新
//  - PWA では、新しい Service Worker が待機中になったときも同じお知らせを出す
//  - 新しい版で初めて起動したとき、version.json の notes（更新内容）をお知らせに入れる
//  公開するときは version.json の version・notes と sw.js の VERSION を上げる
// =============================================================
import { icon } from './icons.js';
import { getState, update, addNotice } from './state.js';

const CHECK_EVERY = 10 * 60 * 1000;   // 開いている間は 10 分ごとに確認
let current = null;
let shown = false;

let latestInfo = null;
async function fetchVersion() {
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    latestInfo = await r.json();
    return latestInfo.version || null;
  } catch { return null; }
}

/** 今の版の更新内容を、まだ見ていなければお知らせに入れる */
function noteThisVersion(info) {
  const s = getState();
  if (!s || !info?.version || s.meta?.seenVersion === info.version) return;
  update((st) => {
    const first = !st.meta.seenVersion;
    st.meta.seenVersion = info.version;
    if (first && !st.machines.length) return;                 // はじめて遊ぶ人には出さない
    const notes = (info.notes || []).filter(Boolean);
    if (notes.length) addNotice(st, `アップデートしました：${notes.join('／')}`, { type: 'update' });
  });
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
  noteThisVersion(latestInfo);
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
