// フェーズナビゲーションと THINK TIME（問いの自動一時停止）のテスト（Playwright）。
//   npm run experience:build → npm run experience:serve（別ターミナル）→ node tests/phase-nav.e2e.mjs
//   確かめること：導入では強調しない／現在のフェーズだけ赤・完了にチェック／分岐中もフェーズが変わらない／
//                フェーズが変わるとチャプタータイトル／振り返りで MISSION COMPLETE／スマートフォンは短い名称／
//                問いの映像が出そろったところで止まり THINK TIME、止まっている間も回答できる／再接続で状態が戻る
import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(join(execSync('npm root -g').toString().trim(), 'playwright'));
}
const URL = process.env.APP_URL || 'http://localhost:4173/';
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, {recursive: true});
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({name, pass});
  console.log(`${pass ? '✔' : '✖'} ${name}${detail ? `（${detail}）` : ''}`);
};
const browser = await playwright.chromium.launch({executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required']});
const shot = async (page, name) => SHOTS && page.screenshot({path: join(SHOTS, `${name}.png`)});

const host = await (await browser.newContext({viewport: {width: 1366, height: 900}})).newPage();
await host.goto(`${URL}?view=host`);
await host.getByRole('button', {name: 'セッションを作成する'}).click();
await host.getByText('学生の参加URL').waitFor();
const joinUrl = await host.locator('.lv-join input').inputValue();
const go = async (label) => {
  await host.locator('.lv-item', {hasText: label}).first().click();
  await host.waitForTimeout(700);
};

const joinAs = async (viewport, name) => {
  const c = await browser.newContext({viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600});
  const p = await c.newPage();
  await p.goto(joinUrl);
  await p.getByLabel('表示名（ニックネームで構いません）').fill(name);
  await p.getByRole('button', {name: '参加する'}).click();
  await p.locator('.lv-top').waitFor();
  return {c, p};
};
const pc = await joinAs({width: 1280, height: 860}, 'あおい');
const sp = await joinAs({width: 390, height: 844}, 'ひかる');
const nav = (p) =>
  p.evaluate(() => ({
    intro: !!document.querySelector('.pn-intro'),
    now: [...document.querySelectorAll('.pn-step.now .pn-long')].map((x) => x.textContent),
    done: [...document.querySelectorAll('.pn-step.done .pn-long')].map((x) => x.textContent),
    where: document.querySelector('.pn-where')?.textContent ?? '',
    red: getComputedStyle(document.querySelector('.pn-step.now') ?? document.body).backgroundColor,
    bar: document.querySelector('.pn-bar i')?.getAttribute('style') ?? '',
    h: document.querySelector('.pn')?.getBoundingClientRect().height ?? 0,
    vh: innerHeight,
  }));

// 導入：4フェーズを強調しない
let n = await nav(pc.p);
ok('導入では4フェーズを強調しない（灰色）', n.intro && n.now.length === 0, n.where);
await shot(pc.p, 'nav-01-intro');

// PHASE 1
await go('お客様からの相談');
n = await nav(pc.p);
ok('PHASE 1 で「聞く」だけが赤（#D7141E）', n.now.join() === '聞く' && n.red === 'rgb(215, 20, 30)' && n.done.length === 0, `${n.where}／${n.red}`);
ok('ナビゲーションの高さが画面の約6〜9%以内（PC）', n.h / n.vh <= 0.1, `${Math.round((n.h / n.vh) * 1000) / 10}%`);
await shot(pc.p, 'nav-02-phase1');

// 問い：映像が出そろうと止まり THINK TIME。止まっている間も回答できる
await go('Q 最初に何を確認する？');
await pc.p.locator('.tt-badge').waitFor({timeout: 30000}).catch(async (e) => {
  await pc.p.screenshot({path: '/tmp/claude-0/-home-user-sales-training-video/4fc96ac5-ba14-51c4-9881-061740017742/scratchpad/debug-q.png'});
  console.log(await pc.p.evaluate(() => { const v = document.querySelector('.lv-qclip video'); return JSON.stringify({hasVideo: !!v, src: v?.currentSrc, t: v?.currentTime, d: v?.duration, paused: v?.paused, ended: v?.ended, player: !!document.querySelector('.lv-qclip .player')}); }));
  throw e;
});
const paused = await pc.p.evaluate(() => {
  const v = document.querySelector('.lv-qclip video');
  return v ? v.paused : null;
});
const badge = await pc.p.locator('.tt-badge').innerText();
ok('問いの映像が、問いと選択肢を出しきったところで自動で止まる', paused === true || paused === null, `paused=${paused}`);
ok('「THINK TIME｜考えてみよう」と残り時間（約60秒）を出す', /THINK TIME｜考えてみよう/.test(badge) && /(\d+)秒/.test(badge) && Number(badge.match(/(\d+)秒/)[1]) >= 55, badge.replace(/\n/g, ' '));
n = await nav(pc.p);
ok('問いの間もフェーズ表示を保つ', n.now.join() === '聞く');
await pc.p.locator('.lv-choice').nth(1).click();
await pc.p.getByRole('button', {name: 'この選択肢で回答する'}).click();
await pc.p.getByText('回答しました').waitFor();
ok('止まっている間に回答を送れる', true);
const hostNote = await host.locator('.lv-note', {hasText: 'THINK TIME'}).first().innerText().catch(() => '');
ok('進行役の画面にも THINK TIME の残り時間が出る（同じ時刻）', /THINK TIME：残り \d+秒/.test(hostNote), hostNote.slice(0, 40));
await shot(pc.p, 'nav-03-think-time-pc');
await sp.p.locator('.tt-badge').waitFor({timeout: 30000});
await shot(sp.p, 'nav-04-think-time-phone');
// 締め切り → 分岐の映像の間もフェーズは変わらない
await host.getByRole('button', {name: /締め切り/}).click();
await host.waitForTimeout(800);
n = await nav(pc.p);
ok('A/B/Cの分岐の映像に進んでも、フェーズは「聞く」のまま', n.now.join() === '聞く');

// PHASE 2：チャプタータイトル
await go('現場のセンサを見る');
const chap = await pc.p.locator('.pn-chapter').innerText().catch(() => '');
n = await nav(pc.p);
ok('PHASE 2 に入ると「聞く」に完了チェック、「考える」が赤', n.now.join() === '考える' && n.done.join() === '聞く', n.where);
ok('中央にチャプタータイトル「PHASE 02 考える／原因を調べよう」', /PHASE 02/.test(chap) && /考える/.test(chap) && /原因を調べよう/.test(chap), chap.replace(/\n/g, ' '));
await shot(pc.p, 'nav-05-chapter-phase2');
await shot(sp.p, 'nav-06-chapter-phase2-phone');
await pc.p.waitForTimeout(3000);
ok('チャプタータイトルは2〜3秒で消える', (await pc.p.locator('.pn-chapter').count()) === 0);

// 実機デモは PHASE 4
await go('比較デモ1：通常搬送');
n = await nav(pc.p);
ok('実機デモは PHASE 4「提案する」として表示', n.now.join() === '提案する' && n.done.length === 3, n.where);
await shot(pc.p, 'nav-07-demo-phase4');

// 再接続：同じ状態に戻る（演出は出さない）
await pc.p.reload();
await pc.p.locator('.pn').waitFor();
n = await nav(pc.p);
ok('再接続すると、現在のフェーズと完了状態が戻る', n.now.join() === '提案する' && n.done.length === 3 && (await pc.p.locator('.pn-chapter').count()) === 0);

// 振り返り
await go('振り返り Q1');
n = await nav(pc.p);
ok('振り返りでは4フェーズが完了、MISSION COMPLETE', n.done.length === 4 && n.now.length === 0 && /MISSION COMPLETE/.test(n.where));
await shot(pc.p, 'nav-08-mission-complete');

// スマートフォン：短い名称
const shortNames = await sp.p.evaluate(() => [...document.querySelectorAll('.pn-step .pn-short')].filter((x) => getComputedStyle(x).display !== 'none').map((x) => x.textContent));
ok('スマートフォンでは短い名称（1 聞く／2 考える／3 課題発見／4 提案）', shortNames.join('／') === '1 聞く／2 考える／3 課題発見／4 提案', shortNames.join('／'));
await shot(sp.p, 'nav-09-mission-complete-phone');
await shot(host, 'nav-10-host');

await browser.close();
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} 合格`);
process.exit(failed ? 1 : 0);
