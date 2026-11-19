// =============================================================
// 商品・自販機・街並みの SVG 描画（イラスト調：紺の輪郭線＋フラット塗り）
// =============================================================
import { MACHINE_MODELS } from '../config.js';
import { esc, num } from '../util.js';
import { getImage } from '../images.js';

export const OUTLINE = '#2b3a67';
let seq = 0;
const nid = () => `a${(++seq).toString(36)}_`;   // 末尾の _ で、接尾辞付きの ID と重ならないようにする

// ---------- 色 ----------
const rgb = (hex) => { const h = (hex || '#888888').replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
export function shade(hex, amt) {
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  return '#' + rgb(hex).map((c) => Math.round(c + (t - c) * p).toString(16).padStart(2, '0')).join('');
}
export function isLight(hex) {
  const [r, g, b] = rgb(hex).map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}

// ---------- ジャンルのアイコン（中心 0,0 / 約 16px） ----------
function genreIcon(genre, c) {
  switch (genre) {
    case 'water': return `<path d="M0 -8C3 -4 6 -1 6 2.5a6 6 0 0 1-12 0C-6 -1-3 -4 0 -8z" fill="${c}"/><path d="M-3 2a3 3 0 0 0 2 3" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    case 'tea': return `<path d="M-6 6C-6 -2 -1 -7 7 -7C7 1 2 6-6 6z" fill="${c}"/><path d="M-5 5 4 -4" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>`;
    case 'coffee': return `<ellipse rx="5.2" ry="7.4" fill="${c}" transform="rotate(30)"/><path d="M-2.5 -5.5C1 -2-2 2 2.5 5.5" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    case 'soda': return `<circle cx="-2.5" cy="2.5" r="4" fill="${c}"/><circle cx="3.5" cy="-3" r="3" fill="${c}"/><circle cx="-3" cy="-5" r="1.8" fill="${c}"/><circle cx="-3.6" cy="1.4" r="1.2" fill="#fff"/>`;
    case 'juice': return `<circle r="7" fill="${c}"/><circle r="5" fill="#fff" opacity=".85"/>${[0, 60, 120].map((a) => `<line x1="0" y1="-5" x2="0" y2="5" stroke="${c}" stroke-width="1.2" transform="rotate(${a})"/>`).join('')}`;
    case 'energy': return `<path d="M2 -8 -5 1h4.5L-2 8 5 -1H0.5z" fill="${c}"/>`;
    case 'sweet': return `<path d="M0 7-6 1a3.8 3.8 0 0 1 6-5 3.8 3.8 0 0 1 6 5z" fill="${c}"/>`;
    default: return `<path d="M0 -7 2 -2.2 7.2 -2.2 3 1 4.6 6.4 0 3.2-4.6 6.4-3 1-7.2 -2.2-2 -2.2z" fill="${c}"/>`;
  }
}

// ---------- ラベル柄（c：ラベルの色、c2：サブカラー） ----------
function pattern(tpl, x, y, w, h, c, c2) {
  let s = '';
  switch (tpl) {
    case 'band': return `<rect x="${x}" y="${y + h * 0.32}" width="${w}" height="${h * 0.36}" fill="${c}"/>`;
    case 'stripe':
      for (let i = -h; i < w + h; i += 9) s += `<path d="M${x + i} ${y + h}L${x + i + h} ${y}" stroke="${c}" stroke-width="3"/>`;
      return s;
    case 'dots':
      for (let yy = y + 5, r = 0; yy < y + h; yy += 8, r++)
        for (let xx = x + 4 + (r % 2) * 4; xx < x + w; xx += 8) s += `<circle cx="${xx}" cy="${yy}" r="2" fill="${c}"/>`;
      return s;
    case 'split': return `<path d="M${x} ${y + h * 0.75}L${x + w} ${y + h * 0.25}V${y + h}H${x}Z" fill="${c}"/>`;
    case 'circle': return `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(w, h) * 0.38}" fill="${c}"/>`;
    case 'check':
      for (let yy = y, r = 0; yy < y + h; yy += 6, r++)
        for (let xx = x + (r % 2) * 6; xx < x + w; xx += 12) s += `<rect x="${xx}" y="${yy}" width="6" height="6" fill="${c}" opacity=".85"/>`;
      return s;
    case 'wave': return `<path d="M${x} ${y + h * 0.55}q${w / 4} -7 ${w / 2} 0t${w / 2} 0V${y + h}H${x}Z" fill="${c}"/>`;
    case 'heart':
      for (let yy = y + 6, r = 0; yy < y + h + 6; yy += 11, r++)
        for (let xx = x + 3 + (r % 2) * 7; xx < x + w + 4; xx += 14) s += `<path transform="translate(${xx} ${yy}) scale(.42)" d="M0 7-6 1a3.8 3.8 0 0 1 6-5 3.8 3.8 0 0 1 6 5z" fill="${c}"/>`;
      return s;
    case 'star':
      for (let yy = y + 6, r = 0; yy < y + h + 6; yy += 12, r++)
        for (let xx = x + 4 + (r % 2) * 7; xx < x + w + 4; xx += 14) s += `<path transform="translate(${xx} ${yy}) scale(.5)" d="M0 -7 2 -2.2 7.2 -2.2 3 1 4.6 6.4 0 3.2-4.6 6.4-3 1-7.2 -2.2-2 -2.2z" fill="${c}"/>`;
      return s;
    case 'border':
      for (let yy = y + 2; yy < y + h; yy += 8) s += `<rect x="${x}" y="${yy}" width="${w}" height="4" fill="${c}"/>`;
      return s;
    case 'leaf':
      for (let yy = y + 4, r = 0; yy < y + h + 6; yy += 12, r++)
        for (let xx = x + 2 + (r % 2) * 8; xx < x + w + 4; xx += 16)
          s += `<g transform="translate(${xx} ${yy}) rotate(-30)"><path d="M0 0C4 -5 10 -5 12 0C10 5 4 5 0 0Z" fill="${c}"/><path d="M1 0H11" stroke="${c2}" stroke-width=".8"/></g>`;
      return s;
    case 'lemon': {
      const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) * 0.34;
      s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.8}" fill="${c2}"/>`;
      for (let a = 0; a < 360; a += 45) s += `<path d="M${cx} ${cy}L${(cx + Math.cos(a * Math.PI / 180) * r * 0.78).toFixed(1)} ${(cy + Math.sin(a * Math.PI / 180) * r * 0.78).toFixed(1)}" stroke="${c}" stroke-width="1.4"/>`;
      return s;
    }
    case 'two': return `<rect x="${x}" y="${y}" width="${w / 2}" height="${h}" fill="${c}"/><rect x="${x + w / 2}" y="${y}" width="${w / 2}" height="${h}" fill="${c2}"/>`;
    case 'fade':
      for (let i = 0; i < 6; i++) s += `<rect x="${x}" y="${(y + h - (i + 1) * h / 6).toFixed(1)}" width="${w}" height="${(h / 6 + 0.5).toFixed(1)}" fill="${c}" opacity="${(0.15 + i * 0.15).toFixed(2)}"/>`;
      return s;
    case 'tartan':
      for (let xx = x + 3; xx < x + w; xx += 9) s += `<rect x="${xx}" y="${y}" width="3" height="${h}" fill="${c}" opacity=".7"/>`;
      for (let yy = y + 3; yy < y + h; yy += 9) s += `<rect x="${x}" y="${yy}" width="${w}" height="3" fill="${c2}" opacity=".7"/>`;
      return s;
    case 'mountain':
      return `<path d="M${x} ${y + h}L${x + w * 0.35} ${y + h * 0.35}L${x + w * 0.55} ${y + h * 0.6}L${x + w * 0.75} ${y + h * 0.3}L${x + w} ${y + h * 0.7}V${y + h}Z" fill="${c}"/>
        <path d="M${x + w * 0.29} ${y + h * 0.43}L${x + w * 0.35} ${y + h * 0.35}L${x + w * 0.41} ${y + h * 0.43}ZM${x + w * 0.7} ${y + h * 0.37}L${x + w * 0.75} ${y + h * 0.3}L${x + w * 0.8} ${y + h * 0.38}Z" fill="${c2}"/>`;
    default: return '';
  }
}

