// 工場ライン LINE 03 の各カット
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {X} from '../theme';
import {DEPTH, FactoryLine, bottlesAt, passTimes, project, type Flow, type View} from '../FactoryLine';
import {Worker} from '../Person';
import {progress} from '../../../consulting/components/anim';

const BASE_COUNT = 1265;

const smooth = (t: number, a: number, b: number) => {
  const p = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return p * p * (3 - 2 * p);
};

type Cfg = {
  view: View;
  length: number;
  sensorX: number;
  flow: Flow;
  range: [number, number];
  // 二重カウントになるボトル（通過した瞬間にカウントが余分に1増える）
  extraBottles?: number[];
  hud?: 'count' | 'speed' | null;
  slowFrom?: number;
};

const SPEED = 240; // px/秒
const SPACING = 230;
const lin = (t: number, i: number, x0 = 200) => x0 + SPEED * t - i * SPACING;

// スロー区間を含む時間の流れ
const warp = (t: number, from?: number, k = 0.4) => (from === undefined || t < from ? t : from + (t - from) * k);

const CONFIG = (variant: string): Cfg => {
  const view: View = {ox: 150, oy: 780, s: 1};
  switch (variant) {
    case 'miscount':
      return {view, length: 1500, sensorX: 760, flow: (t, i) => ({x: lin(t, i), z: 86}), range: [-1, 14], extraBottles: [3], hud: 'count'};
    case 'disturbed': {
      const from = 4.5;
      return {
        view,
        length: 1500,
        sensorX: 760,
        range: [-1, 14],
        slowFrom: from,
        extraBottles: [5],
        hud: 'count',
        flow: (t, i) => {
          const tt = warp(t, from);
          const d = smooth(tt, from - 1.2, from + 0.6);
          const bunch = i % 3 === 2 ? 120 * d : i % 3 === 1 ? 40 * d : 0;
          return {x: lin(tt, i) + bunch, z: 86 + (i % 2 ? 18 : -14) * d, tilt: Math.sin(tt * 9 + i) * 7 * d};
        },
      };
    }
    case 'wobble':
      return {
        view: {ox: -700, oy: 1060, s: 1.9},
        length: 1500,
        sensorX: 760,
        range: [-2, 10],
        flow: (t, i) => {
          const tt = t * 0.45;
          const bunch = i % 3 === 2 ? 110 : i % 3 === 1 ? 36 : 0;
          return {x: lin(tt, i, 380) + bunch, z: 86 + (i % 2 ? 16 : -12), tilt: Math.sin(t * 3.4 + i * 1.7) * 7};
        },
      };
    case 'overview-speed':
      return {view: {ox: 70, oy: 760, s: 0.6}, length: 2700, sensorX: 1300, flow: (t, i) => ({x: lin(t, i, 300), z: 86}), range: [-1, 20], hud: 'speed'};
    case 'overview':
      return {view: {ox: 110, oy: 800, s: 0.8}, length: 2000, sensorX: 1000, flow: (t, i) => ({x: lin(t * 0.8, i), z: 86}), range: [-1, 16]};
    case 'stopped-recount':
      return {
        view,
        length: 1500,
        sensorX: 760,
        range: [-1, 14],
        hud: null,
        // 2.5秒で減速して3.5秒で停止
        flow: (t, i) => {
          const tt = t < 2.5 ? t : t < 3.5 ? 2.5 + (t - 2.5) * (1 - (t - 2.5) / 2) : 3.0;
          return {x: lin(tt, i), z: 86};
        },
      };
    case 'manual-check':
    default:
      return {view: {ox: 330, oy: 780, s: 1}, length: 1400, sensorX: 760, flow: (t, i) => ({x: lin(t, i), z: 86}), range: [-1, 14], hud: null};
  }
};

