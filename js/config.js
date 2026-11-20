// =============================================================
// ゲームバランス・マスターデータの一元管理（仕様書 17章）
// 数値はすべてここで調整する。他のファイルに数値を直書きしない。
// =============================================================

export const SCHEMA_VERSION = 6;
export const SAVE_KEY = 'vending-sim/save/v1';

export const BALANCE = {
  initialMoney: 75000,          // 初期資金：1台目の自販機（住宅街 ¥55,000）＋最初の仕入れぶん
  starterMachine: { name: '1号機', locationId: 'residential', modelId: 'standard' },
  starterStock: 8,              // 初期自販機に入っているお試し在庫（本/スロット）
  lowStockRatio: 0.25,          // 収納上限に対してこの割合以下で「残りわずか」
  maxNotices: 30,
  maxMachines: 8,               // 所有できる自販機の上限
};

// 自販機の機種
// 自販機を購入するときに選べる本体の色（看板・側面・下部の色になる）
export const MACHINE_COLORS = [
  { name: 'ブルー', hex: '#4aa8f0' }, { name: 'ネイビー', hex: '#2f5fb8' }, { name: 'レッド', hex: '#e8453c' },
  { name: 'オレンジ', hex: '#ff8a2b' }, { name: 'イエロー', hex: '#f2c12e' }, { name: 'グリーン', hex: '#3fb55a' },
  { name: 'ミント', hex: '#3cc4b4' }, { name: 'パープル', hex: '#8e5bd6' }, { name: 'ピンク', hex: '#ef6fa8' },
  { name: 'ブラウン', hex: '#8a5a3c' }, { name: 'グレー', hex: '#7d8aa3' }, { name: 'ブラック', hex: '#3a3f55' },
];

export const MACHINE_MODELS = {
  standard: {
    name: 'スタンダード機', slots: 8, slotCapacity: 15, cols: 4, color: '#4aa8f0',
    // 陳列位置ごとの「おすすめ」。スロット番号は左上から右へ。
    // 合う商品（ジャンル・温度）を置くと売れ行きが slotMatchBonus 倍になる（数字は画面に出さない）
    slotHints: [
      { text: '冷たい水・お茶', genres: ['water', 'tea'], temp: 'cold' },
      { text: '炭酸飲料', genres: ['soda'] },
      { text: 'ジュース', genres: ['juice'] },
      { text: 'エナジードリンク', genres: ['energy'] },
      { text: '甘い飲み物', genres: ['sweet'] },
      { text: 'HOTのお茶', genres: ['tea'], temp: 'hot' },
      { text: '水', genres: ['water'] },
      { text: 'HOTのコーヒー', genres: ['coffee'], temp: 'hot' },
    ],
    // 目線の高さ（上段）は全体的に少し売れやすい
    slotBase: [1.05, 1.05, 1.05, 1.05, 1, 1, 1, 1],
  },
};

// 設置場所（仕様書 7-2）。数値はゲーム内相対値（STEP5 で使用）
export const LOCATIONS = [
  { id: 'residential', name: '住宅街',     traffic: '中', spend: '低', note: '安定した需要', likes: '水・お茶',       trafficMul: 1.0, spendMul: 0.9, upkeepPerDay: 750, unlockCost: 0, installCost: 5000, requiredSales: 0 },
  { id: 'station',     name: '駅前',       traffic: '高', spend: '中', note: '販売回転率が高い', likes: 'コーヒー・炭酸飲料',   trafficMul: 1.5, spendMul: 1.0, upkeepPerDay: 2000, unlockCost: 60000, installCost: 15000, requiredSales: 100000 },
  { id: 'office',      name: 'オフィス街', traffic: '高', spend: '高', note: 'コーヒー需要', likes: 'コーヒー・お茶',       trafficMul: 1.4, spendMul: 1.2, upkeepPerDay: 2250, unlockCost: 120000, installCost: 20000, requiredSales: 250000 },
  { id: 'park',        name: '公園',       traffic: '中', spend: '中', note: '天候の影響が大きい', likes: '炭酸飲料・ジュース', trafficMul: 1.1, spendMul: 1.0, upkeepPerDay: 1000, unlockCost: 15000, installCost: 8000, requiredSales: 15000 },
  { id: 'tourist',     name: '観光地',     traffic: '高', spend: '高', note: '高価格でも売れやすい', likes: '水・ジュース', trafficMul: 1.5, spendMul: 1.4, upkeepPerDay: 3000, unlockCost: 250000, installCost: 30000, requiredSales: 500000 },
  { id: 'school',      name: '学校付近',   traffic: '高', spend: '低', note: '甘い飲み物が人気', likes: '甘い飲み物・炭酸飲料',   trafficMul: 1.3, spendMul: 0.85, upkeepPerDay: 1250, unlockCost: 40000, installCost: 10000, requiredSales: 60000 },
];

