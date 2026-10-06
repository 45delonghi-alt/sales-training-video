import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {SceneSpec} from '../types';
import {C} from '../theme';
import {Backdrop, RedSlash} from '../components/Backdrop';
import {useCue} from '../components/SceneShell';
import {appear, fadeOut, progress} from '../components/anim';
import {Conveyor, conveyorCounts} from '../components/Conveyor';

// MISSION カード → 飲料工場のライン。センサが時々二重カウントしてしまう
export const Scene03Mission: React.FC<{spec: SceneSpec<'Scene03Mission'>}> = ({spec}) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const {visual: v, animation: a} = spec;
  const toFactory = cue(a.toFactory);
  const sensor = cue(a.showSensor);
  const error = cue(a.showError);

  return (
    <AbsoluteFill>
      <Backdrop tone="dark" sceneNo={3} />

      {/* ライン */}
      <AbsoluteFill style={{opacity: progress(frame, toFactory, 20)}}>
        <Conveyor frame={frame} sensorStart={sensor} errorStart={error} />
        <MissionHeader label={v.label} title={v.title} />
        <CountHud frame={frame} start={sensor} error={error} hud={v.hud} />
      </AbsoluteFill>

      {/* MISSION カード */}
      <AbsoluteFill style={{opacity: fadeOut(frame, toFactory - 6, 14)}}>
        <AbsoluteFill style={{background: C.dark}} />
        <RedSlash progress={progress(frame, 0, 20)} left={1380} width={260} opacity={0.95} />
        <RedSlash progress={progress(frame, 4, 20)} left={1690} width={80} opacity={0.6} />
        <div style={{position: 'absolute', left: 160, top: 300}}>
          <div
            style={{
              fontSize: 210,
              fontWeight: 900,
              letterSpacing: 24,
              color: C.red,
              lineHeight: 1,
              ...appear(frame, 2, {dx: -60, dy: 0, dur: 18}),
            }}
          >
            {v.label}
          </div>
          <div style={{height: 4, background: C.white, width: 1100 * progress(frame, 10, 20), margin: '34px 0 30px'}} />
          <div style={{fontSize: 76, fontWeight: 900, color: C.white, ...appear(frame, 16, {dy: 20})}}>{v.title}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const MissionHeader: React.FC<{label: string; title: string}> = ({label, title}) => (
  <div style={{position: 'absolute', left: 72, top: 110, display: 'flex', alignItems: 'center', gap: 24}}>
    <div style={{fontSize: 30, fontWeight: 900, letterSpacing: 6, color: C.white, background: C.red, padding: '4px 18px 6px'}}>
      {label}
    </div>
    <div style={{fontSize: 36, fontWeight: 700, color: C.white}}>{title}</div>
  </div>
);

const fmt = (n: number) => n.toLocaleString('en-US');

export const CountHud: React.FC<{
  frame: number;
  start: number;
  error: number;
  hud: SceneSpec<'Scene03Mission'>['visual']['hud'];
}> = ({frame, start, error, hud}) => {
  const {actual, count, extra} = conveyorCounts(frame, error);
  const errOn = frame >= error && extra > 0;
  const blink = errOn ? interpolate(Math.sin(frame / 4), [-1, 1], [0.55, 1]) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        right: 72,
        top: 170,
        width: 430,
        ...appear(frame, start + 6, {dx: 30, dy: 0}),
        background: 'rgba(13,14,16,0.78)',
        border: `2px solid ${errOn ? C.redOnDark : 'rgba(255,255,255,0.3)'}`,
        padding: '20px 28px 24px',
        color: C.white,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <div style={{fontSize: 17, letterSpacing: 3, color: 'rgba(255,255,255,0.6)', fontWeight: 700}}>{hud.line}</div>
      <Row label={hud.actualLabel} value={fmt(actual)} />
      <Row label={hud.countLabel} value={fmt(count)} color={errOn ? C.redOnDark : C.white} />
      <div
        style={{
          marginTop: 14,
          height: 46,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: errOn ? C.red : 'rgba(255,255,255,0.08)',
          padding: '0 16px',
          opacity: errOn ? blink : 1,
        }}
      >
        <span style={{fontSize: 22, fontWeight: 700}}>{errOn ? `⚠ ${hud.alert}` : 'STATUS　NORMAL'}</span>
        <span style={{fontSize: 26, fontWeight: 900}}>{errOn ? `+${extra}` : '±0'}</span>
      </div>
    </div>
  );
};

const Row: React.FC<{label: string; value: string; color?: string}> = ({label, value, color = C.white}) => (
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14}}>
    <span style={{fontSize: 24, color: 'rgba(255,255,255,0.75)', fontWeight: 500}}>{label}</span>
    <span style={{fontSize: 48, fontWeight: 900, color}}>{value}</span>
  </div>
);