// ---------- ラベルに重ねるアイコンと文字 ----------
const charW = (ch) => (/[\u0000-ÿ｡-ﾟ]/.test(ch) ? 0.7 : 1);   // 半角は全角の約 0.7 幅
const FONT = `font-weight="900" text-anchor="middle" font-family="'Hiragino Sans','Noto Sans JP',sans-serif"`;

/** 文字（スタイル付き）。範囲 x,y,w,h の中央に置く */
function labelText(l, chars, x, y, w, h) {
  const fill = l.textColor || '#ffffff', sub = l.subColor || '#ffffff';
  const style = l.textStyle || 'plain';
  const halo = isLight(fill) ? OUTLINE : '#ffffff';
  const vertical = l.textDir === 'v';
  const pad = style === 'box' || style === 'ribbon' ? 3 : 0;
  let fs, cx = x + w / 2, cy = y + h / 2, bw, bh, body;
  if (vertical) {
    const cs = chars.map((c) => (c === 'ー' || c === '-' || c === '－' ? '｜' : c));
    fs = Math.min((w - pad * 2) * 0.62, (h - 4 - pad * 2) / cs.length, 14);
    bw = fs * 1.35; bh = fs * cs.length + fs * 0.4;
    const top = cy - (fs * cs.length) / 2;
    body = (a) => cs.map((c, i) => `<text x="${cx}" y="${(top + fs * (i + 0.86)).toFixed(1)}" font-size="${fs.toFixed(1)}" ${FONT} ${a}>${esc(c)}</text>`).join('');
  } else {
    const units = chars.reduce((a, c) => a + charW(c), 0);
    fs = Math.min((w - 4 - pad * 2) / units, h * 0.7, 14);
    bw = Math.min(w - 2, units * fs + fs * 0.6); bh = fs * 1.5;
    body = (a) => `<text x="${cx}" y="${(cy + fs * 0.36).toFixed(1)}" font-size="${fs.toFixed(1)}" ${FONT} ${a}>${esc(chars.join(''))}</text>`;
  }
  const plain = `fill="${fill}" stroke="${halo}" stroke-width="${(fs * 0.14).toFixed(2)}" paint-order="stroke" stroke-linejoin="round"`;
  switch (style) {
    case 'ribbon':   // サブカラーの帯の上に文字
      return (vertical
        ? `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y - 2}" width="${bw.toFixed(1)}" height="${h + 4}" fill="${sub}"/>`
        : `<rect x="${x - 2}" y="${(cy - bh / 2).toFixed(1)}" width="${w + 4}" height="${bh.toFixed(1)}" fill="${sub}"/>`) + body(`fill="${fill}"`);
    case 'box': {    // 枠の中に文字。文字が明るい色なら枠は紺、暗い色なら白
      const boxBg = isLight(fill) ? OUTLINE : '#ffffff';
      return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${(cy - bh / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${boxBg}" stroke="${fill}" stroke-width="1.4"/>` + body(`fill="${fill}"`);
    }
    case 'slant': return `<g transform="rotate(${vertical ? -6 : -12} ${cx} ${cy})">${body(plain)}</g>`;
    case 'outline': return body(`fill="none" stroke="${fill}" stroke-width="${Math.max(0.8, fs * 0.09).toFixed(2)}"`);
    default: return body(plain);
  }
}

function labelDeco(item, x, y, w, h) {
  const l = item.label || {};
  const text = [...String(l.text || '').trim()];
  const showIcon = !!l.icon;
  if (!showIcon && !text.length) return '';
  const body = item.color || '#4aa8f0', lc = l.color || '#ffffff';
  // 無地（ラベル全体がラベルの色）のときは丸を本体の色にして見えるようにする
  const plainBg = l.mode !== 'image' && l.template === 'plain';
  const circle = plainBg ? body : lc, glyph = plainBg ? lc : body;
  let s = '';
  // 文字の入る範囲とアイコンの範囲を分ける
  let iy = y, ih = h, ty = y, th = h;
  if (showIcon && text.length) {
    if (l.textDir === 'v') { ih = Math.min(w * 0.75, h * 0.3); ty = y + ih; th = h - ih; }
    else { ih = h * 0.56; ty = y + ih; th = h - ih; }
  }
  if (showIcon) {
    const r = Math.min(w, ih) * (text.length ? 0.42 : 0.36), k = r / 9;
    s += `<circle cx="${x + w / 2}" cy="${iy + ih / 2}" r="${r}" fill="${circle}"/>
      <g transform="translate(${x + w / 2} ${iy + ih / 2}) scale(${k})">${genreIcon(item.genre, glyph)}</g>`;
  }
  if (text.length) s += labelText(l, text, x, ty, w, th);
  return s;
}

/** 中身の色（透明ボトル）。指定がなければジャンルから決める */
export const LIQUID_BY_GENRE = { water: '#d6f1fe', tea: '#b9c94e', coffee: '#6b4329', soda: '#e6f7ff', juice: '#ffa62b', sweet: '#fbe0ea', energy: '#f4d03a', other: '#cfe6c8' };

/** ラベルの範囲。pos：std（ふつう）/ high（上寄せ）/ low（下寄せ）/ full（全面）/ double（上下2本） */
function labelRects(pos, top, bottom, std) {
  const H = bottom - top;
  switch (pos) {
    case 'high': return [[top + H * 0.04, H * 0.44]];
    case 'low': return [[top + H * 0.5, H * 0.42]];
    case 'full': return [[top - 30, bottom - top + 34]];
    case 'double': { const h = H * 0.17; return [[top + H * 0.06, h], [bottom - H * 0.06 - h, h]]; }
    default: return [std];
  }
}

/** 商品1本。viewBox 0 0 60 130、下端揃え、内容量で高さが変わる */
export function drinkSVG(item, { cls = '' } = {}) {
  const id = nid();
  const l = item.label || {};
  const tpl = l.template || 'plain';
  const lc = l.color || '#fff', c2 = l.subColor || '#ffffff';
  const body = item.color || '#999';
  const pos = l.pos || 'std';
  const img = l.mode === 'image' ? getImage(l.image) : null;
  const hasText = !!String(l.text || '').trim();
  const pic = (x, y, w, h) => `<image href="${img}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`;
  const o = `stroke="${OUTLINE}" stroke-width="2.4" stroke-linejoin="round"`;
  const ow = (w) => `stroke="${OUTLINE}" stroke-width="${w}" stroke-linejoin="round"`;   // 線の太さだけ変えたいとき
  const isCan = item.container === 'can';
  const clear = !isCan && !!l.clear;

  // 形
  let path, x, w, top, bottom, shoulder, H, std;
  if (isCan) {
    H = 48 + 60 * Math.min(1, item.volume / 350);
    top = 127 - H; x = 13; w = 34; bottom = 127; shoulder = top;
    // 上下がすぼまった缶：上は首（ネック）、下は底のふち
    const n = 4, nh = 6, bh = 4;
    path = `M${x + n} ${top}H${x + w - n}Q${x + w - n + 1} ${top} ${x + w - 1} ${top + nh - 1.5}Q${x + w} ${top + nh} ${x + w} ${top + nh + 2}V${bottom - bh - 1}Q${x + w} ${bottom - bh + 1} ${x + w - 2} ${bottom - 1}Q${x + w - 3} ${bottom} ${x + w - 5} ${bottom}H${x + 5}Q${x + 3} ${bottom} ${x + 2} ${bottom - 1}Q${x} ${bottom - bh + 1} ${x} ${bottom - bh - 1}V${top + nh + 2}Q${x} ${top + nh} ${x + 1} ${top + nh - 1.5}Q${x + n - 1} ${top} ${x + n} ${top}Z`;
    std = [top + nh + 4, H - nh - bh - 8];
  } else {
    H = 74 + 50 * Math.min(1, item.volume / 500);
    top = 127 - H; x = 12; w = 36; bottom = 127; shoulder = top + 24;
    path = `M24 ${top + 9}H36V${top + 13}C36 ${top + 17} 48 ${shoulder - 6} 48 ${shoulder + 5}V${top + H - 6}Q48 ${top + H} 42 ${top + H}H18Q12 ${top + H} 12 ${top + H - 6}V${shoulder + 5}C12 ${shoulder - 6} 24 ${top + 17} 24 ${top + 13}Z`;
    std = hasText ? [shoulder + (H - 24) * 0.08, (H - 24) * 0.64] : [shoulder + (H - 24) * 0.14, (H - 24) * 0.5];
  }
  const rects = labelRects(pos, isCan ? top + 2 : shoulder, isCan ? bottom - 2 : bottom, std);

  // 本体（透明ボトルは中身の色が透ける）
  const liquid = l.liquid || LIQUID_BY_GENRE[item.genre] || LIQUID_BY_GENRE.other;
  const base = clear
    ? `<path d="${path}" fill="#eef8fe"/><rect x="0" y="${shoulder - 4}" width="60" height="130" fill="${liquid}" opacity=".92"/>`
    : `<path d="${path}" fill="${body}"/>`;

  // ラベルの地：無地はラベルの色。柄なしは本体を少し明るく。透明ボトルでは本体の色がラベルの地になる
  const labelBg = tpl === 'plain' ? lc : clear ? body : tpl === 'none' ? shade(body, 0.25) : body;
  const drawBg = !isCan || clear || tpl === 'plain' || pos !== 'std';
  let label = '';
  for (const [ly, lh] of rects) {
    label += `${drawBg || img ? `<rect x="${x}" y="${ly}" width="${w}" height="${lh}" fill="${labelBg}"/>` : ''}
      ${img ? pic(x, ly, w, lh) : tpl === 'plain' ? '' : pattern(tpl, x, ly, w, lh, lc, c2)}
      ${pos === 'full' ? '' : `<path d="M${x} ${ly}h${w}M${x} ${ly + lh}h${w}" stroke="${OUTLINE}" stroke-width="1.4" opacity=".5"/>`}`;
  }
  // 文字・アイコンを置く範囲（上下2本のときは間、全面のときは胴の中ほど）
  const deco = pos === 'double' ? [rects[0][0] + rects[0][1], rects[1][0] - rects[0][0] - rects[0][1]]
    : pos === 'full' ? (isCan ? std : [shoulder + (H - 24) * 0.1, (H - 24) * 0.6]) : rects[0];
  label += labelDeco(item, x, deco[0], w, deco[1]);

  let s = `<defs><clipPath id="${id}"><path d="${path}"/></clipPath></defs>
    ${clear ? '' : base}
    <g clip-path="url(#${id})">${clear ? base : ''}${label}
      ${isCan ? `<rect x="${x}" y="${top}" width="${w}" height="8" fill="#dfe6ee"/><rect x="${x}" y="${bottom - 6}" width="${w}" height="6" fill="#dfe6ee"/>
        <path d="M${x} ${top + 8}h${w}M${x} ${bottom - 6}h${w}" stroke="${OUTLINE}" stroke-width="1.3" opacity=".55"/>
        <rect x="${x + w - 8}" y="${top}" width="4" height="${H}" fill="#000" opacity=".1"/>` : ''}
      <rect x="${x + 4.5}" y="${isCan ? top + 9 : shoulder}" width="4.5" height="${isCan ? H - 18 : H - 34}" rx="2.2" fill="#fff" opacity="${clear ? 0.75 : isCan ? 0.5 : 0.55}"/>
    </g>
    <path d="${path}" fill="none" ${o}/>`;
  s += isCan
    ? `<rect x="${x + 3}" y="${top - 2.5}" width="${w - 6}" height="4" rx="2" fill="#eef2f6" ${ow(1.6)}/>
       <path d="M${x + w / 2 - 5} ${top - 1}h7a2 2 0 0 1 0 3h-7z" fill="#c9d2de" stroke="${OUTLINE}" stroke-width="1" stroke-linejoin="round"/>`
    : `<rect x="22.5" y="${top}" width="15" height="10" rx="2.5" fill="${l.cap || shade(body, -0.15)}" ${ow(2)}/>`;
  return `<svg class="drink ${cls}" viewBox="0 0 60 130" role="img" aria-label="${esc(item.name)}">${s}</svg>`;
}

const inner = (svg) => svg.replace(/^<svg[^>]*>|<\/svg>$/g, '');

/** 角を同じ半径で丸めた多角形のパス（頂点は時計回りでも反時計回りでもよい） */
function roundedPoly(pts, r) {
  const n = pts.length;
  const at = (i) => pts[(i + n) % n];
  const toward = (p, q, d) => { const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy); const k = Math.min(d, len / 2) / len; return [p[0] + dx * k, p[1] + dy * k]; };
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = at(i), a = toward(p, at(i - 1), r), b = toward(p, at(i + 1), r);
    d += `${i ? 'L' : 'M'}${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${p[0]} ${p[1]} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  return d + 'Z';
}

/**
 * 自販機本体（左側面が見える立体イラスト）。強化による見た目の変化はなし。
 * 本体の外形は側面と前面を 1 本の輪郭で描き、角はすべて同じ半径で丸める。
 */
export function machineSVG(machine, { compact = false } = {}) {
  const id = nid();
  const model = MACHINE_MODELS[machine.modelId];
  const cols = model.cols, rows = Math.ceil(machine.slots.length / cols);
  const B = machine.color || model.color;
  const O = OUTLINE, sw = 'stroke-width="3" stroke-linejoin="round"';
  const R = 8;                                                     // 角の丸み：本体も部品もすべてこの値でそろえる
  const r = R;

  const D = 22;                                                    // 側面の奥行き
  const fx = 50, fw = 254, fy = 20;                                // 前面
  const wx = fx + 16, wy = fy + 68, ww = 196, cw = ww / cols, rowH = 98;
  const wh = rows * rowH + 10;
  const lowY = wy + wh + 14, bottom = lowY + 120;
  const W = 330, H = bottom + 34;

  // ---- 商品棚 ----
  let cells = '';
  for (let rr = 0; rr < rows; rr++) {
    const ry = wy + 6 + rr * rowH;
    cells += `<rect x="${wx}" y="${ry + 66}" width="${ww}" height="24" fill="#ffffff"/>
      <path d="M${wx} ${ry + 66}h${ww}M${wx} ${ry + 90}h${ww}" stroke="${O}" stroke-width="2"/>`;
    for (let c = 0; c < cols; c++) {
      const slot = machine.slots[rr * cols + c];
      if (!slot) continue;
      const cx = wx + c * cw, mid = cx + cw / 2;
      const out = slot.item && slot.stock === 0;
      if (slot.item) {
        cells += `<g opacity="${out ? 0.35 : 1}"><svg x="${cx + 3}" y="${ry}" width="${cw - 6}" height="66" viewBox="0 0 60 130" preserveAspectRatio="xMidYMax meet">${inner(drinkSVG(slot.item))}</svg></g>`;
        cells += `<rect x="${mid - 20}" y="${ry + 70}" width="40" height="16" rx="${R}" fill="${out ? '#e5484d' : '#3b4466'}"/>
          ${compact ? '' : `<text x="${mid}" y="${ry + 82}" text-anchor="middle" font-size="10" font-weight="800" fill="#fff">${out ? '売切' : `${num(slot.price)}円`}</text>`}`;
      } else {
        cells += `<rect x="${cx + 10}" y="${ry + 14}" width="${cw - 20}" height="48" rx="${R}" fill="none" stroke="#9fb3c8" stroke-dasharray="4 4"/>
          <rect x="${mid - 20}" y="${ry + 70}" width="40" height="16" rx="${R}" fill="#c7d2de"/>`;
      }
    }
  }

  // ---- 本体の形 ----
  const back = 12;                                                 // 奥の辺は少し短く見える
  const body = roundedPoly([[fx - D, fy + back], [fx, fy], [fx + fw, fy], [fx + fw, bottom], [fx, bottom], [fx - D, bottom - back]], R);
  const sideFill = `M${fx} ${fy - 4}L${fx - D - 4} ${fy + back - 4}V${bottom - back + 4}L${fx} ${bottom + 4}Z`;
  const foot = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${R}" fill="${fill}" stroke="${O}" stroke-width="2.6"/>`;

  return `<svg class="machine" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(machine.name)}">
  <defs><clipPath id="${id}w"><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="${R}"/></clipPath>
    <clipPath id="${id}b"><path d="${body}"/></clipPath></defs>
  <ellipse cx="${fx + fw / 2 - D / 2}" cy="${bottom + 18}" rx="${fw / 2 + D}" ry="11" fill="#1d2b55" opacity=".16"/>
  ${foot(fx - D + 4, bottom - 18, 26, 26, '#2b3352')}
  ${foot(fx + fw - 40 - D, bottom - 18, 26, 26, '#2b3352')}
  ${foot(fx + 6, bottom - 6, 32, 22, '#3b4466')}
  ${foot(fx + fw - 40, bottom - 6, 32, 22, '#3b4466')}
  <path d="${body}" fill="#f6fbff"/>
  <g clip-path="url(#${id}b)">
    <path d="M${fx} ${lowY + 54}L${fx + fw} ${lowY - 6}V${bottom}H${fx}z" fill="${shade(B, 0.62)}"/>
    <path d="M${fx + fw} ${lowY + 34}V${bottom}H${fx + 150}z" fill="${shade(B, 0.25)}"/>
    <path d="${sideFill}" fill="${shade(B, -0.08)}"/>
    <path d="M${fx - D + 7} ${fy + back + 12}V${bottom - back - 12}" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".4"/>
  </g>
  <path d="M${fx} ${fy}V${bottom}" stroke="${O}" stroke-width="3" clip-path="url(#${id}b)"/>
  <path d="${body}" fill="none" stroke="${O}" ${sw}/>
  <rect x="${fx + 12}" y="${fy + 12}" width="${fw - 24}" height="46" rx="${R}" fill="${B}" stroke="${O}" ${sw}/>
  <path d="M${fx + 120} ${fy + 13.5}h34l-26 43h-34zM${fx + 166} ${fy + 13.5}h12l-26 43h-12z" fill="#fff" opacity=".22"/>
  <g transform="translate(${fx + fw / 2} ${fy + 35})" stroke="${O}" stroke-width="2.2" stroke-linejoin="round">
    <path d="M-9 -8h18l-2.5 19h-13z" fill="#fff"/><path d="M-11 -12h22v4h-22z" fill="#fff"/><path d="M2 -12l3-6" fill="none" stroke-linecap="round"/>
    <path d="M-7.5 -1h15" stroke="${B}" stroke-width="3"/>
  </g>
  <rect x="${wx - 2}" y="${wy - 2}" width="${ww + 4}" height="${wh + 4}" rx="${R}" fill="#dfe9f4" stroke="${O}" ${sw}/>
  <g clip-path="url(#${id}w)">${cells}
    <path d="M${wx} ${wy}h70L${wx + 20} ${wy + wh}h-20z" fill="#fff" opacity=".35"/>
    <path d="M${wx + 84} ${wy}h18L${wx + 52} ${wy + wh}h-18z" fill="#fff" opacity=".28"/>
  </g>
  <rect x="${wx - 2}" y="${wy - 2}" width="${ww + 4}" height="${wh + 4}" rx="${R}" fill="none" stroke="${O}" ${sw}/>
  <rect x="${wx + ww + 10}" y="${wy + 14}" width="16" height="44" rx="${R}" fill="#3b4466" stroke="${O}" stroke-width="2.4"/>
  <rect x="${wx + ww + 15.5}" y="${wy + 22}" width="5" height="28" rx="${R}" fill="#1d2440"/>
  <rect x="${wx + ww + 10}" y="${wy + 72}" width="16" height="64" rx="${R}" fill="#3b4466" stroke="${O}" stroke-width="2.4"/>
  <circle cx="${wx + ww + 18}" cy="${wy + 88}" r="3.5" fill="#c7d2de"/><circle cx="${wx + ww + 18}" cy="${wy + 104}" r="3.5" fill="#c7d2de"/><circle cx="${wx + ww + 18}" cy="${wy + 120}" r="4" fill="#ffb92e"/>
  <rect x="${fx + fw - 104}" y="${lowY + 8}" width="46" height="44" rx="${R}" fill="#3b4466" stroke="${O}" ${sw}/>
  <rect x="${fx + fw - 96}" y="${lowY + 16}" width="30" height="10" rx="${R}" fill="#1d2440"/><rect x="${fx + fw - 96}" y="${lowY + 32}" width="30" height="10" rx="${R}" fill="#1d2440"/>
  <rect x="${fx + fw - 48}" y="${lowY + 8}" width="32" height="44" rx="${R}" fill="#3b4466" stroke="${O}" ${sw}/>
  <circle cx="${fx + fw - 32}" cy="${lowY + 26}" r="6.5" fill="#ffb92e" stroke="${O}" stroke-width="2"/>
  <rect x="${fx + 32}" y="${lowY + 64}" width="${fw - 64}" height="40" rx="${R}" fill="#4a5270" stroke="${O}" ${sw}/>
  <rect x="${fx + 40}" y="${lowY + 71}" width="${fw - 80}" height="12" rx="${R}" fill="#6b7393"/>
</svg>`;
}

// ---------- 街並み（設置場所 × 時間帯） ----------
export function timeOfDay(h = new Date().getHours()) {
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 16) return 'day';
  if (h >= 16 && h < 19) return 'evening';
  return 'night';
}