// 容器と内容量（仕様書 3-2）
export const CONTAINERS = {
  can: { name: '缶',           volumes: [100, 120, 150, 200, 250, 350] },
  pet: { name: 'ペットボトル', volumes: [200, 250, 350, 500] },
};

// 仕入れ単価（仕様書 5-2 の仮数値を補完）
export const UNIT_COST = {
  can: { 100: 35, 120: 37, 150: 40, 200: 45, 250: 50, 350: 58 },
  pet: { 200: 55, 250: 58, 350: 65, 500: 80 },
};

export const TEMPS = { cold: 'COLD', hot: 'HOT' };

// 味：0〜3 の強さで持つ（仕様書 4-2 の「数値による強弱」案を採用）
export const TASTES = [
  { id: 'sweet',   name: '甘さ' },
  { id: 'bitter',  name: '苦さ' },
  { id: 'refresh', name: 'すっきり' },
  { id: 'sour',    name: '酸味' },
];

// ジャンル：需要表（4-3, 2-2）が「コーヒー・お茶・水…」で書かれているため追加した項目
export const GENRES = [
  { id: 'water',  name: '水' },
  { id: 'tea',    name: 'お茶' },
  { id: 'coffee', name: 'コーヒー' },
  { id: 'soda',   name: '炭酸飲料' },
  { id: 'juice',  name: 'ジュース' },
  { id: 'sweet',  name: '甘い飲み物' },
  { id: 'energy', name: 'エナジードリンク' },
  { id: 'other',  name: 'その他' },
];

// ラベルテンプレート
export const LABEL_TEMPLATES = [
  { id: 'none',   name: '柄なし' },
  { id: 'band',   name: '帯' },
  { id: 'stripe', name: 'ストライプ' },
  { id: 'dots',   name: 'ドット' },
  { id: 'wave',   name: 'ウェーブ' },
  { id: 'split',  name: 'ななめ' },
  { id: 'circle', name: 'エンブレム' },
  { id: 'check',  name: 'チェック' },
  { id: 'plain',  name: '無地' },
  { id: 'heart',  name: 'ハート' },
  { id: 'star',   name: '星' },
  { id: 'border', name: 'ボーダー' },
  { id: 'leaf',   name: '葉っぱ', sub: true },
  { id: 'lemon',  name: 'レモン', sub: true },
  { id: 'two',    name: '2色', sub: true },
  { id: 'fade',   name: 'グラデ' },
  { id: 'tartan', name: 'チェック2色', sub: true },
  { id: 'mountain', name: '山', sub: true },
];

// ラベルの位置
export const LABEL_POSITIONS = [['std', 'ふつう'], ['high', '上寄せ'], ['low', '下寄せ'], ['full', '全面'], ['double', '上下2本']];
// 文字のスタイル
export const TEXT_STYLES = [['plain', 'そのまま'], ['ribbon', 'リボン'], ['box', '枠'], ['slant', 'ななめ'], ['outline', 'ふちだけ']];

