import { getState, replaceState, migrate, createInitialState, update } from '../state.js';
import { onSaveStatus, clearAll } from '../storage.js';
import { yen, num, esc, fmtDateTime } from '../util.js';
import { confirmDialog, toast } from '../ui.js';
import { icon, ill } from '../icons.js';
import { NOTIFY } from '../config.js';
import { permission, requestPermission } from '../notify.js';
import { pageHead } from './parts.js';
import { getAudioPrefs, setAudioPrefs, se } from '../audio.js';
import { showTutorial } from './tutorial.js';

// ----- 準備中の画面 -----
const PLANNED = {
  warehouse: ['倉庫・仕入れ', 'warehouse', 'box', ['商品の仕入れ', '在庫一覧', '自販機へ補充', '在庫の回収']],
  shop: ['ショップ', 'cart', 'shop', ['自販機の購入', '設置場所の解放', '設備']],
  stats: ['経営', 'chart', 'barsBlue', ['売上履歴', 'ランキング', '経営統計']],
  events: ['イベント', 'calendar', 'star', ['今日のイベント', '今後の予定', 'イベント効果']],
};

export function renderPlanned(s, key) {
  const [title, ic, big, list] = PLANNED[key];
  const qty = Object.values(s.warehouse).reduce((a, w) => a + (w.qty || 0), 0);
  return `${pageHead({ title, ic, right: key === 'warehouse' ? `<span class="loc-pill">${ill('box')}${qty}本</span>` : '' })}
  <section class="wcard soon-card">
    <span class="soon-ic">${ill(big)}</span>
    <b>準備中</b>
    <div class="chips">${list.map((x) => `<span class="tag">${x}</span>`).join('')}</div>
  </section>`;
}

// ----- 設定・データ -----
let unsubStatus = null;

export function renderSettings(s) {
  return `${pageHead({ title: '設定', ic: 'gear', back: '#home' })}
  <div class="narrow">
  <button class="btn wide tt-open" id="tt-open">${icon('star')}遊び方を見る</button>
  ${soundSection()}
  ${notifySection(s)}
  <section class="wcard"><h2 class="wtitle">${icon('bell')}お知らせ</h2>
    <ul class="notices" id="notices">${s.notices.map((n, i) => `<li class="${n.read ? '' : 'unread'} ${i >= 10 ? 'more' : ''}">${n.target
      ? `<a href="${n.target}"><span><time>${fmtDateTime(n.at)}</time>${esc(n.text)}</span><span class="go">›</span></a>`
      : `<span><time>${fmtDateTime(n.at)}</time>${esc(n.text)}</span>`}</li>`).join('') || '<li class="muted">ありません</li>'}</ul>
    ${s.notices.length > 10 ? `<button class="btn ghost wide" id="nt-more">もっと見る（${s.notices.length - 10}件）</button>` : ''}
  </section>
  <section class="wcard"><h2 class="wtitle">${icon('cloud')}セーブ</h2><ul class="rows" id="save-status"></ul></section>
  <section class="wcard"><h2 class="wtitle">${icon('backup')}バックアップ</h2>
    <div class="row-btns"><button class="btn" id="bk-copy">${icon('copy')}コピー</button><button class="btn" id="bk-open">${icon('restore')}復元</button></div>
    <div id="bk-restore" hidden>
      <textarea id="bk-text" rows="3" placeholder="バックアップを貼り付け" aria-label="バックアップ文字列"></textarea>
      <button class="btn primary wide" id="bk-apply">復元する</button>
    </div>
  </section>
  <button class="btn danger wide" id="reset">${icon('trash')}データをリセット</button>
  </div>`;
}

function soundSection() {
  const a = getAudioPrefs();
  const row = (key, label) => `<label class="sw-row"><span>${label}</span>
    <input type="checkbox" class="switch" data-snd="${key}" ${a[key] ? 'checked' : ''}></label>
    <div class="vol-row ${a[key] ? '' : 'off'}"><span class="vol-ic" aria-hidden="true">♪</span>
      <input type="range" class="vol" data-vol="${key}Vol" min="0" max="100" step="5" value="${Math.round(a[key + 'Vol'] * 100)}" aria-label="${label}の音量">
      <b class="vol-val">${Math.round(a[key + 'Vol'] * 100)}</b></div>`;
  return `<section class="wcard"><h2 class="wtitle">${icon('music')}サウンド</h2>
    ${row('bgm', 'BGM')}
    <div class="sw-group">${row('se', '効果音')}</div>
  </section>`;
}

