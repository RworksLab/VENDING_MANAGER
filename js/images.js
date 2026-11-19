// =============================================================
// ラベル画像：縮小・保存・読み込み・不要画像の掃除
// 画像本体はセーブデータと別に保存し、state には ID だけを持つ。
// state.imageIds に、これまでに保存した画像 ID を記録する。
// =============================================================
import { LABEL_IMAGE } from './config.js';
import { loadImage, saveImage, deleteImage } from './storage.js';
import { uid } from './util.js';

const cache = new Map(); // id -> dataURL
export const getImage = (id) => (id ? cache.get(id) : null);

/** ファイルを読み込み、長辺 maxSide に縮小した dataURL を返す */
export async function fileToDataURL(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('not-image');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const k = Math.min(1, LABEL_IMAGE.maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k));
    const h = Math.max(1, Math.round(img.naturalHeight * k));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; // 透過PNGはJPEG化で黒くならないよう白地に
    g.fillRect(0, 0, w, h);
    g.drawImage(img, 0, 0, w, h);
    return c.toDataURL(LABEL_IMAGE.mime, LABEL_IMAGE.quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 画像を保存して ID を返す。登録は呼び出し側が state.imageIds に追加する */
export async function storeImage(dataUrl) {
  const id = uid('img');
  cache.set(id, dataUrl);
  const ok = await saveImage(id, dataUrl);
  if (!ok) throw new Error('save-failed');
  return id;
}

/** state が参照している画像 ID（商品・自販機の陳列・倉庫） */
export function referencedImages(s, extra = []) {
  const ids = new Set(extra.filter(Boolean));
  const add = (o) => { if (o?.label?.image) ids.add(o.label.image); };
  s.products.forEach(add);
  s.machines.forEach((m) => m.slots.forEach((sl) => add(sl.item)));
  Object.values(s.warehouse).forEach((w) => add(w.snap));
  return ids;
}

/** 参照されている画像をまとめて読み込む。読み込めたら true */
export async function preloadImages(s) {
  const need = [...referencedImages(s)].filter((id) => !cache.has(id));
  if (!need.length) return false;
  const got = await Promise.all(need.map(async (id) => [id, await loadImage(id)]));
  got.forEach(([id, data]) => data && cache.set(id, data));
  return got.some(([, d]) => d);
}

/** どこからも参照されなくなった画像を削除。state.imageIds を書き換えるので update() 内で呼ぶ */
export function collectGarbage(s, keep = []) {
  const used = referencedImages(s, keep);
  const drop = (s.imageIds || []).filter((id) => !used.has(id));
  if (!drop.length) return;
  s.imageIds = s.imageIds.filter((id) => used.has(id));
  drop.forEach((id) => { cache.delete(id); deleteImage(id); });
}