// 商品開発フォーム
export const PRODUCT_FORM = {
  nameMax: 14,
  labelTextMax: 6,          // ラベルに入れる文字の最大数
  priceMin: 10,
  priceMax: 990,
  priceStep: 10,
  colorPresets: ['#4fb3e8', '#2b7bd6', '#2f9e44', '#9bd14b', '#f2d22e', '#ff9f1c', '#e8453c', '#c2185b', '#8e5bd6', '#4a2e22', '#c8a27a', '#f4f1ee', '#1d1b1a'],
  // 新規作成時の初期値
  defaults: {
    name: '', genre: 'tea', container: 'pet', volume: 500, temp: 'cold',
    taste: { sweet: 0, bitter: 1, refresh: 2, sour: 0 }, color: '#2f9e44',
    label: { mode: 'template', template: 'none', color: '#ffffff', image: null, icon: true, text: '', textColor: '#ffffff', textDir: 'h', textStyle: 'plain', subColor: '#ffffff', pos: 'std', clear: false, liquid: null, cap: null }, price: 130,
  },
};

// 価格の目安（仕様書 9-2）。商品開発画面のヒント表示用
// 適正価格：ジャンルごとの「500ml のときの値段」から内容量で決める（場所の財布のゆるさ spendMul もかかる）
//  内容量 v ml のとき ＝ at500 ×（0.55 ＋ 0.45 × v / 500）を 10 円単位に丸める
export const GENRE_PRICE = { water: 130, tea: 160, coffee: 200, soda: 180, juice: 170, sweet: 170, energy: 260, other: 160 };
export const fairPrice = (genre, volume, spendMul = 1) =>
  Math.round(((GENRE_PRICE[genre] ?? GENRE_PRICE.other) * (0.55 + 0.45 * volume / 500) * spendMul) / 10) * 10;

// 価格の目安（適正価格との比で表示）
export const PRICE_HINTS = [
  { max: 0.8, text: 'かなり安い：よく売れるが利益は少なめ' },
  { max: 0.95, text: '少し安め：売れやすい' },
  { max: 1.05, text: '適正価格：いちばん儲かりやすい' },
  { max: 1.2, text: '少し高め：売れ行きが落ちる' },
  { max: Infinity, text: '高すぎ：ほとんど売れない' },
];
export const priceHintOf = (price, fair) => PRICE_HINTS.find((h) => price / fair <= h.max).text;

// アップロード画像の縮小設定（保存容量を抑える）
export const LABEL_IMAGE = { maxSide: 320, quality: 0.82, mime: 'image/jpeg' };

// 設備強化（仕様書 8-1。費用・効果は STEP5 で設定）
// cost: Lv1 の費用、growth: レベルごとの費用の伸び、per: 1レベルあたりの効果
export const UPGRADES = [
  { id: 'ecash',    name: '電子マネー決済', effect: '購入率アップ',     unit: '売れ行き', per: 0.06, maxLevel: 5, cost: 8000,  growth: 1.8 },
  { id: 'capacity', name: '大容量収納',     effect: '最大在庫数アップ', unit: '1列の上限', per: 3,    maxLevel: 5, cost: 6000,  growth: 1.8 },
  { id: 'cooling',  name: '高性能冷却装置', effect: '電気代を削減',     unit: '電気代',   per: 0.1,  maxLevel: 5, cost: 5000,  growth: 1.7 },
  { id: 'speed',    name: '高速販売機構',   effect: '販売効率アップ',   unit: '売れ行き', per: 0.05, maxLevel: 5, cost: 10000, growth: 1.8 },
  { id: 'security', name: '防犯性能',       effect: '故障・いたずらを減らす', unit: 'トラブル', per: 0.18, maxLevel: 5, cost: 4000, growth: 1.7 },
  { id: 'ad',       name: '広告パネル',     effect: '集客力アップ',     unit: '人通り',   per: 0.08, maxLevel: 5, cost: 7000,  growth: 1.8 },
];
export const upgradeOf = (id) => UPGRADES.find((u) => u.id === id);
export const upgradeCost = (id, lv) => { const u = upgradeOf(id); return Math.round((u.cost * u.growth ** lv) / 100) * 100; };

