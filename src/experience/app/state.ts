// 体験アプリの状態。ブラウザに保存し（再読み込みしても続きから）、投影用ウィンドウと同期する。
import {useEffect, useReducer, useRef} from 'react';
import {phases, sceneById, scenes} from '../data';
import type {QuestionScene, Scene} from '../types';

export type ChoiceId = 'A' | 'B' | 'C';
export type Step = 'ready' | 'playing' | 'done' | 'think' | 'choose' | 'result';

export type Answer = {choiceId: ChoiceId; reason: string; at: number; tries: ChoiceId[]};
export type DemoResult = {passed: string; counted: string; chatter: '' | 'yes' | 'no'; note: string; source: 'live' | 'video' | 'simulation'};

export type State = {
  sceneId: string;
  step: Step;
  stack: {sceneId: string; step: Step}[];
  answers: Record<string, Answer>;
  demo: Record<string, DemoResult>;
  pitch: Record<string, string>;
  notes: Record<string, string>; // 振り返りのメモ
  revealed: Record<string, boolean>; // 解説（推奨・学習ポイント）を表示したか
  compare: boolean;
  showSubtitles: boolean;
  showStatus: boolean;
  volume: number;
  startedAt: number | null;
  phaseEnteredAt: Record<string, number>;
  playToken: number; // 再生し直しの合図
};

const KEY = 'optexfa-xp-session-v1';

export const initialStep = (s: Scene | undefined): Step => (s?.type === 'question' ? 'think' : 'ready');

export const fresh = (): State => ({
  sceneId: scenes[0].sceneId,
  step: initialStep(scenes[0]),
  stack: [],
  answers: {},
  demo: {},
  pitch: {},
  notes: {},
  revealed: {},
  compare: false,
  showSubtitles: true,
  showStatus: true,
  volume: 0.8,
  startedAt: null,
  phaseEnteredAt: {},
  playToken: 0,
});

const load = (): State => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = {...fresh(), ...JSON.parse(raw)} as State;
      if (sceneById.has(s.sceneId)) return s;
    }
  } catch {
    // 保存できない環境（プライベートモード等）でも動く
  }
  return fresh();
};

export type Action =
  | {type: 'go'; sceneId: string}
  | {type: 'next'}
  | {type: 'back'}
  | {type: 'step'; step: Step}
  | {type: 'choose'; choiceId: ChoiceId}
  | {type: 'reason'; text: string}
  | {type: 'reveal'; on: boolean}
  | {type: 'compare'; on: boolean}
  | {type: 'demo'; sceneId: string; result: Partial<DemoResult>}
  | {type: 'pitch'; key: string; text: string}
  | {type: 'note'; sceneId: string; text: string}
  | {type: 'toggle'; key: 'showSubtitles' | 'showStatus'}
  | {type: 'volume'; value: number}
  | {type: 'start'}
  | {type: 'replay'}
  | {type: 'reset'}
  | {type: 'replace'; state: State};

// 実機デモの判定（記録がなければ null）
export const judge = (r?: DemoResult): boolean | null => {
  if (!r || r.passed === '' || r.counted === '' || r.chatter === '') return null;
  const p = Number(r.passed);
  const c = Number(r.counted);
  if (!Number.isFinite(p) || !Number.isFinite(c) || p <= 0) return null;
  return p === c && r.chatter === 'no';
};

const DEMO_SCENES = scenes.filter((s) => s.type === 'demo').map((s) => s.sceneId);

// この問いの前提となる実測（p5-s3 は通常条件、p5-s4 はそれまでの全条件）
export const demoGate = (q: QuestionScene, demo: Record<string, DemoResult>) => {
  const idx = scenes.findIndex((s) => s.sceneId === q.sceneId);
  const needed = DEMO_SCENES.filter((id) => scenes.findIndex((s) => s.sceneId === id) < idx);
  const results = needed.map((id) => ({id, ok: judge(demo[id])}));
  if (results.some((r) => r.ok === false)) return {status: 'fail' as const, results};
  if (results.some((r) => r.ok === null)) return {status: 'missing' as const, results};
  return {status: 'pass' as const, results};
};

const enter = (s: State, sceneId: string, push = true): State => {
  const scene = sceneById.get(sceneId);
  if (!scene) return s;
  const now = Date.now();
  const phaseEnteredAt = s.phaseEnteredAt[scene.phaseId] ? s.phaseEnteredAt : {...s.phaseEnteredAt, [scene.phaseId]: now};
  return {
    ...s,
    sceneId,
    step: initialStep(scene),
    stack: push ? [...s.stack, {sceneId: s.sceneId, step: s.step}] : s.stack,
    compare: false,
    phaseEnteredAt,
    startedAt: s.startedAt ?? now,
    playToken: s.playToken + 1,
  };
};

