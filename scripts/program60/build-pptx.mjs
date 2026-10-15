// 60分版のスライドを PowerPoint に書き出す。中身は content.mjs。
// 使い方：node scripts/program60/build-pptx.mjs [出力先.pptx]
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {APPENDIX, MEDIA, PEOPLE, PHASES, SLIDES} from './content.mjs';

const require = createRequire(import.meta.url);
const pptxgen = require('pptxgenjs');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ASSETS = join(ROOT, 'docs', 'program60', 'assets');
const OUT = process.argv[2] || join(ROOT, 'docs', 'program60', 'program60-slides.pptx');

const W = 13.333, H = 7.5, M = 0.6;
const C = {red: 'E60012', ink: '141517', ink2: '1E2126', card: '2A2D33', line: '3A3F46', mute: '8A939D', gray: '5A6470', bg: 'F3F4F6', white: 'FFFFFF', text: '1E2126', soft: 'FDECEE', pale: 'E6E8EB'};
const FONT = 'Meiryo';
const mediaById = Object.fromEntries(MEDIA.map((m) => [m.id, m]));
const dims = (name) => {
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', join(ASSETS, `${name}.jpg`)]).toString().trim().split(',').map(Number);
  return {w, h};
};

mkdirSync(join(ROOT, 'out'), {recursive: true});
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.title = 'コンサルティング営業体験（60分版）';
pres.author = 'OPTEX-FA 営業企画';
pres.theme = {headFontFace: FONT, bodyFontFace: FONT};

// レイアウト（黒・白）。ヘッダーの文字とページ番号はレイアウト側に置く。
const chrome = (dark) => [
  {text: {text: '/', options: {x: M - 0.05, y: 0.22, w: 0.2, h: 0.25, fontSize: 11, bold: true, color: C.red, margin: 0}}},
  {text: {text: 'OPTEX-FA　|　CONSULTING SALES EXPERIENCE', options: {x: M + 0.12, y: 0.22, w: 5, h: 0.25, fontSize: 8, color: dark ? C.mute : C.gray, charSpacing: 1, margin: 0}}},
];
pres.defineSlideMaster({title: 'DARK', background: {color: C.ink}, objects: chrome(true), slideNumber: {x: W - 0.95, y: H - 0.42, w: 0.6, h: 0.25, fontSize: 8, color: C.mute, align: 'right'}});
pres.defineSlideMaster({title: 'LIGHT', background: {color: C.bg}, objects: chrome(false), slideNumber: {x: W - 0.95, y: H - 0.42, w: 0.6, h: 0.25, fontSize: 8, color: C.gray, align: 'right'}});

const T = (s, text, o) => s.addText(text, {fontFace: FONT, margin: 0, isTextBox: true, valign: 'top', ...o});
const box = (s, x, y, w, h, o = {}) => s.addShape(pres.shapes.RECTANGLE, {x, y, w, h, fill: {color: o.fill ?? C.white}, line: o.line ? {color: o.line, width: o.lw ?? 1, dashType: o.dash} : {type: 'none'}, shadow: o.shadow ? {type: 'outer', color: '000000', opacity: 0.12, blur: 6, offset: 2, angle: 90} : undefined, objectName: o.name});
const tag = (s, text, x, y, o = {}) => {
  const w = o.w ?? Math.max(0.6, 0.14 * [...text].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 1 : 0.55), 0) + 0.3);
  box(s, x, y, w, o.h ?? 0.3, {fill: o.fill ?? C.red});
  T(s, text, {x, y, w, h: o.h ?? 0.3, fontSize: o.size ?? 10, bold: true, color: o.color ?? C.white, align: 'center', valign: 'middle'});
  return w;
};

// ヘッダー：フェーズの札＋タイトル＋右上の6フェーズ表示
const header = (s, sl, dark) => {
  const ph = PHASES.find((p) => p.key === sl.phase);
  const w = tag(s, ph ? ph.ja : '補足', M, 0.62, {size: 11, h: 0.36});
  T(s, sl.title, {x: M + w + 0.18, y: 0.58, w: W - 2 * M - w - 0.2, h: 0.46, fontSize: 22, bold: true, color: dark ? C.white : C.text, valign: 'middle'});
  if (!ph) return;
  PHASES.forEach((p, i) => {
    const on = p.key === sl.phase;
    T(s, p.key, {x: W - M - (6 - i) * 0.98, y: 0.22, w: 0.94, h: 0.22, fontSize: 6.5, bold: on, color: on ? C.red : dark ? '5A5D63' : 'A0A7AF', align: 'right', charSpacing: 0.5});
  });
};
const think = (s, sec, x, y) => {
  s.addShape(pres.shapes.OVAL, {x, y, w: 0.95, h: 0.95, fill: {color: C.red}, line: {type: 'none'}});
  T(s, [{text: `${sec}`, options: {fontSize: 24, bold: true, breakLine: true}}, {text: '秒', options: {fontSize: 10}}], {x, y: y + 0.1, w: 0.95, h: 0.8, color: C.white, align: 'center', valign: 'middle'});
  T(s, '考える時間', {x: x - 0.3, y: y + 1.0, w: 1.55, h: 0.25, fontSize: 9, color: C.mute, align: 'center'});
};

// 画像・動画の差し替え枠。仮画像があれば比率を保って枠の中に収め、無ければ点線の枠と説明を置く。
const PLACED = [];
let curId = '';
const placeholder = (s, ref, x, y, w, h, dark) => {
  const m = mediaById[ref.id];
  PLACED.push({id: m.id, slide: curId, w: +w.toFixed(2), h: +h.toFixed(2), img: ref.img || ''});
  const isVideo = m.type === '動画';
  const label = `【${m.id}】${m.use}`;
  if (ref.img) {
    const d = dims(ref.img);
    let iw = w, ih = (w * d.h) / d.w;
    if (ih > h) { ih = h; iw = (h * d.w) / d.h; }
    const ix = x + (w - iw) / 2, iy = y + (h - ih) / 2;
    box(s, x, y, w, h, {fill: dark ? '0B0C0D' : C.pale, name: `${m.id}_frame`});
    s.addImage({path: join(ASSETS, `${ref.img}.jpg`), x: ix, y: iy, w: iw, h: ih, altText: `${label}（仮画像）`, objectName: m.id});
    if (isVideo) {
      s.addShape(pres.shapes.OVAL, {x: x + w / 2 - 0.45, y: y + h / 2 - 0.45, w: 0.9, h: 0.9, fill: {color: C.red, transparency: 10}, line: {color: C.white, width: 1.5}});
      s.addShape(pres.shapes.ISOSCELES_TRIANGLE, {x: x + w / 2 - 0.13, y: y + h / 2 - 0.2, w: 0.4, h: 0.4, rotate: 90, fill: {color: C.white}, line: {type: 'none'}});
    }
    box(s, ix, iy + ih - 0.34, iw, 0.34, {fill: '000000'});
    tag(s, '仮', ix + 0.08, iy + ih - 0.3, {h: 0.26, w: 0.3, size: 9});
    T(s, `${label}　後日指定${isVideo ? '動画' : '画像'}に差し替え`, {x: ix + 0.45, y: iy + ih - 0.34, w: iw - 0.5, h: 0.34, fontSize: 8, color: C.white, valign: 'middle'});
    return;
  }
  box(s, x, y, w, h, {fill: dark ? '1B1D20' : 'FAFAFB', line: dark ? '5A5D63' : 'B9C1CA', dash: 'dash', lw: 1.25, name: m.id});
  const lines = [
    {text: `【${m.id}】`, options: {fontSize: 11, bold: true, color: C.red, breakLine: true}},
    {text: `用途：${m.use}`, options: {fontSize: 9.5, color: dark ? C.white : C.text, breakLine: true}},
    ...(h > 1.6 ? [{text: `目的：${m.purpose}`, options: {fontSize: 8.5, color: dark ? C.mute : C.gray, breakLine: true}}] : []),
    {text: `状態：後日指定${isVideo ? '動画' : '画像'}に差し替え`, options: {fontSize: 8.5, color: dark ? C.mute : C.gray}},
  ];
  T(s, lines, {x: x + 0.15, y: y + 0.1, w: w - 0.3, h: h - 0.2, align: 'center', valign: 'middle', paraSpaceAfter: 3});
};

