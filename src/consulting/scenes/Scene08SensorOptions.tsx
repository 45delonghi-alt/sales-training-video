import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneSpec} from '../types';
import {C} from '../theme';
import {Backdrop} from '../components/Backdrop';
import {useCue} from '../components/SceneShell';
import {appear, keyZoom, progress} from '../components/anim';
import {SensorDiagram} from '../components/SensorDiagram';

// 検出方式のカード → 「どれが高性能か」ではなく「今回のお客様に、どれが最適か」
export const Scene08SensorOptions: React.FC<{spec: SceneSpec<'Scene08SensorOptions'>}> = ({spec}) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const {visual: v, animation: a} = spec;
  const cards = cue(a.cards);
  const wrong = cue(a.wrong);
  const right = cue(a.right);

  const CARD_W = 322;
  const GAP = 22;
  const left0 = (1920 - (CARD_W * 5 + GAP * 4)) / 2;

  return (
    <AbsoluteFill>
      <Backdrop tone="light" sceneNo={8} />

      <div style={{position: 'absolute', left: left0, top: 118, display: 'flex', alignItems: 'baseline', gap: 24, ...appear(frame, 0)}}>
        <div style={{fontSize: 50, fontWeight: 900, color: C.ink}}>{v.heading}</div>
        <div style={{fontSize: 20, fontWeight: 700, letterSpacing: 4, color: C.gray}}>PHOTOELECTRIC SENSORS</div>
      </div>

      {v.sensors.map((s, i) => (
        <div
          key={s.kind}
          style={{
            position: 'absolute',
            top: 200,
            left: left0 + i * (CARD_W + GAP),
            width: CARD_W,
            height: 420,
            ...appear(frame, cards + i * 8, {dy: 34}),
            background: C.white,
            border: `2px solid ${C.line}`,
            borderTop: `6px solid ${C.ink}`,
            boxSizing: 'border-box',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{height: 150}}>
            <SensorDiagram kind={s.kind} />
          </div>
          <div style={{marginTop: 26, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap'}}>
            <div style={{fontSize: 38, fontWeight: 900, color: C.ink}}>{s.name}</div>
          </div>
          <div style={{height: 36, marginTop: 6}}>
            {s.sub ? (
              <span style={{fontSize: 22, fontWeight: 700, color: C.white, background: C.red, padding: '3px 12px'}}>{s.sub}</span>
            ) : null}
          </div>
          <div style={{fontSize: 23, color: C.gray, lineHeight: 1.55, whiteSpace: 'pre-line', marginTop: 10}}>{s.desc}</div>
        </div>
      ))}

      {/* どれが高性能か → 今回のお客様に、どれが最適か */}
      <div style={{position: 'absolute', top: 680, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40}}>
        <div style={{position: 'relative', fontSize: 52, fontWeight: 700, color: C.gray, opacity: progress(frame, wrong, 12)}}>
          {v.wrong}
          <div style={{position: 'absolute', left: -8, top: '54%', height: 7, background: C.red, width: `${progress(frame, wrong + 18, 12) * 106}%`}} />
        </div>
        <svg width={90} height={40} style={{opacity: progress(frame, right - 4, 10)}}>
          <line x1={0} y1={20} x2={70} y2={20} stroke={C.red} strokeWidth={4} />
          <path d="M 88 20 L 66 8 L 66 32 Z" fill={C.red} />
        </svg>
        <div
          style={{
            fontSize: 62,
            fontWeight: 900,
            color: C.red,
            ...appear(frame, right, {dx: 30, dy: 0}),
            transform: `translateX(${(1 - progress(frame, right)) * 30}px) scale(${keyZoom(frame, right)})`,
          }}
        >
          {v.right}
        </div>
      </div>
    </AbsoluteFill>
  );
};
