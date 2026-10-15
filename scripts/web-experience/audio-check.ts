// 台本を書き換えたあと、録音済みの音声が「いまの文」と一致しているかを確かめる。
// 一致しない音声は public/experience/audio/_retired/ に移し、タイミングから外す（字幕だけで流れ、録り直し待ちになる）。
// 照合の元：録音時の台本 docs/consulting-experience/talk-script-by-slide.md（音声ファイル名と読み上げ文の対応）
import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {allClips, linesForAsset, lineIdOf, speechOf} from '../../src/experience/data';

const ROOT = join(__dirname, '..', '..');
const md = readFileSync(join(ROOT, 'docs/consulting-experience/talk-script-by-slide.md'), 'utf8');
const recorded = new Map<string, string>();
for (const m of md.matchAll(/^\| \d+ \| .+? \| .+? \| (.+?) \| `(.+?)\.mp3` \|$/gm)) recorded.set(m[2], m[1]);
const TP = join(ROOT, 'src/experience/data/audioTiming.json');
const timing: Record<string, number> = JSON.parse(readFileSync(TP, 'utf8'));
const now = new Map<string, string>();
for (const a of allClips) linesForAsset(a.assetId).forEach((l, i) => now.set(lineIdOf(a.assetId, i), speechOf(l.text)));
const norm = (t: string) => t.replace(/[\s　]/g, '');
const retired: string[] = [];
const keep: string[] = [];
for (const id of Object.keys(timing)) {
  const before = recorded.get(id);
  const after = now.get(id);
  if (after && before && norm(before) === norm(after)) keep.push(id);
  else retired.push(id);
}
const RET = join(ROOT, 'public/experience/audio/_retired');
mkdirSync(RET, {recursive: true});
for (const id of retired) {
  const f = join(ROOT, 'public/experience/audio', `${id}.mp3`);
  if (existsSync(f)) renameSync(f, join(RET, `${id}.mp3`));
  delete timing[id];
}
writeFileSync(TP, JSON.stringify(timing, null, 1) + '\n');
const need = [...now.keys()].filter((id) => !(id in timing));
console.log(`録音そのまま使える：${keep.length}文／外した（文が変わった・場面がなくなった）：${retired.length}文／録音が必要：${need.length}文`);
writeFileSync(join(ROOT, 'out/needs-recording.json'), JSON.stringify(need, null, 1));
