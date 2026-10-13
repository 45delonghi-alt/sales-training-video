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
const phases = JSON.parse(readFileSync(join(root, 'src/experience/data/phases.json'), 'utf8'));
const scenes = phases.flatMap((p) => p.scenes.map((s) => ({...s, phaseId: p.phaseId})));

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
      ok(`${s.questionId}：実測が基準を満たしたので問いが出る`, await page.locator('.q-card').isVisible());
    }
    ok(`${s.questionId}：考える時間では選択肢を出さない`, (await page.locator('.choice').count()) === 0);
    ok(`${s.questionId}：回答前に推奨を出さない`, !(await page.locator('.stage').innerText()).includes('推奨'));
    if (s.hint) {
      await page.locator('.q-card').getByRole('button', {name: /先輩のヒント/}).click();
      ok(`${s.questionId}：先輩のヒントを表示できる`, (await page.locator('.hint').innerText()).includes(s.hint.text));
    }
    await page.getByRole('button', {name: '選択肢を表示する'}).click();
    ok(`${s.questionId}：選択肢を出しても推奨は出さない`, !(await page.locator('.stage').innerText()).includes('推奨'));
    // A/B/C をすべて試す（最後に推奨を選ぶ。推奨なしの問いは C）
    const last = s.recommendedChoice ?? 'C';
    const ids = ['A', 'B', 'C'].filter((x) => x !== last).concat(last);
    for (const id of ids) {
      const c = s.choices.find((x) => x.choiceId === id);
      await page.locator('.choice', {hasText: c.choiceText.replace(/[「」]/g, '').slice(0, 12)}).click();
      await page.waitForSelector('.player-box');
      const playing = await page.locator('.clip-view .player-box').count();
      await page.getByRole('button', {name: '回答へ進む ⏭'}).click();
      const text = await page.locator('.result-main').innerText();
      ok(`${s.questionId}-${id}：専用映像 → 回答・分かったこと・まだ分からないことが一致`, playing === 1 && text.includes(c.customerResponse) && text.includes(c.gained) && text.includes(c.missing));
      const rev = await page.locator('.reveal').innerText();
      ok(`${s.questionId}-${id}：回答後に推奨と理由が出る`, rev.includes(s.recommendedChoice ? `推奨：${s.recommendedChoice}` : '推奨：なし') && rev.includes(s.recommendReason));
      if (id !== last) await page.getByRole('button', {name: '選び直す'}).click();
    }
    ok(`${s.questionId}：学生側の結果画面に比較ボタンを出さない`, (await page.locator('.result-actions').getByRole('button', {name: /ほかの選択肢/}).count()) === 0);
    await page.locator('.fac').getByRole('button', {name: 'ほかの選択肢の結果を表示'}).click();
    const cmp = await page.locator('.compare').innerText();
    ok(`${s.questionId}：進行役が他の選択肢の結果を表示できる`, s.choices.every((c) => cmp.includes(c.gained) && cmp.includes(c.customerResponse)));
    await page.locator('.reason textarea').fill(`${s.questionId} の理由`);
    if (s.sceneId === 'p1-q1') await shot('02-question-result');
    if (s.sceneId === 'p2-q1') await shot('02b-no-recommend');
  }
  if (s.type === 'demo') {
    if (s.predictPrompt) ok(`${s.sceneId}：再生前に予想の問いを出す`, (await page.locator('.predict-q').innerText()).includes(s.predictPrompt));
    // 実測の記録：通過10本・カウント10・切り替わりなし → 基準OK（テスト用の入力。実測値ではない）
    await page.locator('.record-grid input').nth(0).fill('10');
    await page.locator('.record-grid input').nth(1).fill('10');
    await page.getByRole('button', {name: 'なかった'}).click();
    ok(`${s.sceneId}：記録すると判定が出る`, (await page.locator('.verdict').innerText()).includes('基準を満たした'));
    if (s.sceneId === 'p4-demo-normal') await shot('03-demo');
  }
}
ok('最後の場面（エンディング）まで進める', (await title()) === order[order.length - 1].title);
await page.getByRole('button', {name: /▶ エンディング/}).click();
let ended = false;
try {
  await page.waitForSelector('.end', {timeout: 40000});
  ended = true;
} catch {}
ok('エンディングのあとに終了画面（選択の記録）が出る', ended && (await page.locator('.end-table').innerText()).includes('P4-Q4'));
await shot('04-ending');

// 記録が残る（再読み込みしても続きから）
await page.reload();
await page.waitForTimeout(500);
ok('再読み込みしても場面と記録が残る', (await title()) === order[order.length - 1].title && (await page.locator('.fac-table').innerText()).includes('A→B→C'));

// 戻る
await page.getByRole('button', {name: '← 戻る'}).click();
ok('戻るで1つ前の場面へ', (await title()) === order[order.length - 2].title);

// 基準未達の分岐：通常条件で「切り替わりあり」→ 次の問いではなく追加調査へ
await page.locator('.fac select').selectOption('p4-demo-normal');
await page.waitForTimeout(200);
await page.getByRole('button', {name: 'あった'}).click();
await page.locator('.fac select').selectOption('p4-q3');
await page.waitForTimeout(200);
ok('基準未達：次の問いを出さない', (await page.locator('.gate-title').innerText()).includes('基準を満たさない'));
await page.getByRole('button', {name: '追加調査の場面へ進む'}).click();
ok('基準未達：追加調査の場面へ進む', (await title()) === byId['p4-followup'].title);
await shot('05-followup');
await next();
ok('追加調査 → 実機デモで伝えたいこと', (await title()) === byId['p4-message'].title);

