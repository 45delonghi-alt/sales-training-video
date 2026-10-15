// WEB参加（学生1〜5名・各自の端末）のテスト（Playwright）。端末ごとに別のブラウザコンテキストで開く。
//   npm run experience:build → npm run experience:serve（別ターミナル）→ node tests/live.e2e.mjs
//   確かめること：参加（5名まで・6名目は満員）／回答前に正解・他人の回答が見えない／締め切ると自分の選択肢の映像
//                解説で人数と理由（名前なし）を共有／1名のときは共有しない／再接続で同じ人に戻る／提案の提出と共有
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
const ctx = () => browser.newContext({viewport: {width: 1280, height: 860}});
const shot = async (page, name) => SHOTS && page.screenshot({path: join(SHOTS, `${name}.png`)});
const text = (page) => page.locator('body').innerText();

// ───── 進行役：セッションを作る
const hostCtx = await ctx();
const host = await hostCtx.newPage();
await host.goto(`${URL}?view=host`);
await host.getByRole('button', {name: 'セッションを作成する'}).click();
await host.getByText('学生の参加URL').waitFor();
const joinUrl = await host.locator('.lv-join input').inputValue();
const sid = new globalThis.URL(joinUrl).searchParams.get('session');
ok('進行役がセッションを作成し、参加URLとQRコードが出る', !!sid && (await host.locator('.lv-qr svg').count()) === 1, sid);
await shot(host, '01-host-start');

// ───── 学生5名が各自の端末から参加
const names = ['あおい', 'ひかる', 'みなと', 'さくら', 'けんと'];
const students = [];
for (const n of names) {
  const c = await ctx();
  const p = await c.newPage();
  await p.goto(joinUrl);
  await p.getByLabel('表示名（ニックネームで構いません）').fill(n);
  await p.getByRole('button', {name: '参加する'}).click();
  await p.locator('.lv-top').waitFor();
  students.push({c, p, n});
}
await host.waitForFunction(() => document.querySelectorAll('.lv-people li.on').length === 5);
ok('5名が参加し、進行役の画面に全員が「接続中」で並ぶ', true);
const sixth = await (await ctx()).newPage();
await sixth.goto(joinUrl);
await sixth.getByLabel('表示名（ニックネームで構いません）').fill('ろくにんめ');
await sixth.getByRole('button', {name: '参加する'}).click();
await sixth.getByText('満員').waitFor();
ok('6名目は「満員（最大5名）」と表示されて入れない', true);
await shot(students[0].p, '02-student-intro');

// ───── 導入動画 → つなぎ → P1-Q1
const goTo = async (title) => {
  await host.locator('.lv-item', {hasText: title}).first().click();
  await host.waitForTimeout(400);
};
await goTo('YOUR MISSION');
await students[0].p.getByText('ここからは、あなたが営業担当です').first().waitFor();
ok('導入動画のあと、全員の端末が「YOUR MISSION　ここからは、あなたが営業担当です。」に切り替わる', true);

await goTo('最初に何を確認する？');
for (const s of students) await s.p.getByText('最初に、何を確認しますか？').waitFor();
const before = await text(students[0].p);
ok('回答前の学生の画面に、推奨・解説・他の人の回答が出ない', !/おすすめ|解説|みんなの回答/.test(before));
await shot(students[0].p, '03-student-question');

// 回答：A 1名・B 3名・C 1名（理由つき）
const picks = ['A', 'B', 'B', 'B', 'C'];
for (const [i, s] of students.entries()) {
  await s.p.locator('.lv-choice', {hasText: new RegExp(`^${picks[i]}`)}).click();
  await s.p.getByLabel('選んだ理由（ひとこと）').fill(`${s.n}の理由`);
  await s.p.getByRole('button', {name: 'この選択肢で回答する'}).click();
  await s.p.getByText('回答しました').waitFor();
}
await host.waitForFunction(() => document.querySelectorAll('.lv-people .st').length === 5 && [...document.querySelectorAll('.lv-people .st')].every((e) => e.textContent.includes('回答')));
const counts = await host.locator('.lv-htable td.num').allInnerTexts();
ok('進行役の画面に、選択肢ごとの人数と、名前つきの理由が出る', counts.join(',') === '1名,3名,1名' && (await text(host)).includes('ひかる：ひかるの理由'), counts.join(','));
ok('回答中は、学生の画面に他の人の人数が出ない', !(await text(students[1].p)).includes('3名'));

