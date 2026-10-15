// チャプター型フェーズナビゲーション（PhaseNavigation）の表示内容と状態。
// 名称と順番は導入資料「YOUR MISSION」の4つの営業プロセスと同じ。WEBアプリ（React）と、単独再生用の書き出し（Remotion）で共通に使う
import {sceneById, scenes} from './index';

export type NavPhase = {id: 'p1' | 'p2' | 'p3' | 'p4'; no: string; name: string; short: string; sub: string; chapter: string};

export const NAV_PHASES: NavPhase[] = [
  {id: 'p1', no: '01', name: '聞く', short: '聞く', sub: 'お客様の現状を確認する', chapter: 'お客様の現状を確認する'},
  {id: 'p2', no: '02', name: '考える', short: '考える', sub: '原因の仮説を立てる', chapter: '原因を調べよう'},
  {id: 'p3', no: '03', name: '課題を見つける', short: '課題発見', sub: '本当に困っていることを理解する', chapter: '本当の困りごとは何だろう？'},
  {id: 'p4', no: '04', name: '提案する', short: '提案', sub: '解決策を実機で検証する', chapter: '解決策を、実機で確かめよう'},
];

export const NAV_RED = '#D7141E';

export type NavState = {
  isIntro: boolean;
  isReflection: boolean;
  currentPhase: number; // 0〜3（導入は -1、振り返りは 4）
  completedPhases: number[];
  currentScene: string;
  phaseProgress: number; // 現在のフェーズの中の進み具合（0〜1）
  progress: number; // 4フェーズ全体の進み具合（0〜1）
};

// 進行の順番（場面の nextSceneId をたどる。分岐の枝は数えない）
const ORDER = (() => {
  const out: string[] = [];
  let id: string | null | undefined = scenes[0]?.sceneId;
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    out.push(id);
    id = sceneById.get(id)?.nextSceneId ?? null;
  }
  return out;
})();

// 進行役が選んでいる場面から、ナビゲーションの状態を決める。学生が動画を止めても、回答を待っていても進まない
export const navState = (sceneId: string): NavState => {
  const sc = sceneById.get(sceneId);
  const phaseId = sc?.phaseId ?? 'intro';
  const idx = NAV_PHASES.findIndex((p) => p.id === phaseId);
  const isIntro = phaseId === 'intro';
  const isReflection = phaseId === 'reflection';
  const cur = isIntro ? -1 : isReflection ? 4 : idx;
  const inPhase = (i: number) => ORDER.filter((id) => sceneById.get(id)?.phaseId === NAV_PHASES[i].id);
  let phaseProgress = 0;
  if (cur >= 0 && cur < 4) {
    const list = inPhase(cur);
    // 枝の場面（例：基準に届かなかったときの次の一手）は、その直前の本流の場面と同じ位置として数える
    let k = list.indexOf(sceneId);
    if (k < 0) k = Math.max(0, list.findIndex((id) => sceneById.get(id)?.nextSceneId === sc?.nextSceneId));
    phaseProgress = (k + 1) / Math.max(1, list.length);
  }
  const progress = isIntro ? 0 : isReflection ? 1 : (cur + phaseProgress) / 4;
  return {isIntro, isReflection, currentPhase: cur, completedPhases: NAV_PHASES.map((_, i) => i).filter((i) => i < cur), currentScene: sceneId, phaseProgress, progress};
};
