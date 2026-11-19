// =============================================================
// Service Worker（仕様書 15-3）
//  - アプリの画面一式をキャッシュし、オフラインでも基本画面を表示
//  - 通知をタップしたら該当画面を開く
//  - サーバーからのプッシュ通知（push イベント）を受け取って表示する受け口
// ファイルを更新したら VERSION を上げる
// =============================================================
const VERSION = 'v3';
const CACHE = `vending-sim-${VERSION}`;
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/app.js', './js/config.js', './js/state.js', './js/storage.js', './js/util.js', './js/ui.js', './js/icons.js',
  './js/images.js', './js/actions.js', './js/sim.js', './js/events.js', './js/notify.js', './js/audio.js',
  './js/render/art.js', './js/render/map.js',
  './js/views/home.js', './js/views/machines.js', './js/views/products.js', './js/views/productEdit.js', './js/views/more.js',
  './js/views/warehouse.js', './js/views/refill.js', './js/views/arrange.js', './js/views/price.js', './js/views/slotgrid.js',
  './js/views/parts.js', './js/views/shop.js', './js/views/stats.js', './js/views/events.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/badge-96.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('vending-sim-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 自分のファイルは「ネット優先、つながらなければキャッシュ」
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
});

// 通知をタップ → 開いているアプリがあればそこで該当画面へ、なければ開く
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const hash = e.notification.data?.url || '#home';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { c.postMessage({ type: 'open', url: hash }); return c.focus(); }
    return self.clients.openWindow(`./index.html${hash}`);
  }));
});

// サーバーからのプッシュ通知（将来のクラウド保存・サーバー計算と組み合わせて使う）
// 送る内容の例：{ "title": "1号機", "body": "まいにちの水が売り切れました", "url": "#refill-m-xxx", "badge": 3 }
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data?.text() }; }
  const tasks = [self.registration.showNotification(d.title || '自販機マネジャー', {
    body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { url: d.url || '#home' },
  })];
  if (d.badge && self.navigator.setAppBadge) tasks.push(self.navigator.setAppBadge(d.badge));
  e.waitUntil(Promise.all(tasks));
});
