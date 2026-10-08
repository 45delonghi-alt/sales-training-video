// 体験アプリの全分岐テスト（Playwright）。
//   npm run experience:build → npm run experience:serve（別ターミナル）→ node tests/experience.e2e.mjs
//   環境変数：APP_URL（既定 http://localhost:4173/）、SHOTS（スクリーンショットの保存先。省略可）
import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
import {mkdirSync, readFileSync} from 'node:fs';
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
const root = new globalThis.URL('..', import.meta.url).pathname;
const scenes = JSON.parse(readFileSync(join(root, 'src/experience/data/scenes.json'), 'utf8'));

const results = [];
const ok = (name, pass, detail = '') => {
  results.push({name, pass, detail});
  console.log(`${pass ? '✔' : '✖'} ${name}${detail ? `（${detail}）` : ''}`);
};

const browser = await playwright.chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext({viewport: {width: 1600, height: 900}});
const page = await context.newPage();
const errors = [];
const missing = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && missing.push(`${r.status()} ${r.url()}`));

const shot = async (name) => SHOTS && page.screenshot({path: join(SHOTS, `${name}.png`)});
const title = () => page.locator('.nav-title span').nth(1).innerText();

await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.goto(URL);
await page.getByRole('button', {name: '学生画面'}).click(); // 進行役モードへ
ok('進行役モードに切り替わる', await page.locator('.fac').isVisible());

// 導入動画
ok('最初の場面は導入動画', (await title()) === scenes[0].title);
await page.waitForSelector('.player-box');
await shot('01-intro');

const byId = Object.fromEntries(scenes.map((s) => [s.sceneId, s]));
const order = [];
for (let s = scenes[0]; s; s = s.nextSceneId ? byId[s.nextSceneId] : null) order.push(s);

const next = () => page.getByRole('button', {name: '次へ →'}).click();

for (const s of order.slice(1)) {
  await next();
  await page.waitForTimeout(250);
  const t = await title();
  if (t !== s.title) {
    ok(`場面「${s.title}」に進む`, false, `表示は「${t}」`);
    break;
  }
  if (s.type === 'question') {
    if (s.requiresDemoPass) {
      // 実測が記録済み（基準OK）なのでゲートは出ない
      ok(`${s.sceneId}：実測が基準を満たしたので問いが出る`, await page.locator('.q-card').isVisible());
    }
    ok(`${s.sceneId}：考える時間では選択肢を出さない`, (await page.locator('.choice').count()) === 0);
    ok(`${s.sceneId}：推奨を学生画面に出さない`, !(await page.locator('.stage').innerText()).includes('おすすめ'));
    await page.getByRole('button', {name: '選択肢を表示する'}).click();
    // A/B/C をすべて試す（最後に推奨を選ぶ）
    const ids = ['A', 'B', 'C'].filter((x) => x !== s.recommendedChoice).concat(s.recommendedChoice);
    for (const id of ids) {
      const c = s.choices.find((x) => x.choiceId === id);
      await page.locator('.choice', {hasText: c.choiceText.replace(/[「」]/g, '').slice(0, 12)}).click();
      await page.waitForSelector('.player-box');
      const playing = await page.locator('.clip-view .player-box').count();
      await page.getByRole('button', {name: '回答へ進む ⏭'}).click();
      const text = await page.locator('.result-main').innerText();
      ok(`${s.sceneId}-${id}：映像 → お客様の回答・分かったことが一致`, playing === 1 && text.includes(c.customerResponse) && text.includes(c.discovered));
      if (id !== s.recommendedChoice) await page.getByRole('button', {name: '選び直す'}).click();
    }
    await page.getByRole('button', {name: '他の選択肢と比較する'}).click();
    const cmp = await page.locator('.compare').innerText();
    ok(`${s.sceneId}：比較に3つの回答が出る`, s.choices.every((c) => cmp.includes(c.discovered)));
    ok(`${s.sceneId}：解説前は「おすすめ」を出さない`, !cmp.includes('おすすめ'));
    await page.getByRole('button', {name: '解説を表示'}).click();
    ok(`${s.sceneId}：解説を表示すると推奨と学習ポイントが出る`, (await page.locator('.compare').innerText()).includes('おすすめ') && (await page.locator('.reveal').innerText()).includes(s.learningPoint));
    await page.locator('.reason textarea').fill(`${s.sceneId} の理由`);
    if (s.sceneId === 'p1-q1') await shot('02-question-result');
  }
  if (s.type === 'demo') {
    // 実測の記録：通過10本・カウント10・切り替わりなし → 基準OK
    await page.locator('.record-grid input').nth(0).fill('10');
    await page.locator('.record-grid input').nth(1).fill('10');
    await page.getByRole('button', {name: 'なかった'}).click();
    ok(`${s.sceneId}：記録すると判定が出る`, (await page.locator('.verdict').innerText()).includes('基準を満たした'));
    if (s.sceneId === 'p5-s2-demo') await shot('03-demo');
  }
  if (s.type === 'pitch') {
    await page.locator('.pitch-part textarea').first().fill('数量確認の負担');
    await page.getByRole('button', {name: '例を表示'}).click();
    ok('提案トーク：例を表示できる', await page.locator('.pitch-example').isVisible());
  }
}
ok('最後の場面（エンディング）まで進める', (await title()) === order[order.length - 1].title);
await shot('04-ending');

