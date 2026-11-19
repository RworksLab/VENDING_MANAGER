// 線画アイコン（24x24, stroke=currentColor）
const P = {
  home: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  machine: 'M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM8 5h8v9H8zM8 17.5h5M15.5 17.5h.5',
  bottle: 'M10 2h4M10.5 2v3L8 8.5V21a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8.5L13.5 5V2M8 12h8v5H8',
  warehouse: 'M3 21V9l9-6 9 6v12M7 21v-8h10v8M7 17h10',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  bell: 'M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  refresh: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  chart: 'M4 20V11M10 20V5M16 20v-6M2 20h20',
  shop: 'M3 9l2-5h14l2 5M4 9v11h16V9M3 9h18M9 20v-6h6v6',
  gear: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  plus: 'M12 5v14M5 12h14',
  refill: 'M12 3v10M8 9l4 4 4-4M4 15v5h16v-5',
  swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  tag: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  pin: 'M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12zM12 10h.01',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  back: 'M15 5l-7 7 7 7',
  yen: 'M6 4l6 8 6-8M12 12v8M7 13h10M7 17h10',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9h.01',
  cloud: 'M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z',
  phone: 'M7 2h10v20H7zM11 18h2',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z',
  drop: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
  palette: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-1.4-1.2-1.6-1.2-2.8 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8zM7.5 11h.01M10 7h.01M15 7h.01',
  flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9',
  check: 'M5 12l5 5L20 7',
  alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v2M12 21v2M1 12h2M21 12h2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  backup: 'M12 3v12M7 10l5 5 5-5M4 17v3h16v-3',
  restore: 'M12 15V3M7 8l5-5 5 5M4 17v3h16v-3',
  cart: 'M3 4h3l2.4 11h11l2.6-8H7.5M9.5 20.5h.01M18 20.5h.01',
};

export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${P[name] || ''}"/></svg>`;