// 再接続：けんと の端末を閉じて開き直す → 同じ人として戻り、回答が残る
const k = students[4];
await k.p.close();
await host.waitForFunction(() => [...document.querySelectorAll('.lv-people li')].some((li) => li.textContent.includes('けんと') && li.classList.contains('off')));
ok('端末を閉じると、進行役の画面で「切断中」になる', true);
k.p = await k.c.newPage();
await k.p.goto(joinUrl);
await k.p.getByText('回答済み：C').waitFor();
ok('同じ端末で開き直すと、同じ参加者として戻り、回答も残っている', (await host.locator('.lv-people li.on').count()) === 5);

// 締め切り → 各自の選択肢の映像
await host.getByRole('button', {name: /締め切り/}).click();
await students[0].p.getByText('あなたの選択').waitFor();
const a0 = await text(students[0].p);
const a1 = await text(students[1].p);
ok('締め切ると、各自が選んだ選択肢の映像とお客様の反応が出る（Aの人とBの人で違う）', a0.includes('他社製の、回帰反射型') && a1.includes('通常は0.5〜0.8%'));
ok('締め切り後も、解説の前は推奨が出ない', !/おすすめ/.test(a0));
await shot(students[0].p, '04-student-branch');

// 解説 → 人数と理由（名前なし）を共有
await host.getByRole('button', {name: /解説/}).click();
await students[0].p.getByText('みんなの回答（5名）').waitFor();
const ex = await text(students[0].p);
ok('解説で、推奨と全員の人数（A 1名・B 3名・C 1名）が出る', ex.includes('おすすめ') && ex.includes('B：3名') && ex.includes('A：1名'));
ok('共有される理由に、ほかの人の名前は出ない', ex.includes('ひかるの理由') && !/ひかる：/.test(ex));
await shot(students[0].p, '05-student-explain');
await shot(host, '06-host-question');

// ───── 30秒の提案：提出 → 進行役 → 共有
await goTo('30秒で提案しよう');
for (const s of students.slice(0, 2)) {
  await s.p.getByText('次の4つを組み合わせて').waitFor();
  for (const chip of await s.p.locator('.lv-part').all()) await chip.locator('.lv-chip').first().click();
  await s.p.getByRole('button', {name: '提案を提出する'}).click();
  await s.p.getByText('提出しました').waitFor();
}
await host.waitForFunction(() => document.body.innerText.includes('提案するセンサ：透明体専用'));
ok('提案（課題・センサ・改善・実機での検証）が進行役の画面にそろう', true);
await host.getByRole('button', {name: /全員に共有/}).click();
await students[3].p.getByText('みんなの答え').waitFor();
ok('共有すると、全員の端末に提出された提案が出る', (await students[3].p.locator('.lv-card').count()) === 2);
await shot(students[3].p, '07-student-pitch-share');

// ───── 実機デモ：記録がなければ「仮想データ」と明記
await goTo('比較デモ2');
await students[0].p.getByText('仮想データ・教育用').waitFor();
ok('実測を記録していない比較は「仮想データ・教育用」と明記される', true);
const inputs = host.locator('.lv-record input');
const vals = ['200', '205', '205', '200', '200', '200'];
for (let i = 0; i < 6; i++) await inputs.nth(i).fill(vals[i]);
await host.getByRole('button', {name: '実測として学生に表示する'}).click();
await students[0].p.getByText('比較の記録（実測）').waitFor();
ok('進行役が実測を記録すると、全員の表示が「実測」に変わる', (await text(students[0].p)).includes('+2.5%'));

// ───── 1名だけの体験：人数は共有しない
const soloHostCtx = await ctx();
const sh = await soloHostCtx.newPage();
await sh.goto(`${URL}?view=host`);
await sh.evaluate(() => localStorage.clear());
await sh.goto(`${URL}?view=host`);
await sh.getByRole('button', {name: 'セッションを作成する'}).click();
const soloUrl = await sh.locator('.lv-join input').inputValue();
const solo = await (await ctx()).newPage();
await solo.goto(soloUrl);
await solo.getByLabel('表示名（ニックネームで構いません）').fill('ひとり');
await solo.getByRole('button', {name: '参加する'}).click();
await solo.locator('.lv-top').waitFor();
await sh.locator('.lv-item', {hasText: '最初に何を確認する？'}).click();
await solo.locator('.lv-choice').nth(1).click();
await solo.getByRole('button', {name: 'この選択肢で回答する'}).click();
await solo.getByText('回答しました').waitFor();
await sh.getByRole('button', {name: /締め切り/}).click();
await sh.getByRole('button', {name: /解説/}).click();
await solo.getByText('おすすめ').waitFor();
ok('1名のときは個別体験として進み、人数の共有は出ない', !(await text(solo)).includes('みんなの回答'));

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} 件 合格`);
process.exit(failed.length ? 1 : 0);
