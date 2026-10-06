// 台本と音声の長さから、各Scene・ナレーション・字幕・演出きっかけのフレームを算出する。
// Remotion 側（calculateMetadata）と Node 側（尺一覧スクリプト）の両方から使う。

import type {AnySceneSpec, AudioDurations, ConsultingScript, Cue, NarrationLine} from './types';

export type SubtitleTiming = {text: string; from: number; to: number};

export type LineTiming = {
  line: NarrationLine;
  // Scene 先頭からのフレーム
  from: number;
  // 読み上げ部分のフレーム数（間を除く）
  speechFrames: number;
  audioFile?: string;
  audioSeconds?: number;
  estimated: boolean;
  subtitles: SubtitleTiming[];
};

export type SceneTiming = {
  spec: AnySceneSpec;
  durationInFrames: number;
  lines: LineTiming[];
  // 全体の先頭からの開始フレーム（フェードの重なりを差し引き済み）
  globalFrom: number;
};

export type Timeline = {
  fps: number;
  fadeFrames: number;
  scenes: SceneTiming[];
  totalFrames: number;
};

const chars = (s: string) => [...s.replace(/[「」『』\s]/g, '')].length;

export const speechText = (line: NarrationLine) => line.speech ?? line.text;

export const estimateSeconds = (script: ConsultingScript, line: NarrationLine) =>
  chars(speechText(line)) * script.meta.secondsPerChar;

export const allLines = (script: ConsultingScript) =>
  script.scenes.flatMap((spec) => spec.narration.map((line) => ({spec, line})));

const buildScene = (
  script: ConsultingScript,
  spec: AnySceneSpec,
  audio: AudioDurations,
): Omit<SceneTiming, 'globalFrom'> => {
  const {fps, minLineSeconds, defaultPause, narrationDir, audioExt} = script.meta;
  const f = (s: number) => Math.round(s * fps);

  let cursor = f(spec.leadIn);
  const lines: LineTiming[] = spec.narration.map((line) => {
    const audioSeconds = audio[line.id];
    const estimated = audioSeconds === undefined;
    const speechSeconds = Math.max(minLineSeconds, audioSeconds ?? estimateSeconds(script, line));
    const speechFrames = f(speechSeconds);

    // 字幕：読み上げ時間を字幕の文字数比で割り振る
    const total = line.subtitles.reduce((s, t) => s + chars(t), 0) || 1;
    let acc = 0;
    const subtitles = line.subtitles.map((text, i) => {
      const from = cursor + Math.round((acc / total) * speechFrames);
      acc += chars(text);
      const isLast = i === line.subtitles.length - 1;
      const to = cursor + Math.round((acc / total) * speechFrames) + (isLast ? f(0.25) : 0);
      return {text, from, to};
    });

    const timing: LineTiming = {
      line,
      from: cursor,
      speechFrames,
      audioFile: estimated ? undefined : `${narrationDir}/${line.id}.${audioExt}`,
      audioSeconds,
      estimated,
      subtitles,
    };
    cursor += speechFrames + f(line.pauseAfter ?? defaultPause);
    return timing;
  });

  const durationInFrames = Math.max(
    f(spec.minSeconds),
    cursor + f(spec.tail),
  );
  return {spec, lines, durationInFrames};
};

export const buildTimeline = (
  script: ConsultingScript,
  audio: AudioDurations = {},
): Timeline => {
  const {fps, fadeSeconds} = script.meta;
  const fadeFrames = Math.round(fadeSeconds * fps);
  let globalFrom = 0;
  const scenes = script.scenes.map((spec) => {
    const s = buildScene(script, spec, audio);
    const timing = {...s, globalFrom};
    // 場面転換のフェードで前後の Scene が重なる
    globalFrom += s.durationInFrames - fadeFrames;
    return timing;
  });
  const totalFrames = globalFrom + fadeFrames;
  return {fps, fadeFrames, scenes, totalFrames};
};

// 演出のきっかけ（Cue）を Scene 内のフレームに変換する
export const resolveCue = (timing: SceneTiming, fps: number, cue: Cue): number => {
  const offset = Math.round((cue.offset ?? 0) * fps);
  if (cue.at === 'sceneStart') return offset;
  if (cue.at === 'sceneEnd') return timing.durationInFrames + offset;
  const line = timing.lines.find((l) => l.line.id === cue.at);
  if (!line) throw new Error(`Cue の参照先ナレーションが見つかりません: ${cue.at}`);
  const base = cue.edge === 'end' ? line.from + line.speechFrames : line.from;
  return base + offset;
};
