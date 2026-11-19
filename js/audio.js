// =============================================================
// サウンド：BGM と効果音（音声ファイルは使わず Web Audio で合成）
//  - BGM：穏やかなお店経営のイメージ。エレピの和音・ベース・木琴風のメロディ・小さなシェイカー
//    8小節 × 4 の 32 小節で 1 周。メロディは毎周同じ（種から決まる）
//  - 効果音：タップ・コイン・仕入れ・補充・成功・エラーなど
//  - 設定（オン/オフ・音量）は端末ごとに localStorage へ保存（セーブデータには入れない）
//  - ブラウザの決まりで、最初に画面をタップするまで音は出せない
// =============================================================

const KEY = 'vending-sim-audio';
const DEFAULTS = { bgm: true, se: true, bgmVol: 0.5, seVol: 0.7 };

let prefs = { ...DEFAULTS };
try { prefs = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* 保存できない環境 */ }

export const getAudioPrefs = () => ({ ...prefs });
export function setAudioPrefs(patch) {
  prefs = { ...prefs, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* 無視 */ }
  applyVolumes();
  if (ctx) prefs.bgm ? startBgm() : stopBgm();
}

// ---------- 音の土台 ----------
let ctx = null, master, bgmBus, seBus, verb, verbSend;

function init() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createDynamicsCompressor();
  master.threshold.value = -14; master.ratio.value = 3;
  master.connect(ctx.destination);
  bgmBus = ctx.createGain(); bgmBus.connect(master);
  seBus = ctx.createGain(); seBus.connect(master);
  // 部屋の響き（短めのリバーブ）
  verb = ctx.createConvolver();
  verb.buffer = impulse(1.8);
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.32;
  verb.connect(verbOut); verbOut.connect(bgmBus);
  verbSend = verb;
  applyVolumes();
  return ctx;
}

function impulse(sec) {
  const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

let noiseBuf = null;
function noise() {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  bgmBus.gain.setTargetAtTime(prefs.bgm ? prefs.bgmVol * 1.4 : 0, t, 0.3);
  seBus.gain.setTargetAtTime(prefs.se ? prefs.seVol * 2.5 : 0, t, 0.02);
}

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/** 減衰する1音。type：波形、partials：倍音 [倍率, 音量]、dest：出力先 */
function tone(dest, { at, midi, f, dur = 0.5, vol = 0.2, type = 'sine', attack = 0.005, partials = null, lp = 0, glide = 0, send = 0 }) {
  const freq = f || hz(midi);
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, at);
  out.gain.linearRampToValueAtTime(vol, at + attack);
  out.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  let node = out;
  if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; out.connect(fl); node = fl; }
  node.connect(dest);
  if (send) { const s = ctx.createGain(); s.gain.value = send; node.connect(s); s.connect(verbSend); }
  for (const [mul, g] of partials || [[1, 1]]) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq * mul, at);
    if (glide) o.frequency.exponentialRampToValueAtTime(freq * mul * glide, at + dur);
    og.gain.value = g;
    o.connect(og); og.connect(out);
    o.start(at); o.stop(at + dur + 0.05);
  }
}

function hiss(dest, { at, dur = 0.05, vol = 0.05, hp = 6000, lp = 0, send = 0 }) {
  const src = ctx.createBufferSource(); src.buffer = noise();
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f);
  let n = f;
  if (lp) { const l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp; f.connect(l); n = l; }
  n.connect(g); g.connect(dest);
  if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(verbSend); }
  src.start(at, Math.random() * 0.5); src.stop(at + dur + 0.02);
}

// ---------- BGM ----------
const BPM = 86, BEAT = 60 / BPM, SWING = 0.58;   // 8分音符を少し跳ねさせる
// コード：[ルート(MIDI), 構成音]  F メジャー。穏やかな循環
const PROG = [
  [41, [57, 60, 64, 69]],   // Fmaj7
  [40, [55, 59, 62, 67]],   // Em7
  [38, [57, 60, 62, 65]],   // Dm7
  [36, [55, 59, 62, 64]],   // Cmaj7(9)
  [46, [57, 62, 65, 69]],   // B♭maj7
  [45, [55, 60, 64, 67]],   // Am7
  [43, [58, 62, 65, 69]],   // Gm7(9)
  [36, [58, 60, 65, 67]],   // C7sus4
];
const SCALE = [65, 67, 69, 72, 74, 77, 79, 81];   // F メジャー・ペンタ（ファ ソ ラ ド レ）
const RHYTHMS = [                                 // 8分単位で 1 小節 8 コマ、1 が音の出だし
  [1, 0, 0, 1, 0, 0, 1, 0], [1, 0, 1, 0, 0, 0, 0, 0], [0, 0, 1, 0, 1, 0, 1, 0],
  [1, 0, 0, 0, 1, 0, 0, 0], [0, 1, 0, 1, 0, 0, 1, 0], [1, 0, 0, 0, 0, 0, 0, 0],
];

