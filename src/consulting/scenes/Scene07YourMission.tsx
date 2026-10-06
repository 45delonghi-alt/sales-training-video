import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneSpec} from '../types';
import {C} from '../theme';
import {Backdrop, RedSlash} from '../components/Backdrop';
import {useCue} from '../components/SceneShell';
import {appear, keyZoom, progress} from '../components/anim';

// YOUR MISSION：1 聞く／2 考える／3 課題を見つける／4 提案する ＋ 最初の10分はヒアリング
export const Scene07YourMission: React.FC<{spec: SceneSpec<'Scene07YourMission'>}> = ({spec}) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const {visual: v, animation: a} = spec;
  const negation = cue(a.negation);
  const steps = a.steps.map(cue);
  const first = cue(a.firstStep);
  const active = steps.filter((s) => frame >= s).length - 1;

  const CARD_W = 384;
  const GAP = 24;
  const left0 = (1920 - (CARD_W * 4 + GAP * 3)) / 2;

  return (
    <AbsoluteFill>
      <Backdrop
        tone="dark"
        sceneNo={7}
        decor={<RedSlash progress={progress(frame, 0, 20)} left={1400} width={100} opacity={0.85} />}
      />

      <div style={{position: 'absolute', left: left0, top: 120}}>
        <div style={{fontSize: 112, fontWeight: 900, letterSpacing: 12, color: C.red, lineHeight: 1, ...appear(frame, 2, {dx: -50, dy: 0, dur: 18})}}>
          {v.label}
        </div>
        {/* センサを当てるゲームではない */}
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            marginTop: 26,
            fontSize: 40,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.6)',
            opacity: progress(frame, negation, 12),
          }}
        >
          {v.negation}
          <div style={{position: 'absolute', left: -8, top: '54%', height: 5, background: C.red, width: `${progress(frame, negation + 14, 12) * 104}%`}} />
        </div>
      </div>

      {v.steps.map((s, i) => {
        const isActive = i === active;
        return (
          <div
            key={s.label}
            style={{
              position: 'absolute',
              top: 380,
              left: left0 + i * (CARD_W + GAP),
              width: CARD_W,
              height: 270,
              ...appear(frame, steps[i], {dy: 30}),
              background: isActive ? C.red : 'rgba(255,255,255,0.06)',
              border: `2px solid ${isActive ? C.red : 'rgba(255,255,255,0.28)'}`,
              padding: '26px 30px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{fontSize: 64, fontWeight: 900, color: isActive ? C.white : C.red, lineHeight: 1}}>{i + 1}</div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 900,
                color: C.white,
                marginTop: 18,
                whiteSpace: 'nowrap',
                transform: `scale(${isActive ? keyZoom(frame, steps[i]) : 1})`,
                transformOrigin: 'left center',
              }}
            >
              {s.label}
            </div>
            <div style={{fontSize: 24, fontWeight: 500, color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.6)', marginTop: 14, lineHeight: 1.45}}>
              {s.note}
            </div>
          </div>
        );
      })}

      {/* 最初の10分 */}
      <div
        style={{
          position: 'absolute',
          top: 700,
          left: left0,
          width: CARD_W * 4 + GAP * 3,
          height: 110,
          ...appear(frame, first, {dy: 24}),
          background: C.white,
          display: 'flex',
          alignItems: 'center',
          gap: 30,
          paddingLeft: 30,
          boxSizing: 'border-box',
        }}
      >
        <Timer p={progress(frame, first + 6, 40)} />
        <div style={{fontSize: 26, fontWeight: 900, letterSpacing: 4, color: C.white, background: C.red, padding: '6px 16px'}}>
          {v.firstStep.badge}
        </div>
        <div style={{fontSize: 50, fontWeight: 900, color: C.ink, transform: `scale(${keyZoom(frame, first, 1.05)})`, transformOrigin: 'left center'}}>
          {v.firstStep.text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Timer: React.FC<{p: number}> = ({p}) => {
  const r = 26;
  const len = 2 * Math.PI * r;
  return (
    <svg width={68} height={68} viewBox="0 0 68 68">
      <circle cx={34} cy={36} r={r} fill="none" stroke={C.line} strokeWidth={6} />
      <circle
        cx={34}
        cy={36}
        r={r}
        fill="none"
        stroke={C.red}
        strokeWidth={6}
        strokeDasharray={`${len * p} ${len}`}
        transform="rotate(-90 34 36)"
      />
      <rect x={28} y={0} width={12} height={6} fill={C.ink} />
    </svg>
  );
};
