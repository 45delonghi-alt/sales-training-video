// WEB参加（学生1〜5名・各自の端末）のセッション。進行役が場面を進め、学生は自分の端末で見て・選んで・書く。
// 変更はサーバー送信イベント（SSE）で全員に即時に届く。保存はメモリだけ（サーバーを止めると消える）。
// 個人情報は扱わない：表示名（ニックネーム）と回答だけ。
import {randomBytes} from 'node:crypto';
import type {IncomingMessage, ServerResponse} from 'node:http';

export const MAX_STUDENTS = 5;
const MAX_SESSIONS = 30;
const SESSION_TTL = 6 * 60 * 60 * 1000; // 6時間で破棄

export type Stage = 'play' | 'answer' | 'branch' | 'explain' | 'write' | 'share';
type Student = {pid: string; name: string; joinedAt: number; lastSeen: number; conns: number; done: Record<string, boolean>};
type Answer = {choiceId: 'A' | 'B' | 'C'; reason: string; at: number};
type Measure = {passed: string; outputs: string; counted: string};
type Demo = {existing: Measure; optex: Measure; source: 'live' | 'simulation'; note: string};
type Session = {
  id: string;
  hostKey: string;
  createdAt: number;
  sceneId: string;
  stage: Stage;
  stageAt: number;
  thinkSeconds: number;
  students: Map<string, Student>;
  answers: Map<string, Map<string, Answer>>; // sceneId → pid → 回答
  texts: Map<string, Map<string, Record<string, string>>>; // sceneId → pid → 入力（提案の4要素・振り返り）
  demo: Map<string, Demo>;
  rev: number;
  hostConns: number;
  clients: Set<{res: ServerResponse; role: 'host' | 'student'; pid?: string}>;
};

const sessions = new Map<string, Session>();

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = (n: number) => Array.from(randomBytes(n), (b) => ABC[b % ABC.length]).join('');
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify(body));
};

const readBody = (req: IncomingMessage) =>
  new Promise<Record<string, unknown>>((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > 16000) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });

const sweep = () => {
  const now = Date.now();
  for (const [id, s] of sessions) if (now - s.createdAt > SESSION_TTL && s.clients.size === 0) sessions.delete(id);
  while (sessions.size >= MAX_SESSIONS) {
    const oldest = [...sessions.values()].sort((a, b) => a.createdAt - b.createdAt)[0];
    for (const c of oldest.clients) c.res.end();
    sessions.delete(oldest.id);
  }
};

// 学生に見せる内容：自分の回答・入力と、全員の集計（2名以上で、解説・共有の段階になってから）
const studentView = (s: Session, pid: string) => {
  const me = s.students.get(pid);
  const n = s.students.size;
  const reveal = (sid: string, st: Stage) => sid === s.sceneId && (st === 'explain' || st === 'share');
  const tally = (sid: string) => {
    const a = s.answers.get(sid);
    const counts = {A: 0, B: 0, C: 0} as Record<string, number>;
    const reasons: {choiceId: string; reason: string}[] = [];
    a?.forEach((x) => {
      counts[x.choiceId]++;
      if (x.reason) reasons.push({choiceId: x.choiceId, reason: x.reason});
    });
    return {counts, reasons, total: a?.size ?? 0};
  };
  const shared = (sid: string) =>
    [...(s.texts.get(sid) ?? new Map()).entries()].map(([p, t]) => ({name: s.students.get(p)?.name ?? '', text: t}));
  return {
    role: 'student' as const,
    sessionId: s.id,
    rev: s.rev,
    sceneId: s.sceneId,
    stage: s.stage,
    stageAt: s.stageAt,
    thinkSeconds: s.thinkSeconds,
    me: me ? {pid, name: me.name} : null,
    members: [...s.students.values()].map((x) => x.name),
    count: n,
    myAnswer: s.answers.get(s.sceneId)?.get(pid) ?? null,
    myText: s.texts.get(s.sceneId)?.get(pid) ?? null,
    answers: Object.fromEntries([...s.answers.entries()].map(([sid, m]) => [sid, m.get(pid) ?? null])),
    tally: n >= 2 && reveal(s.sceneId, s.stage) ? tally(s.sceneId) : null,
    shared: n >= 2 && s.stage === 'share' ? shared(s.sceneId) : null,
    demo: Object.fromEntries(s.demo),
  };
};

