import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {SceneSpec} from '../types';
import {C} from '../theme';
import {Backdrop} from '../components/Backdrop';
import {useCue} from '../components/SceneShell';
import {appear, fadeOut, keyZoom, progress} from '../components/anim';

// 光電センサの基本：添付の解説動画（図・光の線・検出物・受光部の拡大など）をそのまま使い、
// 見出し・背景・字幕・ナレーションだけ本編の仕様に合わせる。
// 図の動きは、各ページの元動画の区間を、音読さんのナレーションの長さに合わせて速度調整して再生する。

// 元動画（public/consulting/video/sensor_draft.webm）は、解説動画の 5.5秒〜113.2秒を
// 本文エリア（y=160〜880）だけ切り出し、背景を透過したもの
const DRAFT = 'consulting/video/sensor_draft.webm';
const DRAFT_OFFSET = 5.5;
const FREEZE = 'consulting/video/sensor_summary_freeze.png';
const CONTENT_TOP = 175;

// 元動画の中の文言のうち、モノの有無の言い方を「検出」にそろえるために差し替えるラベル。
// page：ページ番号、from / to：元動画上で表示されている秒、box：元動画上の位置（px）
type Relabel = {page: number; from: number; to: number; text: string; pill: boolean; box: [number, number, number, number]};
// まとめ表から消す文言（回帰反射型の注意点「光沢物は偏光フィルタ付き」）。from は元動画上で出てくる秒
const SUMMARY_ERASE: Relabel = {page: -1, from: 102.6, to: 999, text: '', pill: false, box: [1306, 188, 372, 40]};
const RELABELS: Relabel[] = [
  {page: 0, from: 7.0, to: 99, text: '光の変化 ＝ モノを検出', pill: false, box: [400, 552, 420, 50]},
  {page: 1, from: 27.2, to: 36.2, text: '光が遮られた → 検出', pill: true, box: [426, 572, 368, 56]},
  {page: 2, from: 43.47, to: 52.63, text: '光が遮られた → 検出', pill: true, box: [426, 572, 368, 56]},
  {page: 4, from: 71.33, to: 78.43, text: '光が返ってきた → 検出', pill: true, box: [410, 572, 400, 56]},
];
// 元動画のカードは白・半透明（α 160/255）
const CARD = 'rgba(255,255,255,0.627)';

export const Scene07SensorBasics: React.FC<{spec: SceneSpec<'Scene07SensorBasics'>}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cue = useCue();
  const {visual: v, animation: a} = spec;
  const starts = v.pages.map((p) => cue({at: p.start}));
  const summaryStart = cue(a.summary);
  const freezeAt = cue(a.wrong) - Math.round(fps * 0.4);

  // 元動画の区間 [ds, de] を、本編の from〜to フレームに合わせて再生する
  const clip = (key: string, from: number, to: number, ds: number, de: number) => {
    const frames = Math.max(1, to - from);
    const rate = ((de - ds) * fps) / frames;
    return (
      <Sequence key={key} from={from} durationInFrames={frames} layout="none">
        <AbsoluteFill style={{top: CONTENT_TOP, height: 720}}>
          <OffthreadVideo
            src={staticFile(DRAFT)}
            transparent
            muted
            startFrom={Math.round((ds - DRAFT_OFFSET) * fps)}
            playbackRate={rate}
            style={{width: 1920, height: 720}}
          />
        </AbsoluteFill>
      </Sequence>
    );
  };

  return (
    <AbsoluteFill>
      <Backdrop tone="light" sceneNo={7} label="PHOTOELECTRIC SENSORS" />
      {/* 自社センサブランド */}
      <Img
        src={staticFile('consulting/images/fastus.png')}
        style={{position: 'absolute', right: 100, top: 88, width: 190, opacity: progress(frame, 0, 14)}}
      />

      {v.pages.map((page, i) => {
        const start = starts[i];
        const end = i + 1 < starts.length ? starts[i + 1] : summaryStart;
        return (
          <React.Fragment key={page.start}>
            {frame >= start - 2 && frame <= end + 8 ? (
              <AbsoluteFill style={{opacity: fadeOut(frame, end, 8)}}>
                <Header tag={page.tag} title={page.title} frame={frame} start={start} />
              </AbsoluteFill>
            ) : null}
            {clip(page.start, start, end, page.draft[0], page.draft[1])}
            {RELABELS.filter((r) => r.page === i).map((r) => {
              // 元動画の秒 → 本編のフレーム
              const toFrame = (t: number) => start + ((t - page.draft[0]) / (page.draft[1] - page.draft[0])) * (end - start);
              const from = Math.max(start, Math.round(toFrame(r.from)));
              const to = Math.min(end, Math.round(toFrame(r.to)));
              return frame >= from && frame < to ? <Relabeled key={r.text + i} r={r} frame={frame} from={from} /> : null;
            })}
          </React.Fragment>
        );
      })}

      {/* まとめ：表が出そろうまで元動画を再生し、その画面で止めて「最適か」のメッセージを重ねる */}
      {frame >= summaryStart ? <Header title="まとめ：どれを選ぶ？" frame={frame} start={summaryStart} /> : null}
      {clip('summary', summaryStart, freezeAt, v.summaryDraft[0], v.summaryDraft[1])}
      {frame >= freezeAt ? (
        <Img src={staticFile(FREEZE)} style={{position: 'absolute', left: 0, top: CONTENT_TOP, width: 1920, height: 720}} />
      ) : null}
      {(() => {
        const [ds, de] = v.summaryDraft;
        const from = Math.round(summaryStart + ((SUMMARY_ERASE.from - ds) / (de - ds)) * (freezeAt - summaryStart));
        return frame >= from ? <Relabeled r={SUMMARY_ERASE} frame={frame} from={from} /> : null;
      })()}
      {frame >= summaryStart ? <Message spec={spec} frame={frame} /> : null}
    </AbsoluteFill>
  );
};

