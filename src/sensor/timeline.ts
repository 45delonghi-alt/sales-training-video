// 台本と音声の長さから、各場面・各ナレーション行の表示フレームを算出する
import {SENSOR_META, SENSOR_SCENES, type NarrationLine, type SensorScene} from './script';

export type SensorAudio = Record<string, number>;

export type LineTiming = {line: NarrationLine; from: number; durationInFrames: number; hasAudio: boolean};

export type SensorSceneTiming = {
  scene: SensorScene;
  durationInFrames: number;
  lines: LineTiming[];
};

export type SensorTimeline = {scenes: SensorSceneTiming[]; totalFrames: number; fadeFrames: number};

/** 仮の長さを出すとき、括弧や句読点は読み上げないので数えない */
const spokenLength = (text: string) => text.replace(/[「」『』（）、。・？！]/g, '').length;

export const lineSeconds = (line: NarrationLine, audio: SensorAudio): number => {
  const {secondsPerChar, minLineSeconds} = SENSOR_META;
  const voiced = audio[line.id] ?? spokenLength(line.text) * secondsPerChar;
  return Math.max(voiced, minLineSeconds);
};

export const buildSensorTimeline = (audio: SensorAudio): SensorTimeline => {
  const {fps, lineGapSeconds, leadSeconds, tailSeconds, fadeFrames} = SENSOR_META;
  const f = (s: number) => Math.round(s * fps);
  const scenes = SENSOR_SCENES.map((scene) => {
    let cursor = f(leadSeconds);
    const lines = scene.lines.map((line) => {
      const durationInFrames = f(lineSeconds(line, audio) + lineGapSeconds);
      const timing = {line, from: cursor, durationInFrames, hasAudio: line.id in audio};
      cursor += durationInFrames;
      return timing;
    });
    return {scene, lines, durationInFrames: cursor + f(tailSeconds)};
  });
  const sum = scenes.reduce((a, s) => a + s.durationInFrames, 0);
  return {scenes, fadeFrames, totalFrames: sum - fadeFrames * (scenes.length - 1)};
};
