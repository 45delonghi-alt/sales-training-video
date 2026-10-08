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
  'production-log': {
    title: '今週のカウント記録',
    sub: 'LINE 03 ｜ 実際の本数とセンサのカウントの照合',
    note: '教育用の架空データ',
    head: ['曜日', '照合結果', '誤カウント'],
    widths: [200, 560, 240],
    rows: [
      ['月', '一致', {mark: 'none'}],
      ['火', 'センサのカウントが多い', {mark: 'error'}],
      ['水', '一致', {mark: 'none'}],
      ['木', 'センサのカウントが多い', {mark: 'error'}],
      ['金', 'センサのカウントが多い', {mark: 'error'}],
    ],
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

export const DocumentScene: React.FC<{variant: string}> = ({variant}) => {
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
