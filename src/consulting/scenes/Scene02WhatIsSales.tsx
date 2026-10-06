import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {SceneSpec} from '../types';
import {C} from '../theme';
import {Backdrop} from '../components/Backdrop';
import {useCue} from '../components/SceneShell';
import {appear, keyZoom, progress} from '../components/anim';

// 「売る」→ 聞く／考える／課題を見つける／提案する
export const Scene02WhatIsSales: React.FC<{spec: SceneSpec<'Scene02WhatIsSales'>}> = ({spec}) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const {visual: v, animation: a} = spec;
  const strike = cue(a.strike);
  const steps = a.steps.map(cue);
  const conclusion = cue(a.conclusion);

  // 「売る」は打ち消し線のあと左へ退く
  const moveP = progress(frame, strike + 22, 22);
  const uruX = interpolate(moveP, [0, 1], [960, 380]);
  const uruScale = interpolate(moveP, [0, 1], [1, 0.62]);
  const active = steps.filter((s) => frame >= s).length - 1;

  const ROW_H = 104;
  const GAP = 38;
  const TOP = 150;

  return (
    <AbsoluteFill>
      <Backdrop tone="light" sceneNo={2} />

      {/* 売る */}
      <div
        style={{
          position: 'absolute',
          left: uruX,
          top: 400,
          transform: `translate(-50%, -50%) scale(${uruScale})`,
          opacity: progress(frame, 0, 10) * interpolate(moveP, [0, 1], [1, 0.5]),
          textAlign: 'center',
        }}
      >
        <div style={{fontSize: 30, letterSpacing: 8, color: C.gray, fontWeight: 700, opacity: moveP}}>BEFORE</div>
        <div style={{position: 'relative', fontSize: 280, fontWeight: 900, color: C.ink, lineHeight: 1.1}}>
          {v.from}
          <div
            style={{
              position: 'absolute',
              left: -20,
              top: '52%',
              height: 16,
              background: C.red,
              width: `${progress(frame, strike, 12) * 110}%`,
            }}
          />
        </div>
      </div>

      {/* → */}
      <svg
        width={140}
        height={40}
        style={{position: 'absolute', left: 620, top: 380, opacity: progress(frame, steps[0] - 6, 12)}}
      >
        <line x1={0} y1={20} x2={120} y2={20} stroke={C.red} strokeWidth={4} />
        <path d="M 138 20 L 116 8 L 116 32 Z" fill={C.red} />
      </svg>

      {/* 聞く → 考える → 課題を見つける → 提案する */}
      {v.steps.map((s, i) => {
        const start = steps[i];
        const y = TOP + i * (ROW_H + GAP);
        const isActive = i === active;
        return (
          <React.Fragment key={s.label}>
            {i > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  left: 860,
                  top: y - GAP + 4,
                  width: 4,
                  height: (GAP - 8) * progress(frame, start - 4, 8),
                  background: C.red,
                }}
              />
            ) : null}
            <div
              style={{
                position: 'absolute',
                left: 800,
                top: y,
                width: 900,
                height: ROW_H,
                ...appear(frame, start, {dx: 40, dy: 0}),
                background: isActive ? C.ink : C.white,
                border: `2px solid ${isActive ? C.ink : C.line}`,
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                paddingLeft: 30,
              }}
            >
              <div style={{fontSize: 28, fontWeight: 900, color: C.red, width: 44}}>{String(i + 1).padStart(2, '0')}</div>
              <div
                style={{
                  fontSize: 54,
                  fontWeight: 900,
                  color: isActive ? C.white : C.ink,
                  transform: `scale(${isActive ? keyZoom(frame, start) : 1})`,
                  transformOrigin: 'left center',
                }}
              >
                {s.label}
              </div>
              {s.note ? (
                <div style={{fontSize: 30, fontWeight: 500, color: isActive ? C.grayLight : C.gray}}>（{s.note}）</div>
              ) : null}
            </div>
          </React.Fragment>
        );
      })}

      {/* = コンサルティング営業 */}
      <div
        style={{
          position: 'absolute',
          left: 800,
          top: TOP + 4 * (ROW_H + GAP) + 6,
          width: 900,
          ...appear(frame, conclusion, {dy: 20}),
          display: 'flex',
          alignItems: 'center',
          gap: 22,
        }}
      >
        <div style={{fontSize: 56, fontWeight: 900, color: C.red}}>＝</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: C.white,
            background: C.red,
            padding: '6px 30px 10px',
            transform: `scale(${keyZoom(frame, conclusion)})`,
            transformOrigin: 'left center',
          }}
        >
          {v.conclusion}
        </div>
      </div>
    </AbsoluteFill>
  );
};
