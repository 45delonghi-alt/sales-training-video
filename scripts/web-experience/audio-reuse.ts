// 文の位置（ID）が変わっただけで、文そのものは同じ録音を、新しいIDで使い直す。
import {copyFileSync, existsSync, readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {allClips, linesForAsset, lineIdOf, speechOf, characterById} from '../../src/experience/data';

const ROOT = join(__dirname, '..', '..');
const md = readFileSync(join(ROOT, 'docs/consulting-experience/talk-script-by-slide.md'), 'utf8');
const old = new Map<string, {text: string; who: string}>();
for (const m of md.matchAll(/^\| \d+ \| (.+?) \| .+? \| (.+?) \| `(.+?)\.mp3` \|$/gm)) old.set(m[3], {who: m[1], text: m[2]});
const oldTiming: Record<string, number> = JSON.parse(execFileSync('git', ['show', 'HEAD:src/experience/data/audioTiming.json'], {cwd: ROOT}).toString());
const TP = join(ROOT, 'src/experience/data/audioTiming.json');
const timing: Record<string, number> = JSON.parse(readFileSync(TP, 'utf8'));
const norm = (t: string) => t.replace(/[\s　]/g, '');
let n = 0;
for (const a of allClips)
  linesForAsset(a.assetId).forEach((l, i) => {
    const id = lineIdOf(a.assetId, i);
    if (id in timing) return;
    const who = characterById.get(l.speaker)?.name ?? '';
    const hit = [...old.entries()].find(([oid, o]) => norm(o.text) === norm(speechOf(l.text)) && o.who === who && oldTiming[oid]);
    if (!hit) return;
    const [oid] = hit;
    const src = [join(ROOT, 'public/experience/audio', `${oid}.mp3`), join(ROOT, 'public/experience/audio/_retired', `${oid}.mp3`)].find(existsSync);
    if (!src) return;
    copyFileSync(src, join(ROOT, 'public/experience/audio', `${id}.mp3`));
    timing[id] = oldTiming[oid];
    n++;
    console.log(`  ${oid} → ${id}　${l.text}`);
  });
writeFileSync(TP, JSON.stringify(timing, null, 1) + '\n');
const need = allClips.flatMap((a) => linesForAsset(a.assetId).map((_, i) => lineIdOf(a.assetId, i))).filter((id) => !(id in timing));
writeFileSync(join(ROOT, 'out/needs-recording.json'), JSON.stringify(need, null, 1));
console.log(`使い直した録音：${n}文／録音が必要：${need.length}文`);