// 元の文言を、背景（本編の背景＋半透明カード）の複製で隠し、その上に差し替えの文言を描く
const Relabeled: React.FC<{r: Relabel; frame: number; from: number}> = ({r, frame, from}) => {
  const [x, y, w, h] = r.box;
  const pad = 8;
  const L = x - pad;
  const T = CONTENT_TOP + y - pad;
  const p = progress(frame, from, 6);
  return (
    <>
      <div style={{position: 'absolute', left: L, top: T, width: w + pad * 2, height: h + pad * 2, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: -L, top: -T, width: 1920, height: 1080}}>
          <Backdrop tone="light" sceneNo={7} label="PHOTOELECTRIC SENSORS" />
        </div>
        <AbsoluteFill style={{background: CARD}} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: CONTENT_TOP + y,
          width: w,
          height: h,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: h / 2,
          background: r.pill ? '#EF7F1E' : 'transparent',
          color: r.pill ? C.white : '#1E5BC6',
          fontSize: r.pill ? 26 : 34,
          fontWeight: 700,
          opacity: p,
          transform: `scale(${0.96 + 0.04 * p})`,
        }}
      >
        {r.text}
      </div>
    </>
  );
};

const Header: React.FC<{tag?: string; title: string; frame: number; start: number}> = ({tag, title, frame, start}) => (
  <div style={{position: 'absolute', left: 110, top: 104, display: 'flex', alignItems: 'center', gap: 18, ...appear(frame, start, {dx: -30, dy: 0, dur: 10})}}>
    {tag ? (
      <div style={{fontSize: 24, fontWeight: 900, color: C.white, background: C.red, padding: '4px 14px 6px', letterSpacing: 1}}>{tag}</div>
    ) : null}
    <div style={{fontSize: 52, fontWeight: 900, color: C.ink}}>{title}</div>
  </div>
);

// どれが高性能か → 今回のお客様に、どれが最適か
const Message: React.FC<{spec: SceneSpec<'Scene07SensorBasics'>; frame: number}> = ({spec, frame}) => {
  const cue = useCue();
  const {visual: v, animation: a} = spec;
  const wrong = cue(a.wrong);
  const right = cue(a.right);
  return (
    <div style={{position: 'absolute', top: 720, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40}}>
      <div style={{position: 'relative', fontSize: 52, fontWeight: 700, color: C.gray, opacity: progress(frame, wrong, 10)}}>
        {v.wrong}
        <div style={{position: 'absolute', left: -8, top: '54%', height: 7, background: C.red, width: `${progress(frame, wrong + 14, 10) * 106}%`}} />
      </div>
      <svg width={90} height={40} style={{opacity: progress(frame, right - 4, 8)}}>
        <line x1={0} y1={20} x2={70} y2={20} stroke={C.red} strokeWidth={4} />
        <path d="M 88 20 L 66 8 L 66 32 Z" fill={C.red} />
      </svg>
      <div
        style={{
          fontSize: 62,
          fontWeight: 900,
          color: C.red,
          opacity: progress(frame, right, 10),
          transform: `translateX(${(1 - progress(frame, right, 10)) * 30}px) scale(${keyZoom(frame, right)})`,
        }}
      >
        {v.right}
      </div>
    </div>
  );
};
