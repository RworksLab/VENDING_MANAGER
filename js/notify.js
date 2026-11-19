// =============================================================
// 端末の通知・アプリアイコンのバッジ・Service Worker（仕様書 12章・15-3）
// 使えない環境（claude.ai の公開ページなど）では何もせず、アプリ内のお知らせだけになる
// =============================================================
let reg = null;

export const notifySupported = () => {
  try { return 'Notification' in window && window.isSecureContext && window.top === window.self; } catch { return false; }
};
export const permission = () => (notifySupported() ? Notification.permission : 'unsupported');

export async function requestPermission() {
  if (!notifySupported()) return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

/** Service Worker を登録（PWA・オフライン表示・通知タップでの画面移動） */
export async function registerSW() {
  try {
    if (!('serviceWorker' in navigator) || window.top !== window.self) return null;
    reg = await navigator.serviceWorker.register('./sw.js');
    // 通知をタップして開いたとき、Service Worker から移動先を受け取る
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'open' && e.data.url) location.hash = e.data.url.split('#')[1] ? `#${e.data.url.split('#')[1]}` : '#home';
    });
    return reg;
  } catch { return null; }
}

/** お知らせを端末の通知として出す */
export async function systemNotify(n) {
  if (permission() !== 'granted') return;
  const opts = { body: n.text, tag: n.id, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { url: n.target || '#home' } };
  try {
    if (reg) await reg.showNotification('自販機マネジャー', opts);
    else { const x = new Notification('自販機マネジャー', opts); x.onclick = () => { window.focus(); location.hash = n.target || '#home'; }; }
  } catch { /* 出せない環境 */ }
}

/** アプリアイコンのバッジ（対応環境のみ）とタブのタイトルに未読数を出す */
export function setBadge(count) {
  try {
    if ('setAppBadge' in navigator) { if (count) navigator.setAppBadge(count); else navigator.clearAppBadge(); }
  } catch { /* 非対応 */ }
  document.title = count ? `(${count}) 自販機マネジャー` : '自販機マネジャー';
}