// 自販機の購入・設置（仕様書 7-3）
export const SHOP = {
  machinePrice: 50000,       // 1台目の本体価格（チュートリアル）
  // n 台目の本体価格（＋設置場所ごとの設置費用 installCost）。2台目は安く、増やすほど高くなる
  machinePrices: [50000, 25000, 35000, 50000, 70000, 100000, 140000, 190000],
  relocateRate: 0.6,         // 設置場所の変更費用＝移転先の設置費用 × この割合
};

// 維持費（仕様書 10-3）：1日あたり。10分ごとに日割りで差し引く
export const UPKEEP = {
  electricityPerDay: 625,    // 電気代（冷却装置で削減）
  maintenancePerLevel: 40,   // 設備維持費：強化レベル合計 × これ
};

// トラブル（故障・いたずら）。起きると一定時間販売が止まる
export const TROUBLE = {
  perDayChance: 0.04,        // 1台が1日にトラブルにあう確率
  downHours: [2, 5],         // 止まる時間（最小〜最大）
  kinds: ['故障', 'いたずら', '硬貨詰まり'],
};

/** 1列あたりの収納上限（大容量収納で増える） */
export const capOf = (m) => MACHINE_MODELS[m.modelId].slotCapacity + (m.upgrades?.capacity || 0) * upgradeOf('capacity').per;


// 最初から商品一覧にあるサンプル商品（編集・削除可能）
export const STARTER_PRODUCTS = [
  { name: 'まいにちの水', genre: 'water', container: 'pet', volume: 500, temp: 'cold',
    taste: { sweet: 0, bitter: 0, refresh: 3, sour: 0 }, color: '#4fb3e8', label: { mode: 'template', template: 'none', color: '#ffffff', icon: true }, price: 110 },
  { name: 'あさのブラック', genre: 'coffee', container: 'can', volume: 200, temp: 'hot',
    taste: { sweet: 0, bitter: 3, refresh: 1, sour: 0 }, color: '#4a2e22', label: { mode: 'template', template: 'none', color: '#f3e2c4', icon: true }, price: 130 },
  { name: 'レモンソーダ', genre: 'soda', container: 'can', volume: 350, temp: 'cold',
    taste: { sweet: 2, bitter: 0, refresh: 2, sour: 2 }, color: '#f2d22e', label: { mode: 'template', template: 'dots', color: '#2f9e44' }, price: 140 },
];

export const TRAFFIC_WORD = { 高: '多い', 中: 'ふつう', 低: '少ない' };

export const findLocation = (id) => LOCATIONS.find((l) => l.id === id) || LOCATIONS[0];
export const findGenre = (id) => GENRES.find((g) => g.id === id) || GENRES[GENRES.length - 1];
export const SLOT_MATCH_BONUS = 1.25;   // おすすめに合う商品を置いたときの売れ行き補正

/** その位置のおすすめに商品が合っているか */
export function slotMatches(modelId, index, item) {
  const h = MACHINE_MODELS[modelId]?.slotHints?.[index];
  if (!h || !item) return false;
  return (!h.genres || h.genres.includes(item.genre)) && (!h.temp || h.temp === item.temp);
}
export const slotHintOf = (modelId, index) => MACHINE_MODELS[modelId]?.slotHints?.[index] || null;

/** 陳列位置の補正値（位置の基本 × おすすめ一致） */
export const slotBonusOf = (modelId, index, item) =>
  (MACHINE_MODELS[modelId]?.slotBase?.[index] ?? 1) * (slotMatches(modelId, index, item) ? SLOT_MATCH_BONUS : 1);

