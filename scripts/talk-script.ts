// トークスクリプト（音読さん用）と、収録した音声の取り込み。
//   npm run experience:talk          … docs/consulting-experience/talk-script.md と ondoku/（音読さんに貼る原稿）を書き出す
//   npm run experience:import-audio  … audio_import/experience/ の音声を文ごとに分け、public/experience/audio/<セリフID>.mp3 と
//                                      src/experience/data/audioTiming.json（文ごとの秒数）を作る。映像の長さ・字幕はこの秒数に合わせて伸び縮みする
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {assetById, characterById, lineIdOf, linesForAsset, phases, scenes, speechOf} from '../src/experience/data';
import type {Line, Speaker} from '../src/experience/types';

const ROOT = join(__dirname, '..');
const DOCS = join(ROOT, 'docs', 'consulting-experience');
const ONDOKU = join(DOCS, 'ondoku');
const IMPORT_DIR = join(ROOT, 'audio_import', 'experience');
const AUDIO_DIR = join(ROOT, 'public', 'experience', 'audio');
const TIMING = join(ROOT, 'src', 'experience', 'data', 'audioTiming.json');
// 読み上げ速度：音読さんで決めた速さのまま取り込む（ナレーションは導入動画と同じ設定で作るので、取り込み時には変えない）
const SPEED = Number(process.env.SPEED || 1);
const speedOf = (sp: Speaker) => (sp === 'narration' ? Number(process.env.NARRATION_SPEED || 1) : SPEED);

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
// 音読さんに1回で貼れる文字数（無料プランの上限に合わせて小さめ。ONDOKU_LIMIT で変更できる）
const LIMIT = Number(process.env.ONDOKU_LIMIT || 450);
// 音読さんの原稿：話者ごとに、再生順のまま LIMIT 文字以内で区切る。ファイル名は <話者>_<2桁の連番>
const chunkGroups = (lines: TalkLine[]) => {
  const groups = new Map<string, TalkLine[]>();
  for (const sp of SPEAKER_ORDER) {
    let k = 0;
    let size = Infinity;
    for (const l of lines.filter((x) => x.speaker === sp)) {
      const n = [...speechOf(l.text)].length + 2;
      if (size + n > LIMIT) {
        k++;
        size = 0;
        groups.set(`${sp}_${String(k).padStart(2, '0')}`, []);
      }
      groups.get(`${sp}_${String(k).padStart(2, '0')}`)!.push(l);
      size += n;
    }
  }
  return groups;
};

// 音読さん Beta の声（話者ごと）。talk-script.md の「話者と声」と同じ
const BETA: Record<Speaker, string> = {
  narration: 'Yann',
  sales: 'Leo',
  sato: 'Roy',
  takahashi: 'Tina',
  mori: 'Reid',
  nakata: 'Emma',
};

