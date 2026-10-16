import type {Asset, Character, GlossaryItem, Line, Phase, PhaseFile, QuestionScene, Scene, Speaker} from '../types';
import phasesJson from './phases.json';
import assetsJson from './assets.json';
import charactersJson from './characters.json';
import displayBreaksJson from './displayBreaks.json';
import glossaryJson from './glossary.json';
import audioTimingJson from './audioTiming.json';

const phaseFile = phasesJson as unknown as PhaseFile;

export const phases: Phase[] = phaseFile.map(({scenes: _s, ...p}) => p);
export const scenes: Scene[] = phaseFile.flatMap((p) => p.scenes.map((s) => ({...s, phaseId: p.phaseId}) as Scene));
export const assets = assetsJson as Asset[];
export const characters = charactersJson as Character[];
export const glossary = glossaryJson as GlossaryItem[];

export const sceneById = new Map(scenes.map((s) => [s.sceneId, s]));
export const assetById = new Map(assets.map((a) => [a.assetId, a]));
export const characterById = new Map(characters.map((c) => [c.id, c]));
export const glossaryByKey = new Map(glossary.map((g) => [g.key, g]));

export const questions = scenes.filter((s): s is QuestionScene => s.type === 'question');

// 営業（あなた）が話す言葉：salesLine、なければ「」付きの選択肢
export const salesLineOf = (c: {choiceText: string; salesLine?: string}) => {
  if (c.salesLine) return c.salesLine;
  const m = c.choiceText.match(/^「(.+)」$/);
  return m ? m[1] : undefined;
};

// 長いセリフは、句点で区切って字幕を分ける（1画面2行まで）
const splitLong = (speaker: Speaker, text: string): Line[] => {
  if ([...text].length <= 34) return [{speaker, text}];
  const parts = text.match(/[^。]+。?/g) ?? [text];
  return parts.map((t) => ({speaker, text: t.trim()})).filter((l) => l.text);
};

const splitAll = (lines: Line[]) => lines.flatMap((l) => splitLong(l.speaker, l.text));

// 素材を使っている場面のセリフ（字幕・音声・台本の書き出し用）。1要素＝1文＝音声1ファイル
// 問い・先輩のヒント・振り返りの画面（アプリでは画面に表示するだけだが、動画にも書き出す）。
//   キーは音声ファイル名と同じ：q-<問いID>／hint-<問いID>／r-<場面ID>
export type CardKind = 'question' | 'hint' | 'reflection';
type Card = {key: string; kind: CardKind; scene: Scene};
export const cards: Card[] = scenes.flatMap((s): Card[] => {
  // ヒントを問いの画面に入れる設問（hintOnQuestion）は、ヒントだけの画面を作らない
  if (s.type === 'question') return [{key: `q-${s.questionId}`, kind: 'question', scene: s}, ...(s.hint && !s.hintOnQuestion ? [{key: `hint-${s.questionId}`, kind: 'hint' as const, scene: s}] : [])];
  if (s.type === 'reflection') return [{key: `r-${s.sceneId}`, kind: 'reflection', scene: s}];
  return [];
});
export const cardByKey = new Map(cards.map((c) => [c.key, c]));
const cardLines = (key: string): Line[] | undefined => {
  const c = cardByKey.get(key);
  if (!c) return undefined;
  const s = c.scene;
  // 問いの読み上げ。ヒントを問いの画面に入れる設問は、続けて先輩のヒント（音声は hint-<設問ID>_01 をそのまま使う）
  if (c.kind === 'question' && s.type === 'question') return [{speaker: 'narration', text: s.questionText}, ...(s.hintOnQuestion && s.hint ? [{...s.hint, audioId: `hint-${s.questionId}_01`}] : [])];
  if (c.kind === 'hint' && s.type === 'question' && s.hint) return [s.hint];
  if (c.kind === 'reflection' && s.type === 'reflection') return [{speaker: 'narration', text: s.question}];
  return [];
};
// 場面の写真（3DCGの背景）。フェーズごとの場所：P1 ライン／P2 センサの設置／P3 数え直し／P4 比較デモ
export const PLACE: Record<string, string> = {p1: 'factory-line', p2: 'sensor-side', p3: 'recount', p4: 'demo-rig'};
const cardAsset = (key: string, kind: CardKind): Asset => ({
  assetId: key,
  shots: [{overlay: kind, photo: PLACE[cardByKey.get(key)?.scene.phaseId ?? ''], header: {title: kind === 'question' ? `問い ${key.slice(2)}` : kind === 'hint' ? `先輩のヒント（${key.slice(5)}）` : '振り返り'}}],
  seconds: kind === 'question' ? 6 : 4,
  dialogAt: 0.6,
  visualDescription: kind === 'question' ? '問いと選択肢' : kind === 'hint' ? '先輩のヒント' : '振り返りの問い',
  cameraDirection: '固定（導入動画と同じ）',
  animationDirection: '—',
  status: [],
  production: {method: 'cg', prompt: '', negativePrompt: '', note: '問い・ヒント・振り返りの画面'},
});
// 映像になるものすべて（場面の映像47本＋問い・ヒント・振り返りの画面）
export const allClips: Asset[] = [...assetsJson as Asset[], ...cards.map((c) => cardAsset(c.key, c.kind))];
export const clipById = new Map(allClips.map((a) => [a.assetId, a]));

