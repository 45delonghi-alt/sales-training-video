// 3Dシーンを静止画に書き出す：node scripts/web-experience/photo3d/render.mjs [shot ...]
// 出力：public/experience/photos/<shot>.jpg（写真の枠に入る）
import {build} from 'esbuild';
import {execSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(join(execSync('npm root -g').toString().trim(), 'playwright')); }
const ROOT = new URL('../../..', import.meta.url).pathname;
const TMP = join(ROOT, 'out', 'photo3d');
const OUT = join(ROOT, 'public', 'experience', 'photos');
mkdirSync(TMP, {recursive: true});
mkdirSync(OUT, {recursive: true});
await build({entryPoints: [join(ROOT, 'scripts/web-experience/photo3d/scene.ts')], bundle: true, format: 'iife', outfile: join(TMP, 'scene.js'), logLevel: 'warning'});
writeFileSync(join(TMP, 'index.html'), '<!doctype html><html><body style="margin:0;background:#000"><script src="scene.js"></script></body></html>');
const shots = process.argv.slice(2).length ? process.argv.slice(2) : ['factory-line', 'sensor-side', 'line-wobble', 'demo-rig', 'plc-panel', 'recount'];
const browser = await playwright.chromium.launch({executablePath: process.env.CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 1920, height: 1080}});
page.on('console', (m) => m.type() === 'error' && console.log('  console:', m.text()));
page.on('pageerror', (e) => console.log('  error:', e.message));
for (const s of shots) {
  const t = Date.now();
  await page.goto(`file://${join(TMP, 'index.html')}?shot=${s}`);
  await page.waitForFunction(() => window.done === true, null, {timeout: 600000});
  const png = join(TMP, `${s}.png`);
  await page.locator('canvas').screenshot({path: png});
  execSync(`ffmpeg -nostdin -y -loglevel error -i ${png} -q:v 2 ${join(OUT, `${s}.jpg`)}`);
  console.log(`${s}.jpg（${((Date.now() - t) / 1000).toFixed(0)}秒）`);
}
await browser.close();
