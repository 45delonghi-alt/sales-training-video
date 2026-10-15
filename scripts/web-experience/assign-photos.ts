// 会話の場面に、話している人の写真の枠を割り当てる（写真が ready になると背景に使われる）。
// 使い方：npx tsx scripts/web-experience/assign-photos.ts
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {PLACE, linesForAsset, responderFor} from '../../src/experience/data';

const ROOT = join(__dirname, '..', '..');
const AP = join(ROOT, 'src/experience/data/assets.json');
const assets = JSON.parse(readFileSync(AP, 'utf8'));
const PP0 = join(ROOT, 'src/experience/data/photos.json');
const photos = JSON.parse(readFileSync(PP0, 'utf8'));
for (const p of photos.slots) p.ready = existsSync(join(ROOT, 'public', p.file));
const BY: Record<string, string> = {sato: 'sato', takahashi: 'takahashi', mori: 'mori', nakata: 'nakata'};
let n = 0;
for (const a of assets) {
  const lines = linesForAsset(a.assetId);
  for (const s of a.shots) {
    if (s.overlay === 'issue-photo') { s.photo = 'recount'; n++; continue; }
    if (s.overlay !== 'talk' && s.overlay !== 'talk-card') continue;
    const at = lines[s.atLine ?? 0]?.speaker;
    const sp = at && BY[at] ? at : lines.slice(s.atLine ?? 0).find((l) => BY[l.speaker])?.speaker;
    let slot = sp ? BY[sp] : undefined;
    if (slot === 'sato' && responderFor(a.assetId)?.mood === 'positive') slot = 'sato-smile';
    // 人物の写真が置かれていなければ、場面の場所（3DCG）を背景にする
    const place = a.assetId === 'p2-q1-a' ? 'line-wobble' : PLACE[a.assetId.slice(0, 2)];
    const ready = (x?: string) => !!x && photos.slots.some((p: {slot: string; ready: boolean}) => p.slot === x && p.ready);
    const use = ready(slot) ? slot : place;
    if (use) { s.photo = use; n++; } else delete s.photo;
  }
}
writeFileSync(AP, JSON.stringify(assets, null, 2) + '\n');
// ファイルが置かれている枠を ready にする
writeFileSync(PP0, JSON.stringify(photos, null, 2) + '\n');
console.log(`写真の枠を${n}ショットに割り当て／配置済み ${photos.slots.filter((p: {ready: boolean}) => p.ready).length}/${photos.slots.length}`);
