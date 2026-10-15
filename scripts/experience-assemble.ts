// 書き出した各クリップをつないで、1本の MP4 にする。あわせて、音声の欠落・重複・順序違いを確認する。
//   npx tsx scripts/experience-assemble.ts all        … 全64スライド（台本の順。A/B/C の分岐もすべて）
//   npx tsx scripts/experience-assemble.ts recommended … 導入動画＋推奨ルート（問い→ヒント→推奨の選択肢）
// 前提：npm run experience:render で out/experience/videos/<ID>.mp4 を書き出し済み
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {cardByKey, clipById, clipSeconds, lineSchedule, linesForAsset, scenes} from '../src/experience/data';

const ROOT = join(__dirname, '..');
// VIDEOS_DIR で書き出し先を変えられる。PARTIAL=1 なら、まだ書き出していないクリップの手前までで1本にする（途中確認用）
const VIDEOS = process.env.VIDEOS_DIR || join(ROOT, 'out', 'experience', 'videos');
const PARTIAL = process.env.PARTIAL === '1';
const OUT = join(ROOT, 'out', 'experience', 'final');
const FPS = 30;
const mode = process.argv[2] === 'recommended' ? 'recommended' : 'all';

// 再生順のクリップ（と、その場面。フェーズナビゲーションの表示に使う）
const sceneOfClip = new Map<string, string>();
const order = (): string[] => {
  const ids: string[] = [];
  const add = (id: string, sceneId: string) => {
    ids.push(id);
    sceneOfClip.set(id, sceneId);
  };
  for (const s of scenes) {
    if (s.type === 'clip' || s.type === 'result' || s.type === 'demo') add(s.videoAsset, s.sceneId);
    if (s.type === 'question') {
      add(`q-${s.questionId}`, s.sceneId);
      if (cardByKey.has(`hint-${s.questionId}`)) add(`hint-${s.questionId}`, s.sceneId);
      const picks = mode === 'all' ? s.choices : s.choices.filter((c) => c.choiceId === (s.recommendedChoice ?? 'A'));
      for (const c of picks) add(c.videoAsset, s.sceneId);
    }
    if (s.type === 'reflection') add(`r-${s.sceneId}`, s.sceneId);
  }
  // 推奨ルートでは「基準未達のときの次の一手」は通らない
  return mode === 'recommended' ? ids.filter((id) => id !== 'p4-followup') : ids;
};

// 単独再生用なので、フェーズナビゲーション（上部）とチャプタータイトル（フェーズの最初のクリップの頭 2.6秒）を焼き込む。
// 画像は scripts/web-experience/nav-overlays.ts で書き出したもの（ない場合は重ねない）
const NAV = join(ROOT, 'out', 'experience', 'nav');
const CHAPTER_SEC = 2.6;
const navFilter = (navPng?: string, chapterPng?: string): {inputs: string[]; filter: string} => {
  const inputs: string[] = [];
  const steps: string[] = ['[0:v]scale=1920:1080,fps=30,format=yuva420p[v0]'];
  let last = 'v0';
  if (navPng && existsSync(navPng)) {
    inputs.push('-i', navPng);
    steps.push(`[${last}][1:v]overlay=0:0[v1]`);
    last = 'v1';
  }
  if (chapterPng && existsSync(chapterPng)) {
    const k = inputs.length / 2 + 1;
    inputs.push('-loop', '1', '-t', String(CHAPTER_SEC), '-i', chapterPng);
    steps.push(`[${k}:v]format=rgba,fade=t=in:st=0:d=0.3:alpha=1,fade=t=out:st=${CHAPTER_SEC - 0.4}:d=0.4:alpha=1[ch]`, `[${last}][ch]overlay=0:0:eof_action=pass[v2]`);
    last = 'v2';
  }
  steps.push(`[${last}]format=yuv420p[vout]`);
  return {inputs, filter: steps.join(';')};
};

const sh = (cmd: string, args: string[]) => execFileSync(cmd, args, {stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26}).toString();
const probe = (f: string, stream?: 'v' | 'a') =>
  Number(sh('ffprobe', ['-v', 'error', ...(stream ? ['-select_streams', stream, '-show_entries', 'stream=duration'] : ['-show_entries', 'format=duration']), '-of', 'csv=p=0', f]).trim().split('\n')[0].replace(/,/g, ''));

