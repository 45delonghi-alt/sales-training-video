// 音声配置一覧と、音声の品質確認（未使用・誤配置・重複再生・音切れ・字幕の不一致）。
//   npx tsx scripts/web-experience/audio-placement.ts
// 入力：assets-src/audio/beta-2026-10-15/（受領した16本）、audio_import/experience/split.json（文の区切り）、取り込み済みの1文ずつの音声
// 出力：out/audio-placement.json（一覧と確認結果。docs と xlsx の元データ）
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {characterById, clipById, clipSeconds, lineSchedule, linesForAsset, sceneById} from '../../src/experience/data';
import {talkLines} from '../talk-script';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'assets-src', 'audio', 'beta-2026-10-15');
const IMPORT = join(ROOT, 'audio_import', 'experience');
const AUDIO = join(ROOT, 'public', 'experience', 'audio');
const GAP = 0.9; // _part1 と _part2 のあいだに入れた無音（取り込み時）
const VOICE: Record<string, string> = {narration: 'Yann', sales: 'Ash', sato: 'Ash', takahashi: 'Misa', mori: 'Leo', nakata: 'Ellis'};
const PHASE: Record<string, string> = {intro: '導入', p1: 'PHASE 1 聞く', p2: 'PHASE 2 考える', p3: 'PHASE 3 課題を見つける', p4: 'PHASE 4 提案する', reflection: '振り返り'};

