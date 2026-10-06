// 光電センサ入門動画：各場面の尺の一覧と、音声合成用のナレーション一覧 sensor_narration.csv を出力
import {existsSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT, probe} from './load';
import {SENSOR_META, SENSOR_SCENES} from '../src/sensor/script';
import {buildSensorTimeline, type SensorAudio} from '../src/sensor/timeline';

const audio: SensorAudio = {};
for (const {id} of SENSOR_SCENES.flatMap((s) => s.lines)) {
  const file = join(ROOT, 'public/audio/sensor', `${id}.mp3`);
  if (existsSync(file)) audio[id] = probe(file);
}

const t = buildSensorTimeline(audio);
const sec = (f: number) => (f / SENSOR_META.fps).toFixed(1);
for (const s of t.scenes) console.log(`${s.scene.id}\t${s.scene.heading ?? 'タイトル'}\t${sec(s.durationInFrames)}秒`);
const total = t.totalFrames / SENSOR_META.fps;
console.log(`合計\t${total.toFixed(1)}秒（上限 ${SENSOR_META.maxSeconds}秒）`);
if (total > SENSOR_META.maxSeconds) console.warn('⚠ 上限を超えています。ナレーションを短くしてください');

const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
const rows = [['ファイル名', '場面', '字幕', '読み上げるテキスト', '秒数'].map(esc).join(',')];
for (const s of t.scenes)
  for (const l of s.lines)
    rows.push(
      [`${l.line.id}.mp3`, s.scene.heading ?? 'タイトル', l.line.text, l.line.say ?? l.line.text, sec(l.durationInFrames)].map(esc).join(','),
    );
writeFileSync(join(ROOT, 'sensor_narration.csv'), '﻿' + rows.join('\n') + '\n');
console.log('sensor_narration.csv を出力しました');