export const linesForAsset = (assetId: string): Line[] => {
  const card = cardLines(assetId);
  if (card) return card;
  for (const s of scenes) {
    if ((s.type === 'clip' || s.type === 'result') && s.videoAsset === assetId) return splitAll(s.lines);
    if (s.type === 'question') {
      const c = s.choices.find((ch) => ch.videoAsset === assetId);
      if (c) {
        const sales = salesLineOf(c);
        return splitAll([...(sales ? [{speaker: 'sales' as Speaker, text: sales}] : []), {speaker: c.responder, text: c.customerResponse}, ...(c.extraLines ?? [])]);
      }
    }
  }
  return [];
};

// セリフのID（音声ファイル名）：<素材ID>_<2桁の連番>。例 p1-q1-b_02 → public/experience/audio/p1-q1-b_02.mp3
export const lineIdOf = (assetId: string, index: number) => `${assetId}_${String(index + 1).padStart(2, '0')}`;
export const lineAudioPath = (lineId: string) => `experience/audio/${lineId}.mp3`;

// 音読さん等で読み上げるときの表記（字幕はそのまま。読み間違えやすい語だけ読み方に置き換える）
const READINGS: [RegExp, string][] = [
  [/OPTEX-FA/g, 'オプテックス・エフエー'],
  [/KR-Q/g, 'ケーアール・キュー'],
  [/PLC/g, 'ピーエルシー'],
  [/PET/g, 'ペット'],
  [/(\d+(?:\.\d+)?)〜(\d+(?:\.\d+)?)%/g, '$1から$2パーセント'],
  [/(\d+(?:\.\d+)?)〜(\d+(?:\.\d+)?)/g, '$1から$2'],
  [/(\d+(?:\.\d+)?)%/g, '$1パーセント'],
  [/1万本/g, 'いちまんぼん'],
  [/……/g, '…'],
];
export const speechOf = (text: string) => READINGS.reduce((t, [re, to]) => t.replace(re, to), text);

// 収録した音声の長さ（秒）。npm run experience:import-audio が書き込む。なければ文字数から見積もる
const audioTiming = audioTimingJson as Record<string, number>;
export const recordedSeconds = (lineId: string): number | undefined => audioTiming[lineId];

// 素材で話すお客様と表情（反応の小窓用）
export const responderFor = (assetId: string): {speaker: Speaker; mood: Choice['mood']} | undefined => {
  for (const s of scenes) {
    if (s.type === 'question') {
      const c = s.choices.find((ch) => ch.videoAsset === assetId);
      if (c) return {speaker: c.responder, mood: c.mood};
    }
  }
  return undefined;
};
type Choice = QuestionScene['choices'][number];

export const compositionIdFor = (assetId: string) => `XP-${assetId}`;

// 実写・実機の映像の置き場所（assets.json に videoPath がなければ、素材IDと同じ名前の MP4）
export const videoPathFor = (assetId: string) => assetById.get(assetId)?.videoPath ?? `experience/videos/${assetId}.mp4`;


// 選択肢 → 映像の対応表（visual-branches.json）。1つの選択肢に、専用の映像が1本だけ対応する
export const branches = () =>
  questions.flatMap((q) =>
    q.choices.map((c) => {
      const a = assetById.get(c.videoAsset);
      return {
        branchId: `${q.questionId}-${c.choiceId}`,
        phaseId: q.phaseId,
        sceneId: q.sceneId,
        questionId: q.questionId,
        questionText: q.questionText,
        choiceId: c.choiceId,
        choiceText: c.choiceText,
        salesLine: salesLineOf(c) ?? '',
        visualSubject: a?.visualDescription ?? '',
        cameraDirection: a?.cameraDirection ?? '',
        animationDirection: a?.animationDirection ?? '',
        responder: c.responder,
        customerResponse: c.customerResponse,
        customerMood: c.mood,
        gained: c.gained,
        missing: c.missing,
        learningPoint: c.learningPoint,
        technicalInsight: c.technicalInsight ?? '',
        videoAsset: c.videoAsset,
        imageAsset: c.imageAsset ?? a?.imagePath ?? '',
        assetPath: videoPathFor(c.videoAsset),
        fallbackVisual: compositionIdFor(c.videoAsset),
        assetStatus: a?.status ?? [],
        recommended: q.recommendedChoice === c.choiceId,
        nextSceneId: q.nextSceneId,
      };
    }),
  );

// セリフの読み上げ時間の目安（字幕を出しておく秒数）
export const readSeconds = (text: string) => Math.max(2.2, [...text].length * 0.17 + 0.8);