function notifySection(s) {
  const nf = s.notifications;
  const perm = permission();
  const sw = (key, label) => `<label class="sw-row"><span>${label}</span>
    <input type="checkbox" class="switch" data-nf="${key}" ${nf[key] !== false ? 'checked' : ''} ${key !== 'enabled' && !nf.enabled ? 'disabled' : ''}></label>`;
  const permText = { granted: '許可済み', denied: 'ブロック中（端末の設定から許可してください）', default: '未許可', unsupported: 'この画面では使えません' }[perm];
  return `<section class="wcard"><h2 class="wtitle">${icon('bell')}通知</h2>
    ${sw('enabled', '通知を受け取る')}
    <div class="sw-group">${NOTIFY.types.map((t) => sw(t.id, t.name)).join('')}</div>
    <div class="perm-row"><span><b>端末の通知</b><small>${permText}</small></span>
      ${perm === 'default' ? '<button class="btn" id="nf-allow">許可する</button>' : ''}</div>
    ${perm === 'unsupported' ? '<p class="muted small">ホーム画面に追加したアプリ（PWA）として開くと、アプリを閉じていても売り切れなどを端末に通知できます。この画面ではアプリ内のお知らせと、ホームの「設定」ボタンの件数で確認できます。</p>' : ''}
  </section>`;
}

export function mountSettings(el, s) {
  el.querySelector('#tt-open')?.addEventListener('click', () => showTutorial());
  el.querySelectorAll('[data-snd]').forEach((c) => c.addEventListener('change', () => {
    setAudioPrefs({ [c.dataset.snd]: c.checked });
    c.closest('.sw-row').nextElementSibling.classList.toggle('off', !c.checked);
    if (c.dataset.snd === 'se' && c.checked) se('confirm');
  }));
  el.querySelectorAll('[data-vol]').forEach((r) => {
    r.addEventListener('input', () => { r.nextElementSibling.textContent = r.value; setAudioPrefs({ [r.dataset.vol]: Number(r.value) / 100 }); });
    if (r.dataset.vol === 'seVol') r.addEventListener('change', () => se('coin'));   // 効果音の音量は離したときに試し鳴らし
  });
  el.querySelectorAll('[data-nf]').forEach((c) => c.addEventListener('change', () => {
    update((st) => { st.notifications[c.dataset.nf] = c.checked; });
  }));
  el.querySelector('#nt-more')?.addEventListener('click', (e) => {
    el.querySelector('#notices').classList.add('all');
    e.currentTarget.remove();
  });
  el.querySelector('#nf-allow')?.addEventListener('click', async () => {
    const r = await requestPermission();
    toast(r === 'granted' ? '端末の通知を許可しました' : '通知は許可されませんでした');
    update((st) => { st.notifications.permissionAsked = Date.now(); });
  });
  // 表示したお知らせを既読に（未読の印を一度見せてから）
  if (s.notices.some((n) => !n.read)) setTimeout(() => update((st) => st.notices.forEach((n) => { n.read = true; })), 1200);
  unsubStatus?.();
  const box = el.querySelector('#save-status');
  const label = { saved: '保存済み', pending: '送信待ち', error: '保存できません', ready: '接続済み', off: '利用できません', idle: '—' };
  unsubStatus = onSaveStatus((st) => {
    if (!box.isConnected) return unsubStatus?.();
    box.innerHTML = `<li><span>${icon('phone')}この端末</span><b>${label[st.local]}</b></li>
      <li><span>${icon('cloud')}クラウド</span><b>${label[st.cloud]}</b></li>`;
  });

  el.querySelector('#bk-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(getState())); toast('コピーしました'); }
    catch { toast('コピーできませんでした'); }
  });
  el.querySelector('#bk-open').addEventListener('click', () => { el.querySelector('#bk-restore').hidden = false; });
  el.querySelector('#bk-apply').addEventListener('click', async () => {
    let data;
    try { data = migrate(JSON.parse(el.querySelector('#bk-text').value)); } catch { data = null; }
    if (!data) return toast('バックアップの形式が正しくありません');
    if (!(await confirmDialog({ title: '復元しますか？', body: '現在のデータは上書きされます。', ok: '復元する', danger: true }))) return;
    data.meta.savedAt = Date.now();
    replaceState(data);
    toast('復元しました');
    location.hash = '#home';
  });
  el.querySelector('#reset').addEventListener('click', async () => {
    if (!(await confirmDialog({ title: 'データをリセットしますか？', body: '所持金・自販機・商品・履歴がすべて初期状態に戻ります。元に戻せません。', ok: 'リセットする', danger: true }))) return;
    await clearAll();
    replaceState(createInitialState());
    toast('リセットしました');
    location.hash = '#home';
  });
}
