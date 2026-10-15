// 体験アプリのビルドと配信。
//   npm run experience:build  … dist/experience/ に書き出す（app.js・app.css・index.html・素材・available.json）
//   npm run experience:serve  … dist/experience/ を http://localhost:4173/ で配信（会場PCでの実行用）
//                                 あわせて、スマートフォン回答の API（/api/…）を提供する（メモリ上の一時保存。サーバーを止めると消える）
import {cpSync, createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {networkInterfaces} from 'node:os';
import {extname, join, relative} from 'node:path';
import {build} from 'esbuild';
import {handleLive} from './live-server';

const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'dist', 'experience');
const APP = join(ROOT, 'src', 'experience', 'app');

// アプリが読む素材（public/ 以下）
const MEDIA_DIRS = ['consulting', 'experience'];

const walk = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? walk(p) : [p];
      })
    : [];

const buildApp = async () => {
  rmSync(OUT, {recursive: true, force: true});
  mkdirSync(OUT, {recursive: true});
  await build({
    entryPoints: {app: join(APP, 'main.tsx')},
    bundle: true,
    minify: true,
    sourcemap: false,
    format: 'iife',
    target: ['chrome110', 'edge110', 'safari16'],
    outdir: OUT,
    jsx: 'automatic',
    loader: {'.woff2': 'file', '.woff': 'file', '.png': 'file', '.webp': 'file'},
    assetNames: 'assets/[name]-[hash]',
    define: {'process.env.NODE_ENV': '"production"'},
    logLevel: 'warning',
  });
  cpSync(join(APP, 'index.html'), join(OUT, 'index.html'));
  const files: string[] = [];
  for (const d of MEDIA_DIRS) {
    const src = join(ROOT, 'public', d);
    if (!existsSync(src)) continue;
    cpSync(src, join(OUT, d), {recursive: true});
    files.push(...walk(src).map((f) => relative(join(ROOT, 'public'), f).split('\\').join('/')));
  }
  // 書き出し済みの体験クリップ（MP4）。WEB参加の学生端末は、端末で描画せずにこれを再生する（軽い）
  const rendered = join(ROOT, 'out', 'experience', 'videos');
  if (existsSync(rendered)) {
    mkdirSync(join(OUT, 'experience', 'rendered'), {recursive: true});
    for (const f of readdirSync(rendered).filter((x) => x.endsWith('.mp4'))) {
      cpSync(join(rendered, f), join(OUT, 'experience', 'rendered', f));
      files.push(`experience/rendered/${f}`);
    }
  }
  // 配置済みの素材一覧（アプリはここにあるものだけを参照する＝存在しないファイルを読まない）
  writeFileSync(join(OUT, 'available.json'), JSON.stringify(files.sort(), null, 1));
  const size = walk(OUT).reduce((n, f) => n + statSync(f).size, 0);
  console.log(`dist/experience に書き出しました（${files.length}素材、合計 ${(size / 1e6).toFixed(1)}MB）`);
};

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};


// ---------------------------------------------------------------- スマートフォン回答 API
// 1台の会場PCで配信し、同じネットワークのスマートフォンから回答を受ける。
// 保存はメモリだけ（個人情報は扱わない：端末ごとの乱数IDと、選んだ記号・任意の理由だけ）。
type Current = {key: string; questionId: string; questionText: string; choices: {choiceId: string; choiceText: string}[]; open: boolean};
type Session = {createdAt: number; current: Current | null; votes: Map<string, Map<string, {choiceId: string; reason: string; at: number}>>};
const sessions = new Map<string, Session>();
const MAX_SESSIONS = 20;
const MAX_VOTERS = 500;

const newId = () => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 読み違えやすい文字（I・O・0・1）を除く
  let id = '';
  do id = Array.from({length: 5}, () => abc[Math.floor(Math.random() * abc.length)]).join('');
  while (sessions.has(id));
  return id;
};

const json = (res: ServerResponse, code: number, body: unknown) => {
  res.writeHead(code, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify(body));
};

