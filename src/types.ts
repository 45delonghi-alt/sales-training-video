// script.json の型定義。台本を変えれば動画が変わるよう、描画はすべてこの型を経由する。

export type CharacterKey = string;
export type Pose = 'front' | 'side' | 'down' | 'smile';

export type Character = {
  name: string;
  role: string;
  color: string;
  position: 'left' | 'right';
  images: Record<Pose, string>;
};

export type LineItem = {
  type: 'line';
  id: string;
  speaker: CharacterKey;
  text: string;
  pose?: Pose;
};
export type PauseItem = {type: 'pause'; seconds: number};
export type InnerItem = {
  type: 'inner';
  speaker: CharacterKey;
  text: string;
  pose?: Pose;
  seconds?: number;
};
export type SheetItem = {
  type: 'sheet';
  highlight?: string;
  showGap?: boolean;
  hide?: boolean;
};
export type StepItem = {type: 'step'; step: number};
export type TelopItem = {type: 'telop'; seconds: number; lines: string[]};
export type ActionCardItem = {
  type: 'actionCard';
  seconds: number;
  title: string;
  rows: {label: string; value: string}[];
};

export type DialogueItem =
  | LineItem
  | PauseItem
  | InnerItem
  | SheetItem
  | StepItem
  | TelopItem
  | ActionCardItem;

type SceneBase = {id: string; name: string; targetSeconds: number};

export type TitleScene = SceneBase & {
  type: 'title';
  seconds: number;
  title: string;
  subtitle: string;
};
export type DialogueScene = SceneBase & {
  type: 'dialogue';
  label: string;
  desaturate: boolean;
  steps?: string[];
  items: DialogueItem[];
};
export type ExplainBeat =
  | {type: 'flow'; seconds: number; nodes: string[]}
  | {type: 'message'; seconds: number; text: string}
  | {
      type: 'shifts';
      seconds: number;
      title: string;
      items: {before: string; after: string}[];
    };
export type ExplainScene = SceneBase & {
  type: 'explain';
  heading: string;
  beats: ExplainBeat[];
};
export type CompareScene = SceneBase & {
  type: 'compare';
  seconds: number;
  rows: {label: string; before: string; after: string}[];
};
export type SummaryScene = SceneBase & {
  type: 'summary';
  seconds: number;
  heading: string;
  items: string[];
};
export type EndScene = SceneBase & {
  type: 'end';
  seconds: number;
  label: string;
  text: string;
};

export type Scene =
  | TitleScene
  | DialogueScene
  | ExplainScene
  | CompareScene
  | SummaryScene
  | EndScene;

export type Script = {
  meta: {
    title: string;
    fps: number;
    width: number;
    height: number;
    secondsPerChar: number;
    lineGapSeconds: number;
    minLineSeconds: number;
    innerVoiceMinSeconds: number;
    fadeSeconds: number;
    audioExt: string;
    ambientFile: string;
    ambientVolume: number;
    kenBurns: {seconds: number; scale: number};
    useImages: boolean;
    backgroundImage: string;
  };
  characters: Record<CharacterKey, Character>;
  sheet: {
    title: string;
    person: string;
    rows: {item: string; self: number; boss: number}[];
  };
  scenes: Scene[];
};

// 台詞IDごとの音声の長さ（秒）。音声ファイルが無いIDは含まれない。
export type AudioDurations = Record<string, number>;