export const unitCostOf = (container, volume) => UNIT_COST[container]?.[volume] ?? 60;

// =============================================================
// 販売シミュレーション（仕様書 2章・9章）。すべて仮の値
// 1スロットあたりの販売数（本/時）＝ basePerHour × 各補正
// =============================================================
export const SIM = {
  tickMinutes: 10,          // 販売処理の間隔（分）
  maxOfflineHours: 72,      // 放置中に計算する上限（時間）。これより長い分は売れない
  basePerHour: 1.25,        // 補正がすべて1のときの販売数（本/時/スロット）。朝・昼・晩の1日3回のぞくペースに合わせた値
  noise: 0.15,              // ±15% のゆらぎ（仕様書 9-4）
  priceElasticityLow: 1.2,  // 適正価格より安いとき：安くするほど少しずつ売れやすくなる
  priceElasticityHigh: 3.5, // 適正価格より高いとき：急に売れにくくなる（適正価格がいちばん儲かる）
  // 混み具合（人通り）で「高くても買う」度合いが変わる：受け入れられる値段 ＝ 適正価格 ×（1 ＋ crowdTolerance ×（人通り − 1））
  crowdTolerance: 0.18,
  crowdToleranceMin: 0.92,  // とても空いているとき（深夜など）は適正価格の 92% くらいが売れやすい
  crowdToleranceMax: 1.25,  // とても混んでいるとき（駅前の朝など）は 25% 高くても売れやすい
  welcomeBackMinutes: 30,   // これ以上空けて戻ると「留守中の売上」を表示
  salesLogMax: 200,
};

// 時間帯ごとの人通り（0〜23時）
export const HOURLY_TRAFFIC = [
  0.25, 0.15, 0.1, 0.1, 0.15, 0.3, 0.7, 1.2, 1.4, 1.1, 1.0, 1.1,
  1.3, 1.2, 1.0, 1.0, 1.1, 1.3, 1.4, 1.2, 0.9, 0.7, 0.5, 0.35,
];

// 時間帯ごとに売れやすいジャンル（仕様書 2-2）
export const TIME_BANDS = [
  { from: 6, to: 10, genres: { coffee: 1.4, tea: 1.3 } },
  { from: 10, to: 14, genres: { soda: 1.3, juice: 1.3 } },
  { from: 14, to: 18, genres: { sweet: 1.3, water: 1.2 } },
  { from: 18, to: 22, genres: { tea: 1.2, water: 1.2, sweet: 1.2 } },
];

// 設置場所 × ジャンルの相性（仕様書 4-3）。書いていない組み合わせは 1
export const LOCATION_GENRE = {
  residential: { water: 1.25, tea: 1.25, coffee: 0.9 },
  station:     { coffee: 1.3, water: 1.2, soda: 1.25, energy: 1.25 },
  office:      { coffee: 1.45, tea: 1.3, juice: 0.8, energy: 1.35 },
  park:        { soda: 1.35, juice: 1.35, water: 1.1, coffee: 0.8 },
  tourist:     { water: 1.3, juice: 1.25, other: 1.2 },
  school:      { sweet: 1.45, soda: 1.35, coffee: 0.6, energy: 0.7 },
};
// 夜間（22〜6時）に強い場所
export const NIGHT_LOCATION = { station: 1.6, office: 0.5, school: 0.3, park: 0.6, residential: 1.0, tourist: 0.8 };

// 季節（月）× HOT/COLD
export const SEASON_TEMP = {
  hot:  [1.3, 1.3, 1.1, 0.7, 0.4, 0.25, 0.2, 0.2, 0.35, 0.7, 1.1, 1.3],
  cold: [0.6, 0.6, 0.8, 1.0, 1.15, 1.3, 1.45, 1.45, 1.25, 1.0, 0.8, 0.65],
};

