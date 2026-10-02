// Node 側から台本と音声の長さを読み込む共通処理
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {AudioDurations, Script} from '../src/types';
import {listLines} from '../src/timeline';

export const ROOT = join(import.meta.dirname, '..');

export const loadScript = (): Script =>
  JSON.parse(readFileSync(join(ROOT, 'src/script.json'), 'utf8'));

const ffprobeArgs = (file: string) => [
  '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
];

// システムの ffprobe を優先し、無ければ Remotion 同梱の ffprobe を使う
const probe = (file: string): number => {
  try {
    return Number(execFileSync('ffprobe', ffprobeArgs(file), {encoding: 'utf8'}).trim());
  } catch {
    return Number(
      execFileSync('npx', ['remotion', 'ffprobe', ...ffprobeArgs(file)], {
        encoding: 'utf8',
        cwd: ROOT,
      }).trim(),
    );
  }
};

export const loadAudioDurations = (script: Script): AudioDurations => {
  const audio: AudioDurations = {};
  for (const {line} of listLines(script)) {
    const file = join(ROOT, 'public/audio', `${line.id}.${script.meta.audioExt}`);
    if (existsSync(file)) audio[line.id] = probe(file);
  }
  return audio;
};
