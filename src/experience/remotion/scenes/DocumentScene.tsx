// 資料・記録を一人称で確認するカット。金額・型式・仕様値は表示しない（伏せ字）。
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {X} from '../theme';
import {appear, progress} from '../../../consulting/components/anim';

type Cell = string | {mask: number} | {mark: 'error' | 'ok' | 'none'};
type Doc = {small?: boolean; title: string; sub?: string; note?: string; head: string[]; rows: Cell[][]; widths: number[]; highlight?: number; stamp?: string};

const M = (n: number): Cell => ({mask: n});

const DOCS: Record<string, Doc> = {
  'maintenance-log': {
    title: '設備点検記録',
    sub: 'LINE 03 カウント用 光電センサ',
    note: '教育用の架空データ',
    head: ['時期', '内容', '結果'],
    widths: [240, 520, 240],
    rows: [
      ['約3年前', '導入・設置', '—'],
      ['約2年前', '定期点検（清掃・取付確認）', '異常なし'],
      ['約1年前', '定期点検（清掃・取付確認）', '異常なし'],
      ['半年前', '定期点検（清掃・取付確認）', '異常なし'],
      ['—', '故障・交換の記録', 'なし'],
    ],
    highlight: 0,
  },
  budget: {
    title: '設備予算（今期）',
    note: '金額は表示していません',
    head: ['項目', '予算', '状況'],
    widths: [440, 300, 260],
    rows: [
      ['設備保全', M(5), M(3)],
      ['設備更新', M(6), M(3)],
      ['改善活動', M(4), M(3)],
    ],
    stamp: 'まず、改善できるか',
  },
  'catalog-generic': {
    title: '光電センサ 製品カタログ',
    note: '一般的な製品紹介（メーカー名・型式は表示していません）',
    head: ['特長', ''],
    widths: [520, 480],
    rows: [
      ['高性能', '★★★★★'],
      ['高速応答', '★★★★★'],
      ['長距離検出', '★★★★☆'],
      ['豊富なラインアップ', '★★★★☆'],
    ],
    stamp: '今のセンサと何が違う？',
  },
  price: {
    title: '価格表',
    note: '金額は表示していません',
    head: ['品目', '数量', '価格'],
    widths: [500, 200, 300],
    rows: [
      ['センサ本体', '1', M(5)],
      ['反射板', '1', M(4)],
      ['取付金具', '1', M(4)],
    ],
    stamp: '先に、使えるかを知りたい',
  },
  'test-plan': {
    title: '検証項目と合格基準',
    sub: '試す前に、お客様と決めておく',
    head: ['確かめること', '合格の基準'],
    widths: [620, 640],
    small: true,
    rows: [
      ['① 1本ずつ検出できるか', 'ボトル1本につき、検出表示が1回'],
      ['② 出力が何度も切り替わらないか', '1本の通過中に、出力の変化は1回'],
      ['③ カウントは実際の本数と一致するか', '流した本数とカウント値の差が 0'],
      ['④ 位置ずれ・間隔・向きが変わっても', '①〜③を満たす（範囲は設備担当者と決める）'],
    ],
  },
  'catalog-pages': {
    title: '光電センサ 総合カタログ',
    note: '数値は表示していません',
    head: ['章', 'ページ'],
    widths: [620, 380],
    rows: [
      ['光電センサ 総合', 'p.1〜120'],
      ['透明体検出', 'p.121〜148'],
      ['アクセサリ', 'p.149〜210'],
      ['仕様一覧', 'p.211〜260'],
    ],
    stamp: 'ページ数では決められない',
  },
  'new-sensor-flyer': {
    title: '新しい光電センサのご案内',
    note: '一般的なチラシ（メーカー名・型式は表示していません）',
    head: ['うたい文句', ''],
    widths: [620, 380],
    rows: [
      ['最新モデル', 'NEW'],
      ['高性能・高速', '★★★★★'],
      ['いまなら入れ替えキャンペーン', M(4)],
    ],
    stamp: '欲しいのはセンサではない',
  },
  'price-compare': {
    title: '価格の比較',
    note: '金額は表示していません',
    head: ['項目', '案1', '案2'],
    widths: [440, 280, 280],
    rows: [
      ['センサ本体', M(4), M(4)],
      ['反射板・金具', M(3), M(3)],
      ['設置・調整', M(3), M(4)],
      ['合計', M(5), M(5)],
    ],
    stamp: '使えるかが先',
  },
  'catalog-send': {
    title: 'メール：カタログ送付のご案内',
    note: '宛先・本文のみ',
    head: ['', ''],
    widths: [220, 780],
    rows: [
      ['宛先', '飲料工場 設備課 佐藤様'],
      ['件名', '光電センサ カタログ送付の件'],
      ['本文', 'カタログを添付いたします。ご検討ください。'],
      ['添付', 'catalog.pdf'],
    ],
    stamp: '資料だけでは判断できない',
  },
  'catalog-spec': {
    title: '仕様',
    note: '数値は表示していません',
    head: ['項目', '値'],
    widths: [520, 480],
    rows: [
      ['検出距離', M(4)],
      ['応答時間', M(4)],
      ['検出物体', M(6)],
      ['使用周囲温度', M(5)],
    ],
    stamp: 'うちのラインで使える？',
  },
  quote: {
    title: '御見積書',
    note: '金額は表示していません',
    head: ['品目', '数量', '金額'],
    widths: [500, 200, 300],
    rows: [
      ['光電センサ一式', '1', M(5)],
      ['設置・調整', '1', M(4)],
      ['合計', '', M(6)],
    ],
    stamp: 'まだ決めにくい',
  },
};

