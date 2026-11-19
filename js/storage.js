// =============================================================
// 保存先アダプター
//  - local : ブラウザ内（localStorage）。どこでも動く
//  - cloud : claude.ai 上で開いたとき、本人専用のクラウド領域に保存
//            （別端末から開いても同じデータ。仕様書 15-2 / 15-4）
// 読み込み時は両方を見て新しい方を採用。将来 Firebase 等に移す場合も
// 同じ load/save インターフェースのアダプターを足すだけで済む。
// =============================================================
import { SAVE_KEY } from './config.js';

const localAdapter = {
  name: 'local',
  async load() {
    try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
  },
  save(state) { // 同期で完了させる（閉じる直前でも確実に書く）
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch { return false; }
  },
  async clear() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(SAVE_KEY)).forEach((k) => localStorage.removeItem(k));
    } catch { /* noop */ }
  },
  // 画像はセーブ本体と分けて1枚ずつ保存
  loadImage(id) { try { return localStorage.getItem(`${SAVE_KEY}/img/${id}`); } catch { return null; } },
  saveImage(id, data) { try { localStorage.setItem(`${SAVE_KEY}/img/${id}`, data); return true; } catch { return false; } },
  deleteImage(id) { try { localStorage.removeItem(`${SAVE_KEY}/img/${id}`); } catch { /* noop */ } },
  listImages() {
    try { return Object.keys(localStorage).filter((k) => k.startsWith(`${SAVE_KEY}/img/`)).map((k) => k.slice(SAVE_KEY.length + 5)); } catch { return []; }
  },
};

const within = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

async function createCloudAdapter() {
  const use = window.claude?.use;
  if (typeof use !== 'function') return null;
  const [db, user] = await within(Promise.all([use('db'), use('user')]), 10000) || [];
  if (!db || !user) return null;
  const id = await within(user.id(), 10000);
  if (!id) return null;
  const col = db.collection(`data/users/${id}`);
  const ref = col.doc('save');
  return {
    name: 'cloud',
    async load() {
      const snap = await within(ref.get(), 10000);
      if (!snap || !snap.exists) return null;
      try { return JSON.parse(snap.data().json); } catch { return null; }
    },
    async save(state) {
      await ref.set({ json: JSON.stringify(state), savedAt: state.meta.savedAt, schema: state.schema });
      return true;
    },
    async clear() { try { await ref.delete(); } catch { /* noop */ } },
    async loadImage(imgId) {
      const snap = await within(col.doc(`img-${imgId}`).get(), 10000);
      return snap?.exists ? snap.data().data : null;
    },
    async saveImage(imgId, data) { await col.doc(`img-${imgId}`).set({ data, at: Date.now() }); },
    async deleteImage(imgId) { try { await col.doc(`img-${imgId}`).delete(); } catch { /* noop */ } },
  };
}

// ---------- 保存制御 ----------
const status = { local: 'idle', cloud: 'off', lastCloudAt: 0 };
const statusListeners = new Set();
const emitStatus = () => statusListeners.forEach((fn) => fn({ ...status }));
export const onSaveStatus = (fn) => (statusListeners.add(fn), fn({ ...status }), () => statusListeners.delete(fn));

let cloud = null;
let pending = null;
let writing = false;
let timer = null;

export async function loadBest() {
  const local = await localAdapter.load();
  try { cloud = await createCloudAdapter(); } catch { cloud = null; }
  status.cloud = cloud ? 'ready' : 'off';
  let remote = null;
  if (cloud) { try { remote = await cloud.load(); } catch { remote = null; } }
  emitStatus();
  if (local && remote) return (remote.meta?.savedAt ?? 0) > (local.meta?.savedAt ?? 0) ? remote : local;
  return remote || local;
}

// 状態が変わるたびに呼ばれる。ローカルは即時、クラウドはまとめて1件ずつ
export function persist(state) {
  status.local = localAdapter.save(state) ? 'saved' : 'error';
  if (!cloud) return emitStatus();
  pending = state;
  status.cloud = 'pending';
  emitStatus();
  clearTimeout(timer);
  timer = setTimeout(flushCloud, 2500);
}

async function flushCloud() {
  if (writing || !pending || !cloud) return;
  writing = true;
  const snapshot = JSON.parse(JSON.stringify(pending));
  pending = null;
  try {
    await cloud.save(snapshot);
    status.cloud = 'saved';
    status.lastCloudAt = Date.now();
  } catch (e) {
    status.cloud = 'error';
    if (e?.code === 'unavailable') pending = pending || snapshot;
  }
  writing = false;
  emitStatus();
  if (pending) timer = setTimeout(flushCloud, 4000);
}

// ---------- 画像 ----------
export async function loadImage(id) {
  const local = localAdapter.loadImage(id);
  if (local) return local;
  if (!cloud) return null;
  try {
    const data = await cloud.loadImage(id);
    if (data) localAdapter.saveImage(id, data); // 次回から端末内で読める
    return data;
  } catch { return null; }
}

export async function saveImage(id, data) {
  const ok = localAdapter.saveImage(id, data);
  if (cloud) { try { await cloud.saveImage(id, data); return true; } catch { return ok; } }
  return ok;
}

export async function deleteImage(id) {
  localAdapter.deleteImage(id);
  if (cloud) await cloud.deleteImage(id);
}

export const listLocalImages = () => localAdapter.listImages();

export async function clearAll() {
  await localAdapter.clear();
  if (cloud) await cloud.clear();
}

// ページを離れる直前にクラウドへ未送信分を送る
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { clearTimeout(timer); flushCloud(); }
});
