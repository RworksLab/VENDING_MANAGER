// =============================================================
// イベント・天候（仕様書 11章）
// 日付とセーブごとの seed から決まるので、同じ日は何度開いても同じ内容になり、
// 先の予定もカレンダーに出せる（予告の日数は各イベントの announce）。
// =============================================================
import {
  WEATHER, WEATHER_BY_MONTH, ANNUAL_EVENTS, RANDOM_EVENTS, EVENT_CHANCE, GENRES, LOCATIONS, findLocation, findGenre,
} from './config.js';
import { dateKey } from './util.js';

// ---------- 再現できる乱数 ----------
function rng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pickWeighted = (r, entries) => {
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [k, w] of entries) { if ((x -= w) < 0) return k; }
  return entries[entries.length - 1][0];
};

const toDate = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (key, n) => dateKey(toDate(key).getTime() + n * 864e5);
const mmdd = (key) => key.slice(5);
const inRange = (md, from, to) => (from <= to ? md >= from && md <= to : md >= from || md <= to);
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 864e5);

// ---------- 1日分を作る ----------
function weatherOf(seed, key) {
  const r = rng(`${seed}|w|${key}`);
  const id = pickWeighted(r, Object.entries(WEATHER_BY_MONTH[toDate(key).getMonth()]));
  return { id, ...WEATHER[id] };
}

// その日に始まるランダムイベント
function startsOn(seed, key) {
  const r = rng(`${seed}|e|${key}`);
  const out = [];
  const pool = RANDOM_EVENTS.map((e) => [e.id, e.weight]);
  if (r() < EVENT_CHANCE.first) out.push(pickWeighted(r, pool));
  if (r() < EVENT_CHANCE.second) {
    const id = pickWeighted(r, pool.filter(([k]) => !out.includes(k)));
    out.push(id);
  }
  return out.map((id) => {
    const def = RANDOM_EVENTS.find((e) => e.id === id);
    const fx = JSON.parse(JSON.stringify(def.effects));
    let target = '';
    if (fx.pick === 'genre') { const g = GENRES[Math.floor(r() * GENRES.length)]; fx.genre = { [g.id]: fx.value }; target = g.name; }
    if (fx.pick === 'location') { const l = LOCATIONS[Math.floor(r() * LOCATIONS.length)]; fx.sales = { [l.id]: fx.value }; target = l.name; }
    delete fx.pick; delete fx.value;
    return { ...def, effects: fx, target, start: key, end: addDays(key, def.days - 1) };
  });
}

const MAX_DAYS = Math.max(...RANDOM_EVENTS.map((e) => e.days));
const cache = new Map();

/** その日の天候とイベント（予告の有無に関係なくすべて） */
export function dayInfo(seed, key) {
  const ck = `${seed}|${key}`;
  if (cache.has(ck)) return cache.get(ck);
  const md = mmdd(key);
  const annual = ANNUAL_EVENTS.filter((e) => inRange(md, e.from, e.to)).map((e) => {
    // 期間の初日を求める（予告の判定用）
    let start = key;
    for (let i = 1; i < 40 && inRange(mmdd(addDays(key, -i)), e.from, e.to); i++) start = addDays(key, -i);
    let end = key;
    for (let i = 1; i < 40 && inRange(mmdd(addDays(key, i)), e.from, e.to); i++) end = addDays(key, i);
    return { ...e, start, end, annual: true };
  });
  const random = [];
  for (let k = 0; k < MAX_DAYS; k++) {
    for (const ev of startsOn(seed, addDays(key, -k))) if (ev.days > k) random.push(ev);
  }
  const info = { date: key, weather: weatherOf(seed, key), events: [...annual, ...random] };
  cache.set(ck, info);
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return info;
}

/** today から見て予告済み（または開催中）のイベントだけ */
export function visibleEvents(info, today) {
  return info.events.filter((e) => e.start <= today || daysBetween(today, e.start) <= e.announce);
}

// ---------- 効果をまとめる ----------
const mul = (maps, key) => maps.reduce((a, m) => a * (m?.all ?? 1) * (key ? m?.[key] ?? 1 : 1), 1);

/** その時刻に効く倍率をまとめた関数群 */
export function factorsAt(s, at = Date.now()) {
  const info = dayInfo(s.events?.seed ?? 0, dateKey(at));
  const all = [info.weather.effects, ...info.events.map((e) => e.effects)];
  const pick = (k) => all.map((e) => e[k]).filter(Boolean);
  const num = (k) => all.reduce((a, e) => a * (e[k] ?? 1), 1);
  const plain = (maps, key) => maps.reduce((a, m) => a * (m[key] ?? 1), 1);
  return {
    info,
    traffic: (loc) => mul(pick('traffic'), loc),
    evening: (loc) => mul(pick('evening'), loc),
    sales: (loc) => plain(pick('sales'), loc),
    genre: (g) => plain(pick('genre'), g),
    temp: (t) => plain(pick('temp'), t),
    ecash: num('ecash'),
    elec: num('elec'),
    cost: num('cost'),
  };
}

/** 仕入れ単価の倍率（仕入れ応援セール） */
export const costRate = (s, at = Date.now()) => factorsAt(s, at).cost;
export const salePrice = (s, unitCost, at = Date.now()) => Math.round(unitCost * costRate(s, at));

// ---------- 表示用 ----------
const x = (v) => `×${Math.round(v * 100) / 100}`;
const locName = (id) => (id === 'all' ? '全エリア' : findLocation(id).name);

/** 効果を読める文に */
export function describe(fx) {
  const out = [];
  Object.entries(fx.traffic || {}).forEach(([k, v]) => v !== 1 && out.push({ up: v > 1, text: `${locName(k)}の人通り ${x(v)}` }));
  Object.entries(fx.evening || {}).forEach(([k, v]) => out.push({ up: v > 1, text: `18〜22時 ${locName(k)} ${x(v)}` }));
  Object.entries(fx.genre || {}).forEach(([k, v]) => out.push({ up: v > 1, text: `${findGenre(k).name}の需要 ${x(v)}` }));
  Object.entries(fx.temp || {}).forEach(([k, v]) => out.push({ up: v > 1, text: `${k === 'hot' ? 'HOT' : 'COLD'}の需要 ${x(v)}` }));
  Object.entries(fx.sales || {}).forEach(([k, v]) => out.push({ up: v > 1, text: `${locName(k)}の売上 ${x(v)}` }));
  if (fx.ecash) out.push({ up: true, text: `電子マネー対応機の売れ行き ${x(fx.ecash)}` });
  if (fx.elec) out.push({ up: true, text: `電気代 ${Math.round((1 - fx.elec) * 100)}%オフ` });
  if (fx.cost) out.push({ up: true, text: `仕入れ単価 ${Math.round((1 - fx.cost) * 100)}%オフ` });
  return out;
}

/** その場所に効く今日の要素（自販機詳細の表示用） */
export function effectsForLocation(s, locId, at = Date.now()) {
  const f = factorsAt(s, at);
  const today = dateKey(at);
  const evs = visibleEvents(f.info, today).filter((e) => {
    const fx = e.effects;
    return fx.traffic?.[locId] || fx.traffic?.all || fx.evening?.[locId] || fx.evening?.all || fx.sales?.[locId] || fx.genre || fx.temp || fx.ecash || fx.elec || fx.cost;
  });
  return { weather: f.info.weather, events: evs, traffic: f.traffic(locId) * f.sales(locId) };
}
