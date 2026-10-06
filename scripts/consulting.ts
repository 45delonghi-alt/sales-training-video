// コンサルティング営業体験 導入動画の補助コマンド
//   npm run consulting:durations … 各Sceneの尺の一覧
//   npm run consulting:csv       … 音声合成用のナレーション一覧（consulting_narration.csv）
//   npm run consulting:sheet     … 印刷用のナレーション台本（out/consulting_narration.html → PDF化）
//   npm run consulting:ondoku    … 音読さん等に貼り付ける原稿（out/ondoku/）
//   npm run consulting:import    … 外部の音声合成で作った音声を取り込む（audio_import/ → 文ごとに分割・整音）
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {script} from '../src/consulting/script';
import {allLines, buildTimeline, speechText} from '../src/consulting/timeline';
import type {NarrationTiming} from '../src/consulting/types';

const ROOT = join(import.meta.dirname, '..');

const probe = (file: string) =>
  Number(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
      encoding: 'utf8',
    }).trim(),
  );

const TIMING_FILE = join(ROOT, 'src/consulting/narrationTiming.json');
const loadTiming = (): NarrationTiming => JSON.parse(readFileSync(TIMING_FILE, 'utf8'));

const durations = () => {
  const timing = loadTiming();
  const tl = buildTimeline(script, timing);
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
  console.log(`音声：${Object.keys(timing.lines).length}文（${Object.keys(timing.clips).length}クリップ、${timing.speed}倍速）。無い文は文字数から仮算出。`);
};

const csv = () => {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [
    ['文ID', 'Scene', '読み上げるテキスト', '画面上の文', '後に足す間(秒)'].map(q).join(','),
    ...allLines(script).map(({spec, line}) =>
      [line.id, spec.id, speechText(line), line.text, String(line.hold ?? 0)]
        .map(q)
        .join(','),
    ),
  ];
  const out = join(ROOT, 'consulting_narration.csv');
  writeFileSync(out, '﻿' + rows.join('\n') + '\n');
  console.log(`出力しました：${out}（${rows.length - 1}行）`);
};

const sheet = () => {
  const tl = buildTimeline(script, loadTiming());
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
          const status = l.estimated ? '<span class="missing">音声未生成</span>' : `${(l.speechFrames / tl.fps).toFixed(1)}秒`;
          return `<tr><td class="id">${l.line.id}</td><td class="time">${fmt(at)}</td><td class="text">${esc(l.line.text)}${reading}</td><td class="sub">${l.line.subtitles.map(esc).join('<br>')}</td><td class="num">${l.line.hold ? l.line.hold.toFixed(1) : '−'}</td><td class="num">${status}</td></tr>`;
        })
        .join('');
      return `<section><h2><span class="no">${String(i + 1).padStart(2, '0')}</span>${esc(s.spec.name)}<span class="meta">${s.spec.id}｜${fmt(start)}〜${fmt(start + s.durationInFrames / tl.fps)}</span></h2>
<table><thead><tr><th>ID</th><th>開始</th><th>ナレーション</th><th>字幕（区切り）</th><th>足す間<br>(秒)</th><th>音声</th></tr></thead><tbody>${rows}</tbody></table></section>`;
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
<p>全${tl.scenes.reduce((n, s) => n + s.lines.length, 0)}文／総尺 ${fmt(total)}／声：${esc(script.meta.narrator)}／${script.meta.speed}倍速／開始時刻は動画全体の経過時間（目安）</p></header>
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
//   ・Sceneごと：scene01.mp3 など（原稿 scene01.txt を読み上げたもの）→ 無音の位置から各文の開始・終了を推定
//   ・文ごと：S01_01.mp3 など（ナレーションIDと同じ名前）→ その文だけ単独のクリップとして差し替え
// 出力：
//   ・public/consulting/audio/narration/{先頭の文ID}.mp3 … 続けて読まれた文のまとまり（クリップ）。
//     hold（足す間）がある文の後ろでだけ区切り、それ以外は切らずにつなげる。meta.speed 倍速・音量そろえ済み
//   ・src/consulting/narrationTiming.json … 各文がどのクリップの何秒から何秒か（字幕・演出のタイミング用）
const IMPORT_DIR = join(ROOT, 'audio_import');
const EXTS = ['mp3', 'wav', 'm4a'];
const OUT_DIR = join(ROOT, 'public', script.meta.narrationDir);

