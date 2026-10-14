// talk-script-by-slide.md と talk-script.md（話者と声）から Word を作る。
//   npm run experience:talk のあとに node scripts/talk-script-docx.js
//   → docs/consulting-experience/talk-script-by-slide.docx（docx パッケージが必要）
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  HeadingLevel, AlignmentType, Footer, PageNumber, PageBreak, TableOfContents, LevelFormat,
} = (() => {
  try {
    return require('docx');
  } catch {
    return require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'docx'));
  }
})();

const DOCS = path.join(__dirname, '..', 'docs', 'consulting-experience');
const out = process.argv[2] || path.join(DOCS, 'talk-script-by-slide.docx');
const RED = 'E60012';
const INK = '141517';
const GRAY = '6B6F76';
const LINE = 'D9DBDF';
const FONT = 'Yu Gothic';

// ---- データ
const slideMd = fs.readFileSync(path.join(DOCS, 'talk-script-by-slide.md'), 'utf8').split('\n');
const phases = [];
let cur = null;
let slide = null;
for (const l of slideMd) {
  if (l.startsWith('## ')) phases.push((cur = {title: l.slice(3), slides: []}));
  else if (l.startsWith('### ')) cur.slides.push((slide = {title: l.slice(4).replace('　', '  '), where: '', rows: []}));
  else if (l.startsWith('場面：') && slide) slide.where = l.slice(3);
  else if (/^\| \d+ \|/.test(l) && slide) {
    const c = l.split('|').slice(1, -1).map((x) => x.trim());
    slide.rows.push({no: c[0], who: c[1], voice: c[2], text: c[3], file: c[4].replace(/`/g, '')});
  }
}
const voiceMd = fs.readFileSync(path.join(DOCS, 'talk-script.md'), 'utf8').split('\n');
const voices = voiceMd
  .filter((l) => /^\| (ナレーション|あなた|佐藤さん|高橋さん|森さん|中田さん) \|/.test(l))
  .map((l) => {
    const c = l.split('|').slice(1, -1).map((x) => x.trim());
    const s = c[3];
    const g = (re) => (s.match(re) || [, '—'])[1];
    return {
      who: c[0],
      role: c[1] === '—' ? '導入動画と同じナレーター' : c[1],
      voice: g(/「([^」]+)」/),
      seed: g(/声色値 (-?\d+)/),
      speed: g(/速度([\d.]+x)/),
      pitch: g(/ピッチ ?([^／]+)/),
      count: (c[2].match(/（(\d+文)）$/) || [, ''])[1],
    };
  });
const total = phases.reduce((n, p) => n + p.slides.reduce((m, s) => m + s.rows.length, 0), 0);
const nSlides = phases.reduce((n, p) => n + p.slides.length, 0);

// ---- 部品
const t = (text, o = {}) => new TextRun({text, font: FONT, ...o});
const p = (children, o = {}) => new Paragraph({children: Array.isArray(children) ? children : [t(children)], spacing: {after: 120, line: 300}, ...o});
const border = {style: BorderStyle.SINGLE, size: 4, color: LINE};
const borders = {top: border, bottom: border, left: border, right: border};
const cell = (children, width, o = {}) =>
  new TableCell({
    children: (Array.isArray(children) ? children : [children]).map((c) => (typeof c === 'string' ? new Paragraph({children: [t(c, o.run || {})], spacing: {after: 0, line: 280}}) : c)),
    width: {size: width, type: WidthType.DXA},
    borders,
    margins: {top: 70, bottom: 70, left: 110, right: 110},
    shading: o.fill ? {type: ShadingType.CLEAR, color: 'auto', fill: o.fill} : undefined,
    verticalAlign: 'center',
  });
const table = (widths, head, rows) =>
  new Table({
    width: {size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA},
    columnWidths: widths,
    rows: [
      new TableRow({tableHeader: true, children: head.map((h, i) => cell(h, widths[i], {fill: INK, run: {bold: true, color: 'FFFFFF', size: 19}}))}),
      ...rows.map((r) => new TableRow({cantSplit: true, children: r.map((c, i) => cell(c, widths[i], {run: {size: 20}}))})),
    ],
  });

// ---- 本文
const W = 9638; // A4・左右20mm
const body = [];
body.push(
  new Paragraph({children: [t('OPTEX-FA  CONSULTING SALES EXPERIENCE', {color: RED, bold: true, size: 20})], spacing: {after: 60}}),
  new Paragraph({heading: HeadingLevel.TITLE, children: [t('トークスクリプト（スライドごと）', {bold: true, size: 44, color: INK})], spacing: {after: 120}}),
  p([t(`コンサルティング営業体験（後半・体験パート）　全${nSlides}スライド／${total}文`, {color: GRAY, size: 21})], {
    border: {bottom: {style: BorderStyle.SINGLE, size: 12, color: RED, space: 6}},
    spacing: {after: 240},
  }),
  new Paragraph({heading: HeadingLevel.HEADING_1, children: [t('この台本の使い方')]}),
  p([t('映像の画面（スライド）1枚ごとに、再生順で並べています。音読さん Beta で、下の「話者と声」の設定のとおりに音声を作ります。')]),
  ...[
    ['読み上げ文', '音読さんにそのまま貼る文です。読み間違えやすい語は読み方に直しています（例：PLC → ピーエルシー、KR-Q → ケーアール・キュー）。字幕は元の表記のままです。'],
    ['音声ファイル名', '1文ずつ作るときは、この名前（半角英字）で保存して送ってください。映像の長さ・字幕・場面の切り替えが、音声の長さに合わせて自動で調整されます。'],
    ['声色値', '入力欄に必ず入れてから生成してください。入れないと、毎回ちがう声になります。'],
  ].map(([k, v]) => p([t(`${k}：`, {bold: true}), t(v)], {numbering: {reference: 'dot', level: 0}})),
  new Paragraph({heading: HeadingLevel.HEADING_1, children: [t('話者と声（音読さん Beta）')]}),
  table(
    [1900, 2600, 1300, 1600, 800, 1438],
    ['話者', '役割', '声', '声色値', '速度', 'ピッチ'],
    voices.map((v) => [`${v.who}\u3000${v.count}`, v.role, v.voice, v.seed, v.speed, v.pitch]),
  ),
  p([t('読み上げスタイルは全員「ビジネス（プロフェッショナルでビジネスライクに読み上げてください）」、生成モードは「高速」。', {size: 19, color: GRAY})], {spacing: {before: 100, after: 120}}),
);

for (const ph of phases) {
  body.push(new Paragraph({heading: HeadingLevel.HEADING_1, pageBreakBefore: ph.title.startsWith('PHASE'), children: [t(ph.title)]}));
  for (const s of ph.slides) {
    body.push(
      new Paragraph({heading: HeadingLevel.HEADING_2, keepNext: true, children: [t(s.title)]}),
      new Paragraph({keepNext: true, children: [t(`場面：${s.where}`, {color: GRAY, size: 19})], spacing: {after: 80}}),
      table(
        [460, 1800, 4778, 2600],
        ['#', '話者（声）', '読み上げ文', '音声ファイル名'],
        s.rows.map((r) => [r.no, `${r.who}（${r.voice}）`, r.text, r.file]),
      ),
      new Paragraph({children: [], spacing: {after: 160}}),
    );
  }
}

const doc = new Document({
  creator: 'OPTEX-FA 営業企画',
  title: 'トークスクリプト（スライドごと）',
  styles: {
    default: {document: {run: {font: FONT, size: 21}}},
    paragraphStyles: [
      {id: 'Title', name: 'Title', basedOn: 'Normal', run: {font: FONT, size: 44, bold: true}},
      {id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: {font: FONT, size: 30, bold: true, color: INK}, paragraph: {spacing: {before: 240, after: 160}, outlineLevel: 0, border: {left: {style: BorderStyle.SINGLE, size: 36, color: RED, space: 8}}}},
      {id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: {font: FONT, size: 24, bold: true, color: INK}, paragraph: {spacing: {before: 200, after: 60}, outlineLevel: 1}},
    ],
  },
  numbering: {config: [{reference: 'dot', levels: [{level: 0, format: LevelFormat.BULLET, text: '・', alignment: AlignmentType.LEFT, style: {paragraph: {indent: {left: 420, hanging: 300}}}}]}]},
  sections: [
    {
      properties: {page: {size: {width: 11906, height: 16838}, margin: {top: 1134, bottom: 1134, left: 1134, right: 1134}}},
      footers: {
        default: new Footer({
          children: [new Paragraph({alignment: AlignmentType.CENTER, children: [t('トークスクリプト（スライドごと）　', {size: 16, color: GRAY}), new TextRun({children: [PageNumber.CURRENT], font: FONT, size: 16, color: GRAY})]})],
        }),
      },
      children: body,
    },
  ],
});
Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(out, b);
  console.log('ok', voices.length, 'voices', nSlides, 'slides', total, 'lines');
});
