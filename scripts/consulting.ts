// コンサルティング営業体験 導入動画の補助コマンド
//   npm run consulting:durations … 各Sceneの尺の一覧
//   npm run consulting:csv       … 音声合成用のナレーション一覧（consulting_narration.csv）
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

const command = ({durations, csv} as Record<string, () => void>)[process.argv[2]];
if (command) command();
else console.error('usage: consulting.ts durations|csv');
