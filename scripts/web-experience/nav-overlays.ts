// 単独再生用の完成動画に重ねるフェーズナビゲーションを、背景透過の PNG で書き出す。
//   npx tsx scripts/web-experience/nav-overlays.ts
// 出力：out/experience/nav/<場面ID>.png（上部のナビゲーション）と chapter-<p1〜p4>.png（チャプタータイトル）
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {scenes} from '../../src/experience/data';

const ROOT = join(__dirname, '..', '..');
const OUT = join(ROOT, 'out', 'experience', 'nav');
const browserExecutable = process.env.REMOTION_BROWSER || undefined;

const main = async () => {
  mkdirSync(OUT, {recursive: true});
  const serveUrl = await bundle({entryPoint: join(ROOT, 'src', 'index.ts'), publicDir: join(ROOT, 'public')});
  const jobs: {file: string; props: Record<string, unknown>}[] = [
    ...scenes.filter((s) => s.phaseId !== 'intro').map((s) => ({file: `${s.sceneId}.png`, props: {sceneId: s.sceneId, chapter: false}})),
    ...['p1', 'p2', 'p3', 'p4'].map((p) => ({file: `chapter-${p}.png`, props: {sceneId: scenes.find((s) => s.phaseId === p)!.sceneId, chapter: true}})),
  ];
  for (const j of jobs) {
    const composition = await selectComposition({serveUrl, id: 'PhaseNavOverlay', inputProps: j.props, browserExecutable, logLevel: 'error'});
    await renderStill({serveUrl, composition, frame: 0, output: join(OUT, j.file), inputProps: j.props, imageFormat: 'png', browserExecutable, logLevel: 'error'});
  }
  console.log(`${jobs.length}枚：${OUT}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