// セリフの表示タイミング（秒）とクリップの長さ。映像・アプリ・台本書き出しで共通に使う
// 収録済みの文は、音声の長さ＋間（0.45秒）で並べる。未収録の文は文字数からの見積もり
// 会話の間：同じ人が続けて話すときは短く、話し手が替わるときは少し長く（自然な受け答えの間）
export const GAP_SAME = 0.3;
export const GAP_TURN = 0.6;
// 字幕は話し終わりから少しだけ残す（次の字幕までのちらつきを防ぎつつ、音声とずらさない）
export const SUB_HOLD = 0.15;
export type TimedLine = Line & {from: number; to: number; lineId?: string; recorded?: boolean};
export const lineSchedule = (lines: Line[], dialogAt: number, assetId?: string): TimedLine[] => {
  let t = dialogAt;
  return lines.map((l, i) => {
    const lineId = l.audioId ?? (assetId ? lineIdOf(assetId, i) : undefined);
    // 指定されたセリフの前に間を入れる（前の画面を長く見せる）
    t += (assetId ? assetById.get(assetId)?.gapBefore?.[String(i)] : undefined) ?? 0;
    const rec = lineId ? recordedSeconds(lineId) : undefined;
    const from = t;
    if (rec === undefined) {
      t += readSeconds(l.text);
      return {...l, from, to: t, lineId, recorded: false};
    }
    const next = lines[i + 1];
    t += rec + (next && next.speaker === l.speaker ? GAP_SAME : GAP_TURN);
    return {...l, from, to: from + rec + SUB_HOLD, lineId, recorded: true};
  });
};
// 学生への問い（q-<設問ID>）の画面は、通常の長さより5秒長くする。問いとA/B/Cが出そろった画面をそのまま保つ
// （進行役が止めやすく、止めずに再生しても読める）。学生の考える時間（約60秒）は、WEBアプリ側で一時停止して取る
export const QUESTION_HOLD = 5;
export const questionHold = (assetId?: string) => (assetId?.startsWith('q-') ? QUESTION_HOLD : 0);
export const clipSeconds = (seconds: number, lines: Line[], dialogAt: number, assetId?: string) => {
  const sched = lineSchedule(lines, dialogAt, assetId);
  const end = sched.length ? sched[sched.length - 1].to + 0.8 : 0;
  return Math.max(seconds, end) + questionHold(assetId);
};
export const assetSeconds = (assetId: string) => {
  const a = assetById.get(assetId);
  return a ? clipSeconds(a.seconds, linesForAsset(assetId), a.dialogAt ?? 0.8, assetId) : 0;
};

// ───── 話している人の顔タグ（SpeakerFaceOverlay）。セリフの時間から作る。ナレーションには出さない
// OPTEX-FA は画面の左、お客様は右（全場面で統一）
export type FaceCue = {
  speakerId: Speaker;
  speakerName: string;
  speakerRole: string;
  speakerImage: string;
  speakerCategory: 'optex' | 'customer';
  audioStart: number;
  audioEnd: number;
  displayPosition: 'bottom-left' | 'bottom-right';
};
// 同じ人が続けて話すときは、間が短ければ1つにまとめる（ワイプがちらつかないように）
const FACE_MERGE_GAP = 0.6;
export const faceCues = (sched: TimedLine[]): FaceCue[] => {
  const cues: FaceCue[] = [];
  for (const l of sched) {
    const c = characterById.get(l.speaker);
    if (!c?.badgeImage || !c.category) continue;
    const last = cues[cues.length - 1];
    if (last && last.speakerId === l.speaker && l.from - last.audioEnd <= FACE_MERGE_GAP) {
      last.audioEnd = l.to;
      continue;
    }
    cues.push({
      speakerId: l.speaker,
      speakerName: c.fullName && c.fullName !== c.name ? `${c.fullName}さん` : c.name,
      speakerRole: c.tagRole ?? c.title.replace(/（.*）/, ''),
      speakerImage: c.badgeImage,
      speakerCategory: c.category,
      audioStart: l.from,
      audioEnd: l.to,
      displayPosition: c.category === 'optex' ? 'bottom-left' : 'bottom-right',
    });
  }
  return cues;
};

// ───── 映像の表示用の改行（data/displayBreaks.json）。音声・字幕の元の文は変えず、表示のときだけ行を分ける
type DisplayBreak = {page: string; lineId: string; after?: string; nowrap?: boolean; note?: string};
export const displayBreaks: DisplayBreak[] = (displayBreaksJson as {breaks: DisplayBreak[]}).breaks;
const breakById = new Map(displayBreaks.map((b) => [b.lineId, b]));
// 表示する行（1行または2行）と、改行させないかどうか
export const displayLines = (lineId: string | undefined, text: string): {lines: string[]; nowrap: boolean} => {
  const b = lineId ? breakById.get(lineId) : undefined;
  if (!b) return {lines: [text], nowrap: false};
  if (b.nowrap) return {lines: [text], nowrap: true};
  const k = b.after ? text.indexOf(b.after) : -1;
  if (k < 0) return {lines: [text], nowrap: false};
  const cut = k + b.after!.length;
  const rest = text.slice(cut).replace(/^[\s　]+/, '');
  return rest ? {lines: [text.slice(0, cut), rest], nowrap: false} : {lines: [text], nowrap: false};
};