const SKY = {
  dawn: ['#9cc9f2', '#ffe0c8'], day: ['#7ccaff', '#dff3ff'],
  evening: ['#ffa77d', '#ffe3c4'], night: ['#1f2b5c', '#47599a'],
};

// 天気の重ね描き（雨・雪・台風・くもり）
function weatherOverlay(w) {
  if (w === 'rain' || w === 'typhoon') {
    const n = w === 'typhoon' ? 140 : 80;
    const lines = Array.from({ length: n }, (_, i) => { const x = (i * 97) % 920 - 10, y = (i * 53) % 540; return `<path d="M${x} ${y}l-${w === 'typhoon' ? 14 : 6} 22"/>`; }).join('');
    return `<rect width="900" height="560" fill="#5b6b86" opacity="${w === 'typhoon' ? 0.38 : 0.25}"/><g stroke="#e6f0ff" stroke-width="2" opacity=".7" stroke-linecap="round">${lines}</g>`;
  }
  if (w === 'snow') {
    return `<rect width="900" height="560" fill="#dfe7f2" opacity=".25"/><g fill="#fff">${Array.from({ length: 90 }, (_, i) => `<circle cx="${(i * 89) % 900}" cy="${(i * 61) % 540}" r="${2 + (i % 3)}"/>`).join('')}</g>`;
  }
  if (w === 'cloudy') return '<rect width="900" height="560" fill="#8a96ab" opacity=".14"/>';
  if (w === 'hot') return '<rect width="900" height="560" fill="#ffb347" opacity=".1"/>';
  return '';
}

