// 導入動画「コンサルティング営業体験」の台本の型。
// 各Sceneは duration（minSeconds 等）/ narration / subtitle / visual / animation を持つ。

export type SceneId =
  | 'Scene01Opening'
  | 'Scene02WhatIsSales'
  | 'Scene03Mission'
  | 'Scene04Question'
  | 'Scene05CustomerGoal'
  | 'Scene06Impact'
  | 'Scene07YourMission'
  | 'Scene08SensorOptions'
  | 'Scene09Ending';

export type NarrationLine = {
  // 音声ファイル名にもなる（public/consulting/audio/narration/{id}.mp3）
  id: string;
  // 画面・台本上の文
  text: string;
  // 音声合成に渡す読み（「10分」→「じゅっぷん」など読み間違い対策）。省略時は text
  speech?: string;
  // 字幕。1枚10〜20文字。意味のまとまりで区切る
  subtitles: string[];
  // この文の後の間（秒）。重要な文の前後は 0.3〜0.7
  pauseAfter?: number;
};

// 演出のきっかけ。秒ではなく「どのナレーションの開始（または終了）か」で指定する。
// 音声を録り直して長さが変わっても、画面とナレーションがずれない。
export type Cue = {
  at: string | 'sceneStart' | 'sceneEnd';
  edge?: 'start' | 'end';
  offset?: number;
};

export type SensorKind = 'through' | 'retro' | 'retroClear' | 'diffuse' | 'bgs';

export type Visuals = {
  Scene01Opening: {
    coverImage: string;
    oldImage: {label: string; icon: 'box' | 'price'}[];
    statement: string;
  };
  Scene02WhatIsSales: {
    from: string;
    steps: {label: string; note?: string}[];
    conclusion: string;
  };
  Scene03Mission: {
    label: string;
    title: string;
    hud: {line: string; actualLabel: string; countLabel: string; alert: string};
  };
  Scene04Question: {question: string; options: string[]; message: string};
  Scene05CustomerGoal: {
    left: string;
    right: string;
    quote: string;
    quoteSource: string;
  };
  Scene06Impact: {
    chain: string[];
    surfaceTag: {label: string; text: string};
    rootTag: {label: string; text: string};
  };
  Scene07YourMission: {
    label: string;
    negation: string;
    steps: {label: string; note: string}[];
    firstStep: {badge: string; text: string};
  };
  Scene08SensorOptions: {
    heading: string;
    sensors: {kind: SensorKind; name: string; sub?: string; desc: string}[];
    wrong: string;
    right: string;
  };
  Scene09Ending: {
    catchCopy: string[];
    english: string;
    brand: string;
  };
};

export type Animations = {
  Scene01Opening: {showOldImage: Cue[]; showCheck: Cue; showStatement: Cue};
  Scene02WhatIsSales: {strike: Cue; steps: Cue[]; conclusion: Cue};
  Scene03Mission: {toFactory: Cue; showSensor: Cue; showError: Cue};
  Scene04Question: {options: Cue; spoken: {option: number; cue: Cue}[]; message: Cue};
  Scene05CustomerGoal: {left: Cue; leftDown: Cue; right: Cue; quote: Cue};
  Scene06Impact: {chain: Cue[]; surface: Cue; root: Cue};
  Scene07YourMission: {negation: Cue; steps: Cue[]; firstStep: Cue};
  Scene08SensorOptions: {cards: Cue; wrong: Cue; right: Cue};
  Scene09Ending: {english: Cue; brand: Cue};
};

export type SceneSpec<K extends SceneId = SceneId> = {
  id: K;
  name: string;
  // 画面を見せるために最低限確保する尺。ナレーションが短くても、ここまでは延ばす
  minSeconds: number;
  // 最初のナレーションまでの余白
  leadIn: number;
  // 最後のナレーションの後の余白
  tail: number;
  narration: NarrationLine[];
  visual: Visuals[K];
  animation: Animations[K];
};

export type AnySceneSpec = {[K in SceneId]: SceneSpec<K>}[SceneId];

export type ConsultingScript = {
  meta: {
    title: string;
    fps: number;
    width: number;
    height: number;
    // 音声が無いときの仮の長さ（1文字あたりの秒）
    secondsPerChar: number;
    // 字幕が読めるよう、1文の最低表示時間
    minLineSeconds: number;
    // 既定の文間（pauseAfter 省略時）
    defaultPause: number;
    fadeSeconds: number;
    // 台本PDFに載せる声の名前（音声を作り直したら書き換える）
    narrator: string;
    narrationDir: string;
    audioExt: string;
    bgmFile: string;
    bgmVolume: number;
    // ナレーション中に BGM を下げる倍率
    bgmDuck: number;
    // 字幕で赤・太字にする語（長いものから順に判定）
    emphasis: string[];
  };
  scenes: AnySceneSpec[];
};

// 音声ファイル名（拡張子なし）→ 長さ（秒）
export type AudioDurations = Record<string, number>;
