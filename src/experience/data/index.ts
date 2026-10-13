import type {Asset, Character, GlossaryItem, Line, Phase, PhaseFile, QuestionScene, Scene, Speaker} from '../types';
import phasesJson from './phases.json';
import assetsJson from './assets.json';
import charactersJson from './characters.json';
import glossaryJson from './glossary.json';

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

// 素材を使っている場面のセリフ（字幕・音声・台本の書き出し用）
export const linesForAsset = (assetId: string): Line[] => {
  for (const s of scenes) {
    if (s.type === 'clip' && s.videoAsset === assetId) return s.lines;
    if (s.type === 'question') {
      const c = s.choices.find((ch) => ch.videoAsset === assetId);
      if (c) {
        const sales = salesLineOf(c);
        return [...(sales ? [{speaker: 'sales' as Speaker, text: sales}] : []), ...splitLong(c.responder, c.customerResponse), ...(c.extraLines ?? [])];
      }
    }
  }
  return [];
};

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

// 声の音声の置き場所（素材ごとに1ファイル。セリフの開始時刻から再生）
export const audioPathFor = (assetId: string) => `experience/audio/${assetId}.mp3`;

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
export type TimedLine = Line & {from: number; to: number};
export const lineSchedule = (lines: Line[], dialogAt: number): TimedLine[] => {
  let t = dialogAt;
  return lines.map((l) => {
    const from = t;
    t += readSeconds(l.text);
    return {...l, from, to: t};
  });
};
export const clipSeconds = (seconds: number, lines: Line[], dialogAt: number) => {
  const sched = lineSchedule(lines, dialogAt);
  const end = sched.length ? sched[sched.length - 1].to + 0.8 : 0;
  return Math.max(seconds, end);
};
export const assetSeconds = (assetId: string) => {
  const a = assetById.get(assetId);
  return a ? clipSeconds(a.seconds, linesForAsset(assetId), a.dialogAt ?? 0.8) : 0;
};