// 自動推定では切れ目が見つからない（間を空けずに読まれた）箇所の手動指定：文ID → Scene音声上の開始秒
const START_OVERRIDES: Record<string, number> = {
  // scene07：「…見分けるセンサです。」の後の間（9.94〜10.12秒）。「「投光器」、」の読点の間と取り違えやすい
  PS_03: 10.04,
};

// 台本を書き換えて、手元の Scene 音声とは文面が違う文。録り直しが届くまで音声なし（字幕のみ）で扱う
const RERECORD = new Set<string>([]);

const findInput = (stem: string) =>
  EXTS.map((e) => join(IMPORT_DIR, `${stem}.${e}`)).find((f) => existsSync(f));

// src の from〜to 秒を切り出し、倍速・音量そろえをしてクリップとして書き出す。長さ（秒）を返す
const writeClip = (src: string, name: string, from?: number, to?: number) => {
  const out = join(OUT_DIR, `${name}.${script.meta.audioExt}`);
  const range = from === undefined ? [] : ['-ss', from.toFixed(3), '-to', (to as number).toFixed(3)];
  const af = [`atempo=${script.meta.speed}`, 'loudnorm=I=-16:TP=-1.5:LRA=11', 'aresample=44100'].join(',');
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...range, '-i', src, '-af', af, '-ac', '1', '-b:a', '128k', out]);
  return {file: `${script.meta.narrationDir}/${name}.${script.meta.audioExt}`, seconds: probe(out)};
};

// 文ごとの単独ファイル：前後の無音だけ詰めてからクリップにする
const trimmedRange = (file: string) => {
  const total = probe(file);
  const sil = silences(file, 0.06);
  const head = sil.length && sil[0][0] < 0.05 ? sil[0][1] : 0;
  const tail = sil.length && sil[sil.length - 1][1] > total - 0.05 ? sil[sil.length - 1][0] : total;
  return {start: Math.max(0, head - 0.05), end: Math.min(total, tail + 0.12)};
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
  // 息つぎ・ノイズのようなごく短い音（0.2秒未満）で区切られた無音は、1つの間としてまとめる
  const merged: [number, number][] = [];
  for (const s of list) {
    const last = merged[merged.length - 1];
    if (last && s[0] - last[1] < 0.2) last[1] = s[1];
    else merged.push([...s]);
  }
  return merged;
};

// Scene単位の音声を文ごとに分ける。
// 無音の候補から「文の数−1」個の切れ目を選ぶ。各文の長さが文字数比の予測に最も近く、
// かつ長い無音で切れる組み合わせを、動的計画法でまとめて選ぶ（1か所の誤りが後ろに波及しない）
const splitScene = (file: string, spec: (typeof script.scenes)[number]) => {
  const lines = spec.narration;
  const n = lines.length;
  const total = probe(file);
  const sil = silences(file, 0.06);
  const head = sil.length && sil[0][0] < 0.05 ? sil[0][1] : 0;
  const tail = sil.length && sil[sil.length - 1][1] > total - 0.05 ? sil[sil.length - 1][0] : total;
  const cand = sil
    .filter(([a, b]) => a > head + 0.05 && b < tail - 0.05)
    .map(([a, b]) => ({mid: (a + b) / 2, len: b - a, a, b}));
  if (cand.length < n - 1) {
    throw new Error(`${spec.id}: 文と文の間の無音が足りません（必要 ${n - 1}／検出 ${cand.length}）。文ごとの音声で送ってください`);
  }
  const weights = lines.map((l) => [...speechText(l).replace(/[「」『』\s]/g, '')].length);
  const sum = weights.reduce((x, y) => x + y, 0);
  const expected = weights.map((w) => ((tail - head) * w) / sum);
  const segCost = (k: number, from: number, to: number) => (to - from - expected[k]) ** 2 / expected[k];
  const GAP_BONUS = 2;
  // best[k][j]：k+1 番目の切れ目を候補 j に置いたときの最小コスト
  const best: number[][] = [];
  const prev: number[][] = [];
  for (let k = 0; k < n - 1; k++) {
    best.push(new Array(cand.length).fill(Infinity));
    prev.push(new Array(cand.length).fill(-1));
    for (let j = k; j < cand.length - (n - 2 - k); j++) {
      const bonus = -GAP_BONUS * cand[j].len;
      if (k === 0) {
        best[k][j] = segCost(0, head, cand[j].mid) + bonus;
        continue;
      }
      for (let i = k - 1; i < j; i++) {
        if (best[k - 1][i] === Infinity) continue;
        const c = best[k - 1][i] + segCost(k, cand[i].mid, cand[j].mid) + bonus;
        if (c < best[k][j]) {
          best[k][j] = c;
          prev[k][j] = i;
        }
      }
    }
  }
  let j = -1;
  let min = Infinity;
  best[n - 2].forEach((c, idx) => {
    const v = c + segCost(n - 1, cand[idx].mid, tail);
    if (v < min) {
      min = v;
      j = idx;
    }
  });
  const picked: number[] = [];
  for (let k = n - 2; k >= 0; k--) {
    picked.unshift(j);
    j = prev[k][j];
  }
  // 各文の範囲：無音の出口−0.08秒 〜 次の無音の入口＋0.12秒
  const gaps = picked.map((idx) => cand[idx]);
  const starts = [Math.max(0, head - 0.05), ...gaps.map((g) => Math.max(g.a, g.b - 0.08))];
  const ends = [...gaps.map((g) => Math.min(g.b, g.a + 0.12)), Math.min(total, tail + 0.12)];
  // 手動指定の切れ目
  lines.forEach((l, k) => {
    const at = START_OVERRIDES[l.id];
    if (at !== undefined && k > 0) {
      starts[k] = at;
      ends[k - 1] = at;
    }
  });
  return lines.map((l, k) => ({id: l.id, start: starts[k], end: ends[k]}));
};