export const reducer = (s: State, a: Action): State => {
  const scene = sceneById.get(s.sceneId);
  switch (a.type) {
    case 'replace':
      return a.state;
    case 'go':
      return enter(s, a.sceneId);
    case 'next': {
      if (!scene || scene.nextSceneId === null) return s;
      return enter(s, scene.nextSceneId);
    }
    case 'back': {
      // 同じ問いの中では、結果 → 選択 → 考える の順に戻る
      if (scene?.type === 'question' && (s.step === 'result' || s.step === 'playing')) return {...s, step: 'choose', compare: false};
      if (scene?.type === 'question' && s.step === 'choose') return {...s, step: 'think'};
      const prev = s.stack[s.stack.length - 1];
      if (!prev) return s;
      return {...enter(s, prev.sceneId, false), stack: s.stack.slice(0, -1), step: prev.step === 'playing' ? 'ready' : prev.step};
    }
    case 'step':
      return {...s, step: a.step, playToken: a.step === 'playing' ? s.playToken + 1 : s.playToken};
    case 'choose': {
      const prev = s.answers[s.sceneId];
      const tries = [...(prev?.tries ?? []), a.choiceId];
      return {
        ...s,
        step: 'playing',
        compare: false,
        playToken: s.playToken + 1,
        answers: {...s.answers, [s.sceneId]: {choiceId: a.choiceId, reason: prev?.reason ?? '', at: Date.now(), tries}},
      };
    }
    case 'reason': {
      const prev = s.answers[s.sceneId];
      if (!prev) return s;
      return {...s, answers: {...s.answers, [s.sceneId]: {...prev, reason: a.text}}};
    }
    case 'reveal':
      return {...s, revealed: {...s.revealed, [s.sceneId]: a.on}};
    case 'compare':
      return {...s, compare: a.on};
    case 'demo': {
      const prev = s.demo[a.sceneId] ?? {passed: '', counted: '', chatter: '', note: '', source: 'simulation'};
      return {...s, demo: {...s.demo, [a.sceneId]: {...prev, ...a.result}}};
    }
    case 'pitch':
      return {...s, pitch: {...s.pitch, [a.key]: a.text}};
    case 'note':
      return {...s, notes: {...s.notes, [a.sceneId]: a.text}};
    case 'toggle':
      return {...s, [a.key]: !s[a.key]};
    case 'volume':
      return {...s, volume: a.value};
    case 'start':
      return {...s, startedAt: s.startedAt ?? Date.now()};
    case 'replay':
      return {...s, step: 'playing', playToken: s.playToken + 1};
    case 'reset':
      return fresh();
    default:
      return s;
  }
};

// 投影用ウィンドウとの同期（同じブラウザの別タブ・別ウィンドウ）
export type Sync = {kind: 'state'; state: State} | {kind: 'cmd'; cmd: 'play' | 'pause'} | {kind: 'hello'};
const CHANNEL = 'optexfa-xp-sync';

export const useExperience = (role: 'control' | 'projector') => {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const chan = useRef<BroadcastChannel | null>(null);
  const cmdListeners = useRef(new Set<(c: 'play' | 'pause') => void>());

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const c = new BroadcastChannel(CHANNEL);
    chan.current = c;
    c.onmessage = (e: MessageEvent<Sync>) => {
      const m = e.data;
      if (m.kind === 'state' && role === 'projector') {
        dispatch({type: 'replace', state: m.state});
      }
      if (m.kind === 'hello' && role === 'control') c.postMessage({kind: 'state', state: stateRef.current} satisfies Sync);
      if (m.kind === 'cmd' && role === 'projector') cmdListeners.current.forEach((f) => f(m.cmd));
    };
    if (role === 'projector') c.postMessage({kind: 'hello'} satisfies Sync);
    return () => c.close();
  }, [role]);

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (role !== 'control') return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // 保存できなくても進行は続けられる
    }
    chan.current?.postMessage({kind: 'state', state} satisfies Sync);
  }, [state, role]);

  const sendCmd = (cmd: 'play' | 'pause') => chan.current?.postMessage({kind: 'cmd', cmd} satisfies Sync);
  const onCmd = (f: (c: 'play' | 'pause') => void) => {
    cmdListeners.current.add(f);
    return () => {
      cmdListeners.current.delete(f);
    };
  };
  return {state, dispatch, sendCmd, onCmd};
};

export const phaseOf = (sceneId: string) => {
  const s = sceneById.get(sceneId);
  return phases.find((p) => p.phaseId === s?.phaseId) ?? phases[0];
};

// 選んだ選択肢から分かったこと（場面の順）
export const discoveries = (answers: Record<string, Answer>) =>
  scenes
    .filter((s): s is QuestionScene => s.type === 'question' && !!answers[s.sceneId])
    .map((q) => {
      const c = q.choices.find((ch) => ch.choiceId === answers[q.sceneId].choiceId)!;
      return {sceneId: q.sceneId, phaseId: q.phaseId, text: c.discovered};
    });
