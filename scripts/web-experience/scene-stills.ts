// スライド化の準備：本編の場面ごとの静止画（字幕なし・1920×1080）を書き出す。
// 1つの映像の中で画面が切り替わる（ショット）ごとに1枚。ショットの終わり近く（演出が出そろった状態）を撮る。
//   npx tsx scripts/web-experience/scene-stills.ts
// 出力：out/scene-stills/<連番>_<素材ID>_<ショット>.jpg と manifest.json
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {clipById, compositionIdFor, lineIdOf, lineSchedule, linesForAsset, scenes} from '../../src/experience/data';
import type {Scene} from '../../src/experience/types';

const ROOT = join(__dirname, '..', '..');
const OUT = join(ROOT, 'out', 'scene-stills');
const browserExecutable = process.env.REMOTION_BROWSER || undefined;
const FPS = 30;

type Item = {sceneId: string; assetId: string; role: string; choiceId?: string};
// 場面の順に、映像になるもの（場面の映像・問い・ヒント・選択肢A/B/C）を並べる
const items = (s: Scene): Item[] => {
  if (s.type === 'question')
    return [
      {sceneId: s.sceneId, assetId: `q-${s.questionId}`, role: '問い'},
      ...(s.hint ? [{sceneId: s.sceneId, assetId: `hint-${s.questionId}`, role: '先輩のヒント'}] : []),
      ...s.choices.map((c) => ({sceneId: s.sceneId, assetId: c.videoAsset, role: `選択肢${c.choiceId}`, choiceId: c.choiceId})),
    ];
  if (s.type === 'reflection') return [{sceneId: s.sceneId, assetId: `r-${s.sceneId}`, role: '振り返り'}];
  if ('videoAsset' in s && s.videoAsset) return [{sceneId: s.sceneId, assetId: s.videoAsset, role: '映像'}];
  return [];
};

const main = async () => {
  rmSync(OUT, {recursive: true, force: true});
  mkdirSync(OUT, {recursive: true});
  const serveUrl = await bundle({entryPoint: join(ROOT, 'src', 'index.ts'), publicDir: join(ROOT, 'public')});
  const manifest: unknown[] = [];
  let n = 0;
  for (const s of scenes) {
    for (const it of items(s)) {
      const a = clipById.get(it.assetId);
      if (!a) continue;
      const inputProps = {assetId: it.assetId, showSubtitles: false, showStatus: true};
      const composition = await selectComposition({serveUrl, id: compositionIdFor(it.assetId), inputProps, browserExecutable, logLevel: 'error'});
      const lines = linesForAsset(it.assetId);
      const sched = lineSchedule(lines, a.dialogAt ?? 0.8, it.assetId);
      const starts = a.shots.map((sh, i) => (i === 0 ? 0 : sh.atLine === undefined ? 0 : Math.round((sched[sh.atLine]?.from ?? 0) * FPS) - 4));
      for (let i = 0; i < a.shots.length; i++) {
        const end = i + 1 < a.shots.length ? starts[i + 1] : composition.durationInFrames;
        // 演出が出そろった状態を撮る。話している人がいれば、その人のワイプが出ている瞬間（ショットの中の最後の文の途中）
        const inShot = sched.filter((l) => l.from * FPS >= starts[i] - 2 && l.from * FPS < end);
        const last = inShot[inShot.length - 1];
        const talkFrame = last && last.speaker !== 'narration' ? Math.round(((last.from + Math.min(last.to, end / FPS)) / 2) * FPS) : null;
        const frame = talkFrame ?? Math.max(starts[i] + 10, end - (i + 1 < a.shots.length ? 6 : 24));
        const name = `${String(++n).padStart(3, '0')}_${it.assetId}_${i + 1}`;
        const png = join(OUT, `${name}.png`);
        await renderStill({serveUrl, composition, frame, output: png, inputProps, browserExecutable, logLevel: 'error'});
        execFileSync('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-i', png, '-q:v', '2', join(OUT, `${name}.jpg`)]);
        rmSync(png);
        // このショットのあいだに話される文
        const from = starts[i] / FPS;
        const to = end / FPS;
        const said = sched.map((l, k) => ({...l, k})).filter((l) => l.from >= from - 0.05 && l.from < to);
        manifest.push({
          file: `${name}.jpg`, sceneId: s.sceneId, phaseId: s.phaseId, sceneTitle: s.title, sceneType: s.type, assetId: it.assetId, role: it.role, choiceId: it.choiceId,
          shot: i + 1, shots: a.shots.length, overlay: a.shots[i].overlay, header: a.shots[i].header?.title ?? '', photo: a.shots[i].photo ?? '',
          seconds: +(composition.durationInFrames / FPS).toFixed(1), lines: said.map((l) => ({speaker: l.speaker, text: l.text, lineId: lineIdOf(it.assetId, l.k)})),
        });
        console.log(`${name}　${s.title}／${it.role}`);
      }
    }
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(`静止画 ${manifest.length}枚`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