// スライド（画面）ごとのトークスクリプト：再生順に、画面1枚ずつ、話者・声・読み上げ文・音声ファイル名
const writeBySlide = (lines: TalkLine[]) => {
  const slides = new Map<string, TalkLine[]>();
  for (const l of lines) {
    const key = l.lineId.replace(/_\d+$/, '');
    slides.set(key, [...(slides.get(key) ?? []), l]);
  }
  const titleOf = (key: string, first: TalkLine) => {
    if (key.startsWith('q-')) return `問い（${key.slice(2)}）`;
    if (key.startsWith('hint-')) return `先輩のヒント（${key.slice(5)}）`;
    if (key.startsWith('r-')) return '振り返りの問い';
    const h = assetById.get(key)?.shots.find((sh) => sh.header)?.header;
    return h ? `${h.no ? `${Number(h.no)}. ` : ''}${h.title}` : first.where;
  };
  const md: string[] = [
    '# トークスクリプト（スライドごと）',
    '',
    '> `npm run experience:talk` で自動生成。元データは `src/experience/data/phases.json`。',
    '',
    '映像の画面（スライド）1枚ごとに、再生順で並べています。',
    '',
    '- **読み上げ文**：音読さんに貼る文です。読み間違えやすい語は読み方に直しています（字幕は元の表記）。',
    '- **音声ファイル名**：1文ずつ作るときは、この名前（例：`p1-open_01.mp3`）で `audio_import/experience/` に置きます。話者ごとにまとめて作る場合は [talk-script.md](talk-script.md) の `ondoku/` を使います。',
    '- 声の設定（声色値・速度・ピッチ）は [talk-script.md](talk-script.md) の「話者と声」の表のとおりです。',
    '',
  ];
  let phase = '';
  let n = 0;
  for (const [key, ls] of slides) {
    if (ls[0].phaseId !== phase) {
      phase = ls[0].phaseId;
      md.push(`## ${phases.find((p) => p.phaseId === phase)?.phaseTitle ?? phase}`, '');
    }
    n++;
    md.push(`### スライド ${String(n).padStart(2, '0')}　${titleOf(key, ls[0])}`, '', `場面：${ls[0].where}`, '', '| # | 話者 | 声 | 読み上げ文 | 音声ファイル名 |', '|---|---|---|---|---|');
    ls.forEach((l, i) => md.push(`| ${i + 1} | ${nameOf(l.speaker)} | ${BETA[l.speaker]} | ${speechOf(l.text)} | \`${l.lineId}.mp3\` |`));
    md.push('');
  }
  writeFileSync(join(DOCS, 'talk-script-by-slide.md'), md.join('\n') + '\n');
};

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
    `2. \`ondoku/\` のテキストを、ファイルごとに音読さんへ貼り付けて読み上げる（1ファイル＝1回の生成。${LIMIT}文字以内に区切ってある。1行＝1文で、文と文のあいだの空行で自然に間が空く）。`,
    '3. できた音声（mp3）を、テキストと同じ名前で `audio_import/experience/` に置く（例：`sato_01.txt` → `sato_01.mp3`）。',
    '   - 1文だけ録り直すときは、セリフIDの名前で置く（例：`p1-q1-b_02.mp3`）。まとめた音声より優先される。',
    '4. `npm run experience:import-audio` を実行する → 文ごとに分けて `public/experience/audio/` に保存し、映像の長さと字幕のタイミングが音声に合わせて自動で調整される。',
    '5. `npm run experience:render` で動画を書き出す（アプリはそのまま再生できる）。',
    '',
    '読み上げ用のテキストは、読み間違えやすい語を読み方に置き換えています（OPTEX-FA→オプテックス・エフエー、PLC→ピーエルシー、0.5〜0.8%→0.5から0.8パーセント など）。字幕は元の表記のままです。',
    '',
    '## 話者と声',
    '',
    '音読さん Beta で、下の表の声と確定済みの設定（声色値・速度・ピッチ）を使ってください。設定は変えません。',
    '',
    '| 話者 | 役割 | 声のイメージ | 音読さん Beta の設定 |',
    '|---|---|---|---|',
  ];
  const SETTING: Record<string, string> = {
    narration: '導入動画と同じ：音読さん Beta「Yann（ヤン）」／声色値 1576295248／速度1.0x／ピッチ0／ビジネス（プロフェッショナルでビジネスライクに読み上げてください）／高速',
    sales: '音読さん Beta「Leo（レオ）」／声色値・速度・ピッチは確定済みの設定（音読さんに保存した値）／ビジネス（プロフェッショナルでビジネスライクに読み上げてください）／高速',
    sato: '音読さん Beta「Roy（ロイ）」／声色値・速度・ピッチは確定済みの設定（音読さんに保存した値）／ビジネス（プロフェッショナルでビジネスライクに読み上げてください）／高速',
    takahashi: '音読さん Beta「Tina（ティナ）」／声色値 407820404／速度・ピッチは確定済みの設定／ビジネス（プロフェッショナルでビジネスライクに読み上げてください）／高速',
    mori: '音読さん Beta「Reid（リード）」／声色値 -1388357271／速度・ピッチは確定済みの設定／ビジネス（プロフェッショナルでビジネスライクに読み上げてください）／高速',
    nakata: '音読さん Beta「Emma（エマ）」／声色値・速度・ピッチは確定済みの設定（音読さんに保存した値）／ビジネス（プロフェッショナルでビジネスライクに読み上げてください）／高速',
  };
  for (const sp of SPEAKER_ORDER) {
    const c = characterById.get(sp);
    const n = lines.filter((l) => l.speaker === sp).length;
    if (c && n) md.push(`| ${c.name} | ${c.title || '—'} | ${c.voice}（${n}文） | ${SETTING[sp] ?? ''} |`);
  }
  const apiVoices = SPEAKER_ORDER.map((sp) => characterById.get(sp)).filter((c) => c?.ondokuVoice).map((c) => `${c!.name}＝${c!.ondokuVoice!.replace('ja-JP-', '')}`);
  if (apiVoices.length)
    md.push(
      '',
      `- **録音の方針（2026-10-15）**：後半の音声は、全文を音読さん Beta（下の表の声。B案の人物設定：あなた＝Leo／森さん＝Reid／中田さん＝Emma／佐藤さん＝Roy／高橋さん＝Tina／ナレーション＝Yann）で作り直す。届くまでは、以前に収録した文のうち文が変わっていないものを仮に使い、文が変わったものは字幕だけで流す。`,
      '- 表の Beta の声に差し替えるときは、Beta で作った話者ごとの音声（例：`sato_01.mp3`）を `audio_import/experience/` に置き、同じ話者の文ごとの音声（例：`p1-open_01.mp3`）を消してから `npm run experience:import-audio`。',
    );
  md.push('', '- 男性：あなた（Leo）・森さん（Reid）・佐藤さん（Roy）。女性：中田さん（Emma）・高橋さん（Tina）。ナレーション：Yann。全員、確定済みの声色値・ピッチ・速度を変えない。', '- 「…」で終わる文は、少し間をとって言いよどむ感じに。');
  md.push('', '## 原稿ファイル（音読さんに貼るもの）', '', '| ファイル | 話者 | 文の数 | 文字数 | 最初のセリフID |', '|---|---|---|---|---|');
  const groups = chunkGroups(lines);
  for (const [g, ls] of groups) md.push(`| [ondoku/${g}.txt](ondoku/${g}.txt) | ${nameOf(ls[0].speaker)} | ${ls.length} | ${ls.reduce((n, l) => n + [...speechOf(l.text)].length, 0)} | \`${ls[0].lineId}\` |`);

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

  // 2) 音読さんに貼る原稿（話者ごと・文字数で区切り）と、取り込み用の対応表
  const index: string[] = ['file\torder\tlineId\tspeaker\ttext\tspeech'];
  for (const [g, ls] of groups) {
    writeFileSync(join(ONDOKU, `${g}.txt`), ls.map((l) => speechOf(l.text)).join('\n\n') + '\n');
    ls.forEach((l, i) => index.push([g, i + 1, l.lineId, l.speaker, l.text, speechOf(l.text)].join('\t')));
  }
  writeFileSync(join(ONDOKU, 'index.tsv'), index.join('\n') + '\n');
  writeBySlide(lines);
  console.log(`書き出し：talk-script.md・talk-script-by-slide.md・ondoku/（${groups.size}ファイル・${lines.length}文）`);
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
  // 1文の音声は、話し始め・話し終わりを切らないよう前後に余裕を残す（語尾の弱い音を切らない）
  if (n === 1) return [{start: Math.max(0, head - 0.08), end: Math.min(total, tail + 0.25)}];
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

