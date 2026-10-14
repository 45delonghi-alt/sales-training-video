// トークスクリプト（音読さん用）と、収録した音声の取り込み。
//   npm run experience:talk          … docs/consulting-experience/talk-script.md と ondoku/（音読さんに貼る原稿）を書き出す
//   npm run experience:import-audio  … audio_import/experience/ の音声を文ごとに分け、public/experience/audio/<セリフID>.mp3 と
//                                      src/experience/data/audioTiming.json（文ごとの秒数）を作る。映像の長さ・字幕はこの秒数に合わせて伸び縮みする
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {characterById, lineIdOf, linesForAsset, phases, scenes, speechOf} from '../src/experience/data';
import type {Line, Speaker} from '../src/experience/types';

const ROOT = join(__dirname, '..');
const DOCS = join(ROOT, 'docs', 'consulting-experience');
const ONDOKU = join(DOCS, 'ondoku');
const IMPORT_DIR = join(ROOT, 'audio_import', 'experience');
const AUDIO_DIR = join(ROOT, 'public', 'experience', 'audio');
const TIMING = join(ROOT, 'src', 'experience', 'data', 'audioTiming.json');
// 読み上げ速度（音読さんで標準速度に作り、ここで微調整する。導入動画は 0.85 倍）
const SPEED = Number(process.env.SPEED || 1);

export type TalkLine = Line & {lineId: string; where: string; sceneId: string; phaseId: string};

// 再生順のセリフ一覧（問いの読み上げ・先輩のヒントも含む）
export const talkLines = (): TalkLine[] => {
  const out: TalkLine[] = [];
  const add = (assetId: string, lines: Line[], where: string, sceneId: string, phaseId: string) =>
    lines.forEach((l, i) => out.push({...l, lineId: lineIdOf(assetId, i), where, sceneId, phaseId}));
  for (const s of scenes) {
    if ((s.type === 'clip' || s.type === 'result') && linesForAsset(s.videoAsset).length) add(s.videoAsset, linesForAsset(s.videoAsset), s.title, s.sceneId, s.phaseId);
    if (s.type === 'question') {
      add(`q-${s.questionId}`, [{speaker: 'narration', text: s.questionText}], `${s.questionId} 問い`, s.sceneId, s.phaseId);
      if (s.hint) add(`hint-${s.questionId}`, [s.hint], `${s.questionId} ヒント`, s.sceneId, s.phaseId);
      for (const c of s.choices) add(c.videoAsset, linesForAsset(c.videoAsset), `${s.questionId}-${c.choiceId}「${c.choiceText}」`, s.sceneId, s.phaseId);
    }
    if (s.type === 'reflection') add(`r-${s.sceneId}`, [{speaker: 'narration', text: s.question}], s.title, s.sceneId, s.phaseId);
  }
  return out;
};

const SPEAKER_ORDER: Speaker[] = ['narration', 'sales', 'sato', 'takahashi', 'mori', 'nakata'];
const nameOf = (sp: Speaker) => characterById.get(sp)?.name ?? sp;
// 音読さんの原稿ファイル名：<2桁のフェーズ番号>_<フェーズ>_<話者>
const groupFile = (phaseId: string, sp: Speaker) => `${String(phases.findIndex((p) => p.phaseId === phaseId) + 1).padStart(2, '0')}_${phaseId}_${sp}`;