// 金色のコイン（所持金表示用）
export const coin = (cls = '') =>
  `<svg class="coin ${cls}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#e0a300"/><circle cx="12" cy="11" r="10" fill="#ffd23f"/><circle cx="12" cy="11" r="7.2" fill="none" stroke="#e0a300" stroke-width="1.4"/><path d="M8.6 6.8 12 11l3.4-4.2M12 11v5M9.4 11.6h5.2M9.4 14h5.2" stroke="#b07a00" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;

// ---------- イラスト調のカラーアイコン（32x32） ----------
const O = '#2b3a67';
const ILL = {
  bars: `<rect x="5" y="17" width="6" height="10" rx="1.5" fill="#4cc96a"/><rect x="13" y="11" width="6" height="16" rx="1.5" fill="#4cc96a"/><rect x="21" y="5" width="6" height="22" rx="1.5" fill="#2fae55"/>`,
  barsBlue: `<rect x="5" y="17" width="6" height="10" rx="1.5" fill="#3d8ef5"/><rect x="13" y="11" width="6" height="16" rx="1.5" fill="#3d8ef5"/><rect x="21" y="5" width="6" height="22" rx="1.5" fill="#2a6fd0"/>`,
  box: `<path d="M4 10 16 5l12 5v14l-12 5-12-5z" fill="#e3ac6c" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 10l12 5 12-5M16 15v14" stroke="${O}" stroke-width="1.8" fill="none" stroke-linejoin="round"/><path d="M10 7.5l12 5v4" stroke="#c88a45" stroke-width="2.4" fill="none"/>`,
  shop: `<rect x="5" y="14" width="22" height="14" rx="2" fill="#eaf3ff" stroke="${O}" stroke-width="1.8"/><path d="M4 8h24l-1 6H5z" fill="#fff" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 8l-1 6M14 8v6M20 8l1 6" stroke="#ef5350" stroke-width="3.4"/><path d="M4 8h24l-1 6H5z" fill="none" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/><rect x="9" y="18" width="7" height="10" fill="#3d8ef5" stroke="${O}" stroke-width="1.6"/><rect x="19" y="18" width="5" height="5" fill="#9fd0ff" stroke="${O}" stroke-width="1.4"/>`,
  people: `<circle cx="11" cy="11" r="4.5" fill="#3d8ef5"/><path d="M3 26a8 8 0 0 1 16 0z" fill="#3d8ef5"/><circle cx="22" cy="12" r="3.8" fill="#6aa9f7"/><path d="M16 26a7 7 0 0 1 13 0z" fill="#6aa9f7"/>`,
  star: `<path d="M16 3l3.9 8 8.6 1.2-6.3 6 1.6 8.5L16 22.6l-7.8 4.1 1.6-8.5-6.3-6 8.6-1.2z" fill="#ffc531" stroke="#e8a200" stroke-width="1.4" stroke-linejoin="round"/>`,
  pin: `<path d="M16 29s9-8.6 9-15a9 9 0 0 0-18 0c0 6.4 9 15 9 15z" fill="#f2584a"/><circle cx="16" cy="13.5" r="3.6" fill="#fff"/>`,
  gear: `<path d="M16 4l2.2 2.8 3.5-.8.8 3.5L25.3 11 24 14.3l2 3-2.9 2.1.3 3.6-3.6.3-2.1 2.9-3-2-3.3 1.3-1.5-3.3-3.5-.8.8-3.5L4 13l2.8-2.2-.8-3.5 3.5-.8L11 3.4l3.3 1.3z" fill="#3b4f86"/><circle cx="16" cy="15" r="4.2" fill="#fff"/>`,
  bell: `<path d="M9 21v-6.5a7 7 0 0 1 14 0V21l2.5 3h-19z" fill="#ffc531" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.5 26.5a2.6 2.6 0 0 0 5 0" stroke="${O}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  // タブ用（紺の塗り＋差し色）
  home: `<path d="M4 15 16 5l12 10" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 14v13h7v-7h4v7h7V14l-9-7.5z" fill="${O}"/>`,
  machine: `<rect x="7" y="3" width="18" height="26" rx="3" fill="${O}"/><rect x="10" y="6" width="12" height="10" rx="1.5" fill="#9fd0ff"/><rect x="10" y="19" width="7" height="2.5" rx="1" fill="#fff"/><rect x="19" y="18.5" width="3" height="3.5" rx="1" fill="#ffc531"/><rect x="10" y="24" width="12" height="2.5" rx="1" fill="#4a5c95"/>`,
  cup: `<path d="M9 10h14l-2 18H11z" fill="${O}"/><rect x="7" y="7" width="18" height="4" rx="1.5" fill="${O}"/><path d="M17 7l2.5-4.5" stroke="${O}" stroke-width="2.4" stroke-linecap="round"/><path d="M10.5 15.5h11" stroke="#ffc531" stroke-width="3"/>`,
  warehouse: `<path d="M3 14 16 5l13 9v14H3z" fill="${O}"/><rect x="9" y="17" width="14" height="11" fill="#fff"/><rect x="12" y="20" width="8" height="5" rx="1" fill="#e3ac6c"/>`,
  cart: `<path d="M3 5h4l3.2 14h14l3-10H9" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 9h18l-3 10H11z" fill="${O}"/><circle cx="12" cy="25" r="2.6" fill="${O}"/><circle cx="23" cy="25" r="2.6" fill="${O}"/>`,
  chart: `<rect x="5" y="17" width="6" height="11" rx="1.5" fill="${O}"/><rect x="13" y="11" width="6" height="17" rx="1.5" fill="${O}"/><rect x="21" y="5" width="6" height="23" rx="1.5" fill="${O}"/>`,
  calendar: `<rect x="4" y="6" width="24" height="22" rx="3" fill="${O}"/><rect x="7" y="13" width="18" height="12" rx="1.5" fill="#fff"/>${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${8.5 + c * 4.3}" y="${14.5 + r * 3.6}" width="2.6" height="2.3" fill="${O}"/>`).join('')).join('')}<rect x="9" y="3" width="3" height="6" rx="1.5" fill="${O}"/><rect x="20" y="3" width="3" height="6" rx="1.5" fill="${O}"/>`,
};
export const ill = (name, cls = '') => `<svg class="ill ${cls}" viewBox="0 0 32 32" aria-hidden="true">${ILL[name] || ''}</svg>`;
ILL.map = `<path d="M3 7l8-3 10 3 8-3v21l-8 3-10-3-8 3z" fill="#bfe3a8" stroke="#2b3a67" stroke-width="1.8" stroke-linejoin="round"/><path d="M11 4v21M21 7v21" stroke="#2b3a67" stroke-width="1.8"/><path d="M15 10c0 3 3 6 3 6s3-3 3-6a3 3 0 0 0-6 0z" fill="#f2584a"/>`;
ILL.bottle = `<path d="M13 3h6v4l3 4v16a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V11l3-4z" fill="#6db0ff" stroke="#2b3a67" stroke-width="1.8" stroke-linejoin="round"/><rect x="10" y="14" width="12" height="8" fill="#fff"/><rect x="12.5" y="1.5" width="7" height="3.5" rx="1" fill="#2b3a67"/>`;
ILL.power = `<circle cx="16" cy="16" r="12" fill="#4cc96a"/><path d="M16 9v7M11.5 11.5a6.4 6.4 0 1 0 9 0" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;