// 4週間のカウントデータ（研修用の架空データ）。通常は＋0.5〜0.8%、最大の週で＋3.0%。すべて過剰カウント
const WEEKS = [
  {w: '第1週', actual: 10000, count: 10060},
  {w: '第2週', actual: 10000, count: 10300},
  {w: '第3週', actual: 10000, count: 10050},
  {w: '第4週', actual: 10000, count: 10080},
];
const pct = (r: {actual: number; count: number}) => ((r.count - r.actual) / r.actual) * 100;

const WeeklyCounts: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const hl = frame < 3.4 * fps ? -1 : frame < 6.4 * fps ? 0 : 1; // 第1週 → 最大の第2週
  const fmt = (n: number) => n.toLocaleString('en-US');
  const maxPct = 3.5;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div style={{width: 1560, marginTop: -60, background: X.white, border: `1px solid ${X.line}`, boxShadow: '0 30px 80px rgba(20,21,23,0.18)', padding: '34px 46px 40px', ...appear(frame, 0, {dy: 30})}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 20}}>
          <div style={{fontSize: 40, fontWeight: 900, color: X.ink}}>生産数の管理画面　LINE 03</div>
          <div style={{fontSize: 18, color: X.gray, border: `1px solid ${X.line}`, padding: '2px 10px'}}>研修用の架空データ</div>
        </div>
        <div style={{display: 'flex', gap: 40, marginTop: 22}}>
          <div style={{flex: 1}}>
            <div style={{display: 'flex', borderBottom: `3px solid ${X.ink}`, paddingBottom: 8, fontSize: 20, fontWeight: 700, color: X.gray}}>
              <div style={{width: 130}}>週</div>
              <div style={{width: 210}}>実際の本数</div>
              <div style={{width: 210}}>カウント</div>
              <div>差</div>
            </div>
            {WEEKS.map((r, i) => (
              <div key={r.w} style={{display: 'flex', alignItems: 'center', minHeight: 64, borderBottom: `1px solid ${X.line}`, fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', background: hl === i ? (i === 1 ? 'rgba(215,20,30,0.10)' : 'rgba(20,21,23,0.05)') : 'transparent', ...appear(frame, (0.6 + i * 0.35) * fps, {dy: 10, dur: 10})}}>
                <div style={{width: 130}}>{r.w}</div>
                <div style={{width: 210}}>{fmt(r.actual)}</div>
                <div style={{width: 210, color: i === 1 && hl >= 1 ? X.red : X.ink}}>{fmt(r.count)}</div>
                <div style={{color: i === 1 && hl >= 1 ? X.red : X.ink}}>＋{pct(r).toFixed(1)}%</div>
              </div>
            ))}
            <div style={{fontSize: 20, color: X.gray, marginTop: 12}}>すべて「実際より多い」（過剰カウント）。通常は＋0.5〜0.8%、最大の週で＋3.0%</div>
          </div>
          <div style={{width: 520}}>
            <div style={{fontSize: 20, fontWeight: 700, color: X.gray}}>実際の本数との差（%）</div>
            <svg width={520} height={320} style={{marginTop: 10}}>
              <line x1={40} y1={280} x2={510} y2={280} stroke={X.ink} strokeWidth={2} />
              {[1, 2, 3].map((v) => (
                <g key={v}>
                  <line x1={40} y1={280 - (v / maxPct) * 260} x2={510} y2={280 - (v / maxPct) * 260} stroke={X.line} strokeWidth={1} />
                  <text x={30} y={286 - (v / maxPct) * 260} fontSize={16} fill={X.gray} textAnchor="end">{v}%</text>
                </g>
              ))}
              {WEEKS.map((r, i) => {
                const h = (pct(r) / maxPct) * 260 * progress(frame, (1.2 + i * 0.3) * fps, 16);
                const x = 70 + i * 115;
                return (
                  <g key={r.w}>
                    <rect x={x} y={280 - h} width={70} height={h} fill={i === 1 ? X.red : '#8A8D93'} opacity={hl === -1 || hl === i ? 1 : 0.55} />
                    <text x={x + 35} y={304} fontSize={16} fill={X.gray} textAnchor="middle">{r.w}</text>
                    <text x={x + 35} y={272 - h} fontSize={18} fontWeight={700} fill={i === 1 ? X.red : X.ink} textAnchor="middle">{pct(r).toFixed(1)}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const DocumentScene: React.FC<{variant: string}> = ({variant}) => {
  if (variant === 'weekly-counts') return <WeeklyCounts />;
  return <DocumentCard variant={variant} />;
};

const DocumentCard: React.FC<{variant: string}> = ({variant}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const d = DOCS[variant] ?? DOCS['test-plan'];
  const width = d.widths.reduce((a, b) => a + b, 0);
  // 一人称で資料を手に取る：わずかに傾いた状態から正面へ、ゆっくり寄る
  const push = interpolate(frame, [0, 8 * fps], [1, 1.06], {extrapolateRight: 'clamp'});
  const tilt = interpolate(frame, [0, 0.8 * fps], [10, 0], {extrapolateRight: 'clamp', easing: (x) => 1 - (1 - x) ** 3});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', perspective: 1600, transform: `scale(${push})`}}>
      <div
        style={{
          width: width + 120,
          marginTop: -40,
          background: X.white,
          boxShadow: '0 30px 80px rgba(20,21,23,0.18)',
          border: `1px solid ${X.line}`,
          padding: '44px 60px 50px',
          position: 'relative',
          opacity: appear(frame, 0, {dy: 40, dur: 16}).opacity,
          transform: `${appear(frame, 0, {dy: 40, dur: 16}).transform} rotateX(${tilt}deg)`,
        }}
      >
        <div style={{fontSize: 44, fontWeight: 900, color: X.ink}}>{d.title}</div>
        {d.sub ? <div style={{fontSize: 24, color: X.gray, marginTop: 6}}>{d.sub}</div> : null}
        {d.note ? <div style={{display: 'inline-block', fontSize: 18, color: X.gray, border: `1px solid ${X.line}`, padding: '2px 10px', marginTop: 10}}>{d.note}</div> : null}
        <div style={{display: 'flex', borderBottom: `3px solid ${X.ink}`, marginTop: 26, paddingBottom: 8}}>
          {d.head.map((h, i) => (
            <div key={i} style={{width: d.widths[i], fontSize: 22, fontWeight: 700, color: X.gray}}>{h}</div>
          ))}
        </div>
        {d.rows.map((r, ri) => (
          <div
            key={ri}
            style={{
              display: 'flex',
              alignItems: 'center',
              minHeight: 74,
              borderBottom: `1px solid ${X.line}`,
              background: d.highlight === ri ? 'rgba(215,20,30,0.06)' : 'transparent',
              ...appear(frame, (0.6 + ri * 0.35) * fps, {dy: 12, dur: 10}),
            }}
          >
            {r.map((c, ci) => (
              <div key={ci} style={{width: d.widths[ci], paddingRight: 16, boxSizing: 'border-box', fontSize: d.small ? 26 : 30, fontWeight: ci === 0 ? 700 : 500, color: X.ink}}>
                <CellView c={c} />
              </div>
            ))}
          </div>
        ))}
        {d.stamp ? (
          <div
            style={{
              position: 'absolute',
              right: -40,
              top: -34,
              transform: `rotate(-6deg) scale(${1.2 - 0.2 * progress(frame, 2.2 * fps, 10)})`,
              opacity: progress(frame, 2.2 * fps, 10),
              background: X.red,
              color: X.white,
              fontSize: 30,
              fontWeight: 900,
              padding: '10px 22px 12px',
            }}
          >
            {d.stamp}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const CellView: React.FC<{c: Cell}> = ({c}) => {
  if (typeof c === 'string') return <>{c}</>;
  if ('mask' in c) return <span style={{display: 'inline-block', width: c.mask * 36, height: 22, background: X.line, borderRadius: 3, verticalAlign: 'middle'}} />;
  if (c.mark === 'error') return <span style={{color: X.red, fontWeight: 900}}>● 発生</span>;
  if (c.mark === 'ok') return <span style={{color: X.ok, fontWeight: 900}}>●</span>;
  return <span style={{color: X.grayLight}}>—</span>;
};