const hostView = (s: Session) => ({
  role: 'host' as const,
  sessionId: s.id,
  rev: s.rev,
  sceneId: s.sceneId,
  stage: s.stage,
  stageAt: s.stageAt,
  thinkSeconds: s.thinkSeconds,
  students: [...s.students.values()].map((x) => ({pid: x.pid, name: x.name, online: x.conns > 0, lastSeen: x.lastSeen, done: !!x.done[s.sceneId]})),
  answers: Object.fromEntries([...s.answers.entries()].map(([sid, m]) => [sid, Object.fromEntries(m)])),
  texts: Object.fromEntries([...s.texts.entries()].map(([sid, m]) => [sid, Object.fromEntries(m)])),
  demo: Object.fromEntries(s.demo),
});

const push = (s: Session) => {
  s.rev++;
  for (const c of s.clients) {
    const data = c.role === 'host' ? hostView(s) : studentView(s, c.pid!);
    c.res.write(`event: state\ndata: ${JSON.stringify(data)}\n\n`);
  }
};

const STAGES: Stage[] = ['play', 'answer', 'branch', 'explain', 'write', 'share'];

export const handleLive = async (req: IncomingMessage, res: ServerResponse, firstSceneId: string) => {
  const [path, query = ''] = (req.url || '').split('?');
  const q = new URLSearchParams(query);
  const parts = path.replace(/^\/api\/live\/?/, '').split('/').filter(Boolean);
  try {
    // セッションを作る（進行役）
    if (req.method === 'POST' && parts.length === 0) {
      sweep();
      let id = code(5);
      while (sessions.has(id)) id = code(5);
      const s: Session = {id, hostKey: code(16), createdAt: Date.now(), sceneId: firstSceneId, stage: 'play', stageAt: Date.now(), thinkSeconds: 45, students: new Map(), answers: new Map(), texts: new Map(), demo: new Map(), rev: 0, hostConns: 0, clients: new Set()};
      sessions.set(id, s);
      return json(res, 201, {sessionId: id, hostKey: s.hostKey});
    }
    const s = sessions.get((parts[0] || '').toUpperCase());
    if (!s) return json(res, 404, {error: 'session not found'});
    const isHost = (k: unknown) => typeof k === 'string' && k === s.hostKey;

    // 接続が切れたときの確認（参加が有効か）
    if (req.method === 'HEAD' && parts[1] === 'events') {
      const ok = q.get('role') === 'host' ? isHost(q.get('key')) : s.students.has(q.get('pid') || '');
      res.writeHead(ok ? 200 : 404).end();
      return;
    }
    // 状態の受信（SSE）。再接続すると最新の状態がすぐ届く
    if (req.method === 'GET' && parts[1] === 'events') {
      const role = q.get('role') === 'host' ? 'host' : 'student';
      const pid = q.get('pid') || '';
      if (role === 'host' && !isHost(q.get('key'))) return json(res, 403, {error: 'forbidden'});
      if (role === 'student' && !s.students.has(pid)) return json(res, 404, {error: 'not joined'});
      res.writeHead(200, {'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no'});
      res.write('retry: 2000\n\n');
      const client = {res, role: role as 'host' | 'student', pid};
      s.clients.add(client);
      if (role === 'student') {
        const st = s.students.get(pid)!;
        st.conns++;
        st.lastSeen = Date.now();
      }
      push(s);
      const ping = setInterval(() => res.write(': ping\n\n'), 20000);
      req.on('close', () => {
        clearInterval(ping);
        s.clients.delete(client);
        const st = s.students.get(pid);
        if (st) {
          st.conns = Math.max(0, st.conns - 1);
          st.lastSeen = Date.now();
        }
        push(s);
      });
      return;
    }

    if (req.method !== 'POST') return json(res, 404, {error: 'not found'});
    const b = await readBody(req);

    // 参加（学生）。同じ端末からの再参加は同じ人として扱う
    if (parts[1] === 'join') {
      const pid = str(b.pid, 40);
      if (pid && s.students.has(pid)) {
        const st = s.students.get(pid)!;
        const name = str(b.name, 20);
        if (name) st.name = name;
        push(s);
        return json(res, 200, {pid});
      }
      if (s.students.size >= MAX_STUDENTS) return json(res, 409, {error: 'full', max: MAX_STUDENTS});
      const name = str(b.name, 20) || `参加者${s.students.size + 1}`;
      const id = code(10);
      s.students.set(id, {pid: id, name, joinedAt: Date.now(), lastSeen: Date.now(), conns: 0, done: {}});
      push(s);
      return json(res, 201, {pid: id});
    }

    // 進行役の操作
    if (parts[1] === 'host') {
      if (!isHost(b.key)) return json(res, 403, {error: 'forbidden'});
      const action = str(b.action, 20);
      if (action === 'go') {
        const sceneId = str(b.sceneId, 60);
        const stage = str(b.stage, 10) as Stage;
        if (!sceneId) return json(res, 400, {error: 'bad request'});
        s.sceneId = sceneId;
        s.stage = STAGES.includes(stage) ? stage : 'play';
        s.stageAt = Date.now();
        if (typeof b.thinkSeconds === 'number') s.thinkSeconds = Math.max(0, Math.min(300, b.thinkSeconds));
      } else if (action === 'stage') {
        const stage = str(b.stage, 10) as Stage;
        if (!STAGES.includes(stage)) return json(res, 400, {error: 'bad stage'});
        s.stage = stage;
        s.stageAt = Date.now();
      } else if (action === 'demo') {
        const sceneId = str(b.sceneId, 60);
        const m = (x: unknown): Measure => {
          const o = (x ?? {}) as Record<string, unknown>;
          return {passed: str(o.passed, 8), outputs: str(o.outputs, 8), counted: str(o.counted, 8)};
        };
        const d = (b.demo ?? {}) as Record<string, unknown>;
        s.demo.set(sceneId, {existing: m(d.existing), optex: m(d.optex), source: d.source === 'live' ? 'live' : 'simulation', note: str(d.note, 200)});
      } else if (action === 'remove') {
        const pid = str(b.pid, 40);
        s.students.delete(pid);
        for (const c of s.clients) if (c.pid === pid) c.res.end();
      } else if (action === 'reset') {
        s.answers.clear();
        s.texts.clear();
        s.demo.clear();
        s.sceneId = firstSceneId;
        s.stage = 'play';
        s.stageAt = Date.now();
      } else return json(res, 400, {error: 'unknown action'});
      push(s);
      return json(res, 200, {ok: true});
    }

    // 学生の操作
    const pid = str(b.pid, 40);
    const st = s.students.get(pid);
    if (!st) return json(res, 404, {error: 'not joined'});
    st.lastSeen = Date.now();
    const sceneId = str(b.sceneId, 60);
    if (parts[1] === 'answer') {
      const choiceId = str(b.choiceId, 1);
      if (sceneId !== s.sceneId || s.stage !== 'answer') return json(res, 409, {error: 'closed'});
      if (!['A', 'B', 'C'].includes(choiceId)) return json(res, 400, {error: 'bad choice'});
      const m = s.answers.get(sceneId) ?? new Map<string, Answer>();
      m.set(pid, {choiceId: choiceId as Answer['choiceId'], reason: str(b.reason, 140), at: Date.now()});
      s.answers.set(sceneId, m);
    } else if (parts[1] === 'text') {
      if (sceneId !== s.sceneId || s.stage !== 'write') return json(res, 409, {error: 'closed'});
      const raw = (b.text ?? {}) as Record<string, unknown>;
      const text = Object.fromEntries(Object.entries(raw).slice(0, 8).map(([k, v]) => [str(k, 20), str(v, 300)]));
      const m = s.texts.get(sceneId) ?? new Map<string, Record<string, string>>();
      m.set(pid, text);
      s.texts.set(sceneId, m);
    } else if (parts[1] === 'done') {
      st.done[sceneId] = true;
    } else return json(res, 404, {error: 'not found'});
    push(s);
    return json(res, 200, {ok: true});
  } catch {
    return json(res, 400, {error: 'bad request'});
  }
};
