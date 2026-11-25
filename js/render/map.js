// =============================================================
// 街マップ（ホーム）：6つの設置エリアと、配置中の自販機の稼働状況
// 地図は SVG、自販機のピンは HTML（タップ・アニメーション用）で重ねる
// =============================================================
import { LOCATIONS } from '../config.js';
import { machineSummary } from '../state.js';
import { isDown } from '../sim.js';
import { OUTLINE as O } from './art.js';
import { esc, num } from '../util.js';

export const MAP_W = 400, MAP_H = 330;
const PIN_OFFSETS = [[0, 0], [32, 6], [-32, 6], [16, -30], [-16, -30]];

// エリアの区画（x, y, w, h）と、ピンを置く基準点
const AREA = {
  park:        { r: [8, 8, 120, 140],    pin: [68, 70] },
  office:      { r: [140, 8, 120, 140],  pin: [200, 92] },
  tourist:     { r: [272, 8, 120, 140],  pin: [332, 96] },
  residential: { r: [8, 182, 120, 140],  pin: [68, 262] },
  station:     { r: [140, 182, 120, 140], pin: [200, 266] },
  school:      { r: [272, 182, 120, 140], pin: [332, 248] },
};

// ---------- 区画ごとのイラスト（真上から見た街） ----------
function areaArt(id, [x, y, w, h]) {
  const tree = (cx, cy, r = 9) => `<circle cx="${cx}" cy="${cy + 2}" r="${r}" fill="#3f9a4c" opacity=".35"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#5fbf5a"/><circle cx="${cx - r * 0.3}" cy="${cy - r * 0.3}" r="${r * 0.45}" fill="#86d877"/>`;
  const house = (hx, hy, c) => `<rect x="${hx}" y="${hy + 2}" width="22" height="18" rx="2" fill="#000" opacity=".12"/><rect x="${hx}" y="${hy}" width="22" height="18" rx="2" fill="${c}" stroke="${O}" stroke-width="1.4"/><path d="M${hx} ${hy + 9}h22" stroke="${O}" stroke-width="1.2" opacity=".6"/>`;
  const tower = (tx, ty, tw, th, c) => `<rect x="${tx + 3}" y="${ty + 3}" width="${tw}" height="${th}" rx="2" fill="#000" opacity=".15"/><rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="2" fill="${c}" stroke="${O}" stroke-width="1.4"/>${Array.from({ length: Math.floor(th / 8) - 1 }, (_, i) => `<path d="M${tx + 4} ${ty + 8 + i * 8}h${tw - 8}" stroke="#fff" stroke-width="1.6" opacity=".7"/>`).join('')}`;
  switch (id) {
    case 'park': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#b5e69a"/>
      <path d="M${x} ${y + 100}C${x + 40} ${y + 80} ${x + 70} ${y + 120} ${x + w} ${y + 96}" stroke="#f2e2b8" stroke-width="7" fill="none"/>
      <ellipse cx="${x + 78}" cy="${y + 42}" rx="28" ry="17" fill="#7cc8f2" stroke="${O}" stroke-width="1.4"/><ellipse cx="${x + 72}" cy="${y + 38}" rx="8" ry="3" fill="#fff" opacity=".6"/>
      ${tree(x + 22, y + 26)}${tree(x + 30, y + 58, 11)}${tree(x + 104, y + 118)}${tree(x + 20, y + 124, 8)}${tree(x + 108, y + 76, 8)}`;
    case 'office': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#d6e2f0"/>
      ${tower(x + 10, y + 12, 34, 52, '#7fb2e8')}${tower(x + 54, y + 10, 26, 40, '#a8c6e8')}${tower(x + 88, y + 16, 24, 58, '#5d97da')}
      ${tower(x + 12, y + 80, 28, 36, '#a8c6e8')}${tower(x + 86, y + 90, 26, 40, '#7fb2e8')}${tree(x + 62, y + 124, 7)}`;
    case 'tourist': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f1e3c6"/>
      <rect x="${x + 56}" y="${y + 88}" width="10" height="${h - 88}" fill="#e3cfa5"/>
      <rect x="${x + 28}" y="${y + 18}" width="66" height="56" rx="3" fill="#d0533f" stroke="${O}" stroke-width="1.4"/>
      <rect x="${x + 38}" y="${y + 28}" width="46" height="36" rx="2" fill="#4a4f6a"/><path d="M${x + 38} ${y + 46}h46" stroke="#fff" stroke-width="1.4" opacity=".5"/>
      <path d="M${x + 44} ${y + 96}h34M${x + 47} ${y + 102}h28M${x + 50} ${y + 96}v14M${x + 72} ${y + 96}v14" stroke="#e0533f" stroke-width="3.4" stroke-linecap="round"/>
      ${tree(x + 14, y + 20, 8)}${tree(x + 108, y + 24, 8)}${tree(x + 14, y + 120, 9)}${tree(x + 104, y + 118, 9)}`;
    case 'residential': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e4f1d2"/>
      ${house(x + 10, y + 12, '#f08a7a')}${house(x + 40, y + 10, '#8fbcef')}${house(x + 76, y + 14, '#ffd27a')}
      ${house(x + 12, y + 50, '#8fbcef')}${house(x + 84, y + 48, '#f08a7a')}
      ${house(x + 10, y + 100, '#ffd27a')}${house(x + 44, y + 108, '#f08a7a')}${house(x + 88, y + 104, '#8fbcef')}
      ${tree(x + 60, y + 54, 7)}`;
    case 'station': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#dcdfe6"/>
      <rect x="${x + 10}" y="${y + 8}" width="${w - 20}" height="30" rx="4" fill="#9fb4d6" stroke="${O}" stroke-width="1.4"/>
      <path d="M${x + 10} ${y + 23}h${w - 20}" stroke="#fff" stroke-width="1.6" opacity=".6"/>
      <circle cx="${x + w / 2}" cy="${y + 23}" r="6" fill="#fff" stroke="${O}" stroke-width="1.2"/>
      <rect x="${x + 12}" y="${y + 104}" width="40" height="26" rx="3" fill="#f2c46b" stroke="${O}" stroke-width="1.2"/><rect x="${x + 70}" y="${y + 100}" width="38" height="30" rx="3" fill="#8fbcef" stroke="${O}" stroke-width="1.2"/>
      ${tree(x + 60, y + 118, 6)}`;
    case 'school': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e8ecd8"/>
      <path d="M${x + 10} ${y + 12}h70v22h-48v40h-22z" fill="#f6efe0" stroke="${O}" stroke-width="1.4"/>
      <circle cx="${x + 56}" cy="${y + 23}" r="5" fill="#fff" stroke="${O}" stroke-width="1.2"/>
      <rect x="${x + 40}" y="${y + 82}" width="70" height="46" rx="23" fill="#d99a63" stroke="${O}" stroke-width="1.4"/>
      <rect x="${x + 50}" y="${y + 92}" width="50" height="26" rx="13" fill="#9fd67f"/>
      ${tree(x + 98, y + 22, 8)}${tree(x + 98, y + 54, 8)}`;
    default: return '';
  }
}