// 映像と音声を別々に用意し、音声は映像の長さぴったりに切りそろえて（サンプル単位で）つなぐ。
// クリップごとに音声が映像より少し長い（約16ミリ秒）ので、そのままつなぐと後ろへ行くほど音声が遅れるため。
const piece = (src: string, base: string, navPng?: string, chapterPng?: string) => {
  const v = probe(src, 'v');
  const nav = navFilter(navPng, chapterPng);
  sh('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-i', src, ...nav.inputs, '-an', '-filter_complex', nav.filter, '-map', '[vout]', '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-t', v.toFixed(4), '-f', 'mpegts', `${base}.ts`]);
  sh('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-i', src, '-vn', '-ac', '2', '-ar', '48000', '-af', `apad,atrim=end=${v.toFixed(4)}`, '-c:a', 'pcm_s16le', `${base}.wav`]);
  return v;
};

const main = () => {
  mkdirSync(OUT, {recursive: true});
  const seg = join(OUT, `seg-${mode}`);
  rmSync(seg, {recursive: true, force: true});
  mkdirSync(seg, {recursive: true});
  const all = order();
  const firstMissing = PARTIAL ? all.findIndex((id) => !existsSync(join(VIDEOS, `${id}.mp4`))) : -1;
  const ids = firstMissing >= 0 ? all.slice(0, firstMissing) : all;
  const bases: string[] = [];
  const manifest: {id: string; start: number; duration: number; lines: {lineId: string; at: number; seconds: number; text: string}[]}[] = [];
  let t = 0;
  if (mode === 'recommended') {
    const base = join(seg, '000-intro');
    const d = piece(join(ROOT, 'public', 'consulting', 'video', 'intro-fixed.mp4'), base);
    bases.push(base);
    manifest.push({id: 'intro', start: t, duration: d, lines: []});
    t += d;
  }
  let lastPhase = 'intro';
  ids.forEach((id, k) => {
    const src = join(VIDEOS, `${id}.mp4`);
    const sceneId = sceneOfClip.get(id)!;
    const phaseId = scenes.find((x) => x.sceneId === sceneId)?.phaseId ?? 'intro';
    const chapter = phaseId !== lastPhase && /^p[1-4]$/.test(phaseId) ? join(NAV, `chapter-${phaseId}.png`) : undefined;
    lastPhase = phaseId;
    if (!existsSync(src)) throw new Error(`クリップがありません：${src}`);
    const a = clipById.get(id)!;
    const lines = linesForAsset(id);
    const expect = Math.ceil(clipSeconds(a.seconds, lines, a.dialogAt ?? 0.8, id) * FPS) / FPS;
    const base = join(seg, `${String(k + 1).padStart(3, '0')}-${id}`);
    const d = piece(src, base, join(NAV, `${sceneId}.png`), chapter);
    bases.push(base);
    if (Math.abs(d - expect) > 0.05) throw new Error(`${id}：クリップの長さ ${d.toFixed(2)}秒が想定 ${expect.toFixed(2)}秒と違います（書き出しが古い可能性）`);
    const sched = lineSchedule(lines, a.dialogAt ?? 0.8, id).filter((l) => l.recorded);
    manifest.push({id, start: t, duration: d, lines: sched.map((l) => ({lineId: l.lineId!, at: t + l.from, seconds: l.to - l.from - 0.15, text: l.text}))});
    t += d;
  });
  const name = (mode === 'all' ? 'experience-all-64-slides' : 'experience-with-intro') + (firstMissing >= 0 ? '-partial' : '') + '.mp4';
  const out = join(OUT, name);
  const list = join(seg, 'audio.txt');
  writeFileSync(list, bases.map((b) => `file '${b}.wav'`).join('\n') + '\n');
  sh('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', join(seg, 'audio.wav')]);
  sh('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-i', `concat:${bases.map((b) => `${b}.ts`).join('|')}`, '-c', 'copy', join(seg, 'video.ts')]);
  sh('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-i', join(seg, 'video.ts'), '-i', join(seg, 'audio.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
  writeFileSync(join(OUT, name.replace('.mp4', '.manifest.json')), JSON.stringify({file: name, duration: probe(out), clips: manifest}, null, 1));
  rmSync(seg, {recursive: true, force: true});
  const nLines = manifest.reduce((n, c) => n + c.lines.length, 0);
  console.log(`${name}：${ids.length}クリップ・${nLines}文・${probe(out).toFixed(1)}秒（映像 ${probe(out, 'v').toFixed(2)}秒／音声 ${probe(out, 'a').toFixed(2)}秒／台本上 ${t.toFixed(2)}秒）`);
  console.log(`音声の照合：python3 scripts/experience-verify.py ${join(OUT, name.replace('.mp4', '.manifest.json'))}`);
};

main();