const readBody = (req: IncomingMessage) =>
  new Promise<Record<string, unknown>>((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > 8000) {
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

const lanAddresses = () =>
  Object.values(networkInterfaces())
    .flat()
    .filter((n): n is NonNullable<typeof n> => !!n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address);

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

export const handleApi = async (req: IncomingMessage, res: ServerResponse, port: number) => {
  const [path, query = ''] = (req.url || '').split('?');
  const parts = path.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  try {
    if (req.method === 'GET' && parts[0] === 'info') return json(res, 200, {lan: lanAddresses(), port});
    if (req.method === 'POST' && parts[0] === 'sessions' && parts.length === 1) {
      if (sessions.size >= MAX_SESSIONS) {
        const oldest = [...sessions.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
        sessions.delete(oldest[0]);
      }
      const id = newId();
      sessions.set(id, {createdAt: Date.now(), current: null, votes: new Map()});
      return json(res, 201, {sessionId: id});
    }
    if (parts[0] !== 'sessions' || !parts[1]) return json(res, 404, {error: 'not found'});
    const s = sessions.get(parts[1].toUpperCase());
    if (!s) return json(res, 404, {error: 'session not found'});

    if (req.method === 'GET' && parts.length === 2) {
      const voter = new URLSearchParams(query).get('role') === 'voter';
      const v = s.current ? s.votes.get(s.current.key) : undefined;
      const counts: Record<string, number> = {A: 0, B: 0, C: 0};
      const reasons: {choiceId: string; reason: string}[] = [];
      v?.forEach((x) => {
        counts[x.choiceId] = (counts[x.choiceId] ?? 0) + 1;
        if (x.reason) reasons.push({choiceId: x.choiceId, reason: x.reason});
      });
      // 回答する側には集計を返さない（ほかの人の選択に引っ張られないように）
      return json(res, 200, {sessionId: parts[1].toUpperCase(), current: s.current, counts: voter ? {} : counts, total: v?.size ?? 0, reasons: voter ? [] : reasons.slice(-30)});
    }
    if (req.method === 'PUT' && parts[2] === 'current') {
      const b = await readBody(req);
      const c = b.current as Current | null;
      s.current = c
        ? {
            key: str(c.key, 80),
            questionId: str(c.questionId, 40),
            questionText: str(c.questionText, 200),
            choices: (Array.isArray(c.choices) ? c.choices : []).slice(0, 3).map((x) => ({choiceId: str(x.choiceId, 1), choiceText: str(x.choiceText, 200)})),
            open: !!c.open,
          }
        : null;
      return json(res, 200, {ok: true});
    }
    if (req.method === 'POST' && parts[2] === 'votes') {
      const b = await readBody(req);
      const key = str(b.key, 80);
      const choiceId = str(b.choiceId, 1);
      const voterId = str(b.voterId, 40);
      if (!s.current || !s.current.open || s.current.key !== key) return json(res, 409, {error: 'closed'});
      if (!['A', 'B', 'C'].includes(choiceId) || !voterId) return json(res, 400, {error: 'bad request'});
      const v = s.votes.get(key) ?? new Map();
      if (!v.has(voterId) && v.size >= MAX_VOTERS) return json(res, 429, {error: 'full'});
      v.set(voterId, {choiceId, reason: str(b.reason, 120), at: Date.now()});
      s.votes.set(key, v);
      return json(res, 200, {ok: true});
    }
    return json(res, 404, {error: 'not found'});
  } catch {
    return json(res, 400, {error: 'bad request'});
  }
};

const serve = () => {
  if (!existsSync(join(OUT, 'index.html'))) {
    console.error('先に npm run experience:build を実行してください');
    process.exit(1);
  }
  const port = Number(process.env.PORT || 4173);
  createServer((req, res) => {
    if ((req.url || '').startsWith('/api/live')) {
      void handleLive(req, res, 'intro-video');
      return;
    }
    if ((req.url || '').startsWith('/api/')) {
      void handleApi(req, res, port);
      return;
    }
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = join(OUT, url.endsWith('/') ? `${url}index.html` : url);
    if (!file.startsWith(OUT) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    const size = statSync(file).size;
    const type0 = TYPES[extname(file)] || 'application/octet-stream';
    // 大きな動画は読み込まずに流す（Range 対応）
    if (size > 8e6) {
      const range = req.headers.range;
      const [a, b] = (range || 'bytes=0-').replace('bytes=', '').split('-');
      const start = Number(a) || 0;
      const end = b ? Number(b) : size - 1;
      res.writeHead(range ? 206 : 200, {'Content-Type': type0, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, ...(range ? {'Content-Range': `bytes ${start}-${end}/${size}`} : {})});
      createReadStream(file, {start, end}).pipe(res);
      return;
    }
    const body = readFileSync(file);
    const type = TYPES[extname(file)] || 'application/octet-stream';
    // 動画・音声のシーク用に Range に対応
    const range = req.headers.range;
    if (range) {
      const [a, b] = range.replace('bytes=', '').split('-');
      const start = Number(a);
      const end = b ? Number(b) : body.length - 1;
      res.writeHead(206, {'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1});
      res.end(body.subarray(start, end + 1));
      return;
    }
    res.writeHead(200, {'Content-Type': type, 'Content-Length': body.length, 'Accept-Ranges': 'bytes'});
    res.end(body);
  }).listen(port, () => {
    console.log(`http://localhost:${port}/ で配信中（進行役：そのまま開く／投影用：?view=projector）`);
    console.log(`  WEB参加（学生1〜5名）：進行役は http://localhost:${port}/?view=host を開いてセッションを作成`);
    for (const ip of lanAddresses()) console.log(`  スマートフォン回答：http://${ip}:${port}/?view=vote （同じネットワークから）`);
  });
};

const cmd = process.argv[2];
if (cmd === 'build') buildApp().catch((e) => (console.error(e), process.exit(1)));
else if (cmd === 'serve') serve();
else console.error('usage: experience-app.ts build|serve');
