// 体験コンテンツのクリップを書き出す（バンドルは1回だけ）。
//   npx tsx scripts/experience-render.ts stills [出力先] [割合=0.6]  … 各クリップの静止画（確認用）
//   npx tsx scripts/experience-render.ts videos [出力先] [素材ID…]   … 各クリップの MP4（選択肢別映像）
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {assets, compositionIdFor} from '../src/experience/data';

const ROOT = join(__dirname, '..');
// 環境変数 REMOTION_BROWSER で Chrome（headless shell）の場所を指定できる
const browserExecutable = process.env.REMOTION_BROWSER || undefined;

const main = async () => {
  const [cmd, outArg, ...rest] = process.argv.slice(2);
  const out = outArg || join(ROOT, 'out', 'experience', cmd === 'videos' ? 'videos' : 'stills');
  mkdirSync(out, {recursive: true});
  const serveUrl = await bundle({entryPoint: join(ROOT, 'src', 'index.ts'), publicDir: join(ROOT, 'public')});
  // stills は「素材ID@割合」で個別指定もできる（例：p2-light@0.3 p2-light@0.8）
  const picks = rest.filter((r) => r.includes('@')).map((r) => r.split('@'));
  const ids = cmd === 'videos' && rest.length ? rest : picks.length ? picks.map((p) => p[0]) : assets.map((a) => a.assetId);
  const atFor = (k: number) => (picks.length ? Number(picks[k][1]) : Number(rest[0] ?? 0.6));
  for (const [k, id] of ids.entries()) {
    const at = atFor(k);
    const inputProps = {assetId: id, showSubtitles: true, showStatus: true};
    const composition = await selectComposition({serveUrl, id: compositionIdFor(id), inputProps, browserExecutable, logLevel: 'error'});
    if (cmd === 'stills') {
      const frame = Math.min(composition.durationInFrames - 1, Math.round(composition.durationInFrames * at));
      await renderStill({serveUrl, composition, frame, output: join(out, picks.length ? `${id}@${at}.png` : `${id}.png`), inputProps, browserExecutable, scale: 0.5, logLevel: 'error'});
    } else {
      await renderMedia({serveUrl, composition, codec: 'h264', crf: 23, outputLocation: join(out, `${id}.mp4`), inputProps, browserExecutable, concurrency: 4, logLevel: 'error'});
    }
    console.log(`${id}：${(composition.durationInFrames / composition.fps).toFixed(1)}秒`);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
