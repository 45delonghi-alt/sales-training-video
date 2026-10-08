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
  const ids = cmd === 'videos' && rest.length ? rest : assets.map((a) => a.assetId);
  const at = cmd === 'stills' ? Number(rest[0] ?? 0.6) : 0;
  for (const id of ids) {
    const inputProps = {assetId: id, showSubtitles: true, showStatus: true};
    const composition = await selectComposition({serveUrl, id: compositionIdFor(id), inputProps, browserExecutable, logLevel: 'error'});
    if (cmd === 'stills') {
      const frame = Math.min(composition.durationInFrames - 1, Math.round(composition.durationInFrames * at));
      await renderStill({serveUrl, composition, frame, output: join(out, `${id}.png`), inputProps, browserExecutable, scale: 0.5, logLevel: 'error'});
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