function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

// 32 小節ぶんのメロディを先に作っておく
const MELODY = (() => {
  const r = rng(20261119), bars = [];
  let idx = 3;
  for (let b = 0; b < 32; b++) {
    const section = Math.floor(b / 8);
    const rest = section === 0 || (section === 2 && b % 2 === 1);   // 1 周目の最初と 3 周目の偶数小節は休む
    const rh = RHYTHMS[Math.floor(r() * RHYTHMS.length)];
    const chord = PROG[b % 8][1].map((n) => n + 12);
    const notes = [];
    rh.forEach((on, i) => {
      if (!on || rest) return;
      idx = Math.max(0, Math.min(SCALE.length - 1, idx + Math.round((r() - 0.5) * 3)));
      let n = SCALE[idx];
      if (i === 0) n = chord.reduce((a, c) => (Math.abs(c - n) < Math.abs(a - n) ? c : a), chord[0]);   // 頭はコードの音に寄せる
      notes.push([i, n, r() < 0.3 ? 2 : 1]);
    });
    if (b % 8 === 7 && !rest) notes.splice(0, notes.length, [0, 72, 4]);   // 区切りの小節はドで伸ばす
    bars.push(notes);
  }
  return bars;
})();

const eighth = (i) => Math.floor(i / 2) * BEAT + (i % 2 ? BEAT * 2 * SWING : 0);

function scheduleBar(bar, t0) {
  const [root, chord] = PROG[bar % 8];
  const b = bgmBus;
  // エレピ（和音）：1 拍目と 2 拍裏
  const ep = (at, vol) => chord.forEach((n, k) => tone(b, { at: at + k * 0.012, midi: n, dur: 1.6, vol, attack: 0.01, partials: [[1, 1], [2, 0.18], [3, 0.05]], lp: 2200, send: 0.35 }));
  ep(t0, 0.055);
  ep(t0 + eighth(3), 0.035);
  if (bar % 2) ep(t0 + eighth(6), 0.03);
  // ベース
  tone(b, { at: t0, midi: root, dur: BEAT * 1.8, vol: 0.22, type: 'triangle', attack: 0.01, lp: 700 });
  tone(b, { at: t0 + BEAT * 2, midi: root + (bar % 4 === 3 ? 5 : 7), dur: BEAT * 1.6, vol: 0.16, type: 'triangle', attack: 0.01, lp: 700 });
  tone(b, { at: t0 + eighth(7), midi: root + 12, dur: 0.25, vol: 0.08, type: 'triangle', lp: 700 });
  // メロディ（木琴・カリンバ風）
  for (const [i, n, len] of MELODY[bar % 32]) {
    tone(b, { at: t0 + eighth(i), midi: n, dur: 0.5 + len * 0.25, vol: 0.085, partials: [[1, 1], [4, 0.12], [9.2, 0.03]], send: 0.5 });
  }
  // シェイカー（裏拍、とても小さく）
  if (bar >= 8) for (let i = 1; i < 8; i += 2) hiss(b, { at: t0 + eighth(i), dur: 0.05, vol: 0.022, hp: 7000 });
  // 2 周目からは 4 拍目に小さなリム
  if (bar >= 8 && bar % 2 === 1) hiss(b, { at: t0 + BEAT * 3, dur: 0.04, vol: 0.03, hp: 1800, lp: 4000 });
}

let timer = null, nextBar = 0, nextTime = 0;
function startBgm() {
  if (!ctx || timer || !prefs.bgm) return;
  nextTime = ctx.currentTime + 0.15;
  timer = setInterval(() => {
    while (nextTime < ctx.currentTime + 0.4) {
      scheduleBar(nextBar, nextTime);
      nextTime += BEAT * 4;
      nextBar = (nextBar + 1) % 32;
    }
  }, 100);
}
function stopBgm() { clearInterval(timer); timer = null; }