// =============================================================
// イベント・天候（仕様書 11章）。すべて仮の値
// effects の書き方：
//   traffic: { all|場所ID: 倍率 }   人通り
//   genre:   { ジャンルID: 倍率 }    商品需要
//   temp:    { hot|cold: 倍率 }
//   evening: { all|場所ID: 倍率 }   18〜22時だけ（花火大会など）
//   ecash: 倍率（電子マネー対応機のみ） / elec: 電気代の倍率 / cost: 仕入れ単価の倍率
//   pick: 'genre' | 'location'  発生時にジャンルや場所を1つ選び、その対象だけ倍率（value）
// scale: small / medium / large、announce: 何日前から予告するか（0＝当日まで分からない）
// =============================================================
// どの天気にも、得をする場所や商品が必ずある（▲が1つ以上）
export const WEATHER = {
  clear:   { name: '快晴',   effects: { traffic: { park: 1.25, tourist: 1.25 }, temp: { cold: 1.1 } } },
  sunny:   { name: '晴れ',   effects: { traffic: { park: 1.1 }, genre: { juice: 1.1, soda: 1.1 } } },
  cloudy:  { name: 'くもり', effects: { traffic: { all: 0.95, office: 1.1 }, genre: { tea: 1.1, coffee: 1.1 } } },
  rain:    { name: '雨',     effects: { traffic: { all: 0.9, park: 0.55, tourist: 0.6, station: 1.25 }, temp: { hot: 1.15 }, genre: { coffee: 1.15 } } },
  snow:    { name: '雪',     effects: { traffic: { all: 0.75, residential: 1.2 }, temp: { hot: 1.3 }, genre: { sweet: 1.2 } } },
  hot:     { name: '猛暑日', effects: { temp: { cold: 1.45, hot: 0.5 }, genre: { water: 1.2, energy: 1.2 } } },
  freeze:  { name: '真冬日', effects: { temp: { hot: 1.45, cold: 0.75 }, genre: { sweet: 1.15 } } },
  typhoon: { name: '台風接近', effects: { traffic: { all: 0.5, residential: 1.5 }, genre: { water: 1.6 } } },   // 備えの買いだめ
};
// 月ごとの天候の出やすさ（重み）
export const WEATHER_BY_MONTH = [
  { sunny: 45, cloudy: 25, rain: 8, snow: 7, freeze: 15 },           // 1月
  { sunny: 45, cloudy: 25, rain: 10, snow: 8, freeze: 12 },
  { sunny: 45, clear: 10, cloudy: 25, rain: 20 },
  { sunny: 45, clear: 15, cloudy: 22, rain: 18 },
  { sunny: 45, clear: 15, cloudy: 22, rain: 18 },
  { sunny: 25, cloudy: 30, rain: 45 },                                // 6月（梅雨）
  { sunny: 30, clear: 15, hot: 30, rain: 22, typhoon: 3 },
  { sunny: 28, clear: 15, hot: 35, rain: 15, typhoon: 7 },
  { sunny: 40, clear: 10, hot: 10, cloudy: 20, rain: 14, typhoon: 6 },
  { sunny: 40, clear: 15, cloudy: 25, rain: 16, typhoon: 4 },
  { sunny: 45, clear: 15, cloudy: 25, rain: 15 },
  { sunny: 45, cloudy: 27, rain: 10, snow: 5, freeze: 13 },          // 12月
];

