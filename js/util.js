export const yen = (n) => `¥${Math.round(n || 0).toLocaleString('ja-JP')}`;
export const num = (n) => Math.round(n || 0).toLocaleString('ja-JP');

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const uid = (prefix) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// 端末のローカル日付（日本なら JST）で YYYY-MM-DD
export const dateKey = (t = Date.now()) => {
  const d = new Date(t);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const fmtDateTime = (t) => {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const clone = (o) => JSON.parse(JSON.stringify(o));
