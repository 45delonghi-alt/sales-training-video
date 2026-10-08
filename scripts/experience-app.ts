// 体験アプリのビルドと配信。
//   npm run experience:build  … dist/experience/ に書き出す（app.js・app.css・index.html・素材・available.json）
//   npm run experience:serve  … dist/experience/ を http://localhost:4173/ で配信（会場PCでの実行用）
import {cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {extname, join, relative} from 'node:path';
import {build} from 'esbuild';

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

const serve = () => {
  if (!existsSync(join(OUT, 'index.html'))) {
    console.error('先に npm run experience:build を実行してください');
    process.exit(1);
  }
  const port = Number(process.env.PORT || 4173);
  createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = join(OUT, url.endsWith('/') ? `${url}index.html` : url);
    if (!file.startsWith(OUT) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
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
  }).listen(port, () => console.log(`http://localhost:${port}/ で配信中（進行役：そのまま開く／投影用：?view=projector）`));
};

const cmd = process.argv[2];
if (cmd === 'build') buildApp().catch((e) => (console.error(e), process.exit(1)));
else if (cmd === 'serve') serve();
else console.error('usage: experience-app.ts build|serve');
