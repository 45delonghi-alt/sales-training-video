// コンサルティング営業体験（60分）のシナリオデータの型。
// データ本体は src/experience/data/*.json。アプリ（src/experience/app）と動画（src/experience/remotion）の両方が読む。

export type PhaseId = 'intro' | 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'reflection';

export type Phase = {
  phaseId: PhaseId;
  title: string;
  short: string; // 上部バー用の短い名前
  minutes: number;
  goal: string;
};

// 制作状態（素材管理表・QAで使う）
export type AssetStatus =
  | 'implemented' // 実装済み（CG・図解で完成）
  | 'placeholder' // 仮素材使用中（構図・内容は確定、見た目は仮）
  | 'awaiting-footage' // 実写素材待ち
  | 'awaiting-license'; // 許諾確認待ち

// 映像クリップ。Remotion のコンポジション（XP-<assetId>）として描画し、実写が届いたら videoPath に差し替える
export type Asset = {
  assetId: string;
  kind:
    | 'factory'
    | 'sensor'
    | 'bottle'
    | 'customer'
    | 'document'
    | 'tech'
    | 'product'
    | 'demo'
    | 'applications'
    | 'ending';
  variant: string;
  seconds: number; // 映像だけの長さ（セリフが長ければ自動で延びる）
  dialogAt?: number; // セリフを出し始める秒
  visualDescription: string;
  cameraDirection: string;
  animationDirection: string;
  status: AssetStatus[];
  // 実写・公式画像が届いたら差し替える先（public/ からの相対パス）。存在しなければ CG を使う
  videoPath?: string;
  imagePath?: string;
  needs?: string[]; // 不足している素材
  // 素材の作り方（実写撮影／AI画像／CG／合成）と、生成用プロンプト
  production: {method: 'shoot' | 'ai-image' | 'cg' | 'composite'; prompt: string; negativePrompt: string; note: string};
};

export type Line = {speaker: 'customer' | 'narration' | 'sales'; text: string};

export type Choice = {
  choiceId: 'A' | 'B' | 'C';
  choiceText: string;
  assetId: string;
  customerResponse: string;
  discovered: string; // この選択で新しく分かったこと
  learningPoint: string;
  customerMood: 'neutral' | 'thinking' | 'uneasy' | 'worried' | 'cool' | 'positive' | 'request'; // お客様の反応（表情）
  technicalInsight?: string; // この選択で見えた技術的な発見
};

// 映像の途中で止めて考えさせるポイント
export type Pause = {beforeLine?: number; atLineId?: string; prompt: string; hint?: string};

type Base = {
  sceneId: string;
  phaseId: PhaseId;
  title: string;
  nextSceneId: string | null;
  // 進行役だけに見せるメモ
  facilitatorNote?: string;
};

export type VideoScene = Base & {type: 'video'; compositionId: string; description: string; pauses?: Pause[]};

export type ClipScene = Base & {
  type: 'clip';
  assetId: string;
  lines: Line[];
  pauses?: Pause[];
};

export type QuestionScene = Base & {
  type: 'question';
  backdropAssetId: string;
  questionText: string;
  // 実機デモの結果しだいで問いの前提が変わる場合（結果が基準を満たしたときだけこの問いを出す）
  requiresDemoPass?: boolean;
  fallbackSceneId?: string; // 結果が基準を満たさなかったときの行き先
  situationLine?: string; // 問いの直前のお客様の言葉
  thinkSeconds: number;
  choices: Choice[];
  recommendedChoice: 'A' | 'B' | 'C';
  learningPoint: string;
  technicalInsight?: string;
};

export type PitchScene = Base & {
  type: 'pitch';
  seconds: number;
  parts: {label: string; hint: string}[];
  example: string[];
};

export type DemoScene = Base & {
  type: 'demo';
  assetId: string; // シミュレーション映像
  condition: string;
  checks: string[];
  // 実機で記録する項目
  record: boolean;
};

export type ReflectionScene = Base & {
  type: 'reflection';
  question: string;
  minutes: number;
  examples?: string[];
  assetId?: string;
};

export type Scene = VideoScene | ClipScene | QuestionScene | PitchScene | DemoScene | ReflectionScene;
