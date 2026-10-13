// スマートフォン回答（第2段階）。配信サーバー（npm run experience:serve）の /api を使う。
// 回答はサーバーのメモリに集まる（同じ会場ネットワークの複数端末から送れる）。
// サーバーを使わずに index.html を開いた場合は使えない（その旨を画面に出す）。
import {useEffect, useState} from 'react';

export type VoteChoice = {choiceId: 'A' | 'B' | 'C'; choiceText: string};
export type VoteCurrent = {key: string; questionId: string; questionText: string; choices: VoteChoice[]; open: boolean};
export type VoteStatus = {sessionId: string; current: VoteCurrent | null; counts: Record<string, number>; total: number; reasons: {choiceId: string; reason: string}[]};

const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const r = await fetch(`api/${path}`, {...init, headers: {'Content-Type': 'application/json'}});
  if (!r.ok) throw new Error(`${r.status}`);
  return (await r.json()) as T;
};

export const createSession = () => api<{sessionId: string}>('sessions', {method: 'POST', body: '{}'});
export const serverInfo = () => api<{lan: string[]; port: number}>('info');
export const setCurrent = (sessionId: string, current: VoteCurrent | null) =>
  api<{ok: true}>(`sessions/${sessionId}/current`, {method: 'PUT', body: JSON.stringify({current})});
export const sendVote = (sessionId: string, body: {voterId: string; key: string; choiceId: string; reason: string}) =>
  api<{ok: true}>(`sessions/${sessionId}/votes`, {method: 'POST', body: JSON.stringify(body)});
export const getStatus = (sessionId: string, voter = false) => api<VoteStatus>(`sessions/${sessionId}${voter ? '?role=voter' : ''}`);

// 一定間隔で集計を取りに行く（ポーリング）
export const useVoteStatus = (sessionId: string | undefined, voter = false, ms = 1500) => {
  const [status, setStatus] = useState<VoteStatus | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    const tick = () =>
      getStatus(sessionId, voter)
        .then((s) => alive && (setStatus(s), setError(false)))
        .catch(() => alive && setError(true));
    tick();
    const id = setInterval(tick, ms);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [sessionId, voter, ms]);
  return {status, error};
};

// 端末ごとのID（同じ端末から送り直すと上書き＝1端末1票）
let cached = '';
export const voterId = () => {
  const KEY = 'optexfa-xp-voter';
  if (cached) return cached;
  try {
    cached = localStorage.getItem(KEY) ?? '';
  } catch {
    // 保存できない端末でも、開いている間は同じIDを使う
  }
  if (!cached) {
    cached = Math.random().toString(36).slice(2, 12);
    try {
      localStorage.setItem(KEY, cached);
    } catch {
      // 同上
    }
  }
  return cached;
};
