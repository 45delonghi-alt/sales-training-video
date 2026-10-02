// 台本（script.json）と音声の長さから、各場面・各台詞の表示フレームを算出する。
// Remotion 側（calculateMetadata）と Node 側（尺一覧スクリプト）の両方から使う。

import type {
  AudioDurations,
  CharacterKey,
  DialogueItem,
  DialogueScene,
  Pose,
  Scene,
  Script,
} from './types';

export type SheetState = {
  visible: boolean;
  highlights: string[];
  showGap: boolean;
};

export type Segment = {
  kind: 'line' | 'pause' | 'inner' | 'telop' | 'actionCard';
  item: DialogueItem;
  from: number;
  durationInFrames: number;
  // カメラ（Ken Burns）が寄る人物と、その寄りが始まったフレーム
  focus: CharacterKey | null;
  shotStart: number;
  poses: Record<CharacterKey, Pose>;
  sheet: SheetState;
  step: number | null;
  // 音声ファイルがある台詞のみ
  audioSeconds?: number;
  // 音声が無く「文字数 × 秒」で仮の長さにしたか
  estimated?: boolean;
};

export type SceneTiming = {
  scene: Scene;
  durationInFrames: number;
  segments: Segment[];
};

export type Timeline = {
  fps: number;
  fadeFrames: number;
  scenes: SceneTiming[];
  totalFrames: number;
};

const charCount = (text: string) => [...text].length;

export const estimateSeconds = (script: Script, text: string) =>
  charCount(text) * script.meta.secondsPerChar;

const buildDialogue = (
  script: Script,
  scene: DialogueScene,
  audio: AudioDurations,
): Segment[] => {
  const {fps, lineGapSeconds, minLineSeconds, innerVoiceMinSeconds} = script.meta;
  const toFrames = (s: number) => Math.max(1, Math.round(s * fps));

  const segments: Segment[] = [];
  let cursor = 0;
  let focus: CharacterKey | null = null;
  let shotStart = 0;
  let step: number | null = null;
  let sheet: SheetState = {visible: false, highlights: [], showGap: false};
  const poses: Record<CharacterKey, Pose> = Object.fromEntries(
    Object.keys(script.characters).map((k) => [k, 'front' as Pose]),
  );

  const setFocus = (who: CharacterKey) => {
    if (who !== focus) {
      focus = who;
      shotStart = cursor;
    }
  };

  const push = (
    kind: Segment['kind'],
    item: DialogueItem,
    seconds: number,
    extra: Partial<Segment> = {},
  ) => {
    const durationInFrames = toFrames(seconds);
    segments.push({
      kind,
      item,
      from: cursor,
      durationInFrames,
      focus,
      shotStart,
      poses: {...poses},
      sheet: {...sheet, highlights: [...sheet.highlights]},
      step,
      ...extra,
    });
    cursor += durationInFrames;
  };

  for (const item of scene.items) {
    switch (item.type) {
      case 'step':
        step = item.step;
        break;
      case 'sheet':
        if (item.hide) {
          sheet = {visible: false, highlights: [], showGap: false};
          break;
        }
        sheet = {
          visible: true,
          highlights: item.highlight
            ? [...sheet.highlights, item.highlight]
            : sheet.highlights,
          showGap: sheet.showGap || Boolean(item.showGap),
        };
        break;
      case 'line': {
        setFocus(item.speaker);
        poses[item.speaker] = item.pose ?? 'front';
        const audioSeconds = audio[item.id];
        const base = audioSeconds ?? estimateSeconds(script, item.text);
        // 短い相づち（「はい。」など）でも字幕が読めるよう最低表示時間を確保する
        push('line', item, Math.max(minLineSeconds, base + lineGapSeconds), {
          audioSeconds,
          estimated: audioSeconds === undefined,
        });
        break;
      }
      case 'inner': {
        // 心の声は音声なし。考えている人物に寄る
        setFocus(item.speaker);
        poses[item.speaker] = item.pose ?? poses[item.speaker];
        const seconds =
          item.seconds ??
          Math.max(innerVoiceMinSeconds, estimateSeconds(script, item.text));
        push('inner', item, seconds + lineGapSeconds);
        break;
      }
      case 'pause':
        // 間は直前のカメラをそのまま続ける（沈黙をカットしない）
        push('pause', item, item.seconds);
        break;
      case 'telop':
        push('telop', item, item.seconds);
        break;
      case 'actionCard':
        push('actionCard', item, item.seconds);
        break;
    }
  }
  return segments;
};

export const buildTimeline = (
  script: Script,
  audio: AudioDurations = {},
): Timeline => {
  const {fps, fadeSeconds} = script.meta;
  const fadeFrames = Math.round(fadeSeconds * fps);

  const scenes: SceneTiming[] = script.scenes.map((scene) => {
    switch (scene.type) {
      case 'dialogue': {
        const segments = buildDialogue(script, scene, audio);
        const last = segments[segments.length - 1];
        return {
          scene,
          segments,
          durationInFrames: last ? last.from + last.durationInFrames : fps,
        };
      }
      case 'explain':
        return {
          scene,
          segments: [],
          durationInFrames: Math.round(
            scene.beats.reduce((sum, b) => sum + b.seconds, 0) * fps,
          ),
        };
      default:
        return {
          scene,
          segments: [],
          durationInFrames: Math.round(scene.seconds * fps),
        };
    }
  });

  // 場面転換のフェードは前後の場面が重なるため、その分だけ全体が短くなる
  const totalFrames =
    scenes.reduce((sum, s) => sum + s.durationInFrames, 0) -
    fadeFrames * Math.max(0, scenes.length - 1);

  return {fps, fadeFrames, scenes, totalFrames};
};

// 全台詞（音声ファイルが必要なもの）を一覧にする
export const listLines = (script: Script) =>
  script.scenes.flatMap((scene) =>
    scene.type === 'dialogue'
      ? scene.items
          .filter((i): i is Extract<DialogueItem, {type: 'line'}> => i.type === 'line')
          .map((line) => ({scene, line}))
      : [],
  );