export const FactoryScene: React.FC<{variant: string}> = ({variant}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cfg = CONFIG(variant);
  const bottles = bottlesAt(cfg.flow, t, cfg.range, cfg.sensorX);
  const passes = passTimes(cfg.flow, t, cfg.range, cfg.sensorX, fps).filter((p) => p.t <= t);
  const lastPass = passes.length ? passes[passes.length - 1].t : -9;
  const errors = passes.filter((p) => cfg.extraBottles?.includes(p.i));
  const lastError = errors.length ? errors[errors.length - 1].t : -9;
  const hit = bottles.some((b) => b.state === 'hit');
  // 誤カウントの瞬間は、そのボトルを赤く
  const shown = bottles.map((b) => (cfg.extraBottles?.includes(b.key) && b.state === 'hit' && t - lastError < 0.8 ? {...b, state: 'error' as const} : b));
  const slow = cfg.slowFrom !== undefined && t >= cfg.slowFrom;
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {variant === 'manual-check' ? <ManualWorker t={t} /> : null}
        <FactoryLine
          v={cfg.view}
          length={cfg.length}
          sensorX={cfg.sensorX}
          bottles={shown}
          frame={frame}
          speed={variant === 'stopped-recount' && t > 3.5 ? 0 : slow || variant === 'wobble' ? 2.4 : 6}
          beam={hit ? 'hit' : 'on'}
          labels={variant === 'overview' || variant === 'wobble'}
        />
        {t - lastError < 0.9 ? <ErrorFlash v={cfg.view} x={cfg.sensorX} since={t - lastError} /> : null}
        {variant === 'wobble' ? <FocusRing v={cfg.view} x={cfg.sensorX} frame={frame} /> : null}
        {variant === 'stopped-recount' ? <Recount t={t} v={cfg.view} bottles={shown.map((b) => b.x)} /> : null}
      </svg>
      {cfg.hud === 'count' ? <CountHud actual={BASE_COUNT + passes.length} count={BASE_COUNT + passes.length + errors.length} errorPulse={t - lastError} passPulse={t - lastPass} frame={frame} /> : null}
      {cfg.hud === 'speed' ? <SpeedHud t={t} /> : null}
      {variant === 'manual-check' ? <ClickCounter n={passes.length} pulse={t - lastPass} /> : null}
      {slow || variant === 'wobble' ? <Tag text="スローモーション" frame={frame} start={Math.round((cfg.slowFrom ?? 0) * fps)} /> : null}
      {variant === 'stopped-recount' && t > 3.2 ? <StopLamp frame={frame} /> : null}
    </AbsoluteFill>
  );
};

const ErrorFlash: React.FC<{v: View; x: number; since: number}> = ({v, x, since}) => {
  const [cx, cy] = project(v, x, 120, DEPTH / 2);
  const o = interpolate(since, [0, 0.1, 0.6, 0.9], [0, 1, 1, 0]);
  return (
    <g opacity={o}>
      <circle cx={cx} cy={cy} r={(70 + since * 80) * v.s} fill="none" stroke="#FF2A36" strokeWidth={3} />
      <text x={cx - 120 * v.s} y={cy - 150 * v.s - since * 40} fill="#FF2A36" fontSize={48} fontWeight={900} textAnchor="end">
        +1
      </text>
    </g>
  );
};

const FocusRing: React.FC<{v: View; x: number; frame: number}> = ({v, x, frame}) => {
  const [cx, cy] = project(v, x, 120, DEPTH / 2);
  const p = progress(frame, 20, 20);
  return (
    <g opacity={p}>
      <rect x={cx - 230} y={cy - 260} width={460} height={420} fill="none" stroke={X.redOnDark} strokeWidth={3} strokeDasharray="18 12" />
      <text x={cx - 220} y={cy - 280} fill={X.redOnDark} fontSize={28} fontWeight={700}>
        センサ付近：ボトルが寄り、揺れる
      </text>
    </g>
  );
};

const Recount: React.FC<{t: number; v: View; bottles: number[]}> = ({t, v, bottles}) => {
  if (t < 3.6) return null;
  const visible = bottles.filter((x) => x > 40 && x < 1450).sort((a, b) => b - a);
  const k = Math.min(visible.length, Math.floor((t - 4.2) / 0.55) + 1);
  const [wx, wy] = project(v, 300, -150, -150);
  return (
    <g>
      <g transform={`translate(${wx}, ${wy})`} opacity={progress(t * 30, 3.6 * 30, 14)}>
        <Worker pose="bend" />
      </g>
      <g transform={`translate(${wx + 260}, ${wy + 10})`} opacity={progress(t * 30, 4.0 * 30, 14)}>
        <Worker pose="count" t={t} />
      </g>
      {visible.slice(0, Math.max(0, k)).map((x, idx) => {
        const [bx, by] = project(v, x, 260, 86);
        return (
          <text key={idx} x={bx} y={by} fill={X.redOnDark} fontSize={34} fontWeight={900} textAnchor="middle">
            {idx + 1}
          </text>
        );
      })}
    </g>
  );
};

const ManualWorker: React.FC<{t: number}> = ({t}) => (
  <g>
    <g transform="translate(200, 1010)">
      <Worker pose="count" t={t} />
    </g>
    <line x1={232} y1={742} x2={1060} y2={600} stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeDasharray="8 10" />
  </g>
);

const ClickCounter: React.FC<{n: number; pulse: number}> = ({n, pulse}) => (
  <div style={{position: 'absolute', left: 120, top: 200, color: X.white}}>
    <div style={{fontSize: 22, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: 2}}>目視で数えた本数</div>
    <div style={{fontSize: 96, fontWeight: 900, fontVariantNumeric: 'tabular-nums', transform: `scale(${pulse < 0.25 ? 1.08 : 1})`, transformOrigin: 'left center'}}>{n}</div>
    <div style={{fontSize: 22, color: 'rgba(255,255,255,0.65)'}}>ラインの横に立ち、ずっと数え続ける</div>
  </div>
);

const fmt = (n: number) => n.toLocaleString('en-US');