// 年間イベント：from/to は 'MM-DD'
export const ANNUAL_EVENTS = [
  { id: 'newyear',   name: '年末年始・初詣', from: '12-31', to: '01-03', scale: 'large',  kind: '人通り', announce: 7, effects: { traffic: { tourist: 2.0, residential: 1.2, office: 0.5, school: 0.4 }, temp: { hot: 1.2 } } },
  { id: 'hanami',    name: '花見',           from: '03-25', to: '04-08', scale: 'medium', kind: '人通り', announce: 7, effects: { traffic: { park: 1.8, tourist: 1.3 } } },
  { id: 'enroll',    name: '入学シーズン',   from: '04-01', to: '04-12', scale: 'small',  kind: '人通り', announce: 7, effects: { traffic: { school: 1.4, station: 1.15 } } },
  { id: 'golden',    name: '大型連休',       from: '04-29', to: '05-05', scale: 'large',  kind: '人通り', announce: 7, effects: { traffic: { tourist: 1.8, park: 1.4, office: 0.5, school: 0.4 } } },
  { id: 'summerfes', name: '夏祭り',         from: '08-10', to: '08-16', scale: 'medium', kind: '人通り', announce: 7, effects: { traffic: { residential: 1.3, park: 1.6 }, temp: { cold: 1.15 } } },
  { id: 'fireworks', name: '花火大会',       from: '08-15', to: '08-15', scale: 'large',  kind: '人通り', announce: 7, effects: { evening: { park: 2.2, tourist: 2.0, station: 1.6, all: 1.2 } } },
  { id: 'coffeeday', name: 'コーヒーの日',   from: '10-01', to: '10-01', scale: 'small',  kind: '商品需要', announce: 7, effects: { genre: { coffee: 1.5 } } },
  { id: 'schoolfes', name: '学園祭',         from: '10-28', to: '11-03', scale: 'medium', kind: '人通り', announce: 7, effects: { traffic: { school: 1.8 } } },
  { id: 'autumn',    name: '紅葉シーズン',   from: '11-10', to: '11-30', scale: 'medium', kind: '人通り', announce: 7, effects: { traffic: { tourist: 1.5, park: 1.2 } } },
  { id: 'xmas',      name: 'クリスマス',     from: '12-20', to: '12-25', scale: 'medium', kind: '人通り', announce: 7, effects: { traffic: { station: 1.4, office: 1.2 }, genre: { sweet: 1.3 } } },
];

// ランダムイベント：weight＝出やすさ、days＝続く日数
export const RANDOM_EVENTS = [
  { id: 'festival', name: '地域のお祭り',   scale: 'medium', kind: '人通り',   weight: 6, days: 1, announce: 3, effects: { traffic: { residential: 1.2, station: 1.1, park: 2.5, office: 1.0, tourist: 1.3, school: 1.2 } } },
  { id: 'flea',     name: 'フリーマーケット', scale: 'small', kind: '人通り',   weight: 6, days: 1, announce: 2, effects: { traffic: { park: 1.5 } } },
  { id: 'rush',     name: '通勤ラッシュ',   scale: 'small',  kind: '人通り',   weight: 7, days: 1, announce: 0, effects: { traffic: { station: 1.3, office: 1.3 } } },
  { id: 'soda',     name: '炭酸ブーム',     scale: 'medium', kind: '商品需要', weight: 2, days: 3, announce: 2, effects: { genre: { soda: 1.5 } } },
  { id: 'healthy',  name: '健康志向デー',   scale: 'small',  kind: '商品需要', weight: 6, days: 1, announce: 0, effects: { genre: { water: 1.3, tea: 1.3 } } },
  { id: 'sweets',   name: '甘党の日',       scale: 'small',  kind: '商品需要', weight: 6, days: 1, announce: 0, effects: { genre: { sweet: 1.4 } } },
  { id: 'refresh',  name: 'リフレッシュ週間', scale: 'medium', kind: '商品需要', weight: 2, days: 3, announce: 2, effects: { genre: { juice: 1.3, soda: 1.15 } } },
  { id: 'energy',   name: '試験シーズン',   scale: 'small',  kind: '商品需要', weight: 4, days: 2, announce: 1, effects: { genre: { energy: 1.5, coffee: 1.2 } } },
  { id: 'ecash',    name: '電子マネーキャンペーン', scale: 'medium', kind: '経営', weight: 4, days: 2, announce: 2, effects: { ecash: 1.3 } },
  { id: 'sponsor',  name: 'メーカー協賛',   scale: 'small',  kind: '経営',     weight: 4, days: 1, announce: 0, effects: { pick: 'genre', value: 1.5 } },
  { id: 'local',    name: '地域応援デー',   scale: 'small',  kind: '経営',     weight: 4, days: 1, announce: 1, effects: { pick: 'location', value: 1.3 } },
  { id: 'elec',     name: '電気代割引',     scale: 'small',  kind: '経営',     weight: 4, days: 2, announce: 1, effects: { elec: 0.5 } },
  { id: 'sale',     name: '仕入れ応援セール', scale: 'large', kind: '経営',    weight: 3, days: 2, announce: 3, effects: { cost: 0.8 } },
];
export const EVENT_CHANCE = { first: 0.55, second: 0.12 };   // 1日にランダムイベントが始まる確率
export const SCALE_NAME = { small: '小', medium: '中', large: '大' };