export function machineStatus(m) {
  const x = machineSummary(m);
  // 停止中（グレー）：トラブル中・営業開始前・商品がない／在庫0。トラブルはピンに「！」を付けて見分ける
  if (isDown(m)) return { key: 'idle', label: m.downReason || 'トラブル', down: true };
  if (m.open === false) return { key: 'idle', label: '営業前' };
  if (!x.filled || x.stock === 0) return { key: 'idle', label: '停止中' };
  if (x.soldOut) return { key: 'warn', label: '売切あり' };
  if (x.low) return { key: 'low', label: '残りわずか' };
  return { key: 'ok', label: '稼働中' };
}

export const miniMachine = (color) => `<svg viewBox="0 0 24 32" aria-hidden="true">
  <rect x="2" y="1.5" width="20" height="28" rx="3" fill="#f6fbff" stroke="${O}" stroke-width="2"/>
  <rect x="4.5" y="4" width="15" height="4" rx="1" fill="${color}"/>
  <rect x="4.5" y="10" width="15" height="9" rx="1" fill="#bfd6ee" stroke="${O}" stroke-width="1"/>
  <rect x="6" y="23" width="12" height="3.5" rx="1" fill="#4a5270"/></svg>`;

export function townMap(s) {
  const unlocked = new Set(s.unlockedLocations);
  const areas = LOCATIONS.map((loc) => {
    const a = AREA[loc.id];
    const [x, y, w, h] = a.r;
    const open = unlocked.has(loc.id);
    return `<g>
      <clipPath id="map-${loc.id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/></clipPath>
      <g clip-path="url(#map-${loc.id})">${areaArt(loc.id, a.r)}
        ${open ? '' : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2b3a67" opacity=".5"/>`}</g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="none" stroke="${O}" stroke-width="2.4"/>
      ${open ? '' : `<circle cx="${x + w / 2}" cy="${y + h / 2 - 8}" r="15" fill="#fff" stroke="${O}" stroke-width="2"/>
        <path d="M${x + w / 2 - 6} ${y + h / 2 - 9}h12v9h-12zM${x + w / 2 - 4} ${y + h / 2 - 9}v-3a4 4 0 0 1 8 0v3" fill="none" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
        <text x="${x + w / 2}" y="${y + h / 2 + 22}" text-anchor="middle" font-size="11" font-weight="900" fill="#fff">¥${num(loc.unlockCost)}</text>`}
    </g>`;
  }).join('');

  const roads = `<rect x="0" y="148" width="${MAP_W}" height="34" fill="#c3cad6"/>
    <path d="M0 158h${MAP_W}M0 172h${MAP_W}" stroke="#8a93a6" stroke-width="2"/>
    ${Array.from({ length: 34 }, (_, i) => `<rect x="${i * 12}" y="155" width="3" height="20" fill="#8a93a6"/>`).join('')}
    <rect x="128" y="0" width="12" height="${MAP_H}" fill="#eef1f6"/><rect x="260" y="0" width="12" height="${MAP_H}" fill="#eef1f6"/>
    <path d="M134 0v${MAP_H}M266 0v${MAP_H}" stroke="#fff" stroke-width="1.6" stroke-dasharray="6 6"/>`;

  // 同じエリアに複数台あるときは横にずらす
  const perArea = {};
  const pins = s.machines.map((m) => {
    const a = AREA[m.locationId] || AREA.residential;
    const i = (perArea[m.locationId] = (perArea[m.locationId] ?? -1) + 1);
    const [dx, dy] = PIN_OFFSETS[i % PIN_OFFSETS.length];
    const px = a.pin[0] + dx, py = a.pin[1] + dy;
    const st = machineStatus(m);
    const today = s.today.byMachine[m.id]?.sales || 0;
    return `<a class="pin st-${st.key} ${st.down ? 'is-down' : ''}" href="#machine-${m.id}" style="left:${(px / MAP_W) * 100}%;top:${(py / MAP_H) * 100}%" aria-label="${esc(m.name)}：${st.label}">
      <span class="pin-pulse"></span>
      <span class="pin-body">${miniMachine(m.color || '#4aa8f0')}<i>${st.down ? '!' : ''}</i></span>
      <span class="pin-label">${esc(m.name)}<b>¥${num(today)}</b></span>
    </a>`;
  }).join('');

  const labels = LOCATIONS.map((loc) => {
    const [x, y, , h] = AREA[loc.id].r;
    return `<span class="area-label ${unlocked.has(loc.id) ? '' : 'locked'}" style="left:${((x + 6) / MAP_W) * 100}%;top:${((y + h - 6) / MAP_H) * 100}%">${esc(loc.name)}</span>`;
  }).join('');

  return `<div class="map">
    <svg viewBox="0 0 ${MAP_W} ${MAP_H}" aria-hidden="true"><rect width="${MAP_W}" height="${MAP_H}" rx="16" fill="#eef1f6"/>${roads}${areas}</svg>
    ${labels}${pins}
  </div>`;
}
