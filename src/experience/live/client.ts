// WEB参加（学生1〜5名）の通信。状態はサーバーから SSE で届き、操作は POST で送る。
// 接続が切れても EventSource が自動で再接続し、最新の状態を受け取り直す。
import {useEffect, useState} from 'react';
import {scenes, sceneById} from '../data';
import type {Scene} from '../types';

export type Stage = 'play' | 'answer' | 'branch' | 'explain' | 'write' | 'share';
export type Answer = {choiceId: 'A' | 'B' | 'C'; reason: string; at: number};
export type Measure = {passed: string; outputs: string; counted: string};
export type Demo = {existing: Measure; optex: Measure; source: 'live' | 'simulation'; note: string};

type Common = {sessionId: string; rev: number; sceneId: string; stage: Stage; stageAt: number; thinkSeconds: number; demo: Record<string, Demo>};
export type StudentState = Common & {
  role: 'student';
  me: {pid: string; name: string} | null;
  members: string[];
  count: number;
  myAnswer: Answer | null;
  myText: Record<string, string> | null;
  answers: Record<string, Answer | null>;
  tally: {counts: Record<string, number>; reasons: {choiceId: string; reason: string}[]; total: number} | null;
  shared: {name: string; text: Record<string, string>}[] | null;
};
export type HostState = Common & {
  role: 'host';
  students: {pid: string; name: string; online: boolean; lastSeen: number; done: boolean}[];
  answers: Record<string, Record<string, Answer>>;
  texts: Record<string, Record<string, Record<string, string>>>;
};

const post = async <T = {ok: true}>(path: string, body: unknown): Promise<T> => {
  const r = await fetch(`api/live/${path}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || String(r.status)), {status: r.status, body: j});
  return j as T;
};

export const api = {
  create: () => post<{sessionId: string; hostKey: string}>('', {}),
  join: (sid: string, name: string, pid?: string) => post<{pid: string}>(`${sid}/join`, {name, pid}),
  host: (sid: string, key: string, body: Record<string, unknown>) => post(`${sid}/host`, {key, ...body}),
  answer: (sid: string, pid: string, sceneId: string, choiceId: string, reason: string) => post(`${sid}/answer`, {pid, sceneId, choiceId, reason}),
  text: (sid: string, pid: string, sceneId: string, text: Record<string, string>) => post(`${sid}/text`, {pid, sceneId, text}),
  done: (sid: string, pid: string, sceneId: string) => post(`${sid}/done`, {pid, sceneId}),
};

// SSE で状態を受け取る。online＝いま接続しているか
export const useLiveState = <T>(url: string | null) => {
  const [state, setState] = useState<T | null>(null);
  const [online, setOnline] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!url) return;
    let es: EventSource | null = null;
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      es = new EventSource(url);
      es.addEventListener('state', (e) => {
        setState(JSON.parse((e as MessageEvent).data));
        setOnline(true);
      });
      es.onerror = () => {
        setOnline(false);
        // セッションが消えた・参加が取り消された（404）ときは止める。それ以外は自動で再接続
        fetch(url, {method: 'HEAD'}).then((r) => {
          if (r.status === 404 || r.status === 403) {
            es?.close();
            if (alive) setGone(true);
          }
        }).catch(() => undefined);
        if (es?.readyState === EventSource.CLOSED && alive) {
          retry = setTimeout(open, 2000);
        }
      };
    };
    open();
    return () => {
      alive = false;
      clearTimeout(retry);
      es?.close();
    };
  }, [url]);
  return {state, online, gone};
};

// 場面の既定の段階（進行役が場面に入ったとき）
export const firstStage = (s?: Scene): Stage => (s?.type === 'question' ? 'answer' : s?.type === 'pitch' || s?.type === 'reflection' ? 'write' : 'play');

// 進行の順番（nextSceneId をたどる）。p4-followup は基準に届かなかったときだけ使う枝
export const mainOrder = (): string[] => {
  const order: string[] = [];
  let id: string | null | undefined = scenes[0]?.sceneId;
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    order.push(id);
    id = sceneById.get(id)?.nextSceneId ?? null;
  }
  return order;
};

// 端末ごとの参加ID（セッションごとに保存。再読み込み・再接続しても同じ人として戻れる）
export const savedPid = (sid: string) => {
  try {
    return localStorage.getItem(`optexfa-live-${sid}`) || '';
  } catch {
    return '';
  }
};
export const savePid = (sid: string, pid: string) => {
  try {
    localStorage.setItem(`optexfa-live-${sid}`, pid);
  } catch {
    // 保存できない端末でも、開いている間は参加できる
  }
};

export const useAvailable = () => {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch('available.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: string[]) => setSet(new Set(list)))
      .catch(() => setSet(new Set()));
  }, []);
  return set;
};

export const useNow = (ms = 500) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
};

// 実機デモの仮想データ（教育用）。実測を記録するまでは、これを「仮想データ」と明記して表示する
export const VIRTUAL_DEMO: Record<string, Demo> = {
  'p4-demo-normal': {existing: {passed: '1000', outputs: '1000', counted: '1000'}, optex: {passed: '1000', outputs: '1000', counted: '1000'}, source: 'simulation', note: ''},
  'p4-demo-wobble': {existing: {passed: '1000', outputs: '1024', counted: '1024'}, optex: {passed: '1000', outputs: '1000', counted: '1000'}, source: 'simulation', note: ''},
  'p4-demo-gap': {existing: {passed: '1000', outputs: '1011', counted: '1011'}, optex: {passed: '1000', outputs: '1000', counted: '1000'}, source: 'simulation', note: ''},
};
export const demoOf = (demo: Record<string, Demo>, sceneId: string): Demo | undefined => demo[sceneId] ?? VIRTUAL_DEMO[sceneId];
export const rate = (m?: Measure) => {
  const p = Number(m?.passed);
  const c = Number(m?.counted);
  if (!m?.passed || !m?.counted || !Number.isFinite(p) || p <= 0 || !Number.isFinite(c)) return '―';
  const r = ((c - p) / p) * 100;
  return `${r >= 0 ? '+' : ''}${r.toFixed(1)}%`;
};
export const pass = (m?: Measure) => !!m?.passed && m.passed === m.outputs && m.passed === m.counted;