// 音量は導入動画（完成版：全体で -16.8 LUFS）に合わせる
const writeLine = (src: string, lineId: string, from: number, to: number, speed = SPEED) => {
  const out = join(AUDIO_DIR, `${lineId}.mp3`);
  const af = [`atempo=${speed}`, 'loudnorm=I=-17:TP=-1.5:LRA=11', 'aresample=44100'].join(',');
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
  const groups = chunkGroups(lines);
  for (const [g, ls] of groups) {
    const whole = findInput(g);
    const ranges = whole ? split(whole, ls.map((l) => speechOf(l.text))) : [];
    ls.forEach((l, k) => {
      const single = findInput(l.lineId);
      if (single) {
        const [r] = split(single, [l.text]);
        timing[l.lineId] = writeLine(single, l.lineId, r.start, r.end, speedOf(l.speaker));
      } else if (whole) {
        timing[l.lineId] = writeLine(whole, l.lineId, ranges[k].start, ranges[k].end, speedOf(l.speaker));
      }
    });
    const got = ls.filter((l) => timing[l.lineId] !== undefined).length;
    if (got) console.log(`${g}：${got}/${ls.length}文`);
  }
  writeFileSync(TIMING, JSON.stringify(timing, null, 1) + '\n');
  console.log(`完了：${Object.keys(timing).length}/${lines.length}文を取り込みました（ナレーション ${speedOf('narration')}倍速・ほか ${SPEED}倍速）。未収録の文は字幕だけで進みます。`);
};

if (process.argv[1]?.endsWith('talk-script.ts')) {
  const cmd = process.argv[2];
  if (cmd === 'talk') writeTalk();
  else if (cmd === 'import') importAudio();
  else console.error('usage: talk-script.ts talk|import');
}