export const CountHud: React.FC<{actual: number; count: number; errorPulse: number; passPulse: number; frame: number}> = ({actual, count, errorPulse, passPulse, frame}) => {
  const err = count !== actual;
  const pulse = (s: number, k: number) => (s < 0 ? 1 : interpolate(s, [0, 0.33], [k, 1], {extrapolateRight: 'clamp'}));
  return (
    <div
      style={{
        position: 'absolute',
        right: 72,
        top: 150,
        width: 440,
        background: 'rgba(16,17,19,0.82)',
        border: `2px solid ${err ? X.redOnDark : 'rgba(255,255,255,0.3)'}`,
        padding: '18px 26px 22px',
        color: X.white,
        fontVariantNumeric: 'tabular-nums',
        opacity: progress(frame, 6, 14),
      }}
    >
      <div style={{fontSize: 17, letterSpacing: 3, color: 'rgba(255,255,255,0.6)', fontWeight: 700}}>LINE 03 ｜ PET BOTTLE COUNT</div>
      <Row label="実際の本数" value={fmt(actual)} scale={pulse(passPulse, 1.1)} />
      <Row label="センサのカウント" value={fmt(count)} color={err ? X.redOnDark : X.white} scale={Math.max(pulse(passPulse, 1.1), pulse(errorPulse, 1.3))} />
      <div
        style={{
          marginTop: 12,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: err ? X.red : 'rgba(255,255,255,0.08)',
          padding: '0 16px',
        }}
      >
        <span style={{fontSize: 22, fontWeight: 700}}>{err ? '⚠ 誤カウント発生' : 'STATUS　NORMAL'}</span>
        <span style={{fontSize: 26, fontWeight: 900}}>{err ? `+${count - actual}` : '±0'}</span>
      </div>
    </div>
  );
};

const Row: React.FC<{label: string; value: string; color?: string; scale?: number}> = ({label, value, color = X.white, scale = 1}) => (
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12}}>
    <span style={{fontSize: 24, color: 'rgba(255,255,255,0.75)'}}>{label}</span>
    <span style={{fontSize: 46, fontWeight: 900, color, display: 'inline-block', transform: `scale(${scale})`, transformOrigin: 'right center'}}>{value}</span>
  </div>
);

const SpeedHud: React.FC<{t: number}> = ({t}) => {
  const needle = -30 + Math.sin(t * 2) * 1.5; // ほぼ一定
  const plan = Math.min(1, 0.55 + t * 0.012);
  return (
    <div style={{position: 'absolute', right: 72, top: 150, width: 460, background: 'rgba(16,17,19,0.82)', border: '2px solid rgba(255,255,255,0.3)', padding: '18px 26px 24px', color: X.white}}>
      <div style={{fontSize: 17, letterSpacing: 3, color: 'rgba(255,255,255,0.6)', fontWeight: 700}}>LINE 03 ｜ SPEED / PLAN</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 10}}>
        <svg width={160} height={100}>
          <path d="M 10 92 A 70 70 0 0 1 150 92" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={6} />
          <path d="M 116 36 A 70 70 0 0 1 150 92" fill="none" stroke={X.redOnDark} strokeWidth={6} />
          <line x1={80} y1={92} x2={80 + 62 * Math.cos(((needle - 90) * Math.PI) / 180)} y2={92 + 62 * Math.sin(((needle - 90) * Math.PI) / 180)} stroke={X.white} strokeWidth={4} />
        </svg>
        <div>
          <div style={{fontSize: 22, color: 'rgba(255,255,255,0.7)'}}>ライン速度</div>
          <div style={{fontSize: 34, fontWeight: 900}}>計画どおり</div>
        </div>
      </div>
      <div style={{fontSize: 22, color: 'rgba(255,255,255,0.7)', marginTop: 14}}>本日の生産計画</div>
      <div style={{height: 18, background: 'rgba(255,255,255,0.12)', marginTop: 8}}>
        <div style={{height: '100%', width: `${plan * 100}%`, background: X.white}} />
      </div>
      <div style={{fontSize: 18, color: 'rgba(255,255,255,0.55)', marginTop: 8}}>速度を落とすと、計画に届かない</div>
    </div>
  );
};

const Tag: React.FC<{text: string; frame: number; start: number}> = ({text, frame, start}) => (
  <div style={{position: 'absolute', left: 72, top: 150, fontSize: 24, fontWeight: 700, color: X.white, background: X.red, padding: '4px 14px 6px', opacity: progress(frame, start, 10)}}>{text}</div>
);

const StopLamp: React.FC<{frame: number}> = ({frame}) => (
  <div style={{position: 'absolute', right: 72, top: 150, display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(16,17,19,0.82)', border: `2px solid ${X.redOnDark}`, padding: '14px 24px'}}>
    <div style={{width: 34, height: 34, borderRadius: 17, background: X.redOnDark, opacity: Math.sin(frame / 4) > 0 ? 1 : 0.35, boxShadow: `0 0 24px ${X.redOnDark}`}} />
    <div style={{color: X.white, fontSize: 30, fontWeight: 900, letterSpacing: 2}}>LINE STOP</div>
    <div style={{color: 'rgba(255,255,255,0.7)', fontSize: 22}}>数量確認中</div>
  </div>
);