export const writeTalk = () => {
  const lines = talkLines();
  mkdirSync(ONDOKU, {recursive: true});
  for (const f of readdirSync(ONDOKU)) rmSync(join(ONDOKU, f));

  // 1) 読み物としての台本（再生順）
  const md: string[] = [
    '# トークスクリプト（音読さん用）',
    '',
    '> `npm run experience:talk` で src/experience/data/phases.json から自動生成。セリフを直すときは phases.json を直してから書き出してください。',
    '',
    '## 収録の手順',
    '',
    '1. 下の「話者と声」で、話者ごとに音読さんの声を1つ決める（同じ話者は最後まで同じ声）。',
    '2. `ondoku/` のテキストを、ファイルごとに音読さんへ貼り付けて読み上げる（1行＝1文。文と文のあいだの空行で、自然に間が空く）。',
    '   - フェーズごとの原稿（`02_p1_sato.txt` など22ファイル）と、話者ごとに全編をまとめた原稿（`all_sato.txt` など6ファイル）の、どちらで録ってもよい。',
    '3. できた音声を、テキストと同じ名前で `audio_import/experience/` に置く（例：`02_p1_sato.mp3`、`all_sato.mp3`）。',
    '   - 1文だけ録り直すときは、セリフIDの名前で置く（例：`p1-q1-b_02.mp3`）。まとめた音声より優先される。',
    '4. `npm run experience:import-audio` を実行する → 文ごとに分けて `public/experience/audio/` に保存し、映像の長さと字幕のタイミングが音声に合わせて自動で調整される。',
    '5. `npm run experience:render` で動画を書き出す（アプリはそのまま再生できる）。',
    '',
    '読み上げ用のテキストは、読み間違えやすい語を読み方に置き換えています（OPTEX-FA→オプテックス・エフエー、PLC→ピーエルシー、0.5〜0.8%→0.5から0.8パーセント など）。字幕は元の表記のままです。',
    '',
    '## 話者と声',
    '',
    '| 話者 | 役割 | 声のイメージ | 音読さんの声（記入） |',
    '|---|---|---|---|',
  ];
  for (const sp of SPEAKER_ORDER) {
    const c = characterById.get(sp);
    const n = lines.filter((l) => l.speaker === sp).length;
    if (c && n) md.push(`| ${c.name} | ${c.title || '—'} | ${c.voice}（${n}文） | |`);
  }
  md.push('', '## 原稿ファイル（音読さんに貼るもの）', '', '話者ごとにまとめた原稿：' + SPEAKER_ORDER.filter((sp) => lines.some((l) => l.speaker === sp)).map((sp) => `[all_${sp}.txt](ondoku/all_${sp}.txt)（${nameOf(sp)}）`).join('・'), '', 'フェーズごとの原稿：', '', '| ファイル | 話者 | 文の数 |', '|---|---|---|');
  const groups = new Map<string, TalkLine[]>();
  for (const l of lines) {
    const g = groupFile(l.phaseId, l.speaker);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(l);
  }
  for (const [g, ls] of [...groups].sort()) md.push(`| [ondoku/${g}.txt](ondoku/${g}.txt) | ${nameOf(ls[0].speaker)} | ${ls.length} |`);

  md.push('', '## 全編のセリフ（再生順）', '');
  let phase = '';
  let where = '';
  for (const l of lines) {
    if (l.phaseId !== phase) {
      phase = l.phaseId;
      md.push('', `### ${phases.find((p) => p.phaseId === phase)?.phaseTitle}`, '');
      where = '';
    }
    if (l.where !== where) {
      where = l.where;
      md.push('', `**${where}**`, '', '| セリフID | 話者 | セリフ |', '|---|---|---|');
    }
    md.push(`| \`${l.lineId}\` | ${nameOf(l.speaker)} | ${l.text} |`);
  }
  writeFileSync(join(DOCS, 'talk-script.md'), md.join('\n') + '\n');

  // 2) 音読さんに貼る原稿（フェーズ×話者）と、取り込み用の対応表
  const index: string[] = ['file\torder\tlineId\tspeaker\ttext\tspeech'];
  for (const [g, ls] of groups) {
    writeFileSync(join(ONDOKU, `${g}.txt`), ls.map((l) => speechOf(l.text)).join('\n\n') + '\n');
    ls.forEach((l, i) => index.push([g, i + 1, l.lineId, l.speaker, l.text, speechOf(l.text)].join('\t')));
  }
  // 話者ごとに全編を1つにまとめた原稿（こちらで録ってもよい。ファイル名は all_<話者>）
  for (const sp of SPEAKER_ORDER) {
    const ls = lines.filter((l) => l.speaker === sp);
    if (ls.length) writeFileSync(join(ONDOKU, `all_${sp}.txt`), ls.map((l) => speechOf(l.text)).join('\n\n') + '\n');
  }
  writeFileSync(join(ONDOKU, 'index.tsv'), index.join('\n') + '\n');
  console.log(`書き出し：talk-script.md・ondoku/（${groups.size}ファイル・${lines.length}文）`);
};

// ---------------------------------------------------------------- 取り込み
const probe = (f: string) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

const silences = (file: string, min: number) => {
  const r = spawnSync('ffmpeg', ['-i', file, '-af', `silencedetect=noise=-40dB:d=${min}`, '-f', 'null', '-'], {encoding: 'utf8'});
  const list: [number, number][] = [];
  let start: number | null = null;
  for (const m of r.stderr.matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (m[1] === 'start') start = Number(m[2]);
    else if (start !== null) {
      list.push([start, Number(m[2])]);
      start = null;
    }
  }
  const merged: [number, number][] = [];
  for (const s of list) {
    const last = merged[merged.length - 1];
    if (last && s[0] - last[1] < 0.2) last[1] = s[1];
    else merged.push([...s]);
  }
  return merged;
};

