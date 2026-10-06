// 台本とナレーションの配置（narrationTiming.json）から、各Scene・字幕・演出きっかけのフレームを算出する。
// Remotion 側（calculateMetadata）と Node 側（尺一覧スクリプト）の両方から使う。
//
// ナレーションは「続けて読まれた文のまとまり（クリップ）」単位で、切らずに再生する。
// 文ごとの開始・終了時刻は字幕と演出のタイミングにだけ使う。
// クリップの間には、直前の文の hold（足す間）だけ空ける。

import type {AnySceneSpec, ConsultingScript, Cue, NarrationLine, NarrationTiming} from './types';

export type SubtitleTiming = {text: string; from: number; to: number};

export type LineTiming = {
  line: NarrationLine;
  // Scene 先頭からのフレーム
  from: number;
  // 読み上げ部分のフレーム数
  speechFrames: number;
  // 音声が無く、文字数から仮の長さにしたか
  estimated: boolean;
  subtitles: SubtitleTiming[];
};

export type ClipTiming = {file: string; from: number; durationInFrames: number};

export type SceneTiming = {
  spec: AnySceneSpec;
  durationInFrames: number;
  lines: LineTiming[];
  clips: ClipTiming[];
  // 全体の先頭からの開始フレーム（フェードの重なりを差し引き済み）
  globalFrom: number;
};

export type Timeline = {
  fps: number;
  fadeFrames: number;
  scenes: SceneTiming[];
  totalFrames: number;
};

export const EMPTY_TIMING: NarrationTiming = {speed: 1, clips: {}, lines: {}};

const chars = (s: string) => [...s.replace(/[「」『』\s]/g, '')].length;

export const speechText = (line: NarrationLine) => line.speech ?? line.text;

export const estimateSeconds = (script: ConsultingScript, line: NarrationLine) =>
  (chars(speechText(line)) * script.meta.secondsPerChar) / script.meta.speed;

export const allLines = (script: ConsultingScript) =>
  script.scenes.flatMap((spec) => spec.narration.map((line) => ({spec, line})));

// 字幕：1文の読み上げ時間を、字幕の文字数比で割り振る
const subtitleTimings = (line: NarrationLine, from: number, speechFrames: number, tailFrames: number) => {
  const total = line.subtitles.reduce((s, t) => s + chars(t), 0) || 1;
  let acc = 0;
  return line.subtitles.map((text, i) => {
    const start = from + Math.round((acc / total) * speechFrames);
    acc += chars(text);
    const isLast = i === line.subtitles.length - 1;
    const end = from + Math.round((acc / total) * speechFrames) + (isLast ? tailFrames : 0);
    return {text, from: start, to: end};
  });
};

const buildScene = (
  script: ConsultingScript,
  spec: AnySceneSpec,
  timing: NarrationTiming,
): Omit<SceneTiming, 'globalFrom'> => {
  const {fps, minLineSeconds} = script.meta;
  const f = (s: number) => Math.round(s * fps);
  const narration = spec.narration;

  let cursor = f(spec.leadIn);
  const lines: LineTiming[] = [];
  const clips: ClipTiming[] = [];
  let i = 0;
  while (i < narration.length) {
    const first = timing.lines[narration[i].id];
    if (!first) {
      // 音声が無い文：文字数から仮の長さ
      const line = narration[i];
      const speechFrames = f(Math.max(minLineSeconds, estimateSeconds(script, line)));
      lines.push({line, from: cursor, speechFrames, estimated: true, subtitles: subtitleTimings(line, cursor, speechFrames, f(0.2))});
      cursor += speechFrames + f(line.hold ?? 0);
      i++;
      continue;
    }
    // 同じクリップに入っている文をまとめて配置する
    const clipStart = cursor;
    let last = narration[i];
    while (i < narration.length && timing.lines[narration[i].id]?.clip === first.clip) {
      const line = narration[i];
      const t = timing.lines[line.id];
      const from = clipStart + f(t.start);
      const speechFrames = Math.max(1, f(t.end - t.start));
      lines.push({line, from, speechFrames, estimated: false, subtitles: subtitleTimings(line, from, speechFrames, f(0.15))});
      last = line;
      i++;
    }
    const clipFrames = f(timing.clips[first.clip] ?? 0);
    clips.push({file: first.clip, from: clipStart, durationInFrames: clipFrames});
    cursor = clipStart + clipFrames + f(last.hold ?? 0);
  }

  const durationInFrames = Math.max(f(spec.minSeconds), cursor + f(spec.tail));
  return {spec, lines, clips, durationInFrames};
};

export const buildTimeline = (script: ConsultingScript, timing: NarrationTiming = EMPTY_TIMING): Timeline => {
  const {fps, fadeSeconds} = script.meta;
  const fadeFrames = Math.round(fadeSeconds * fps);
  let globalFrom = 0;
  const scenes = script.scenes.map((spec) => {
    const s = buildScene(script, spec, timing);
    const t = {...s, globalFrom};
    // 場面転換のフェードで前後の Scene が重なる
    globalFrom += s.durationInFrames - fadeFrames;
    return t;
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