const cloud = (x, y, k, op) => `<g transform="translate(${x} ${y}) scale(${k})" fill="#fff" opacity="${op}">
  <circle cx="0" cy="0" r="22"/><circle cx="26" cy="-10" r="28"/><circle cx="56" cy="0" r="22"/><rect x="0" y="0" width="56" height="22"/></g>`;

function townLayer(loc, P) {
  const win = (x, y, cols, rowsN, ww = 14, hh = 12, g = 8) => {
    let s = '';
    for (let i = 0; i < rowsN; i++) for (let j = 0; j < cols; j++)
      if (!P.night || (i * 5 + j * 3 + x) % 3) s += `<rect x="${x + j * (ww + g)}" y="${y + i * (hh + g)}" width="${ww}" height="${hh}" rx="2" fill="${P.win}"/>`;
    return s;
  };
  const block = (x, y, w, c, rows, cols) => `<rect x="${x}" y="${y}" width="${w}" height="${470 - y}" rx="4" fill="${c}"/>${win(x + 12, y + 14, cols, rows)}`;
  switch (loc) {
    case 'station': return `${block(40, 260, 150, P.b2, 6, 6)}${block(700, 250, 170, P.b2, 6, 7)}
      <rect x="250" y="330" width="400" height="140" rx="6" fill="${P.b1}"/><rect x="230" y="318" width="440" height="18" rx="8" fill="${P.roof}"/>
      <rect x="410" y="270" width="80" height="60" rx="6" fill="${P.b1}"/><circle cx="450" cy="300" r="18" fill="#fff" stroke="${P.roof}" stroke-width="4"/>
      <path d="M450 300v-10M450 300l7 4" stroke="${P.roof}" stroke-width="3" stroke-linecap="round"/>${win(268, 352, 6, 3, 18, 14, 10)}${win(500, 352, 6, 3, 18, 14, 10)}`;
    case 'office': return `${block(20, 150, 130, P.b2, 15, 5)}${block(170, 210, 110, P.b1, 12, 4)}${block(600, 120, 140, P.b2, 16, 5)}${block(760, 220, 120, P.b1, 11, 4)}${block(320, 250, 100, P.b2, 10, 4)}${block(470, 230, 100, P.b1, 11, 4)}`;
    case 'park': return `${block(60, 300, 120, P.b2, 5, 4)}${block(720, 290, 140, P.b2, 5, 5)}
      ${[220, 330, 560, 660].map((x, i) => `<rect x="${x - 7}" y="${360 + (i % 2) * 10}" width="14" height="${110 - (i % 2) * 10}" fill="#9a6b45"/><circle cx="${x}" cy="${340 + (i % 2) * 10}" r="${52 - (i % 2) * 8}" fill="${P.tree2}"/><circle cx="${x - 16}" cy="${326 + (i % 2) * 10}" r="22" fill="${P.tree1}"/>`).join('')}`;
    case 'tourist': return `${block(30, 300, 140, P.b2, 5, 5)}${block(730, 300, 140, P.b2, 5, 5)}
      <rect x="330" y="350" width="240" height="120" fill="${P.night ? '#7a3a3a' : '#e0614f'}"/>
      <path d="M290 356h320l-36-34H326zM336 314h228l-28-30H364zM376 280h148l-20-24H396z" fill="${P.night ? '#2a2f4d' : '#4a4f6a'}"/>
      ${[230, 270, 630, 670].map((x) => `<rect x="${x - 1.5}" y="330" width="3" height="16" fill="#555"/><ellipse cx="${x}" cy="360" rx="14" ry="18" fill="${P.night ? '#ffbf5f' : '#ff8f6b'}"/>`).join('')}`;
    case 'school': return `${block(40, 290, 140, P.b2, 6, 5)}${block(740, 280, 130, P.b2, 6, 5)}
      <rect x="230" y="300" width="440" height="170" rx="6" fill="${P.b1}"/><rect x="410" y="240" width="80" height="64" rx="6" fill="${P.b1}"/>
      <circle cx="450" cy="272" r="20" fill="#fff" stroke="${P.roof}" stroke-width="4"/><path d="M450 272v-11M450 272l8 4" stroke="${P.roof}" stroke-width="3" stroke-linecap="round"/>
      ${win(250, 322, 7, 3, 16, 16, 7)}${win(505, 322, 7, 3, 16, 16, 7)}`;
    default: return [[30, 330, 130], [180, 312, 140], [560, 326, 130], [710, 300, 160]].map(([x, y, w], i) => `
      <rect x="${x}" y="${y}" width="${w}" height="${470 - y}" fill="${i % 2 ? P.b2 : P.b1}"/>
      <path d="M${x - 12} ${y + 4}L${x + w / 2} ${y - 46}L${x + w + 12} ${y + 4}z" fill="${i % 2 ? P.roof : P.roof2}"/>
      ${win(x + 18, y + 22, Math.floor((w - 20) / 34), 3, 22, 18, 12)}`).join('') + `${[360, 470].map((x) => `<rect x="${x}" y="380" width="70" height="90" fill="${P.b2}"/>`).join('')}`;
  }
}

