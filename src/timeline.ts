// 台本（script.json）と音声の長さから、各場面・各台詞の表示フレームを算出する。
// Remotion 側（calculateMetadata）と Node 側（尺一覧スクリプト）の両方から使う。

import type {
  AudioDurations,
  CharacterKey,
  DialogueItem,
  LineItem,
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
  // 音声ファイルがある台詞のみ。clips は再生するファイルと、区間先頭からの開始フレーム
  audioSeconds?: number;
  clips?: {file: string; offsetFrames: number}[];
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

// 「…」の間は音声合成に任せず、動画側で無音を入れる。
// - 先頭の「…」：音声の前に無音を入れる
// - 途中の「…」：音声ファイルを分け（B02_1, B02_2）、間に無音を入れる
// - 末尾の「…」：そのまま（台詞の後の余白で表現）
export type SpeechPlan = {
  leadPause: boolean;
  // 音声合成で読み上げるテキスト（ファイル単位）
  parts: string[];
  // 音声ファイル名（拡張子なし）。parts と同じ順番
  stems: string[];
};

export const speechPlan = (line: LineItem): SpeechPlan => {
  const leadPause = line.text.startsWith('…');
  const body = line.text.replace(/^…+/, '');
  const parts = body
    .split(/…+(?=[^。、！？…]*[^。、！？…\s])/u)
    .map((p) => p.trim())
    .filter(Boolean);
  const stems = parts.length > 1 ? parts.map((_, i) => `${line.id}_${i + 1}`) : [line.id];
  return {leadPause, parts, stems};
};

// 動画が参照しうる音声ファイル名（拡張子なし）。分割前の 1 ファイル版も受け付ける
export const audioStems = (script: Script) =>
  listLines(script).flatMap(({line}) => {
    const {stems} = speechPlan(line);
    return stems.length > 1 ? [line.id, ...stems] : stems;
  });

const buildDialogue = (
  script: Script,
  scene: DialogueScene,
  audio: AudioDurations,
): Segment[] => {
  const {fps, lineGapSeconds, minLineSeconds, innerVoiceMinSeconds, ellipsisPauseSeconds} =
    script.meta;
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
        const plan = speechPlan(item);
        const lead = plan.leadPause ? ellipsisPauseSeconds : 0;
        const ext = script.meta.audioExt;

        // 音声：分割ファイルがすべて揃っていればそれを、無ければ 1 ファイル版を使う
        let clips: {file: string; offsetFrames: number}[] | undefined;
        let speech: number | undefined;
        const splitReady = plan.stems.length > 1 && plan.stems.every((st) => audio[st] !== undefined);
        if (splitReady) {
          let t = lead;
          clips = plan.stems.map((st, i) => {
            if (i > 0) t += ellipsisPauseSeconds;
            const clip = {file: `${st}.${ext}`, offsetFrames: Math.round(t * fps)};
            t += audio[st];
            return clip;
          });
          speech = t - lead;
        } else if (audio[item.id] !== undefined) {
          clips = [{file: `${item.id}.${ext}`, offsetFrames: Math.round(lead * fps)}];
          speech = audio[item.id];
        }
        const estimated = speech === undefined;
        const base =
          speech ??
          estimateSeconds(script, plan.parts.join('')) +
            ellipsisPauseSeconds * (plan.parts.length - 1);
        // 短い相づち（「はい。」など）でも字幕が読めるよう最低表示時間を確保する
        push('line', item, Math.max(minLineSeconds, lead + base + lineGapSeconds), {
          audioSeconds: speech,
          clips,
          estimated,
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
