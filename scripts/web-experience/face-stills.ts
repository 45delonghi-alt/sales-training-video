// 顔タグの確認用：素材ごとに、各話者が話している瞬間の静止画（字幕あり）を書き出す。
//   npx tsx scripts/web-experience/face-stills.ts <出力フォルダ> <素材ID>...
import {join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {clipById, compositionIdFor, faceCues, lineSchedule, linesForAsset} from '../../src/experience/data';
const ROOT = join(__dirname, '..', '..');
const OUT = process.argv[2];
const ids = process.argv.slice(3);
(async () => {
  const serveUrl = await bundle({entryPoint: join(ROOT, 'src', 'index.ts'), publicDir: join(ROOT, 'public')});
  for (const id of ids) {
    const a = clipById.get(id)!;
    const sched = lineSchedule(linesForAsset(id), a.dialogAt ?? 0.8, id);
    const cues = faceCues(sched);
    const inputProps = {assetId: id, showSubtitles: true, showStatus: true};
    const composition = await selectComposition({serveUrl, id: compositionIdFor(id), inputProps, browserExecutable: process.env.REMOTION_BROWSER, logLevel: 'error'});
    const seen = new Set<string>();
    for (const c of cues) {
      const frame0 = Math.round(((c.audioStart + c.audioEnd) / 2) * 30);
      const shot = a.shots.reduce((n, sh, i) => (i === 0 || (sh.atLine !== undefined && frame0 >= Math.round((sched[sh.atLine]?.from ?? 0) * 30) - 4) ? i : n), 0);
      const key = `${c.speakerId}-${shot}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const frame = frame0;
      const out = join(OUT, `${id}_${shot + 1}_${c.speakerId}.png`);
      await renderStill({serveUrl, composition, frame, output: out, inputProps, browserExecutable: process.env.REMOTION_BROWSER, logLevel: 'error'});
      console.log(out);
    }
  }
})();
