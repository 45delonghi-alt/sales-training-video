import type {Asset, Phase, QuestionScene, Scene} from '../types';
import phasesJson from './phases.json';
import scenesJson from './scenes.json';
import assetsJson from './assets.json';

export const phases = phasesJson as Phase[];
export const scenes = scenesJson as unknown as Scene[];
export const assets = assetsJson as Asset[];

export const sceneById = new Map(scenes.map((s) => [s.sceneId, s]));
export const assetById = new Map(assets.map((a) => [a.assetId, a]));

export const questions = scenes.filter((s): s is QuestionScene => s.type === 'question');

// 素材を使っている場面（セリフ・字幕の取り出し用）
export const linesForAsset = (assetId: string): {speaker: string; text: string}[] => {
  for (const s of scenes) {
    if (s.type === 'clip' && s.assetId === assetId) return s.lines;
    if (s.type === 'question') {
      const c = s.choices.find((ch) => ch.assetId === assetId);
      if (c) return [{speaker: 'customer', text: c.customerResponse}];
    }
  }
  return [];
};

// 選択肢 → 映像の対応表（branches.json として書き出す）
export const branches = () =>
  questions.flatMap((q) =>
    q.choices.map((c) => ({
      branchId: `${q.sceneId}-${c.choiceId}`,
      phaseId: q.phaseId,
      questionId: q.sceneId,
      choiceId: c.choiceId,
      assetId: c.assetId,
      compositionId: compositionIdFor(c.assetId),
      recommended: q.recommendedChoice === c.choiceId,
      nextSceneId: q.nextSceneId,
    })),
  );

export const compositionIdFor = (assetId: string) => `XP-${assetId}`;

// 実写・実機の映像の置き場所（assets.json に videoPath がなければ、素材IDと同じ名前の MP4）
export const videoPathFor = (assetId: string) => assetById.get(assetId)?.videoPath ?? `experience/videos/${assetId}.mp4`;

// セリフの読み上げ時間の目安（字幕を出しておく秒数）
export const readSeconds = (text: string) => Math.max(2.2, [...text].length * 0.17 + 0.8);

// セリフの表示タイミング（秒）とクリップの長さ。映像・アプリ・台本書き出しで共通に使う
export type TimedLine = {speaker: string; text: string; from: number; to: number};
export const lineSchedule = (lines: {speaker: string; text: string}[], dialogAt: number): TimedLine[] => {
  let t = dialogAt;
  return lines.map((l) => {
    const from = t;
    t += readSeconds(l.text);
    return {...l, from, to: t};
  });
};
export const clipSeconds = (seconds: number, lines: {speaker: string; text: string}[], dialogAt: number) => {
  const sched = lineSchedule(lines, dialogAt);
  const end = sched.length ? sched[sched.length - 1].to + 0.8 : 0;
  return Math.max(seconds, end);
};
export const assetSeconds = (assetId: string) => {
  const a = assetById.get(assetId);
  return a ? clipSeconds(a.seconds, linesForAsset(assetId), a.dialogAt ?? 0.8) : 0;
};