const importAudio = () => {
  if (!existsSync(IMPORT_DIR)) {
    mkdirSync(IMPORT_DIR, {recursive: true});
    console.log(`${IMPORT_DIR} を作成しました。ここに音声を置いてから、もう一度実行してください。`);
    return;
  }
  const {speed} = script.meta;
  console.log(`取り込み元：${IMPORT_DIR}（${readdirSync(IMPORT_DIR).length}ファイル）／${speed}倍速`);
  rmSync(OUT_DIR, {recursive: true, force: true});
  mkdirSync(OUT_DIR, {recursive: true});
  const timing: NarrationTiming = {speed, clips: {}, lines: {}};

  script.scenes.forEach((spec, i) => {
    const sceneFile = findInput(`scene${String(i + 1).padStart(2, '0')}`);
    const ranges = sceneFile ? splitScene(sceneFile, spec) : [];
    if (sceneFile) console.log(`■ ${spec.id}`);
    // 文ごとのファイルがある文は単独クリップ。それ以外は hold の文の後ろで区切ってクリップにまとめる
    let group: {id: string; start: number; end: number}[] = [];
    const flush = () => {
      if (!group.length || !sceneFile) return;
      const from = group[0].start;
      const to = group[group.length - 1].end;
      const clip = writeClip(sceneFile, group[0].id, from, to);
      timing.clips[clip.file] = clip.seconds;
      for (const r of group) {
        timing.lines[r.id] = {clip: clip.file, start: (r.start - from) / speed, end: (r.end - from) / speed};
      }
      console.log(`  クリップ ${group[0].id}〜${group[group.length - 1].id}（${clip.seconds.toFixed(1)}秒）`);
      group = [];
    };
    spec.narration.forEach((line, k) => {
      const single = findInput(line.id);
      if (single) {
        flush();
        const r = trimmedRange(single);
        const clip = writeClip(single, line.id, r.start, r.end);
        timing.clips[clip.file] = clip.seconds;
        timing.lines[line.id] = {clip: clip.file, start: 0, end: clip.seconds};
        console.log(`  ${line.id}：文ごとの音声を単独で取り込み（${clip.seconds.toFixed(1)}秒）`);
        return;
      }
      if (!ranges[k]) return;
      if (RERECORD.has(line.id)) {
        flush();
        console.log(`  ${line.id}：台本変更のため録り直し待ち（字幕のみ）`);
        return;
      }
      group.push(ranges[k]);
      if (line.hold) flush();
    });
    flush();
  });

  writeFileSync(TIMING_FILE, JSON.stringify(timing, null, 1) + '\n');
  console.log(`完了：${Object.keys(timing.lines).length}文／${Object.keys(timing.clips).length}クリップ。npm run consulting:durations で尺を確認できます。`);
};

const command = ({durations, csv, sheet, ondoku, import: importAudio} as Record<string, () => void>)[process.argv[2]];
if (command) command();
else console.error('usage: consulting.ts durations|csv|sheet|ondoku|import');
