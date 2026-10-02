// 音声合成ツールに読み込ませる台詞一覧（CSV）を出力する。npm run csv
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {listLines} from '../src/timeline';
import {ROOT, loadScript} from './load';

const script = loadScript();
const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;

const rows = [
  ['台詞ID', 'ファイル名', '場面', '話者', '台詞'],
  ...listLines(script).map(({scene, line}) => [
    line.id,
    `${line.id}.${script.meta.audioExt}`,
    scene.name,
    script.characters[line.speaker].name,
    line.text,
  ]),
];

const out = join(ROOT, 'audio_lines.csv');
// Excel で文字化けしないよう BOM 付き UTF-8 で出力
writeFileSync(out, '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n');
console.log(`${rows.length - 1}件の台詞を書き出しました：${out}`);