// ---------- 天気アイコン（32x32） ----------
const SUN = (cx = 16, cy = 16, r = 6.5) => `<g stroke="#f5a623" stroke-width="2.4" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M${cx} ${cy - r - 3}v-3" transform="rotate(${a} ${cx} ${cy})"/>`).join('')}</g><circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffc531" stroke="#f5a623" stroke-width="1.5"/>`;
const CLOUD = (fill = '#ffffff') => `<path d="M8 25a5.5 5.5 0 0 1 .6-11 7.5 7.5 0 0 1 14.6 1.6A4.8 4.8 0 0 1 24 25z" fill="${fill}" stroke="#2b3a67" stroke-width="1.8" stroke-linejoin="round"/>`;
const WX = {
  clear: `${SUN(16, 16, 7.5)}<path d="M27 5l.8 1.8L29.6 7.6l-1.8.8L27 10.2l-.8-1.8-1.8-.8 1.8-.8z" fill="#ffc531"/>`,
  sunny: SUN(),
  cloudy: `<g transform="translate(-4 -3) scale(.75)">${SUN()}</g>${CLOUD()}`,
  rain: `${CLOUD('#dfe7f2')}<path d="M10 27l-1.5 3M16 27l-1.5 3M22 27l-1.5 3" stroke="#3d8ef5" stroke-width="2.2" stroke-linecap="round"/>`,
  snow: `${CLOUD('#eef3f9')}<g fill="#7fb2e8"><circle cx="10" cy="28.5" r="1.6"/><circle cx="16" cy="29.5" r="1.6"/><circle cx="22" cy="28.5" r="1.6"/></g>`,
  hot: `${SUN(13, 15, 6.5)}<rect x="23" y="6" width="5" height="16" rx="2.5" fill="#fff" stroke="#2b3a67" stroke-width="1.6"/><circle cx="25.5" cy="24" r="4" fill="#f05a4f" stroke="#2b3a67" stroke-width="1.6"/><rect x="24.5" y="11" width="2" height="11" fill="#f05a4f"/>`,
  freeze: `<g stroke="#3d8ef5" stroke-width="2.4" stroke-linecap="round">${[0, 60, 120].map((a) => `<path d="M16 4v24M12 7l4 4 4-4M12 25l4-4 4 4" transform="rotate(${a} 16 16)"/>`).join('')}</g>`,
  typhoon: `<path d="M16 16m-2 0a2 2 0 1 0 4 0 6 6 0 0 0-10-4M16 16m2 0a8 8 0 0 1-14 4M16 16a10 10 0 0 1 12-6M16 16a8 8 0 0 1 2 12" stroke="#6b7aa6" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
};
export const weatherIcon = (id, cls = '') => `<svg class="wx ${cls}" viewBox="0 0 32 32" aria-hidden="true">${WX[id] || WX.sunny}</svg>`;