// 通知（仕様書 12章）
export const NOTIFY = {
  salesStep: 10000,           // 1台の本日の売上がこの金額を超えるごとに知らせる
  types: [                   // 設定画面に並ぶ通知の種類
    { id: 'soldOut',  name: '売り切れ' },
    { id: 'lowStock', name: '在庫不足' },
    { id: 'sales',    name: '売上の到達' },
    { id: 'events',   name: 'イベント' },
    { id: 'location', name: '設置場所の解放' },
    { id: 'trouble',  name: 'トラブル' },
  ],
};

// =============================================================
// 救済措置：所持金がピンチのときの「経営支援金」
//  - 所持金が trigger 未満で、自販機と倉庫の在庫の合計が stockLow 本未満のとき（売る物がなく立て直せない）
//    → 借金をなくして amount 円を受け取れる。1日1回まで
//  - 維持費の支払いで所持金が debtFloor より下がることはない（それ以上はツケにしない）
// =============================================================
export const SUPPORT = { trigger: 2500, stockLow: 50, amount: 12500, debtFloor: -25000 };

// =============================================================
// 実績と報酬。達成すると「経営」ページで報酬を受け取れる
//  value(s)：今の進み具合、goal：達成ライン、reward：報酬（円）
// =============================================================
const bestDay = (s) => Math.max(s.today?.sales || 0, ...(s.dailyHistory || []).map((d) => d.sales || 0));
const upgradeTotal = (s) => s.machines.reduce((a, m) => a + Object.values(m.upgrades || {}).reduce((x, y) => x + y, 0), 0);
const tiers = (id, name, unit, value, list) => list.map(([goal, reward], i) => ({ id: `${id}${i + 1}`, name: `${name} ${i + 1}`, goal, reward, unit, value }));
export const ACHIEVEMENTS = [
  { id: 'firstSale', name: 'はじめての売上', goal: 1, reward: 10000, unit: '本', value: (s) => s.stats.totalUnits, desc: '商品を1本売る' },
  ...tiers('units', '販売本数', '本', (s) => s.stats.totalUnits, [[120, 8000], [750, 15000], [2500, 37500], [12500, 125000]]),
  ...tiers('sales', '累計売上', '円', (s) => s.stats.totalSales, [[25000, 10000], [125000, 20000], [500000, 50000], [2500000, 200000]]),
  ...tiers('day', '1日の売上', '円', bestDay, [[12500, 7500], [50000, 25000], [150000, 75000]]),
  ...tiers('dev', '商品開発', '種類', (s) => s.stats.developed || s.products.length, [[3, 5000], [10, 20000]]),
  ...tiers('mach', '自販機オーナー', '台', (s) => s.machines.length, [[2, 15000], [5, 50000], [8, 120000]]),
  ...tiers('loc', '進出', 'か所', (s) => s.unlockedLocations.length - 1, [[1, 12500], [3, 50000]]),
  ...tiers('upg', '設備投資', 'レベル', upgradeTotal, [[5, 7500], [20, 37500]]),
];