const probe = (f: string) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
const silences = (f: string): [number, number][] => {
  const r = spawnSync('ffmpeg', ['-i', f, '-af', 'silencedetect=noise=-40dB:d=0.15', '-f', 'null', '-'], {encoding: 'utf8'});
  const st = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const en = [...r.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  return st.map((s, i) => [s, en[i] ?? Infinity]);
};
// 頭・お尻の 40ミリ秒の最大音量（dB）。大きいと、話の途中で切れている
const edgeDb = (f: string, from: number) => edgeDbLen(f, from, 0.04);
const edgeDbLen = (f: string, from: number, len: number) => {
  const r = spawnSync('ffmpeg', ['-ss', Math.max(0, from).toFixed(3), '-t', len.toFixed(3), '-i', f, '-af', 'volumedetect', '-f', 'null', '-'], {encoding: 'utf8'});
  const m = r.stderr.match(/max_volume: (-?[\d.]+|-inf)/);
  return m ? (m[1] === '-inf' ? -99 : Number(m[1])) : -99;
};

const main = () => {
  const split: Record<string, {start: number; end: number}[]> = JSON.parse(readFileSync(join(IMPORT, 'split.json'), 'utf8'));
  const timing: Record<string, number> = JSON.parse(readFileSync(join(ROOT, 'src/experience/data/audioTiming.json'), 'utf8'));
  const lines = talkLines();
  // 文 → 受領ファイル（_part1/_part2）と、その中の位置
  const byGroup = new Map<string, typeof lines>();
  const groupOf = new Map<string, string>();
  const tsv = readFileSync(join(ROOT, 'docs/consulting-experience/ondoku/index.tsv'), 'utf8').trim().split('\n').slice(1).map((r) => r.split('\t'));
  for (const [file, , lineId] of tsv) groupOf.set(lineId, file);
  for (const l of lines) {
    const g = groupOf.get(l.lineId)!;
    byGroup.set(g, [...(byGroup.get(g) ?? []), l]);
  }
  // 素材ごとの時間割（映像の中で、何秒から話すか）
  const usedIn = new Map<string, {assetId: string; from: number; to: number; clip: number; next?: number}[]>();
  for (const a of clipById.values()) {
    const ls = linesForAsset(a.assetId);
    const sched = lineSchedule(ls, a.dialogAt ?? 0.8, a.assetId);
    const clip = clipSeconds(a.seconds, ls, a.dialogAt ?? 0.8, a.assetId);
    sched.forEach((s, i) => {
      if (!s.lineId) return;
      usedIn.set(s.lineId, [...(usedIn.get(s.lineId) ?? []), {assetId: a.assetId, from: s.from, to: s.to, clip, next: sched[i + 1]?.from}]);
    });
  }

  const rows: Record<string, unknown>[] = [];
  const files: Record<string, unknown>[] = [];
  for (const [g, ls] of byGroup) {
    const parts = existsSync(join(SRC, `${g}_part1.mp3`)) ? [`${g}_part1.mp3`, `${g}_part2.mp3`] : [`${g}.mp3`];
    const p1 = probe(join(SRC, parts[0]));
    const ranges = split[g];
    const whole = join(IMPORT, `${g}.mp3`);
    // 未使用：話している部分（無音でないところ）が、どの文の範囲にも入っていない
    const sil = silences(whole);
    const total = probe(whole);
    const speech: [number, number][] = [];
    let t = 0;
    for (const [a, b] of sil) {
      if (a - t > 0.05) speech.push([t, a]);
      t = b;
    }
    if (total - t > 0.05) speech.push([t, total]);
    const unused = speech
      .map(([a, b]) => {
        let left = b - a;
        for (const r of ranges) left -= Math.max(0, Math.min(b, r.end) - Math.max(a, r.start));
        return {a, b, left};
      })
      .filter((x) => x.left > 0.15);
    for (const p of parts) files.push({file: p, seconds: +probe(join(SRC, p)).toFixed(2), group: g, lines: 0, unused: [] as string[]});
    ls.forEach((l, k) => {
      const r = ranges[k];
      const inPart2 = parts.length === 2 && r.start >= p1 + GAP / 2;
      const off = inPart2 ? p1 + GAP : 0;
      const part = inPart2 ? parts[1] : parts[0];
      const f = files.find((x) => x.file === part)!;
      f.lines = (f.lines as number) + 1;
      const per = join(AUDIO, `${l.lineId}.mp3`);
      const sec = timing[l.lineId];
      const uses = usedIn.get(l.lineId) ?? [];
      const u = uses[0];
      const issues: string[] = [];
      const fileSpeaker = g.replace(/_\d+$/, '');
      if (fileSpeaker !== l.speaker) issues.push(`誤配置：${g} は ${fileSpeaker} の音声だが、話者は ${l.speaker}`);
      if (!existsSync(per) || sec === undefined) issues.push('未配置：1文の音声がない');
      if (uses.length === 0) issues.push('未使用：どの映像にも入っていない');
      if (uses.length > 1) issues.push(`重複：${uses.map((x) => x.assetId).join('・')} に入っている`);
      if (u && sec !== undefined && u.next !== undefined && u.from + sec > u.next + 0.01) issues.push(`重複再生：次の文と ${(u.from + sec - u.next).toFixed(2)}秒 重なる`);
      if (u && sec !== undefined && u.from + sec > u.clip + 0.01) issues.push('音切れ：映像の終わりより長い');
      if (u && sec !== undefined && u.to - u.from < sec - 0.01) issues.push('字幕：音声より先に消える');
      const head = existsSync(per) ? edgeDb(per, 0) : -99;
      const tail = existsSync(per) ? edgeDb(per, (sec ?? 0) - 0.04) : -99;
      // 1文の音声の頭・お尻が大きいときは、受領した音声で、区切りの外側（0.12秒）が無音かを確かめる。無音なら切れていない（音量の正規化による）
      const srcAround = (at: number) => edgeDbLen(whole, at, 0.12);
      if (head > -20 && srcAround(r.start - 0.12) > -40) issues.push(`音切れ：話し始めが切れている（頭 ${head}dB）`);
      if (tail > -20 && srcAround(r.end) > -40) issues.push(`音切れ：語尾が切れている（お尻 ${tail}dB）`);
      const sc = sceneById.get(l.sceneId);
      const choice = sc?.type === 'question' ? sc.choices.find((c) => c.videoAsset === u?.assetId) : undefined;
      rows.push({
        lineId: l.lineId,
        sourceFile: part,
        sourceFrom: +(r.start - off).toFixed(2),
        sourceTo: +(r.end - off).toFixed(2),
        speaker: characterById.get(l.speaker)?.name ?? l.speaker,
        voice: VOICE[l.speaker],
        text: l.text,
        phase: PHASE[l.phaseId] ?? l.phaseId,
        scene: sc?.title ?? l.sceneId,
        role: u?.assetId.startsWith('q-') ? '問い' : u?.assetId.startsWith('hint-') ? '先輩のヒント' : u?.assetId.startsWith('r-') ? '振り返り' : choice ? `選択肢${choice.choiceId}` : '共通',
        assetId: u?.assetId ?? '',
        clipFrom: u ? +u.from.toFixed(2) : null,
        clipTo: u && sec !== undefined ? +(u.from + sec).toFixed(2) : null,
        subtitleTo: u ? +u.to.toFixed(2) : null,
        seconds: sec !== undefined ? +sec.toFixed(2) : null,
        clipSeconds: u ? +u.clip.toFixed(2) : null,
        wipe: l.speaker === 'narration' ? 'なし（ナレーション）' : characterById.get(l.speaker)?.category === 'optex' ? '左（OPTEX-FA）' : '右（お客様）',
        issues,
      });
    });
    for (const x of unused) {
      const inPart2 = parts.length === 2 && x.a >= p1 + GAP / 2;
      const f = files.find((y) => y.file === (inPart2 ? parts[1] : parts[0]))!;
      const off = inPart2 ? p1 + GAP : 0;
      (f.unused as string[]).push(`${(x.a - off).toFixed(2)}〜${(x.b - off).toFixed(2)}秒（${x.left.toFixed(2)}秒）`);
    }
  }
  const ng = rows.filter((r) => (r.issues as string[]).length);
  writeFileSync(join(ROOT, 'out', 'audio-placement.json'), JSON.stringify({files, rows}, null, 1));
  console.log(`受領 ${files.length}本・${rows.length}文。確認で引っかかった文 ${ng.length}`);
  for (const f of files) console.log(`  ${f.file}：${f.lines}文${(f.unused as string[]).length ? `／どの文にも入っていない音 ${(f.unused as string[]).join('、')}` : ''}`);
  for (const r of ng) console.log(`  ${r.lineId}：${(r.issues as string[]).join('／')}`);
};

main();