// ---------- 効果音 ----------
const SE = {
  tap(t) { tone(seBus, { at: t, f: 1150, glide: 0.7, dur: 0.06, vol: 0.09 }); },
  coin(t) {
    tone(seBus, { at: t, midi: 95, dur: 0.09, vol: 0.09, type: 'triangle' });
    tone(seBus, { at: t + 0.08, midi: 100, dur: 0.5, vol: 0.1, type: 'triangle', partials: [[1, 1], [2, 0.2]], send: 0.3 });
  },
  buy(t) {   // レジ：チーン＋コイン
    hiss(seBus, { at: t, dur: 0.05, vol: 0.12, hp: 1500, lp: 5000 });
    SE.coin(t + 0.05);
    tone(seBus, { at: t + 0.05, midi: 88, dur: 0.9, vol: 0.05, partials: [[1, 1], [2.76, 0.4], [5.4, 0.2]], send: 0.4 });
  },
  refill(t) {   // 缶を並べる：コトッ × 3
    [0, 0.09, 0.18].forEach((d, i) => {
      tone(seBus, { at: t + d, f: 210 - i * 15, glide: 0.5, dur: 0.12, vol: 0.22 });
      hiss(seBus, { at: t + d, dur: 0.03, vol: 0.05, hp: 2500, lp: 6000 });
    });
    tone(seBus, { at: t + 0.3, midi: 84, dur: 0.35, vol: 0.06, partials: [[1, 1], [4, 0.1]], send: 0.3 });
  },
  recall(t) {
    tone(seBus, { at: t, midi: 79, dur: 0.12, vol: 0.08 });
    tone(seBus, { at: t + 0.09, midi: 74, dur: 0.25, vol: 0.08 });
  },
  confirm(t) {
    tone(seBus, { at: t, midi: 79, dur: 0.12, vol: 0.08, partials: [[1, 1], [4, 0.1]] });
    tone(seBus, { at: t + 0.08, midi: 84, dur: 0.35, vol: 0.09, partials: [[1, 1], [4, 0.1]], send: 0.3 });
  },
  swap(t) { tone(seBus, { at: t, f: 520, glide: 1.6, dur: 0.12, vol: 0.1 }); },
  success(t) {   // ド ミ ソ ド
    [72, 76, 79, 84].forEach((n, i) => tone(seBus, { at: t + i * 0.08, midi: n, dur: 0.6, vol: 0.09, partials: [[1, 1], [4, 0.12]], send: 0.4 }));
  },
  error(t) {
    tone(seBus, { at: t, midi: 58, dur: 0.14, vol: 0.12, type: 'triangle', lp: 1500 });
    tone(seBus, { at: t + 0.13, midi: 55, dur: 0.22, vol: 0.12, type: 'triangle', lp: 1500 });
  },
  notice(t) {
    tone(seBus, { at: t, midi: 88, dur: 0.6, vol: 0.06, partials: [[1, 1], [2.76, 0.3]], send: 0.4 });
    tone(seBus, { at: t + 0.14, midi: 84, dur: 0.9, vol: 0.06, partials: [[1, 1], [2.76, 0.3]], send: 0.4 });
  },
  welcome(t) { SE.success(t); SE.coin(t + 0.4); },
};

let last = {};
/** 効果音を鳴らす。同じ音が短い間に重なりすぎないようにする */
export function se(name) {
  if (!prefs.se || !SE[name] || !init() || ctx.state !== 'running') return;
  const now = performance.now();
  if (now - (last[name] || 0) < 50) return;
  last[name] = now;
  SE[name](ctx.currentTime + 0.01);
}

// ---------- 開始・一時停止 ----------
let unlocked = false;
function unlock() {
  if (!init()) return;
  ctx.resume().then(() => { unlocked = true; startBgm(); });
}

export function initAudio() {
  // 最初の操作で音を出せるようにする。ボタンやリンクを押したらタップ音
  addEventListener('pointerdown', (e) => {
    if (!unlocked) unlock();
    const el = e.target.closest('button, a, label.sw-row, [role="tab"], .slot, input[type="range"]');
    if (el && !el.closest('[data-se-silent]')) se('tap');
  }, { capture: true });
  addEventListener('keydown', () => { if (!unlocked) unlock(); }, { once: true });
  // 画面を離れたら止め、戻ったら再開
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { stopBgm(); ctx.suspend(); }
    else if (unlocked) ctx.resume().then(startBgm);
  });
}
