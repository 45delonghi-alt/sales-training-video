// コンサルティング営業体験 導入動画の補助コマンド
//   npm run consulting:durations … 各Sceneの尺の一覧
//   npm run consulting:csv       … 音声合成用のナレーション一覧（consulting_narration.csv）
//   npm run consulting:sheet     … 印刷用のナレーション台本（out/consulting_narration.html → PDF化）
import {execFileSync} from 'node:child_process';
import {existsSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {script} from '../src/consulting/script';
import {allLines, buildTimeline, speechText} from '../src/consulting/timeline';
import type {AudioDurations} from '../src/consulting/types';

const ROOT = join(import.meta.dirname, '..');

const probe = (file: string) =>
  Number(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
      encoding: 'utf8',
    }).trim(),
  );

const loadAudio = (): AudioDurations => {
  const audio: AudioDurations = {};
  for (const {line} of allLines(script)) {
    const file = join(ROOT, 'public', script.meta.narrationDir, `${line.id}.${script.meta.audioExt}`);
    if (existsSync(file)) audio[line.id] = probe(file);
  }
  return audio;
};

const durations = () => {
  const audio = loadAudio();
  const tl = buildTimeline(script, audio);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  console.table(
    tl.scenes.map((s) => {
      const sec = s.durationInFrames / tl.fps;
      const lastLine = s.lines[s.lines.length - 1];
      const speechEnd = (lastLine.from + lastLine.speechFrames) / tl.fps;
      return {
        Scene: s.spec.id,
        開始: fmt(s.globalFrom / tl.fps),
        '尺(秒)': Number(sec.toFixed(1)),
        '最低(秒)': s.spec.minSeconds,
        'ナレーション終了(秒)': Number(speechEnd.toFixed(1)),
        音声: `${s.lines.filter((l) => !l.estimated).length}/${s.lines.length}`,
      };
    }),
  );
  console.log(`合計 ${fmt(tl.totalFrames / tl.fps)}（${tl.totalFrames}フレーム。フェードの重なり分を差し引き済み）`);
  console.log(`音声ファイル ${Object.keys(audio).length}件。無い文は「文字数 × ${script.meta.secondsPerChar}秒」で仮算出。`);
};

const csv = () => {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [
    ['ファイル名', 'Scene', '読み上げるテキスト', '画面上の文', '後の間(秒)'].map(q).join(','),
    ...allLines(script).map(({spec, line}) =>
      [`${line.id}.${script.meta.audioExt}`, spec.id, speechText(line), line.text, String(line.pauseAfter ?? script.meta.defaultPause)]
        .map(q)
        .join(','),
    ),
  ];
  const out = join(ROOT, 'consulting_narration.csv');
  writeFileSync(out, '﻿' + rows.join('\n') + '\n');
  console.log(`出力しました：${out}（${rows.length - 1}行）`);
};

const sheet = () => {
  const audio = loadAudio();
  const tl = buildTimeline(script, audio);
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const font = (w: number, subset: string) =>
    `url("file://${join(ROOT, 'node_modules/@fontsource/noto-sans-jp/files', `noto-sans-jp-${subset}-${w}-normal.woff2`)}")`;
  const faces = [400, 700, 900]
    .flatMap((w) => [
      `@font-face{font-family:NJ;font-weight:${w};src:${font(w, 'latin')};unicode-range:U+0000-00FF;}`,
      `@font-face{font-family:NJ;font-weight:${w};src:${font(w, 'japanese')};}`,
    ])
    .join('\n');
  const total = tl.totalFrames / tl.fps;
  const sections = tl.scenes
    .map((s, i) => {
      const start = s.globalFrom / tl.fps;
      const rows = s.lines
        .map((l) => {
          const at = start + l.from / tl.fps;
          const reading = l.line.speech ? `<div class="reading">読み：${esc(l.line.speech)}</div>` : '';
          const status = l.estimated ? '<span class="missing">音声未生成</span>' : `${(l.audioSeconds ?? 0).toFixed(1)}秒`;
          return `<tr><td class="id">${l.line.id}</td><td class="time">${fmt(at)}</td><td class="text">${esc(l.line.text)}${reading}</td><td class="sub">${l.line.subtitles.map(esc).join('<br>')}</td><td class="num">${(l.line.pauseAfter ?? script.meta.defaultPause).toFixed(1)}</td><td class="num">${status}</td></tr>`;
        })
        .join('');
      return `<section><h2><span class="no">${String(i + 1).padStart(2, '0')}</span>${esc(s.spec.name)}<span class="meta">${s.spec.id}｜${fmt(start)}〜${fmt(start + s.durationInFrames / tl.fps)}</span></h2>
<table><thead><tr><th>ID</th><th>開始</th><th>ナレーション</th><th>字幕（区切り）</th><th>後の間<br>(秒)</th><th>音声</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    })
    .join('');
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>ナレーション台本</title><style>
${faces}
@page{size:A4 landscape;margin:12mm 12mm 14mm;}
body{font-family:NJ,sans-serif;color:#111214;font-size:10.5pt;margin:0;}
header{border-left:8px solid #E60012;padding:2px 0 2px 14px;margin-bottom:10px;}
header h1{font-size:20pt;font-weight:900;margin:0;}
header p{margin:4px 0 0;color:#555;font-size:9.5pt;}
section{break-inside:avoid;margin-top:12px;}
h2{font-size:12.5pt;font-weight:900;margin:0 0 4px;display:flex;align-items:baseline;gap:8px;}
h2 .no{color:#fff;background:#E60012;padding:1px 7px;font-size:10pt;}
h2 .meta{margin-left:auto;font-size:8.5pt;color:#6B6F76;font-weight:400;}
table{width:100%;border-collapse:collapse;table-layout:fixed;}
th{background:#111214;color:#fff;font-weight:700;font-size:8.5pt;padding:4px 6px;text-align:left;}
td{border-bottom:1px solid #D9DBDF;padding:4px 6px;vertical-align:top;}
th:nth-child(1){width:52px}th:nth-child(2){width:40px}th:nth-child(4){width:30%}th:nth-child(5){width:44px}th:nth-child(6){width:64px}
.id,.time,.num{font-variant-numeric:tabular-nums;color:#555;font-size:9pt;}
.text{font-weight:700;}
.reading{font-weight:400;font-size:8.5pt;color:#B5000E;margin-top:2px;}
.sub{font-size:9pt;color:#333;}
.missing{color:#fff;background:#E60012;padding:1px 4px;font-size:8pt;font-weight:700;}
</style></head><body>
<header><h1>コンサルティング営業体験 導入動画｜ナレーション台本</h1>
<p>全${tl.scenes.reduce((n, s) => n + s.lines.length, 0)}文／総尺 ${fmt(total)}／声：Kuni（ElevenLabs, eleven_multilingual_v2）／開始時刻は動画全体の経過時間（目安）</p></header>
${sections}
</body></html>`;
  const out = join(ROOT, 'out', 'consulting_narration.html');
  writeFileSync(out, html);
  console.log(`出力しました：${out}`);
};

const command = ({durations, csv, sheet} as Record<string, () => void>)[process.argv[2]];
if (command) command();
else console.error('usage: consulting.ts durations|csv');
