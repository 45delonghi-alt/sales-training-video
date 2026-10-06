// コンサルティング営業体験 導入動画の補助コマンド
//   npm run consulting:durations … 各Sceneの尺の一覧
//   npm run consulting:csv       … 音声合成用のナレーション一覧（consulting_narration.csv）
//   npm run consulting:sheet     … 印刷用のナレーション台本（out/consulting_narration.html → PDF化）
//   npm run consulting:ondoku    … 音読さん等に貼り付ける原稿（out/ondoku/）
//   npm run consulting:import    … 外部の音声合成で作った音声を取り込む（audio_import/ → 文ごとに分割・整音）
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, writeFileSync} from 'node:fs';
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
<p>全${tl.scenes.reduce((n, s) => n + s.lines.length, 0)}文／総尺 ${fmt(total)}／声：${esc(script.meta.narrator)}／開始時刻は動画全体の経過時間（目安）</p></header>
${sections}
</body></html>`;
  const out = join(ROOT, 'out', 'consulting_narration.html');
  writeFileSync(out, html);
  console.log(`出力しました：${out}`);
};

// 音読さん等に貼り付ける原稿。Sceneごとのファイルと、全文を1つにしたファイルを出す。
// 1行＝1文。文と文の間は空行を入れ、読み上げ側で間が空くようにしている（取り込み時の分割に使う）
const ondoku = () => {
  const dir = join(ROOT, 'out', 'ondoku');
  mkdirSync(dir, {recursive: true});
  const all: string[] = [];
  script.scenes.forEach((spec, i) => {
    const no = String(i + 1).padStart(2, '0');
    const body = spec.narration.map((l) => speechText(l)).join('\n\n');
    writeFileSync(join(dir, `scene${no}.txt`), body + '\n');
    all.push(`【scene${no}｜${spec.name}】\n\n${body}`);
  });
  writeFileSync(join(dir, 'all.txt'), all.join('\n\n\n') + '\n');
  console.log(`出力しました：${dir}（scene01〜${String(script.scenes.length).padStart(2, '0')}.txt と all.txt）`);
};

// 取り込み元：audio_import/ に次のどちらかを置く（mp3 / wav / m4a）
//   ・文ごと：S01_01.mp3 など（ナレーションIDと同じ名前）
//   ・Sceneごと：scene01.mp3 など（原稿 scene01.txt を読み上げたもの）→ 無音の位置で文ごとに自動分割
// 出力：public/consulting/audio/narration/{ID}.mp3（前後の無音を詰め、音量をそろえる）
const IMPORT_DIR = join(ROOT, 'audio_import');
const EXTS = ['mp3', 'wav', 'm4a'];
const CLEAN = [
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03',
  'areverse',
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08',
  'areverse',
  'loudnorm=I=-16:TP=-1.5:LRA=11',
  'aresample=44100',
].join(',');

const findInput = (stem: string) =>
  EXTS.map((e) => join(IMPORT_DIR, `${stem}.${e}`)).find((f) => existsSync(f));

const writeLine = (src: string, id: string, from?: number, to?: number) => {
  const out = join(ROOT, 'public', script.meta.narrationDir, `${id}.${script.meta.audioExt}`);
  const range = from === undefined ? [] : ['-ss', from.toFixed(3), '-to', (to as number).toFixed(3)];
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...range, '-i', src, '-af', CLEAN, '-ac', '1', '-b:a', '128k', out]);
};

// 無音区間 [開始, 終了] の一覧
const silences = (file: string, minSeconds: number) => {
  const r = spawnSync('ffmpeg', ['-i', file, '-af', `silencedetect=noise=-40dB:d=${minSeconds}`, '-f', 'null', '-'], {
    encoding: 'utf8',
  });
  const list: [number, number][] = [];
  let start: number | null = null;
  for (const m of r.stderr.matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (m[1] === 'start') start = Number(m[2]);
    else if (start !== null) {
      list.push([start, Number(m[2])]);
      start = null;
    }
  }
  return list;
};

// Scene単位の音声を文ごとに分ける。文字数の比から各文の境目を予測し、その近くの「長めの無音」で切る
const splitScene = (file: string, spec: (typeof script.scenes)[number]) => {
  const lines = spec.narration;
  const total = probe(file);
  const sil = silences(file, 0.12);
  const head = sil.length && sil[0][0] < 0.05 ? sil[0][1] : 0;
  const tail = sil.length && sil[sil.length - 1][1] > total - 0.05 ? sil[sil.length - 1][0] : total;
  const inner = sil.filter(([a, b]) => a > head + 0.05 && b < tail - 0.05);
  if (inner.length < lines.length - 1) {
    throw new Error(`${spec.id}: 文と文の間の無音が足りません（必要 ${lines.length - 1}／検出 ${inner.length}）。原稿の空行（間）を確認してください`);
  }
  const weights = lines.map((l) => [...speechText(l).replace(/[「」『』\s]/g, '')].length);
  const sum = weights.reduce((a, b) => a + b, 0);
  const cuts: number[] = [];
  let acc = 0;
  let from = 0;
  for (let k = 0; k < lines.length - 1; k++) {
    acc += weights[k];
    const expected = head + ((tail - head) * acc) / sum;
    const remaining = lines.length - 2 - k;
    // 後の境目のために候補を残しつつ、予測位置に近く・長い無音を選ぶ
    let best = -1;
    let bestScore = Infinity;
    for (let j = from; j < inner.length - remaining; j++) {
      const [a, b] = inner[j];
      const score = Math.abs((a + b) / 2 - expected) - 1.5 * (b - a);
      if (score < bestScore) {
        bestScore = score;
        best = j;
      }
    }
    cuts.push((inner[best][0] + inner[best][1]) / 2);
    from = best + 1;
  }
  const bounds = [head, ...cuts, Math.min(total, tail + 0.15)];
  lines.forEach((l, k) => writeLine(file, l.id, Math.max(0, bounds[k] - 0.05), bounds[k + 1]));
  return lines.map((l, k) => `${l.id} ${(bounds[k + 1] - bounds[k]).toFixed(1)}秒 ${speechText(l)}`);
};

const importAudio = () => {
  if (!existsSync(IMPORT_DIR)) {
    mkdirSync(IMPORT_DIR, {recursive: true});
    console.log(`${IMPORT_DIR} を作成しました。ここに音声を置いてから、もう一度実行してください。`);
    return;
  }
  console.log(`取り込み元：${IMPORT_DIR}（${readdirSync(IMPORT_DIR).length}ファイル）`);
  script.scenes.forEach((spec, i) => {
    const sceneFile = findInput(`scene${String(i + 1).padStart(2, '0')}`);
    if (sceneFile) {
      console.log(`■ ${spec.id}：Scene音声を${spec.narration.length}文に分割`);
      splitScene(sceneFile, spec).forEach((r) => console.log('  ' + r));
    }
    // 文ごとのファイルがあれば、そちらを優先して上書き（分割がずれた文だけ差し替えたいとき用）
    for (const l of spec.narration) {
      const f = findInput(l.id);
      if (f) {
        writeLine(f, l.id);
        console.log(`  ${l.id}：文ごとの音声を取り込み`);
      }
    }
  });
  console.log('完了。npm run consulting:durations で尺を確認できます。');
};

const command = ({durations, csv, sheet, ondoku, import: importAudio} as Record<string, () => void>)[process.argv[2]];
if (command) command();
else console.error('usage: consulting.ts durations|csv|sheet|ondoku|import');