/** 背景の街並み。viewBox 900x560、地面は y=470 */
export function sceneSVG(locationId, tod = timeOfDay(), weather = 'sunny') {
  const id = nid();
  const night = tod === 'night';
  const P = night
    ? { night, far: '#33437a', b1: '#3d4f8a', b2: '#34457d', win: '#ffd76a', roof: '#26325e', roof2: '#5a3a5e', tree1: '#2f6b55', tree2: '#25574a', fence: '#8090c0', ground: '#4a5276', curb: '#5d668c' }
    : { night, far: '#cfe6f8', b1: '#e9f4fd', b2: '#bcdcf5', win: '#8ec3ec', roof: '#6f86b3', roof2: '#e07a68', tree1: '#8fd36e', tree2: '#62bd5a', fence: '#ffffff', ground: '#efe7da', curb: '#ddd3c4' };
  const [top, bottom] = SKY[tod];
  const stars = night ? Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 223) % 900}" cy="${(i * 71) % 220}" r="${i % 4 ? 1 : 1.8}" fill="#fff" opacity=".8"/>`).join('') : '';
  const orb = night ? `<circle cx="760" cy="80" r="26" fill="#fff6d6"/><circle cx="772" cy="72" r="23" fill="${top}"/>`
    : `<circle cx="760" cy="${tod === 'day' ? 80 : 190}" r="34" fill="${tod === 'day' ? '#fff5c2' : '#ffd29a'}"/>`;
  const trees = Array.from({ length: 13 }, (_, i) => {
    const x = i * 72 + 10, r = 30 + (i % 3) * 6;
    return `<circle cx="${x}" cy="${430 - (i % 2) * 8}" r="${r}" fill="${P.tree2}"/><circle cx="${x - 12}" cy="${420 - (i % 2) * 8}" r="${r * 0.55}" fill="${P.tree1}"/>`;
  }).join('');
  const fence = `<rect x="0" y="434" width="900" height="5" rx="2" fill="${P.fence}" opacity=".9"/><rect x="0" y="452" width="900" height="4" rx="2" fill="${P.fence}" opacity=".9"/>
    ${Array.from({ length: 46 }, (_, i) => `<rect x="${i * 20}" y="430" width="4" height="40" rx="2" fill="${P.fence}" opacity=".9"/>`).join('')}`;
  return `<svg class="scene-bg" viewBox="0 0 900 560" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".3" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
    <rect width="900" height="560" fill="url(#${id})"/>${stars}${orb}
    ${night ? '' : cloud(120, 110, 1, 0.95) + cloud(520, 70, 0.8, 0.9) + cloud(640, 200, 0.6, 0.8)}
    ${[[0, 260, 90], [100, 220, 70], [190, 280, 80], [300, 240, 60], [580, 230, 80], [680, 270, 70], [770, 210, 90]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${470 - y}" fill="${P.far}"/>`).join('')}
    ${townLayer(locationId, P)}
    ${trees}${fence}
    <rect y="468" width="900" height="92" fill="${P.ground}"/><rect y="468" width="900" height="6" fill="${P.curb}"/>
    ${Array.from({ length: 19 }, (_, i) => `<rect x="${i * 50}" y="474" width="2" height="86" fill="#000" opacity=".05"/>`).join('')}
    <rect y="515" width="900" height="2" fill="#000" opacity=".05"/>
    ${weatherOverlay(weather)}
  </svg>`;
}
