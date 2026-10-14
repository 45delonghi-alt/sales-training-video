// 書き出した各クリップをつないで、1本の MP4 にする。あわせて、音声の欠落・重複・順序違いを確認する。
//   npx tsx scripts/experience-assemble.ts all        … 全64スライド（台本の順。A/B/C の分岐もすべて）
//   npx tsx scripts/experience-assemble.ts recommended … 導入動画＋推奨ルート（問い→ヒント→推奨の選択肢）
// 前提：npm run experience:render で out/experience/videos/<ID>.mp4 を書き出し済み
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {cardByKey, clipById, clipSeconds, lineSchedule, linesForAsset, scenes} from '../src/experience/data';

const ROOT = join(__dirname, '..');
const VIDEOS = join(ROOT, 'out', 'experience', 'videos');
const OUT = join(ROOT, 'out', 'experience', 'final');
const FPS = 30;
const mode = process.argv[2] === 'recommended' ? 'recommended' : 'all';

// 再生順のクリップ
const order = (): string[] => {
  const ids: string[] = [];
  for (const s of scenes) {
    if (s.type === 'clip' || s.type === 'result' || s.type === 'demo') ids.push(s.videoAsset);
    if (s.type === 'question') {
      ids.push(`q-${s.questionId}`);
      if (cardByKey.has(`hint-${s.questionId}`)) ids.push(`hint-${s.questionId}`);
      const picks = mode === 'all' ? s.choices : s.choices.filter((c) => c.choiceId === (s.recommendedChoice ?? 'A'));
      ids.push(...picks.map((c) => c.videoAsset));
    }
    if (s.type === 'reflection') ids.push(`r-${s.sceneId}`);
  }
  // 推奨ルートでは「基準未達のときの次の一手」は通らない
  return mode === 'recommended' ? ids.filter((id) => id !== 'p4-followup') : ids;
};

const sh = (cmd: string, args: string[]) => execFileSync(cmd, args, {stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26}).toString();
const probe = (f: string) => Number(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim());

const main = () => {
  mkdirSync(OUT, {recursive: true});
  const seg = join(OUT, `seg-${mode}`);
  rmSync(seg, {recursive: true, force: true});
  mkdirSync(seg, {recursive: true});
  const ids = order();
  const parts: string[] = [];
  const manifest: {id: string; start: number; duration: number; lines: {lineId: string; at: number; seconds: number; text: string}[]}[] = [];
  let t = 0;
  if (mode === 'recommended') {
    const intro = join(ROOT, 'public', 'consulting', 'video', 'intro-final.mp4');
    const ts = join(seg, '000-intro.ts');
    sh('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-i', intro, '-vf', 'scale=1920:1080,fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '192k', '-f', 'mpegts', ts]);
    parts.push(ts);
    const d = probe(ts);
    manifest.push({id: 'intro', start: t, duration: d, lines: []});
    t += d;
  }
  ids.forEach((id, k) => {
    const src = join(VIDEOS, `${id}.mp4`);
    if (!existsSync(src)) throw new Error(`クリップがありません：${src}`);
    const a = clipById.get(id)!;
    const lines = linesForAsset(id);
    const expect = Math.ceil(clipSeconds(a.seconds, lines, a.dialogAt ?? 0.8, id) * FPS) / FPS;
    const ts = join(seg, `${String(k + 1).padStart(3, '0')}-${id}.ts`);
    sh('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=1920:1080,fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '192k', '-f', 'mpegts', ts]);
    parts.push(ts);
    const d = probe(ts);
    if (Math.abs(d - expect) > 0.15) throw new Error(`${id}：クリップの長さ ${d.toFixed(2)}秒が想定 ${expect.toFixed(2)}秒と違います（書き出しが古い可能性）`);
    const sched = lineSchedule(lines, a.dialogAt ?? 0.8, id).filter((l) => l.recorded);
    manifest.push({id, start: t, duration: d, lines: sched.map((l) => ({lineId: l.lineId!, at: t + l.from, seconds: l.to - l.from - 0.15, text: l.text}))});
    t += d;
  });
  const name = mode === 'all' ? 'experience-all-64-slides.mp4' : 'experience-with-intro.mp4';
  const out = join(OUT, name);
  sh('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-i', `concat:${parts.join('|')}`, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', '-movflags', '+faststart', out]);
  writeFileSync(join(OUT, name.replace('.mp4', '.manifest.json')), JSON.stringify({file: name, duration: probe(out), clips: manifest}, null, 1));
  rmSync(seg, {recursive: true, force: true});
  const nLines = manifest.reduce((n, c) => n + c.lines.length, 0);
  console.log(`${name}：${ids.length}クリップ・${nLines}文・${probe(out).toFixed(1)}秒`);
  console.log(`音声の照合：python3 scripts/experience-verify.py ${join(OUT, name.replace('.mp4', '.manifest.json'))}`);
};

main();
