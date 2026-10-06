import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {SceneSpec} from '../types';
import {C} from '../theme';
import {Backdrop} from '../components/Backdrop';
import {useCue} from '../components/SceneShell';
import {appear, keyZoom, progress} from '../components/anim';
import {Highlight} from './Scene04Question';

// 左「センサを売る」／右「お客様が実現したいことを考える」→ ドリルと穴
export const Scene05CustomerGoal: React.FC<{spec: SceneSpec<'Scene05CustomerGoal'>}> = ({spec}) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const {visual: v, animation: a} = spec;
  const left = cue(a.left);
  const leftDown = cue(a.leftDown);
  const right = cue(a.right);
  const quote = cue(a.quote);
  const downP = progress(frame, leftDown, 16);
  const quoteP = progress(frame, quote, 18);
  // 格言が出たら比較パネルを上に詰める
  const shift = quoteP * -40;

  return (
    <AbsoluteFill>
      <Backdrop tone="light" sceneNo={5} />

      {/* 左：センサを売る */}
      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 190 + shift,
          width: 640,
          height: 360,
          ...appear(frame, left, {dx: -40, dy: 0}),
          opacity: progress(frame, left, 14) * interpolate(downP, [0, 1], [1, 0.45]),
          background: C.white,
          border: `2px solid ${C.line}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        <div style={{fontSize: 22, letterSpacing: 6, fontWeight: 700, color: C.gray}}>PRODUCT OUT</div>
        <div style={{position: 'relative', fontSize: 72, fontWeight: 900, color: C.ink}}>
          {v.left}
          <div style={{position: 'absolute', left: -10, top: '54%', height: 8, background: C.red, width: `${downP * 106}%`}} />
        </div>
      </div>

      {/* → */}
      <svg width={160} height={60} style={{position: 'absolute', left: 820, top: 340 + shift, opacity: progress(frame, right - 6, 12)}}>
        <line x1={0} y1={30} x2={130} y2={30} stroke={C.red} strokeWidth={5} />
        <path d="M 156 30 L 126 14 L 126 46 Z" fill={C.red} />
      </svg>

      {/* 右：お客様が実現したいことを考える */}
      <div
        style={{
          position: 'absolute',
          left: 1010,
          top: 170 + shift,
          width: 760,
          height: 400,
          ...appear(frame, right, {dx: 40, dy: 0}),
          background: C.red,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          boxShadow: '0 30px 60px rgba(230,0,18,0.25)',
        }}
      >
        <div style={{fontSize: 22, letterSpacing: 6, fontWeight: 700, color: 'rgba(255,255,255,0.8)'}}>CUSTOMER GOAL</div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 900,
            color: C.white,
            textAlign: 'center',
            whiteSpace: 'pre-line',
            lineHeight: 1.3,
            transform: `scale(${keyZoom(frame, right, 1.06)})`,
          }}
        >
          {v.right}
        </div>
      </div>

      {/* 格言 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 600,
          display: 'flex',
          justifyContent: 'center',
          ...appear(frame, quote, {dy: 30, dur: 18}),
        }}
      >
        <div style={{position: 'relative', padding: '28px 80px 24px', borderTop: `2px solid ${C.ink}`, borderBottom: `2px solid ${C.ink}`}}>
          <div style={{position: 'absolute', left: 6, top: -30, fontSize: 120, fontWeight: 900, color: C.red, lineHeight: 1}}>“</div>
          <div style={{fontSize: 52, fontWeight: 700, color: C.ink, lineHeight: 1.55, whiteSpace: 'pre-line', textAlign: 'center'}}>
            <Highlight text={v.quote} word="「穴」" />
          </div>
          <div style={{fontSize: 24, color: C.gray, textAlign: 'right', marginTop: 10}}>― {v.quoteSource}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