const who = (k) => PEOPLE[k];
// 発言カード（名前の札＋台詞）
const say = (s, q, x, y, w, dark, size = 16) => {
  const p = who(q.who);
  const cust = p.side === 'customer';
  tag(s, cust ? 'お客様' : 'OPTEX-FA', x, y, {fill: cust ? C.red : dark ? C.white : C.ink, color: cust ? C.white : dark ? C.ink : C.white, size: 8.5, h: 0.26});
  T(s, p.role.split('｜')[1] ?? '', {x: x + 0.95, y, w: w - 1, h: 0.26, fontSize: 9, color: dark ? C.mute : C.gray, valign: 'middle'});
  T(s, p.name, {x, y: y + 0.32, w, h: 0.36, fontSize: 15, bold: true, color: dark ? C.white : C.text});
  T(s, q.text, {x, y: y + 0.72, w, h: 0.95, fontSize: size, bold: true, color: dark ? C.white : C.text});
};

const notes = (sl) => {
  const n = sl.n;
  const at = startOf(sl);
  const rows = [
    `${sl.id}｜${sl.phase}｜${fmt(at)}〜${fmt(at + sl.dur)}（${sl.dur}分）｜${sl.mode}`,
    `元のスライド：${sl.from}`, '',
    `■ 話すこと\n${n.talk}`,
    n.ask && `■ 問いかけ\n${n.ask}`,
    n.expect && `■ 想定される回答\n${n.expect}`,
    n.feedback && `■ フィードバック\n${n.feedback}`,
    n.hint && `■ 答えが出ないときのヒント\n${n.hint}`,
    sl.media?.length && `■ 画像・動画\n${sl.media.map((r) => `${r.id}（${mediaById[r.id].use}）${r.img ? '：仮画像あり' : '：未提供'}`).join('\n')}`,
    n.next && `■ 次へのつなぎ\n${n.next}`,
    n.skip && `■ 時間超過時\n${n.skip}`,
  ];
  return rows.filter(Boolean).join('\n\n');
};
const starts = {};
let acc = 0;
for (const sl of SLIDES) { starts[sl.id] = acc; acc += sl.dur; }
const startOf = (sl) => starts[sl.id];
const fmt = (m) => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}`;

// ───────── スライドの種類ごとの描き方 ─────────
const R = {};
R.cover = (s, sl) => {
  s.addShape(pres.shapes.RIGHT_TRIANGLE, {x: 7.6, y: 0, w: 2.2, h: H, fill: {color: C.red}, line: {type: 'none'}, flipH: true});
  box(s, 9.8, 0, W - 9.8, H, {fill: C.red});
  placeholder(s, sl.media[0], 8.4, 1.4, 4.4, 2.5, true);
  T(s, sl.kicker, {x: M, y: 2.0, w: 6.5, h: 0.35, fontSize: 13, color: C.mute});
  T(s, sl.head, {x: M, y: 2.45, w: 7, h: 1.1, fontSize: 54, bold: true, color: C.red, fontFace: 'Arial Black'});
  T(s, sl.sub, {x: M, y: 3.65, w: 7, h: 0.6, fontSize: 24, bold: true, color: C.white});
  T(s, 'コンサルティング営業体験｜60分', {x: M, y: 4.6, w: 7, h: 0.35, fontSize: 13, color: C.mute});
};
R.check = (s, sl) => {
  header(s, sl, true);
  sl.items.forEach((it, i) => {
    const y = 1.75 + i * 2.1;
    T(s, `Q${i + 1}`, {x: M, y, w: 0.9, h: 0.7, fontSize: 32, bold: true, color: C.red});
    T(s, it.q, {x: M + 1.0, y, w: 7.2, h: 0.75, fontSize: 22, bold: true, color: C.white});
    T(s, it.a, {x: M + 1.0, y: y + 0.85, w: 7.2, h: 0.4, fontSize: 14, color: C.mute});
  });
  placeholder(s, sl.media[0], 9.4, 1.75, 3.2, 3.2, true);
  T(s, '最後にもう一度聞きます。変化を比べてみましょう。', {x: M, y: 6.3, w: 9, h: 0.4, fontSize: 13, color: C.mute});
};
R.mission = (s, sl) => {
  header(s, sl, true);
  const n = PHASES.length, gw = (W - 2 * M - (n - 1) * 0.12) / n;
  PHASES.forEach((p, i) => {
    const x = M + i * (gw + 0.12);
    box(s, x, 1.55, gw, 2.45, {fill: i === 4 ? C.red : C.card});
    T(s, `${p.start}〜${p.end}分`, {x: x + 0.15, y: 1.68, w: gw - 0.3, h: 0.25, fontSize: 9, color: i === 4 ? C.white : C.mute});
    T(s, p.key, {x: x + 0.15, y: 1.95, w: gw - 0.3, h: 0.3, fontSize: 11, bold: true, color: C.white, charSpacing: 0.5});
    T(s, p.action, {x: x + 0.15, y: 2.35, w: gw - 0.3, h: 0.5, fontSize: 20, bold: true, color: C.white});
    T(s, p.lead, {x: x + 0.15, y: 2.95, w: gw - 0.3, h: 0.95, fontSize: 10.5, color: i === 4 ? C.white : 'C9CED4'});
  });
  T(s, '今日のルール', {x: M, y: 4.45, w: 3, h: 0.35, fontSize: 13, bold: true, color: C.red});
  sl.rules.forEach((r, i) => T(s, `${i + 1}　${r}`, {x: M, y: 4.9 + i * 0.52, w: 11, h: 0.45, fontSize: 17, bold: true, color: C.white}));
};
R.video = (s, sl) => {
  header(s, sl, true);
  placeholder(s, sl.media[0], M, 1.4, 7.4, 4.16, true);
  say(s, sl.quote, 8.4, 1.45, 4.3, true, 17);
  box(s, 8.4, 4.1, 4.3, 1.46, {fill: C.card});
  T(s, '映像のあとで', {x: 8.6, y: 4.22, w: 3.9, h: 0.25, fontSize: 9.5, color: C.red, bold: true});
  T(s, sl.after, {x: 8.6, y: 4.52, w: 3.9, h: 0.95, fontSize: 17, bold: true, color: C.white});
  const m = mediaById[sl.media[0].id];
  T(s, `映像は${m.maxSec}秒以内。視聴だけで終わらせず、直後に問いかける`, {x: M, y: 5.75, w: 7.4, h: 0.3, fontSize: 9.5, color: C.mute});
};
R.divider = (s, sl) => {
  const ph = PHASES.find((p) => p.key === sl.phase);
  s.addShape(pres.shapes.RIGHT_TRIANGLE, {x: 9.9, y: 0, w: 1.6, h: H, fill: {color: C.red}, line: {type: 'none'}, flipH: true});
  box(s, 11.5, 0, W - 11.5, H, {fill: C.red});
  if (!ph) {
    T(s, sl.title, {x: M, y: 2.8, w: 9, h: 0.9, fontSize: 40, bold: true, color: C.white});
    T(s, sl.sub, {x: M, y: 3.8, w: 9, h: 0.5, fontSize: 16, color: C.mute});
    return;
  }
  const i = PHASES.indexOf(ph);
  T(s, `PHASE ${i + 1} / 6　｜　${ph.start}〜${ph.end}分`, {x: M, y: 2.1, w: 8, h: 0.4, fontSize: 14, color: C.mute});
  T(s, ph.key, {x: M, y: 2.6, w: 9, h: 1.1, fontSize: 60, bold: true, color: C.red, fontFace: 'Arial Black'});
  T(s, ph.ja, {x: M, y: 3.75, w: 9, h: 0.7, fontSize: 30, bold: true, color: C.white});
  T(s, ph.lead, {x: M, y: 4.55, w: 9, h: 0.5, fontSize: 17, color: 'C9CED4'});
};
R.question = (s, sl) => {
  header(s, sl, true);
  T(s, 'QUESTION', {x: M, y: 1.45, w: W - 2 * M, h: 0.3, fontSize: 11, bold: true, color: C.red, align: 'center', charSpacing: 3});
  T(s, sl.q, {x: M, y: 1.8, w: W - 2 * M, h: 0.9, fontSize: 32, bold: true, color: C.white, align: 'center', valign: 'middle'});
  const gw = 3.6, gap = 0.3, x0 = (W - 3 * gw - 2 * gap) / 2;
  sl.choices.forEach((c, i) => {
    const x = x0 + i * (gw + gap);
    box(s, x, 3.15, gw, 1.75, {fill: C.card, line: C.line});
    tag(s, 'ABC'[i], x + 0.2, 3.32, {w: 0.42, h: 0.42, size: 15});
    T(s, c, {x: x + 0.2, y: 3.88, w: gw - 0.4, h: 0.95, fontSize: 17, bold: true, color: C.white});
  });
  think(s, sl.think, W / 2 - 0.475, 5.25);
  T(s, '選んだら、理由をひとことメモ', {x: W / 2 + 0.9, y: 5.55, w: 3.5, h: 0.35, fontSize: 12, color: C.mute});
};
R.answer = (s, sl) => {
  header(s, sl, false);
  const gw = 3.85, gap = 0.22, x0 = M;
  sl.rows.forEach((r, i) => {
    const x = x0 + i * (gw + gap);
    box(s, x, 1.4, gw, 4.15, {fill: C.white, line: r.best ? C.red : undefined, lw: 2.5, shadow: true});
    tag(s, r.c, x + 0.25, 1.6, {w: 0.4, h: 0.4, size: 14, fill: r.best ? C.red : C.ink});
    T(s, r.label, {x: x + 0.78, y: 1.6, w: gw - 1.0, h: 0.4, fontSize: 15, bold: true, color: C.text, valign: 'middle'});
    if (r.best) tag(s, 'おすすめ', x + gw - 1.2, 1.12, {w: 1.0, h: 0.3, size: 10});
    T(s, 'お客様の答え', {x: x + 0.25, y: 2.2, w: gw - 0.5, h: 0.25, fontSize: 9, color: C.gray, bold: true});
    T(s, `「${r.reply}」`, {x: x + 0.25, y: 2.48, w: gw - 0.5, h: 1.55, fontSize: 13, color: C.text});
    s.addShape(pres.shapes.LINE, {x: x + 0.25, y: 4.08, w: gw - 0.5, h: 0, line: {color: C.pale, width: 1}});
    T(s, '分かったこと', {x: x + 0.25, y: 4.18, w: gw - 0.5, h: 0.25, fontSize: 9, color: r.best ? C.red : C.gray, bold: true});
    T(s, r.got, {x: x + 0.25, y: 4.45, w: gw - 0.5, h: 1.0, fontSize: 12.5, bold: true, color: C.text});
  });
  box(s, M, 5.85, W - 2 * M, 0.8, {fill: C.ink});
  T(s, [{text: 'POINT　', options: {color: C.red, bold: true, fontSize: 12}}, {text: sl.lesson, options: {color: C.white, bold: true, fontSize: 19}}], {x: M + 0.3, y: 5.85, w: W - 2 * M - 0.6, h: 0.8, valign: 'middle'});
};
R.data = (s, sl) => {
  header(s, sl, false);
  box(s, M, 1.35, 7.3, 4.9, {shadow: true});
  T(s, '週ごとの誤カウント率（表示本数 − 実際の本数）÷ 実際の本数', {x: M + 0.3, y: 1.5, w: 6.8, h: 0.3, fontSize: 11, bold: true, color: C.text});
  const labels = sl.weeks.map((_, i) => `第${i + 1}週`);
  const max = Math.max(...sl.weeks);
  s.addChart(pres.charts.BAR, [
    {name: '通常の週', labels, values: sl.weeks.map((v) => (v === max ? 0 : v))},
    {name: '多い週', labels, values: sl.weeks.map((v) => (v === max ? v : 0))},
  ], {x: M + 0.2, y: 1.85, w: 6.9, h: 4.25, barDir: 'col', barGrouping: 'stacked', chartColors: [C.gray, C.red], showValue: true, dataLabelPosition: 'inEnd', dataLabelFormatCode: '+0.0"%";;', dataLabelColor: C.white, dataLabelFontSize: 13, dataLabelFontBold: true, dataLabelFontFace: '+mn-lt', valAxisMaxVal: 3.5, valAxisMinVal: 0, valAxisLabelFormatCode: '0"%"', valAxisLabelColor: C.gray, valAxisLabelFontSize: 10, valAxisLabelFontFace: '+mn-lt', catAxisLabelColor: C.text, catAxisLabelFontSize: 12, catAxisLabelFontFace: '+mn-lt', valGridLine: {color: 'E6E8EB', size: 0.75}, catGridLine: {style: 'none'}, showLegend: true, legendPos: 't', legendFontSize: 10, legendFontFace: '+mn-lt', legendColor: C.gray, barGapWidthPct: 70});
  T(s, '1万本あたり', {x: 8.25, y: 1.4, w: 4.4, h: 0.3, fontSize: 11, bold: true, color: C.gray});
  sl.facts.forEach((f, i) => {
    const y = 1.78 + i * 1.02;
    box(s, 8.25, y, 4.48, 0.9, {fill: i === 2 ? C.soft : C.white});
    T(s, f.k, {x: 8.42, y: y + 0.08, w: 4.1, h: 0.25, fontSize: 10, color: C.gray});
    T(s, f.v, {x: 8.42, y: y + 0.35, w: 4.2, h: 0.45, fontSize: 15, bold: true, color: i === 2 ? C.red : C.text});
  });
  box(s, 8.25, 4.95, 4.48, 1.3, {fill: C.ink});
  T(s, sl.point, {x: 8.45, y: 4.95, w: 4.1, h: 1.3, fontSize: 17, bold: true, color: C.white, valign: 'middle'});
  T(s, '※ 数値はすべて演習用の設定値です（実測データではありません）', {x: M, y: 6.4, w: 8, h: 0.3, fontSize: 10, color: C.red, bold: true});
};
R.term = (s, sl) => {
  header(s, sl, false);
  sl.terms.forEach((t, i) => {
    const y = 1.4 + i * 1.6;
    box(s, M, y, 6.6, 1.45, {shadow: true});
    T(s, t.t, {x: M + 0.25, y: y + 0.15, w: 2.2, h: 0.4, fontSize: 17, bold: true, color: C.red});
    T(s, t.easy, {x: M + 2.45, y: y + 0.15, w: 4.0, h: 0.4, fontSize: 15, bold: true, color: C.text});
    T(s, t.d, {x: M + 0.25, y: y + 0.65, w: 6.15, h: 0.75, fontSize: 12, color: C.gray});
  });
  placeholder(s, sl.media[0], 7.55, 1.4, 5.18, 4.65, false);
};
R.facts = (s, sl) => {
  header(s, sl, false);
  T(s, '確認できた事実', {x: M, y: 1.35, w: 5, h: 0.3, fontSize: 12, bold: true, color: C.gray});
  sl.facts.forEach((f, i) => {
    const y = 1.72 + i * 0.68;
    box(s, M, y, 7.0, 0.58, {});
    tag(s, '事実', M + 0.12, y + 0.14, {w: 0.55, h: 0.3, size: 9, fill: C.ink});
    T(s, f, {x: M + 0.82, y, w: 6.1, h: 0.58, fontSize: 13.5, bold: true, color: C.text, valign: 'middle'});
  });
  box(s, M, 5.3, 7.0, 0.95, {fill: C.soft, line: C.red, dash: 'dash'});
  T(s, [{text: 'まだ分からないこと　', options: {fontSize: 11, bold: true, color: C.red}}, {text: sl.unknown, options: {fontSize: 18, bold: true, color: C.text}}], {x: M + 0.25, y: 5.3, w: 6.6, h: 0.95, valign: 'middle'});
  placeholder(s, sl.media[0], 7.95, 1.72, 4.78, 2.69, false);
  T(s, 'センサは、ボトルの下のほうを横から見ている（お客様の説明）', {x: 7.95, y: 4.55, w: 4.78, h: 0.6, fontSize: 12, bold: true, color: C.text});
};
// 合図の波形（ON/OFF）。pulses は [開始, 終了]（0〜1）
const wave = (s, x, y, w, h, pulses, color) => {
  const L = (x1, y1, x2, y2) => s.addShape(pres.shapes.LINE, {x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: {color, width: 2.5}});
  let cx = 0;
  for (const [a, b] of pulses) {
    L(x + cx * w, y + h, x + a * w, y + h); L(x + a * w, y + h, x + a * w, y); L(x + a * w, y, x + b * w, y); L(x + b * w, y, x + b * w, y + h);
    cx = b;
  }
  L(x + cx * w, y + h, x + w, y + h);
  T(s, 'ON', {x: x - 0.55, y: y - 0.1, w: 0.45, h: 0.25, fontSize: 9, color: C.gray, align: 'right'});
  T(s, 'OFF', {x: x - 0.55, y: y + h - 0.12, w: 0.45, h: 0.25, fontSize: 9, color: C.gray, align: 'right'});
};
R.mechanism = (s, sl) => {
  header(s, sl, false);
  sl.roles.forEach((r, i) => {
    const x = M + i * 3.45;
    box(s, x, 1.4, 3.25, 2.55, {shadow: true});
    T(s, r.t, {x: x + 0.25, y: 1.55, w: 2.8, h: 0.45, fontSize: 22, bold: true, color: C.red});
    T(s, r.easy, {x: x + 0.25, y: 2.05, w: 2.8, h: 0.75, fontSize: 16, bold: true, color: C.text});
    T(s, r.d, {x: x + 0.25, y: 2.85, w: 2.8, h: 1.0, fontSize: 11.5, color: C.gray});
  });
  s.addShape(pres.shapes.RIGHT_ARROW, {x: M + 3.27, y: 2.5, w: 0.2, h: 0.35, fill: {color: C.red}, line: {type: 'none'}});
  box(s, 7.65, 1.4, 5.08, 2.55, {shadow: true});
  T(s, 'ボトル1本が通るあいだの合図（センサ出力）', {x: 7.85, y: 1.52, w: 4.7, h: 0.3, fontSize: 11, bold: true, color: C.text});
  wave(s, 8.55, 2.15, 3.9, 1.0, [[0.35, 0.65]], C.ink);
  T(s, '合図 1回　→　カウント ＋1', {x: 7.85, y: 3.4, w: 4.7, h: 0.4, fontSize: 15, bold: true, color: C.text, align: 'center'});
  box(s, M, 4.3, W - 2 * M, 1.2, {fill: C.ink});
  T(s, sl.point, {x: M + 0.35, y: 4.3, w: W - 2 * M - 0.7, h: 1.2, fontSize: 24, bold: true, color: C.white, valign: 'middle'});
  T(s, 'この、実際の本数と数えた本数のずれを「誤カウント」と呼びます。', {x: M, y: 5.75, w: 10, h: 0.4, fontSize: 14, color: C.text});
};
R.work = (s, sl) => {
  header(s, sl, true);
  T(s, 'WORK', {x: M, y: 1.45, w: 3, h: 0.3, fontSize: 11, bold: true, color: C.red, charSpacing: 3});
  T(s, sl.q, {x: M, y: 1.8, w: W - 2 * M, h: 1.7, fontSize: 34, bold: true, color: C.white, valign: 'middle'});
  const sw = 3.6;
  sl.steps.forEach((st, i) => {
    const x = M + i * (sw + 0.25);
    box(s, x, 3.95, sw, 1.1, {fill: C.card});
    T(s, st.t, {x: x + 0.25, y: 4.05, w: sw - 0.5, h: 0.45, fontSize: 20, bold: true, color: C.red});
    T(s, st.d, {x: x + 0.25, y: 4.5, w: sw - 0.5, h: 0.45, fontSize: 13, color: C.white});
  });
  T(s, sl.clue, {x: M, y: 5.45, w: W - 2 * M, h: 0.45, fontSize: 14, color: C.mute});
};
R.hypmap = (s, sl) => {
  header(s, sl, false);
  const gx = [M, M + 4.12, M + 8.24], gw = 3.9;
  sl.groups.forEach((g, i) => {
    box(s, gx[i], 1.4, gw, 0.45, {fill: C.ink});
    T(s, g.g, {x: gx[i], y: 1.4, w: gw, h: 0.45, fontSize: 14, bold: true, color: C.white, align: 'center', valign: 'middle'});
    const ih = g.items.length === 1 ? 3.95 : 1.9;
    g.items.forEach((it, j) => {
      const y = 1.98 + j * (ih + 0.15);
      box(s, gx[i], y, gw, ih, {shadow: true});
      tag(s, '仮説', gx[i] + 0.2, y + 0.18, {w: 0.55, h: 0.28, size: 9});
      T(s, it.t, {x: gx[i] + 0.85, y: y + 0.13, w: gw - 1.0, h: 0.4, fontSize: 15, bold: true, color: C.text});
      T(s, it.d, {x: gx[i] + 0.2, y: y + 0.62, w: gw - 0.4, h: ih - 0.75, fontSize: 12, color: C.gray});
    });
  });
  T(s, '原因は、まだ1つも確定していません。', {x: M, y: 6.25, w: 8, h: 0.35, fontSize: 14, bold: true, color: C.red});
};
R.fhv = (s, sl) => {
  header(s, sl, false);
  const head = ['原因の候補', '① 確認できた事実', '② 考えられる仮説', '③ 次に必要な検証'];
  const fills = [C.ink, C.gray, C.red, C.ink];
  const rows = [head.map((t, i) => ({text: t, options: {bold: true, color: C.white, fill: {color: fills[i]}, fontSize: 12, align: 'center'}}))].concat(
    sl.rows.map((r) => r.map((t, i) => ({text: t, options: {bold: i === 0, fontSize: i === 0 ? 12.5 : 11, color: C.text, fill: {color: i === 2 ? C.soft : C.white}}}))));
  s.addTable(rows, {x: M, y: 1.4, w: W - 2 * M, colW: [2.0, 3.6, 2.9, 3.63], fontFace: FONT, border: {type: 'solid', color: 'D5D9DE', pt: 0.75}, valign: 'middle', rowH: [0.42, 0.86, 0.86, 0.86, 0.86, 0.86], margin: 0.08});
  T(s, '「お客様が〜な気がしている」は印象。事実と分けて扱う', {x: M, y: 6.25, w: 10, h: 0.35, fontSize: 12, bold: true, color: C.red});
};
R.signal = (s, sl) => {
  header(s, sl, false);
  placeholder(s, sl.media[0], M, 1.4, 3.6, 3.96, false);
  const cx = M + 3.85, cw = (W - M - cx - 0.2) / 2;
  [['通常（イメージ）', [[0.3, 0.7]], C.ink, '合図1回 → 1本'], ['仮説（イメージ）', [[0.3, 0.46], [0.54, 0.7]], C.red, '合図2回 → 2本と数える']].forEach(([t, p, col, res], i) => {
    const x = cx + i * (cw + 0.2);
    box(s, x, 1.4, cw, 3.96, {shadow: true, line: i ? C.red : undefined, lw: 1.5});
    tag(s, t, x + 0.2, 1.55, {fill: i ? C.red : C.ink, size: 10});
    T(s, 'ボトル1本が通るあいだ', {x: x + 0.2, y: 2.05, w: cw - 0.4, h: 0.3, fontSize: 10.5, color: C.gray});
    wave(s, x + 0.75, 2.6, cw - 1.05, 1.2, p, col);
    T(s, res, {x: x + 0.2, y: 4.2, w: cw - 0.4, h: 0.5, fontSize: 18, bold: true, color: col, align: 'center'});
  });
  box(s, M, 5.55, W - 2 * M, 0.75, {fill: C.ink});
  T(s, sl.point, {x: M + 0.3, y: 5.55, w: W - 2 * M - 0.6, h: 0.75, fontSize: 16, bold: true, color: C.white, valign: 'middle'});
  T(s, '※ 仮説検証用のイメージです（実測ではありません）。このラインで起きているかは、まだ確定していません。', {x: M, y: 6.42, w: 11.5, h: 0.3, fontSize: 10.5, bold: true, color: C.red});
};
R.isolate = (s, sl) => {
  header(s, sl, false);
  const items = [['通過本数', '実際に通ったボトル'], ['合図の回数', 'センサが出した合図'], ['PLCのカウント', '数えた本数']];
  items.forEach(([t, d], i) => {
    const x = M + i * 2.75;
    box(s, x, 1.45, 2.5, 1.3, {fill: C.ink});
    T(s, t, {x, y: 1.6, w: 2.5, h: 0.45, fontSize: 17, bold: true, color: C.white, align: 'center'});
    T(s, d, {x, y: 2.1, w: 2.5, h: 0.4, fontSize: 11, color: 'C9CED4', align: 'center'});
  });
  T(s, '同じ時間に、3つを記録する', {x: M, y: 2.85, w: 8, h: 0.35, fontSize: 13, bold: true, color: C.gray});
  [['合図の回数 ＞ 通過本数', 'センサ側で増えている', 'ボトル・光・設置を調べる'], ['合図の回数 ＝ 通過本数　なのに　カウント ＞ 通過本数', 'PLC側で増えている', '数え方の設定を調べる']].forEach(([c, r, a], i) => {
    const y = 3.35 + i * 1.3;
    box(s, M, y, 8.0, 1.15, {shadow: true});
    T(s, c, {x: M + 0.25, y: y + 0.12, w: 7.5, h: 0.4, fontSize: 14, bold: true, color: C.text});
    T(s, [{text: `→ ${r}`, options: {color: C.red, bold: true, fontSize: 16}}, {text: `　${a}`, options: {color: C.gray, fontSize: 12}}], {x: M + 0.25, y: y + 0.58, w: 7.5, h: 0.45});
  });
  T(s, 'ほかの選択肢を選ぶと', {x: 9.0, y: 1.45, w: 3.7, h: 0.3, fontSize: 12, bold: true, color: C.gray});
  sl.others.forEach((o, i) => {
    const y = 1.85 + i * 1.75;
    box(s, 9.0, y, 3.73, 1.55, {});
    tag(s, o.c, 9.18, y + 0.15, {w: 0.36, h: 0.32, size: 12, fill: C.gray});
    T(s, o.t, {x: 9.65, y: y + 0.13, w: 2.9, h: 0.36, fontSize: 13, bold: true, color: C.text});
    T(s, `「${o.r}」`, {x: 9.18, y: y + 0.62, w: 3.4, h: 0.85, fontSize: 12, color: C.text});
  });
  T(s, 'お客様の反応も、提案の大事な条件になる', {x: 9.0, y: 5.4, w: 3.73, h: 0.6, fontSize: 11.5, bold: true, color: C.red});
  T(s, 'おすすめ：B　どこで数が増えているかを分けられる', {x: M, y: 6.25, w: 9, h: 0.35, fontSize: 13, bold: true, color: C.red});
};
R.core = (s, sl) => {
  header(s, sl, false);
  ['事実', '仮説', '検証'].forEach((t, i) => {
    const x = M + i * 2.2;
    box(s, x, 1.45, 1.8, 0.8, {fill: i === 2 ? C.red : C.ink});
    T(s, t, {x, y: 1.45, w: 1.8, h: 0.8, fontSize: 22, bold: true, color: C.white, align: 'center', valign: 'middle'});
    if (i < 2) s.addShape(pres.shapes.RIGHT_ARROW, {x: x + 1.85, y: 1.7, w: 0.3, h: 0.3, fill: {color: C.gray}, line: {type: 'none'}});
  });
  sl.checks.forEach((c, i) => {
    const x = M + i * 4.12;
    box(s, x, 2.6, 3.9, 2.2, {shadow: true});
    T(s, `${i + 1}`, {x: x + 0.25, y: 2.72, w: 0.6, h: 0.6, fontSize: 28, bold: true, color: C.red});
    T(s, c.t, {x: x + 0.85, y: 2.8, w: 2.9, h: 0.5, fontSize: 17, bold: true, color: C.text});
    T(s, c.d, {x: x + 0.25, y: 3.45, w: 3.4, h: 1.2, fontSize: 13, color: C.gray});
  });
  box(s, M, 5.15, W - 2 * M, 1.05, {fill: C.ink});
  T(s, sl.msg, {x: M, y: 5.15, w: W - 2 * M, h: 1.05, fontSize: 24, bold: true, color: C.white, align: 'center', valign: 'middle'});
};
R.voice = (s, sl) => {
  header(s, sl, true);
  placeholder(s, sl.media[0], M, 1.4, 3.3, 3.4, true);
  sl.quotes.forEach((q, i) => say(s, q, 4.25, 1.4 + i * 1.75, 8.45, true, 19));
  box(s, M, 5.1, W - 2 * M, 1.3, {fill: C.card});
  T(s, 'QUESTION', {x: M + 0.3, y: 5.2, w: 3, h: 0.25, fontSize: 9.5, bold: true, color: C.red, charSpacing: 2});
  T(s, sl.after, {x: M + 0.3, y: 5.48, w: 9.8, h: 0.8, fontSize: 19, bold: true, color: C.white, valign: 'middle'});
  think(s, sl.think, W - M - 1.35, 5.12);
};
R.reveal = (s, sl) => {
  header(s, sl, false);
  box(s, M, 1.4, 7.6, 4.85, {shadow: true});
  say(s, sl.ask, M + 0.3, 1.55, 7.0, false, 15);
  s.addShape(pres.shapes.LINE, {x: M + 0.3, y: 3.2, w: 7.0, h: 0, line: {color: C.pale, width: 1}});
  say(s, sl.reply[0], M + 0.3, 3.4, 7.0, false, 18);
  box(s, M + 0.3, 5.25, 7.0, 0.75, {fill: C.soft});
  T(s, '「何とか対応できている」の裏に、確認のし直しとライン停止があった', {x: M + 0.45, y: 5.25, w: 6.8, h: 0.75, fontSize: 13.5, bold: true, color: C.red, valign: 'middle'});
  T(s, 'ほかのことを聞くと', {x: 8.5, y: 1.4, w: 4.2, h: 0.3, fontSize: 12, bold: true, color: C.gray});
  sl.side.forEach((o, i) => {
    const y = 1.8 + i * 2.2;
    box(s, 8.5, y, 4.23, 1.95, {});
    T(s, o.t, {x: 8.7, y: y + 0.15, w: 3.9, h: 0.35, fontSize: 13, bold: true, color: C.text});
    T(s, `「${o.r}」`, {x: 8.7, y: y + 0.6, w: 3.9, h: 1.2, fontSize: 13, color: C.gray});
  });
};
R.stairs = (s, sl) => {
  header(s, sl, false);
  const steps = [['表面の問題', 'ペットボトルを、実際より多く数えてしまう', C.gray], ['業務への影響', '数量の確認し直し／ときにライン停止／品質管理の負担', C.ink], ['本当に実現したいこと', sl.hidden ? '？' : '安定した生産を続けたい', C.red]];
  steps.forEach(([k, v, col], i) => {
    const x = M + i * 1.0, y = 1.45 + i * 1.3, w = (sl.quote ? 7.4 : 11.1) - i * 1.0;
    box(s, x, y, w, 1.1, {fill: i === 2 && sl.hidden ? C.white : col, line: i === 2 && sl.hidden ? C.red : undefined, dash: 'dash', lw: 2});
    T(s, k, {x: x + 0.25, y: y + 0.1, w: 3, h: 0.3, fontSize: 10.5, bold: true, color: i === 2 && sl.hidden ? C.red : 'E6E8EB'});
    T(s, v, {x: x + 0.25, y: y + 0.4, w: w - 0.5, h: 0.6, fontSize: i === 2 ? 24 : 17, bold: true, color: i === 2 && sl.hidden ? C.red : C.white, valign: 'middle'});
  });
  if (sl.quote) {
    box(s, 8.6, 1.45, 4.13, 3.7, {shadow: true});
    say(s, sl.quote, 8.8, 1.6, 3.75, false, 14);
    T(s, '目の前の問題と、お客様が本当に実現したいことは違う', {x: M, y: 5.6, w: W - 2 * M, h: 0.6, fontSize: 21, bold: true, color: C.text});
  } else {
    T(s, '3段目に入る言葉を、皆さんの答えから考えてみましょう', {x: M, y: 5.6, w: W - 2 * M, h: 0.5, fontSize: 18, bold: true, color: C.text});
  }
};
R.needs = (s, sl) => {
  header(s, sl, false);
  sl.needs.forEach((nd, i) => {
    const x = M + i * 4.12;
    box(s, x, 1.45, 3.9, 3.5, {shadow: true});
    T(s, `要求 ${i + 1}`, {x: x + 0.25, y: 1.6, w: 2, h: 0.3, fontSize: 11, bold: true, color: C.red});
    T(s, nd.t, {x: x + 0.25, y: 1.95, w: 3.4, h: 0.95, fontSize: 19, bold: true, color: C.text});
    T(s, nd.d, {x: x + 0.25, y: 2.95, w: 3.4, h: 1.2, fontSize: 12.5, color: C.gray});
    T(s, `出どころ：${nd.src}`, {x: x + 0.25, y: 4.45, w: 3.4, h: 0.3, fontSize: 9.5, color: C.gray});
  });
  box(s, M, 5.3, W - 2 * M, 1.0, {fill: C.ink});
  T(s, sl.msg, {x: M, y: 5.3, w: W - 2 * M, h: 1.0, fontSize: 23, bold: true, color: C.white, align: 'center', valign: 'middle'});
};
R.steps6 = (s, sl) => {
  header(s, sl, false);
  const gw = (W - 2 * M - 5 * 0.15) / 6;
  sl.steps.forEach((t, i) => {
    const x = M + i * (gw + 0.15), done = i < sl.done;
    box(s, x, 1.9, gw, 2.6, {fill: done ? C.white : i === sl.done ? C.red : C.ink, line: done ? 'D5D9DE' : undefined});
    T(s, `${i + 1}`, {x: x + 0.2, y: 2.05, w: 1, h: 0.6, fontSize: 30, bold: true, color: done ? C.gray : C.white});
    T(s, t, {x: x + 0.2, y: 2.8, w: gw - 0.35, h: 1.5, fontSize: 14.5, bold: true, color: done ? C.gray : C.white});
    if (done) tag(s, '完了', x + gw - 0.75, 2.12, {w: 0.58, h: 0.28, size: 9, fill: C.gray});
  });
  T(s, 'ここまでの体験', {x: M, y: 1.45, w: 3 * gw, h: 0.3, fontSize: 11, bold: true, color: C.gray});
  T(s, 'ここから', {x: M + 3 * (gw + 0.15), y: 1.45, w: 3 * gw, h: 0.3, fontSize: 11, bold: true, color: C.red});
  T(s, '製品を紹介することがゴールではない。お客様が安心して改善を判断できる状態をつくることがゴール', {x: M, y: 4.95, w: W - 2 * M, h: 0.9, fontSize: 17, bold: true, color: C.text});
};
R.product = (s, sl) => {
  header(s, sl, false);
  placeholder(s, sl.media[0], M, 1.4, 4.4, 2.9, false);
  placeholder(s, sl.media[1], M, 4.45, 4.4, 1.85, false);
  const x = 5.3, w = W - M - x;
  sl.facts.forEach((f, i) => {
    const y = 1.4 + i * 0.78;
    box(s, x, y, w, 0.66, {});
    T(s, f.k, {x: x + 0.2, y, w: 1.7, h: 0.66, fontSize: 11, bold: true, color: C.gray, valign: 'middle'});
    T(s, f.v, {x: x + 1.9, y, w: w - 2.05, h: 0.66, fontSize: 14, bold: true, color: C.text, valign: 'middle'});
  });
  box(s, x, 3.85, w, 0.8, {fill: C.ink});
  T(s, sl.diff, {x: x + 0.25, y: 3.85, w: w - 0.5, h: 0.8, fontSize: 15, bold: true, color: C.white, valign: 'middle'});
  box(s, x, 4.8, w, 1.0, {fill: C.soft});
  T(s, sl.caution, {x: x + 0.25, y: 4.8, w: w - 0.5, h: 1.0, fontSize: 14, bold: true, color: C.red, valign: 'middle'});
  T(s, '※ 仕様・性能の数値は、公式資料で確認してから記載します（現時点で未照合）。', {x, y: 5.95, w, h: 0.3, fontSize: 10, color: C.gray});
};
R.plan = (s, sl) => {
  header(s, sl, false);
  placeholder(s, sl.media[0], M, 1.4, 4.2, 4.53, false);
  const x = 5.05, w = W - M - x;
  [['同じにする', sl.same], ['変える条件', sl.vary], ['記録すること', sl.record]].forEach(([k, v], i) => {
    const y = 1.4 + i * 0.82;
    tag(s, k, x, y + 0.17, {w: 1.35, h: 0.34, size: 10.5, fill: C.ink});
    T(s, v, {x: x + 1.5, y, w: w - 1.5, h: 0.68, fontSize: 14.5, bold: true, color: C.text, valign: 'middle'});
  });
  box(s, x, 3.95, w, 1.98, {fill: C.white, line: C.red, lw: 2});
  T(s, '合格の基準（試す前に、お客様と決める）', {x: x + 0.25, y: 4.05, w: w - 0.5, h: 0.35, fontSize: 12, bold: true, color: C.red});
  sl.pass.forEach((p, i) => T(s, `✓　${p}`, {x: x + 0.25, y: 4.5 + i * 0.6, w: w - 0.5, h: 0.5, fontSize: 16, bold: true, color: C.text}));
  T(s, '※ 研修中のシミュレーションは「見方の説明」です。結果ではありません。', {x: M, y: 6.1, w: 10, h: 0.3, fontSize: 10.5, color: C.gray});
};
R.propwork = (s, sl) => {
  header(s, sl, true);
  T(s, 'WORK', {x: M, y: 1.4, w: 3, h: 0.3, fontSize: 11, bold: true, color: C.red, charSpacing: 3});
  sl.qs.forEach((q, i) => {
    const y = 1.8 + i * 0.72;
    T(s, `${i + 1}`, {x: M, y, w: 0.5, h: 0.6, fontSize: 24, bold: true, color: C.red});
    T(s, q, {x: M + 0.55, y, w: 6.4, h: 0.6, fontSize: 17, bold: true, color: C.white, valign: 'middle'});
  });
  box(s, 7.55, 1.45, 5.18, 2.75, {fill: C.card});
  T(s, '提案の型（使っても使わなくてもOK）', {x: 7.75, y: 1.55, w: 4.8, h: 0.3, fontSize: 10, bold: true, color: C.red});
  T(s, sl.frame, {x: 7.75, y: 1.9, w: 4.8, h: 2.2, fontSize: 13, color: C.white, lineSpacingMultiple: 1.25});
  sl.steps.forEach((st, i) => {
    const x = M + i * 3.75;
    box(s, x, 4.5, 3.55, 1.1, {fill: C.card});
    T(s, st.t, {x: x + 0.25, y: 4.6, w: 3, h: 0.45, fontSize: 20, bold: true, color: C.red});
    T(s, st.d, {x: x + 0.25, y: 5.05, w: 3.1, h: 0.45, fontSize: 12.5, color: C.white});
  });
  T(s, '発表は1グループ90秒。お客様役に、直接提案します', {x: 8.15, y: 4.5, w: 4.6, h: 1.1, fontSize: 15, bold: true, color: C.white, valign: 'middle'});
  T(s, '手がかり：S30「お客様の要求」と、S34「検証計画」', {x: M, y: 5.9, w: 10, h: 0.35, fontSize: 12, color: C.mute});
};
R.pitch = (s, sl) => {
  header(s, sl, true);
  T(s, 'PROPOSAL TIME', {x: M, y: 1.4, w: 5, h: 0.3, fontSize: 11, bold: true, color: C.red, charSpacing: 3});
  T(s, sl.rule, {x: M, y: 1.75, w: W - 2 * M, h: 0.8, fontSize: 30, bold: true, color: C.white});
  T(s, 'お客様役が聞いているポイント', {x: M, y: 2.85, w: 6, h: 0.3, fontSize: 12, bold: true, color: C.mute});
  sl.view.forEach((v, i) => {
    const x = M + i * 4.12;
    box(s, x, 3.25, 3.9, 2.3, {fill: C.card});
    T(s, `${i + 1}`, {x: x + 0.25, y: 3.35, w: 0.6, h: 0.6, fontSize: 26, bold: true, color: C.red});
    T(s, v.t, {x: x + 0.85, y: 3.42, w: 2.9, h: 0.75, fontSize: 16, bold: true, color: C.white});
    T(s, v.d, {x: x + 0.25, y: 4.3, w: 3.4, h: 1.1, fontSize: 12, color: 'C9CED4'});
  });
  T(s, '正解かどうかではなく、お客様が「それならやってみたい」と思えるかで聞きます', {x: M, y: 5.85, w: W - 2 * M, h: 0.4, fontSize: 14, color: C.mute});
};
R.react = (s, sl) => {
  header(s, sl, true);
  placeholder(s, sl.media[0], M, 1.4, 4.6, 2.6, true);
  placeholder(s, sl.media[1], M, 4.15, 4.6, 2.1, true);
  const x = 5.55, w = W - M - x;
  box(s, x, 1.4, w, 1.05, {fill: C.card});
  T(s, 'あなたの提案', {x: x + 0.25, y: 1.48, w: 3, h: 0.25, fontSize: 10, bold: true, color: C.red});
  T(s, `「${sl.you}」`, {x: x + 0.25, y: 1.75, w: w - 0.5, h: 0.65, fontSize: 14, bold: true, color: C.white, valign: 'middle'});
  sl.replies.forEach((r, i) => {
    const y = 2.65 + i * 1.12, p = who(r.who);
    box(s, x, y, w, 0.98, {fill: i === 1 ? C.red : C.white});
    T(s, p.name, {x: x + 0.25, y, w: 1.3, h: 0.98, fontSize: 12, bold: true, color: i === 1 ? C.white : C.gray, valign: 'middle'});
    T(s, `「${r.text}」`, {x: x + 1.5, y, w: w - 1.7, h: 0.98, fontSize: 16.5, bold: true, color: i === 1 ? C.white : C.text, valign: 'middle'});
  });
  T(s, '※ 演習用の台詞です（実在のお客様のコメントではありません）', {x, y: 6.05, w, h: 0.3, fontSize: 10, color: C.mute});
};
R.agree = (s, sl) => {
  header(s, sl, false);
  box(s, M, 1.4, W - 2 * M, 1.05, {fill: C.ink});
  T(s, [{text: `${who(sl.quote.who).name}　`, options: {fontSize: 13, bold: true, color: C.red}}, {text: `「${sl.quote.text}」`, options: {fontSize: 21, bold: true, color: C.white}}], {x: M + 0.3, y: 1.4, w: W - 2 * M - 0.6, h: 1.05, valign: 'middle'});
  sl.rows.forEach(([k, v], i) => {
    const y = 2.7 + i * 0.85;
    box(s, M, y, W - 2 * M, 0.72, {});
    T(s, k, {x: M + 0.25, y, w: 2.8, h: 0.72, fontSize: 14, bold: true, color: i === 1 ? C.red : C.text, valign: 'middle'});
    T(s, v, {x: M + 3.1, y, w: W - 2 * M - 3.3, h: 0.72, fontSize: 14.5, color: C.text, valign: 'middle'});
  });
  T(s, sl.note, {x: M, y: 5.35, w: W - 2 * M, h: 0.45, fontSize: 12.5, color: C.gray});
  T(s, '商品が売れたのではなく、お客様から信頼され、次の一歩を任された', {x: M, y: 5.85, w: W - 2 * M, h: 0.55, fontSize: 19, bold: true, color: C.red});
};
R.journey = (s, sl) => {
  header(s, sl, false);
  const gw = (W - 2 * M - 4 * 0.2) / 5;
  sl.steps.forEach((st, i) => {
    const x = M + i * (gw + 0.2);
    box(s, x, 1.7 + (4 - i) * 0.35, gw, 2.6 + i * 0.35, {fill: i === 4 ? C.red : C.ink});
    T(s, st.t, {x: x + 0.2, y: 1.85 + (4 - i) * 0.35, w: gw - 0.4, h: 0.5, fontSize: 20, bold: true, color: C.white});
    T(s, st.d, {x: x + 0.2, y: 2.5 + (4 - i) * 0.35, w: gw - 0.4, h: 1.4, fontSize: 12.5, color: C.white});
  });
  T(s, '選ぶ → 考える → 発見する → 提案する → 顧客の反応を得る', {x: M, y: 6.0, w: W - 2 * M, h: 0.4, fontSize: 15, bold: true, color: C.text, align: 'center'});
};
R.reflect = (s, sl) => {
  header(s, sl, true);
  sl.qs.forEach((q, i) => {
    const x = M + (i % 2) * 6.17, y = 1.5 + Math.floor(i / 2) * 2.05;
    box(s, x, y, 5.95, 1.8, {fill: C.card});
    T(s, `Q${i + 1}`, {x: x + 0.25, y: y + 0.15, w: 1, h: 0.4, fontSize: 15, bold: true, color: C.red});
    T(s, q, {x: x + 0.25, y: y + 0.6, w: 5.45, h: 1.05, fontSize: 18, bold: true, color: C.white});
  });
  T(s, '隣の人と1分。どれか1つで構いません', {x: M, y: 5.75, w: 9, h: 0.4, fontSize: 14, color: C.mute});
};
R.message = (s, sl) => {
  header(s, sl, true);
  s.addShape(pres.shapes.RIGHT_TRIANGLE, {x: 10.6, y: 0, w: 1.2, h: H, fill: {color: C.red}, line: {type: 'none'}, flipH: true});
  box(s, 11.8, 0, W - 11.8, H, {fill: C.red});
  T(s, sl.msg, {x: M, y: 1.7, w: 9.6, h: 2.9, fontSize: 34, bold: true, color: C.white, lineSpacingMultiple: 1.2, valign: 'middle'});
  placeholder(s, sl.media[0], M, 4.95, 4.2, 1.65, true);
};
R.appeal = (s, sl) => {
  header(s, sl, false);
  sl.items.forEach((it, i) => {
    const y = 1.4 + i * 0.98;
    box(s, M, y, W - 2 * M, 0.85, {});
    T(s, `${i + 1}`, {x: M + 0.2, y, w: 0.6, h: 0.85, fontSize: 24, bold: true, color: C.red, valign: 'middle'});
    T(s, it.t, {x: M + 0.85, y, w: 5.6, h: 0.85, fontSize: 17, bold: true, color: C.text, valign: 'middle'});
    T(s, it.d, {x: M + 6.5, y, w: W - 2 * M - 6.7, h: 0.85, fontSize: 12.5, color: it.d.startsWith('【') ? C.red : C.gray, valign: 'middle'});
  });
};
R.senior = (s, sl) => {
  header(s, sl, false);
  placeholder(s, sl.media[0], M, 1.4, 3.6, 4.5, false);
  placeholder(s, sl.media[1], 4.4, 1.4, 4.2, 2.36, false);
  [['氏名・入社年', '（未提供）'], ['担当・仕事の内容', '（未提供）'], ['学生へのメッセージ', '（未提供）']].forEach(([k, v], i) => {
    const y = 4.0 + i * 0.65;
    T(s, k, {x: 4.4, y, w: 2.2, h: 0.5, fontSize: 12, bold: true, color: C.gray, valign: 'middle'});
    box(s, 6.6, y, 6.13, 0.5, {fill: 'FAFAFB', line: 'B9C1CA', dash: 'dash'});
    T(s, v, {x: 6.75, y, w: 5.8, h: 0.5, fontSize: 11, color: C.gray, valign: 'middle'});
  });
  box(s, 8.85, 1.4, 3.88, 2.36, {fill: C.soft});
  T(s, '社員情報が届くまで、このスライドは非表示にします。仮の社員エピソードは創作しません。', {x: 9.05, y: 1.5, w: 3.5, h: 2.16, fontSize: 12, bold: true, color: C.red, valign: 'middle'});
};
R.close = (s, sl) => {
  header(s, sl, true);
  placeholder(s, sl.media[0], M, 1.45, 3.2, 3.2, true);
  T(s, 'アンケート', {x: 4.2, y: 1.45, w: 6, h: 0.45, fontSize: 20, bold: true, color: C.white});
  T(s, '最初に聞いた「営業への興味」を、もう一度聞きます', {x: 4.2, y: 1.95, w: 8.5, h: 0.4, fontSize: 14, color: C.mute});
  T(s, 'OPTEX-FAの営業を、もっと知りたい人へ', {x: 4.2, y: 2.75, w: 8.5, h: 0.4, fontSize: 15, bold: true, color: C.red});
  sl.next.forEach((t, i) => {
    const x = 4.2 + i * 2.85;
    box(s, x, 3.25, 2.65, 1.4, {fill: C.card});
    T(s, t, {x: x + 0.2, y: 3.35, w: 2.3, h: 0.5, fontSize: 16, bold: true, color: C.white});
    T(s, '日程・申込方法：差し替え', {x: x + 0.2, y: 3.95, w: 2.3, h: 0.5, fontSize: 10, color: C.mute});
  });
  T(s, [{text: '/ ', options: {color: C.red}}, {text: 'OPTEX FA', options: {color: C.white}}], {x: M, y: 5.3, w: 6, h: 0.7, fontSize: 30, bold: true, fontFace: 'Arial'});
  T(s, 'ありがとうございました', {x: M, y: 6.0, w: 6, h: 0.4, fontSize: 14, color: C.mute});
};
// 補足資料
R.glossary = (s, sl) => {
  header(s, sl, false);
  const rows = sl.terms.map(([k, v], i) => [{text: k, options: {bold: true, color: C.red, fontSize: 12.5}}, {text: v, options: {fontSize: 11.5, color: C.text, fill: {color: i % 2 ? 'FAFAFB' : C.white}}}]);
  s.addTable(rows, {x: M, y: 1.4, w: W - 2 * M, colW: [2.2, W - 2 * M - 2.2], fontFace: FONT, fill: {color: C.white}, border: {type: 'solid', color: 'D5D9DE', pt: 0.75}, valign: 'middle', rowH: 0.6, margin: 0.1});
};
R.why = (s, sl) => {
  header(s, sl, false);
  sl.items.forEach(([k, v], i) => {
    const x = M + i * 4.12;
    box(s, x, 1.45, 3.9, 3.6, {shadow: true});
    T(s, `${i + 1}`, {x: x + 0.25, y: 1.6, w: 0.6, h: 0.6, fontSize: 26, bold: true, color: C.red});
    T(s, k, {x: x + 0.25, y: 2.3, w: 3.4, h: 0.8, fontSize: 18, bold: true, color: C.text});
    T(s, v, {x: x + 0.25, y: 3.15, w: 3.4, h: 1.7, fontSize: 13, color: C.gray});
  });
  T(s, '一般的な説明です。このお客様のラインで何が起きているかは、検証で確かめます。', {x: M, y: 5.35, w: W - 2 * M, h: 0.4, fontSize: 14, bold: true, color: C.text});
  T(s, sl.src, {x: M, y: 5.9, w: W - 2 * M, h: 0.5, fontSize: 9.5, color: C.gray});
};
R.demo4 = (s, sl) => {
  header(s, sl, false);
  const gw = 2.85, gap = 0.2;
  sl.imgs.forEach(([img, cap], i) => {
    const x = M + i * (gw + gap);
    const d = dims(img), ih = (gw * d.h) / d.w;
    box(s, x, 1.45, gw, ih, {fill: C.white});
    s.addImage({path: join(ASSETS, `${img}.jpg`), x, y: 1.45, w: gw, h: ih, altText: `IMAGE_PLACEHOLDER_11 ${cap}（仮画像）`, objectName: `IMAGE_PLACEHOLDER_11_${i + 1}`});
    tag(s, '仮', x + 0.08, 1.45 + ih - 0.34, {w: 0.3, h: 0.26, size: 9});
    T(s, cap, {x, y: 1.55 + ih, w: gw, h: 0.4, fontSize: 14, bold: true, color: i === 2 ? C.red : C.text, align: 'center'});
  });
  box(s, M, 4.55, W - 2 * M, 0.9, {fill: C.soft});
  T(s, [{text: '要修正　', options: {bold: true, color: C.red, fontSize: 12}}, {text: sl.warn, options: {color: C.text, fontSize: 12.5}}], {x: M + 0.25, y: 4.55, w: W - 2 * M - 0.5, h: 0.9, valign: 'middle'});
  T(s, '【IMAGE_PLACEHOLDER_11】比較デモの4条件　後日指定画像に差し替え／図は「見方の説明」で、実測結果ではありません', {x: M, y: 5.65, w: W - 2 * M, h: 0.35, fontSize: 10, color: C.gray});
};
R.fail = (s, sl) => {
  header(s, sl, false);
  sl.items.forEach((t, i) => {
    const x = M + (i % 2) * 6.17, y = 1.5 + Math.floor(i / 2) * 1.25;
    box(s, x, y, 5.95, 1.05, {shadow: true});
    T(s, `${i + 1}　${t}`, {x: x + 0.3, y, w: 5.5, h: 1.05, fontSize: 18, bold: true, color: C.text, valign: 'middle'});
  });
  box(s, M, 4.3, W - 2 * M, 1.2, {fill: C.ink});
  T(s, sl.msg, {x: M + 0.35, y: 4.3, w: W - 2 * M - 0.7, h: 1.2, fontSize: 18, bold: true, color: C.white, valign: 'middle'});
};
R.sources = (s, sl) => {
  header(s, sl, false);
  const rows = [['項目', '本資料での扱い', '確認状況'].map((t) => ({text: t, options: {bold: true, color: C.white, fill: {color: C.ink}}}))].concat(sl.rows.map((r) => r.map((t, i) => ({text: t, options: {color: i === 2 ? C.gray : C.text, bold: i === 0}}))));
  s.addTable(rows, {x: M, y: 1.4, w: W - 2 * M, colW: [3.0, 4.2, 4.93], fontFace: FONT, fontSize: 12, fill: {color: C.white}, border: {type: 'solid', color: 'D5D9DE', pt: 0.75}, valign: 'middle', rowH: 0.62, margin: 0.1});
  T(s, sl.src, {x: M, y: 6.05, w: W - 2 * M, h: 0.3, fontSize: 10, color: C.gray});
};

const DARK = new Set(['cover', 'check', 'mission', 'video', 'divider', 'question', 'work', 'voice', 'propwork', 'pitch', 'react', 'reflect', 'message', 'close']);
const add = (sl, section) => {
  curId = sl.id;
  const dark = DARK.has(sl.kind);
  const s = pres.addSlide({masterName: dark ? 'DARK' : 'LIGHT', sectionTitle: section});
  if (!R[sl.kind]) throw new Error(`描き方がありません：${sl.kind}`);
  R[sl.kind](s, sl);
  return s;
};

let cur = null;
for (const sl of SLIDES) {
  const ph = PHASES.find((p) => p.key === sl.phase);
  const sec = `${ph.key}（${ph.start}〜${ph.end}分）`;
  if (sec !== cur) { pres.addSection({title: sec}); cur = sec; }
  const s = add(sl, sec);
  s.addNotes(notes(sl));
}
pres.addSection({title: '補足資料'});
for (const x of APPENDIX) {
  const s = add({...x, phase: 'APPENDIX'}, '補足資料');
  s.addNotes(`${x.id}｜補足資料｜本編の時間には含めない。質問が出たとき・時間に余裕があるときに使う。`);
}
PLACED.push({id: 'IMAGE_PLACEHOLDER_11', slide: 'X04', w: 2.85, h: 2.18, img: 'demo_*'});
await pres.writeFile({fileName: OUT});
writeFileSync(join(ROOT, 'out', 'program60-placements.json'), JSON.stringify(PLACED, null, 1));
console.log(`${OUT}：本編${SLIDES.length}枚＋補足${APPENDIX.length}枚`);
