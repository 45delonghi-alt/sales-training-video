// 音声合成ツール・吹き込み用の台詞一覧（CSV）を出力する。npm run csv
// 1行 = 1音声ファイル。途中に「…」がある台詞はファイルを分け、間は動画側で入れる。
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {listLines, speechPlan} from '../src/timeline';
import {ROOT, loadScript} from './load';

const script = loadScript();
const {audioExt, ellipsisPauseSeconds} = script.meta;
const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;

const rows: string[][] = [
  ['ファイル名', '台詞ID', '場面', '話者', '読み上げるテキスト', '元の台詞（字幕）', '声の指示', '注意'],
];
for (const {scene, line} of listLines(script)) {
  const plan = speechPlan(line);
  const character = script.characters[line.speaker];
  plan.parts.forEach((part, i) => {
    const notes: string[] = [];
    if (plan.leadPause && i === 0) {
      notes.push(`先頭の「…」は動画側で${ellipsisPauseSeconds}秒の無音を入れるので読まない`);
    }
    if (plan.parts.length > 1) {
      notes.push(
        `${plan.parts.length}ファイルに分割（${i + 1}つ目）。間の${ellipsisPauseSeconds}秒は動画側で入れる。1ファイルで作る場合は ${line.id}.${audioExt} でも可`,
      );
    }
    if (line.id === 'B06') notes.push('この後に3秒の沈黙が入る。語尾を上げて問いかけで終える');
    rows.push([
      `${plan.stems[i]}.${audioExt}`,
      line.id,
      scene.name,
      character.name,
      part,
      i === 0 ? line.text : '（同上）',
      character.voice,
      notes.join('／'),
    ]);
  });
}

const out = join(ROOT, 'audio_lines.csv');
// Excel で文字化けしないよう BOM 付き UTF-8 で出力
writeFileSync(out, '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n');
console.log(`${rows.length - 1}件の音声ファイル分を書き出しました：${out}`);
