// WEB参加型 コンサルティング営業体験（60分）のシナリオデータの型。
// データ本体：src/experience/data/phases.json（場面・設問・選択肢）、assets.json（映像）、characters.json、glossary.json。
// アプリ（src/experience/app）と動画（src/experience/remotion）の両方が読む。

export type PhaseId = 'intro' | 'p1' | 'p2' | 'p3' | 'p4' | 'reflection';

export type Phase = {
  phaseId: PhaseId;
  phaseTitle: string;
  short: string; // 上部バー用の短い名前
  step: string; // 4ステップの番号（聞く=1 … 提案する=4）
  minutes: number;
  goal: string;
};

export type Speaker = 'sales' | 'sato' | 'takahashi' | 'mori' | 'nakata' | 'narration';

export type Character = {
  id: Speaker;
  role: 'sales' | 'customer' | 'senior' | 'narration';
  name: string;
  title: string;
  gender: string;
  voice: string;
  appearance?: string;
  ondokuVoice?: string;
  ondokuPitch?: number;
  // 顔タグ用（お客様から受領した人物画像を切り出したもの）。ナレーションにはない
  fullName?: string;
  tagRole?: string;
  category?: 'optex' | 'customer';
  image?: string;
  faceImage?: string;
};

export type GlossaryItem = {key: string; term: string; short: string};

export type Mood = 'neutral' | 'thinking' | 'uneasy' | 'worried' | 'cool' | 'positive' | 'request';

// 制作状態（素材管理表・QAで使う）
export type AssetStatus =
  | 'implemented' // 実装済み（CG・図解で完成）
  | 'placeholder' // 仮素材使用中（構図・内容は確定、見た目は仮）
  | 'awaiting-footage' // 実写素材待ち
  | 'awaiting-license'; // 許諾確認待ち

// 1つのクリップの中のショット：どの場面を、どのセリフから出すか（導入動画と同じ線画・パネルで描く）
export type Shot = {
  overlay: string; // 場面の種類（remotion/v4/Scenes.tsx）
  header?: {no?: string; title: string}; // 見出し（12シーンの番号とタイトル）
  atLine?: number; // このショットに切り替わるセリフ（0始まり）。なければ0秒から
  card?: string; // 会話の場面で、赤いカードに出す短い一言
  photo?: string; // 実写風の写真の枠（data/photos.json の slot）。ファイルが ready なら背景に使う
};

export type Asset = {
  assetId: string;
  shots: Shot[];
  seconds: number; // 映像だけの長さ（セリフが長ければ自動で延びる）
  dialogAt?: number; // セリフを出し始める秒
  visualDescription: string;
  cameraDirection: string;
  animationDirection: string;
  status: AssetStatus[];
  videoPath?: string; // 実写・実機の映像（public/ からの相対パス）。既定は experience/videos/<assetId>.mp4
  imagePath?: string; // 正式な製品写真（許諾後に配置）
  productName?: string;
  productModel?: string;
  sensorType?: string;
  assetLicenseStatus?: string;
  verificationStatus?: string;
  needs?: string[];
  production: {method: 'shoot' | 'ai-image' | 'cg' | 'composite'; prompt: string; negativePrompt: string; note: string};
};

export type Line = {speaker: Speaker; text: string};

export type Choice = {
  choiceId: 'A' | 'B' | 'C';
  choiceText: string; // 画面に出す選択肢
  salesLine?: string; // 営業（あなた）が実際に話す言葉。choiceText が「」付きのセリフなら省略可
  videoAsset: string; // この選択肢専用の映像
  imageAsset?: string;
  responder: Speaker; // 答える人
  mood: Mood; // 答えるときの表情
  customerResponse: string;
  extraLines?: Line[]; // 回答のあとの短い解説（先輩社員など）
  gained: string; // 得られる情報
  missing: string; // まだ不足している情報
  learningPoint: string; // 簡単な解説
  technicalInsight?: string;
};

// 映像の途中で止めて考えさせるポイント
export type Pause = {beforeLine?: number; atLineId?: string; atSeconds?: number; prompt: string; hint?: string};

type Base = {
  sceneId: string;
  phaseId: PhaseId;
  title: string;
  nextSceneId: string | null;
  facilitatorNote?: string; // 進行役だけに見せるメモ
  glossary?: string[]; // この場面で表示する用語メモ（glossary.json の key）
};

export type VideoScene = Base & {type: 'video'; compositionId: string; videoFile?: string; description: string; pauses?: Pause[]};

export type ClipScene = Base & {type: 'clip'; videoAsset: string; lines: Line[]; pauses?: Pause[]; clear?: {head: string; message: string; next: string}};

// 30秒の提案づくり（4つの要素を組み合わせる。学生ごとに入力）
export type PitchScene = Base & {type: 'pitch'; prompt: string; parts: {key: string; label: string; placeholder: string; options: string[]}[]; seconds: number; minutes: number};

export type QuestionScene = Base & {
  type: 'question';
  questionId: string;
  backdropAsset: string;
  situation?: Line; // 問いの直前のお客様の言葉
  questionText: string;
  thinkSeconds: number;
  hint?: Line; // 難しいときに出す、先輩社員のヒント
  choices: Choice[];
  recommendedChoice: 'A' | 'B' | 'C' | null; // null＝どれも必要な確認（推奨なし）
  recommendReason: string; // 回答後に示す、推奨の理由
  learningPoint: string;
  technicalInsight?: string;
  requiresDemoPass?: boolean; // 実測が基準を満たしたときだけ出す
  fallbackSceneId?: string; // 満たさない・未記録のときの行き先
};

export type DemoScene = Base & {
  type: 'demo';
  videoAsset: string; // シミュレーション（見方の説明）
  condition: string;
  checks: string[];
  predictPrompt?: string; // 結果を見る前に予想させる問い
  record: boolean;
  compare?: boolean; // 既設センサと提案センサを、同じ条件で比べて記録する
};

// 比較結果（記録した実測値だけを表示する）
export type ResultScene = Base & {type: 'result'; videoAsset: string; lines: Line[]};

export type ReflectionScene = Base & {type: 'reflection'; question: string; minutes: number; videoAsset?: string};

export type Scene = VideoScene | ClipScene | QuestionScene | DemoScene | ResultScene | ReflectionScene | PitchScene;

// phases.json の形（フェーズの中に場面を持つ）
export type PhaseFile = (Phase & {scenes: Omit<Scene, 'phaseId'>[]})[];