// 記録が残る（再読み込みしても続きから）
await page.reload();
await page.waitForTimeout(500);
ok('再読み込みしても場面と記録が残る', (await title()) === order[order.length - 1].title && (await page.locator('.fac-table').innerText()).includes('A→C→B'));

// 戻る
await page.getByRole('button', {name: '← 戻る'}).click();
ok('戻るで1つ前の場面へ', (await title()) === order[order.length - 2].title);

// 基準未達の分岐：通常条件で「切り替わりあり」→ STEP3 の問いではなく追加調査へ
await page.locator('.fac select').selectOption('p5-s2-demo');
await page.waitForTimeout(200);
await page.getByRole('button', {name: 'あった'}).click();
await page.locator('.fac select').selectOption('p5-s3-q');
await page.waitForTimeout(200);
ok('基準未達：STEP3 の問いを出さない', (await page.locator('.gate-title').innerText()).includes('基準を満たさない'));
await page.getByRole('button', {name: '追加調査の場面へ進む'}).click();
ok('基準未達：追加調査の場面へ進む', (await title()) === byId['p5-followup'].title);
await shot('05-followup');
await next();
ok('追加調査 → 実機デモで伝えたいこと', (await title()) === byId['p5-message'].title);

// 未記録のときは記録を促す
await page.locator('.fac select').selectOption('p5-s2-demo');
await page.locator('.record-grid input').nth(0).fill('');
await page.locator('.fac select').selectOption('p5-s3-q');
await page.waitForTimeout(200);
ok('未記録：記録を促す', (await page.locator('.gate-title').innerText()).includes('未記録'));

// 学生画面では進行役の情報を出さない
await page.getByRole('button', {name: '進行役モード'}).click();
ok('学生画面：進行役パネルを出さない', (await page.locator('.fac').count()) === 0 && (await page.locator('.disc').isVisible()));
ok('学生画面：分かったことがたまる', (await page.locator('.disc-list li').count()) >= 5);
await page.getByRole('button', {name: '学生画面'}).click();

// 投影用ウィンドウと同期
const proj = await context.newPage();
proj.on('pageerror', (e) => errors.push(`projector: ${e}`));
await proj.goto(`${URL}?view=projector`);
await proj.getByRole('button', {name: /クリックして投影を開始/}).click();
await page.locator('.fac select').selectOption('p4-q4');
await proj.waitForTimeout(500);
ok('投影用ウィンドウが場面に追従する', (await proj.locator('.q-text').innerText()).includes(byId['p4-q4'].questionText));
ok('投影用ウィンドウには操作ボタンを出さない', (await proj.locator('.nav').count()) === 0 && (await proj.getByRole('button', {name: '選択肢を表示する'}).count()) === 0);
if (SHOTS) await proj.screenshot({path: join(SHOTS, '06-projector.png')});

// 最初からやり直す
await page.getByRole('button', {name: '最初からやり直す…'}).click();
await page.getByRole('button', {name: '最初からやり直す', exact: true}).click();
ok('最初からやり直すと導入動画に戻り、記録が消える', (await title()) === scenes[0].title && !(await page.locator('.fac-table').innerText()).includes('→'));

ok('ページのエラーなし', errors.length === 0, errors.slice(0, 3).join(' / '));
ok('存在しないファイルの読み込みなし（404なし）', missing.length === 0, missing.slice(0, 3).join(' / '));

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length}項目中 ${results.length - failed.length}項目 合格`);
process.exit(failed.length ? 1 : 0);
