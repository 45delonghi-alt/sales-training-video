import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import type {SceneSpec, SensorPage} from '../types';
import {C} from '../theme';
import {Backdrop} from '../components/Backdrop';
import {useCue} from '../components/SceneShell';
import {appear, fadeOut, keyZoom, progress} from '../components/anim';
import {SensorStage} from '../components/SensorStage';

// 光電センサの基本：とは？ → 透過型 → 回帰反射型 → 透明体専用 → 反射型 → 距離設定型 → まとめ（最適を考えるのが営業）
// ページはナレーションに合わせて素早くスライドで切り替える
export const Scene07SensorBasics: React.FC<{spec: SceneSpec<'Scene07SensorBasics'>}> = ({spec}) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const {visual: v, animation: a} = spec;
  const starts = v.pages.map((p) => cue({at: p.start}));
  const summaryStart = cue(a.summaryRows[0]) - 4;
  const inSummary = frame >= summaryStart;

  return (
    <AbsoluteFill>
      <Backdrop tone="light" sceneNo={7} label="PHOTOELECTRIC SENSORS" />
      {/* 自社センサブランド */}
      <Img
        src={staticFile('consulting/images/fastus.png')}
        style={{position: 'absolute', right: 110, top: 96, width: 230, opacity: progress(frame, 0, 14)}}
      />
      {v.pages.map((page, i) => {
        const start = starts[i];
        const end = i + 1 < starts.length ? starts[i + 1] : summaryStart;
        // 表示中のページと、切り替わり直後の前ページ（短くフェードアウト）だけ描く
        if (frame < start - 2 || frame > end + 8) return null;
        const out = fadeOut(frame, end, 8);
        return (
          <AbsoluteFill key={page.start} style={{opacity: out}}>
            <Page page={page} frame={frame} start={start} action={page.action ? cue(page.action) : null} cue={cue} />
          </AbsoluteFill>
        );
      })}
      {inSummary ? <Summary spec={spec} frame={frame} start={summaryStart} /> : null}
    </AbsoluteFill>
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

const Page: React.FC<{
  page: SensorPage;
  frame: number;
  start: number;
  action: number | null;
  cue: ReturnType<typeof useCue>;
}> = ({page, frame, start, action, cue}) => {
  const resultP = action === null ? 0 : progress(frame, action + 10, 10);
  return (
    <>
      <Header tag={page.tag} title={page.title} frame={frame} start={start} />
      {/* 原理図 */}
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 200,
          width: 1080,
          height: 560,
          background: C.white,
          border: `2px solid ${C.line}`,
          borderTop: `6px solid ${C.ink}`,
          boxSizing: 'border-box',
          padding: '20px 30px 0',
          ...appear(frame, start + 2, {dx: 40, dy: 0, dur: 10}),
        }}
      >
        <div style={{height: 440}}>
          {page.diagram ? <SensorStage kind={page.diagram} frame={frame} start={start} action={action} /> : null}
        </div>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 4}}>
          {page.caption ? <div style={{fontSize: 24, color: C.gray, fontWeight: 500}}>{page.caption}</div> : null}
          {page.result ? (
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: C.white,
                background: C.red,
                padding: '4px 22px 6px',
                opacity: resultP,
                transform: `scale(${keyZoom(frame, (action ?? 0) + 10, 1.12)})`,
              }}
            >
              {page.result}
            </div>
          ) : null}
        </div>
      </div>
      {/* 特長・注意点 */}
      <div style={{position: 'absolute', left: 1230, top: 200, width: 590, display: 'flex', flexDirection: 'column', gap: 18}}>
        {(page.points ?? []).map((pt, i) => {
          const at = cue({at: pt.at}) + i * 6;
          const color = pt.tone === 'minus' ? C.red : pt.tone === 'plus' ? C.ink : C.gray;
          return (
            <div
              key={pt.text}
              style={{
                ...appear(frame, at, {dx: 30, dy: 0, dur: 10}),
                background: C.white,
                border: `2px solid ${pt.tone === 'minus' ? C.red : C.line}`,
                borderLeft: `8px solid ${color}`,
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <ToneIcon tone={pt.tone} />
              <div style={{fontSize: 30, fontWeight: 700, color: pt.tone === 'minus' ? C.redDeep : C.ink, lineHeight: 1.35}}>{pt.text}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const ToneIcon: React.FC<{tone: 'plus' | 'minus' | 'info'}> = ({tone}) => (
  <svg width={38} height={38} viewBox="0 0 24 24" style={{flex: 'none'}}>
    {tone === 'plus' ? (
      <>
        <circle cx={12} cy={12} r={11} fill={C.ink} />
        <path d="M6.5 12.5 L10.5 16 L17.5 8" fill="none" stroke={C.white} strokeWidth={2.6} />
      </>
    ) : tone === 'minus' ? (
      <>
        <path d="M12 1.5 L23 21.5 L1 21.5 Z" fill={C.red} />
        <path d="M12 8 L12 14.5" stroke={C.white} strokeWidth={2.6} />
        <circle cx={12} cy={18} r={1.5} fill={C.white} />
      </>
    ) : (
      <>
        <circle cx={12} cy={12} r={11} fill={C.grayLight} />
        <path d="M12 10.5 L12 17.5" stroke={C.white} strokeWidth={2.6} />
        <circle cx={12} cy={6.8} r={1.6} fill={C.white} />
      </>
    )}
  </svg>
);

const Summary: React.FC<{spec: SceneSpec<'Scene07SensorBasics'>; frame: number; start: number}> = ({spec, frame, start}) => {
  const cue = useCue();
  const {visual: v, animation: a} = spec;
  const rows = a.summaryRows.map(cue);
  const wrong = cue(a.wrong);
  const right = cue(a.right);
  const COLS = '400px 1fr 500px';
  return (
    <>
      <Header title="まとめ：どれを選ぶ？" frame={frame} start={start} />
      <div style={{position: 'absolute', left: 110, top: 200, width: 1700, ...appear(frame, start + 2, {dy: 20, dur: 10})}}>
        <div style={{display: 'grid', gridTemplateColumns: COLS, background: C.ink, color: C.white, fontSize: 24, fontWeight: 700, padding: '12px 24px'}}>
          <div>方式</div>
          <div>こんなときに</div>
          <div>注意点</div>
        </div>
        {v.summary.map((r, i) => (
          <div
            key={r.method}
            style={{
              display: 'grid',
              gridTemplateColumns: COLS,
              alignItems: 'center',
              background: C.white,
              borderBottom: `2px solid ${C.line}`,
              padding: '14px 24px',
              fontSize: 28,
              ...appear(frame, rows[i], {dx: 30, dy: 0, dur: 10}),
            }}
          >
            <div style={{fontWeight: 900, color: C.ink, paddingLeft: r.sub ? 28 : 0}}>
              {r.sub ? <span style={{color: C.red, marginRight: 8}}>└</span> : null}
              {r.method}
            </div>
            <div style={{fontWeight: 700, color: C.ink}}>{r.when}</div>
            <div style={{fontSize: 23, color: C.gray}}>{r.note}</div>
          </div>
        ))}
      </div>
      {/* どれが高性能か → 今回のお客様に、どれが最適か */}
      <div style={{position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40}}>
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
    </>
  );
};