// まとめて読んだ音声を n 文に分ける。文字数比で予想した長さに最も近く、長い無音で切れる組み合わせを選ぶ（動的計画法）
const split = (file: string, texts: string[]) => {
  const n = texts.length;
  const total = probe(file);
  const sil = silences(file, 0.15);
  const head = sil.length && sil[0][0] < 0.05 ? sil[0][1] : 0;
  const tail = sil.length && sil[sil.length - 1][1] > total - 0.05 ? sil[sil.length - 1][0] : total;
  if (n === 1) return [{start: Math.max(0, head - 0.05), end: Math.min(total, tail + 0.12)}];
  const cand = sil.filter(([a, b]) => a > head + 0.05 && b < tail - 0.05).map(([a, b]) => ({mid: (a + b) / 2, len: b - a, a, b}));
  if (cand.length < n - 1) throw new Error(`${file}：文の間の無音が足りません（必要 ${n - 1}／検出 ${cand.length}）。1文ずつの音声で置いてください`);
  const w = texts.map((t) => [...t.replace(/[「」『』\s]/g, '')].length);
  const sum = w.reduce((x, y) => x + y, 0);
  const exp = w.map((x) => ((tail - head) * x) / sum);
  const cost = (k: number, a: number, b: number) => (b - a - exp[k]) ** 2 / exp[k];
  const best: number[][] = [];
  const prev: number[][] = [];
  for (let k = 0; k < n - 1; k++) {
    best.push(new Array(cand.length).fill(Infinity));
    prev.push(new Array(cand.length).fill(-1));
    for (let j = k; j < cand.length - (n - 2 - k); j++) {
      const bonus = -2 * cand[j].len;
      if (k === 0) {
        best[k][j] = cost(0, head, cand[j].mid) + bonus;
        continue;
      }
      for (let i = k - 1; i < j; i++) {
        if (best[k - 1][i] === Infinity) continue;
        const c = best[k - 1][i] + cost(k, cand[i].mid, cand[j].mid) + bonus;
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
    const v = c + cost(n - 1, cand[idx].mid, tail);
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
  const gaps = picked.map((i) => cand[i]);
  const starts = [Math.max(0, head - 0.05), ...gaps.map((g) => Math.max(g.a, g.b - 0.08))];
  const ends = [...gaps.map((g) => Math.min(g.b, g.a + 0.12)), Math.min(total, tail + 0.12)];
  return texts.map((_, k) => ({start: starts[k], end: ends[k]}));
};

const EXTS = ['mp3', 'wav', 'm4a'];
const findInput = (stem: string) => EXTS.map((e) => join(IMPORT_DIR, `${stem}.${e}`)).find((f) => existsSync(f));

const writeLine = (src: string, lineId: string, from: number, to: number) => {
  const out = join(AUDIO_DIR, `${lineId}.mp3`);
  const af = [`atempo=${SPEED}`, 'loudnorm=I=-16:TP=-1.5:LRA=11', 'aresample=44100'].join(',');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', from.toFixed(3), '-to', to.toFixed(3), '-i', src, '-af', af, '-ac', '1', '-b:a', '128k', out]);
  return probe(out);
};

const importAudio = () => {
  if (!existsSync(IMPORT_DIR)) {
    mkdirSync(IMPORT_DIR, {recursive: true});
    console.log(`${IMPORT_DIR} を作成しました。音読さんで作った音声を置いてから、もう一度実行してください。`);
    return;
  }
  rmSync(AUDIO_DIR, {recursive: true, force: true});
  mkdirSync(AUDIO_DIR, {recursive: true});
  const timing: Record<string, number> = {};
  const lines = talkLines();
  const groups = new Map<string, TalkLine[]>();
  for (const l of lines) {
    const g = groupFile(l.phaseId, l.speaker);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(l);
  }
  // 話者ごとのまとめ音声（all_<話者>）があれば、先に全編を分けておく
  const fromAll = new Map<string, {file: string; start: number; end: number}>();
  for (const sp of SPEAKER_ORDER) {
    const f = findInput(`all_${sp}`);
    if (!f) continue;
    const ls = lines.filter((l) => l.speaker === sp);
    split(f, ls.map((l) => speechOf(l.text))).forEach((r, k) => fromAll.set(ls[k].lineId, {file: f, ...r}));
    console.log(`all_${sp}：${ls.length}文に分けました`);
  }
  for (const [g, ls] of groups) {
    const whole = findInput(g);
    const ranges = whole ? split(whole, ls.map((l) => speechOf(l.text))) : [];
    ls.forEach((l, k) => {
      const single = findInput(l.lineId);
      if (single) {
        const [r] = split(single, [l.text]);
        timing[l.lineId] = writeLine(single, l.lineId, r.start, r.end);
      } else if (whole) {
        timing[l.lineId] = writeLine(whole, l.lineId, ranges[k].start, ranges[k].end);
      } else if (fromAll.has(l.lineId)) {
        const r = fromAll.get(l.lineId)!;
        timing[l.lineId] = writeLine(r.file, l.lineId, r.start, r.end);
      }
    });
    const got = ls.filter((l) => timing[l.lineId] !== undefined).length;
    if (got) console.log(`${g}：${got}/${ls.length}文`);
  }
  writeFileSync(TIMING, JSON.stringify(timing, null, 1) + '\n');
  console.log(`完了：${Object.keys(timing).length}/${lines.length}文を取り込みました（${SPEED}倍速）。未収録の文は字幕だけで進みます。`);
};

if (process.argv[1]?.endsWith('talk-script.ts')) {
  const cmd = process.argv[2];
  if (cmd === 'talk') writeTalk();
  else if (cmd === 'import') importAudio();
  else console.error('usage: talk-script.ts talk|import');
}