// 未記録のときは記録を促す
await page.locator('.fac select').selectOption('p4-demo-normal');
await page.locator('.record-grid input').nth(0).fill('');
await page.locator('.fac select').selectOption('p4-q3');
await page.waitForTimeout(200);
ok('未記録：記録を促す', (await page.locator('.gate-title').innerText()).includes('未記録'));

// 映像の途中の「考えよう」：解説クリップを再生すると、2文目の前で止まって問いを出す
await page.locator('.fac select').selectOption('p2-light');
await page.waitForTimeout(300);
await page.getByRole('button', {name: /▶ 解説：透明なボトルと光/}).click();
let paused = false;
try {
  await page.waitForSelector('.think-pause', {timeout: 25000});
  paused = true;
} catch {}
ok('解説の途中で「考えよう」が出て止まる', paused && (await page.locator('.tp-prompt').innerText()).includes('透明なボトル'));
if (SHOTS) await page.screenshot({path: join(SHOTS, '07-think-pause.png')});
if (paused) {
  await page.getByRole('button', {name: '続きを見る ▶'}).click();
  ok('「続きを見る」で再開する', (await page.locator('.think-pause').count()) === 0);
}

// 学生画面では進行役の情報を出さない
await page.getByRole('button', {name: '進行役モード'}).click();
ok('学生画面：進行役パネルを出さない', (await page.locator('.fac').count()) === 0 && (await page.locator('.disc').isVisible()));
ok('学生画面：分かったことがたまる', (await page.locator('.disc-list li').count()) >= 5);
ok('学生画面：まだ分からないことを出す', await page.locator('.disc-missing').isVisible());
await page.getByRole('button', {name: '学生画面'}).click();

// 投影用ウィンドウと同期
const proj = await context.newPage();
proj.on('pageerror', (e) => errors.push(`projector: ${e}`));
await proj.goto(`${URL}?view=projector`);
await proj.getByRole('button', {name: /クリックして投影を開始/}).click();
await page.locator('.fac select').selectOption('p3-q2');
await proj.waitForTimeout(500);
ok('投影用ウィンドウが場面に追従する', (await proj.locator('.q-text').innerText()).includes(byId['p3-q2'].questionText));
ok('投影用ウィンドウには操作ボタンを出さない', (await proj.locator('.nav').count()) === 0 && (await proj.getByRole('button', {name: '選択肢を表示する'}).count()) === 0);
if (SHOTS) await proj.screenshot({path: join(SHOTS, '06-projector.png')});

// スマートフォン回答：受付 → 端末から回答 → 集計 → 最多の選択肢で進める
await page.locator('.fac select').selectOption('p1-q1');
await page.waitForTimeout(200);
await page.getByRole('button', {name: '回答の受付を始める'}).click();
await page.waitForSelector('.vo-code b');
const code = await page.locator('.vo-code b').innerText();
ok('スマートフォン回答：コードと参加URLを投影する', /^[A-Z0-9]{5}$/.test(code) && (await page.locator('.vo-url').innerText()).includes(`session=${code}`));
await page.getByRole('button', {name: '選択肢を表示する'}).click();
const phones = [];
for (const [i, pick] of ['B', 'B', 'A'].entries()) {
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}});
  const ph = await ctx.newPage();
  ph.on('pageerror', (e) => errors.push(`phone${i}: ${e}`));
  await ph.goto(`${URL}?view=vote&session=${code}`);
  await ph.waitForSelector('.va-choices .choice', {timeout: 8000});
  await ph.locator('.va-choices .choice').filter({has: ph.locator('.choice-id', {hasText: new RegExp(`^${pick}$`)})}).click();
  await ph.waitForSelector('.va-done');
  phones.push({ctx, ph});
}
if (SHOTS) await phones[0].ph.screenshot({path: join(SHOTS, '08-phone-vote.png')});
ok('スマートフォン回答：端末側には集計を出さない', (await phones[0].ph.locator('.vote-bars').count()) === 0);
await page.waitForTimeout(2000);
const tally = await page.locator('.fac .vote-bars').innerText();
ok('スマートフォン回答：3端末の回答が集計される（B 2人・A 1人）', /A\s*1人/.test(tally) && /B\s*2人/.test(tally));
await page.locator('.fac').getByRole('button', {name: '集計を投影'}).click();
ok('スマートフォン回答：集計を投影できる', (await page.locator('.vote-overlay.big').innerText()).includes('3人'));
if (SHOTS) await page.screenshot({path: join(SHOTS, '09-vote-tally.png')});
await page.locator('.fac').getByRole('button', {name: '最多のBで進める'}).click();
await page.waitForTimeout(500);
ok('スマートフォン回答：最多の選択肢で映像へ進む', (await page.locator('.clip-view .player-box').count()) === 1);
await phones[0].ph.waitForTimeout(2000);
ok('スマートフォン回答：選んだあとは受付を締め切る', (await phones[0].ph.locator('.va-wait').innerText()).includes('受付は終わりました'));
for (const p of phones) await p.ctx.close();
await page.locator('.fac').getByRole('button', {name: '回答の受付を終える'}).click();

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
