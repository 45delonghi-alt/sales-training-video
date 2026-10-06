// 飲料工場のコンベアライン（線画のセンサUI）。透明ペットボトルが流れ、上から光電センサが検出する。
// 誤動作の演出では、ときどき 1 本を 2 回数えて「実際の本数」と「センサのカウント」がずれていく。
import React from 'react';
import {interpolate} from 'remotion';
import {C, W} from '../theme';
import {progress} from './anim';

const SPEED = 9; // px / frame（約0.9秒に1本がセンサを通過）
const SPACING = 236;
const X0 = 300;
const SENSOR_X = 960;
const BELT_Y = 770;
const BASE_COUNT = 1240;

// 透明ペットボトル（底辺中央が原点）
const BOTTLE_PATH =
  'M -12 -228 L -12 -208 C -12 -188 -42 -180 -42 -150 L -42 -14 Q -42 0 -28 0 L 28 0 Q 42 0 42 -14 L 42 -150 C 42 -180 12 -188 12 -208 L 12 -228 Z';

const Bottle: React.FC<{x: number; hit: boolean}> = ({x, hit}) => (
  <g transform={`translate(${x}, ${BELT_Y})`}>
    <clipPath id={`liq-${Math.round(x)}`}>
      <path d={BOTTLE_PATH} />
    </clipPath>
    <path d={BOTTLE_PATH} fill="rgba(255,255,255,0.05)" />
    <rect x={-50} y={-138} width={100} height={140} fill="rgba(140,200,235,0.22)" clipPath={`url(#liq-${Math.round(x)})`} />
    <line x1={-42} y1={-138} x2={42} y2={-138} stroke="rgba(170,215,240,0.55)" strokeWidth={2} />
    <path d={BOTTLE_PATH} fill="none" stroke={hit ? C.redOnDark : 'rgba(255,255,255,0.78)'} strokeWidth={hit ? 3.5 : 2.5} />
    {/* キャップ */}
    <rect x={-16} y={-250} width={32} height={24} rx={3} fill="none" stroke={hit ? C.redOnDark : 'rgba(255,255,255,0.78)'} strokeWidth={2.5} />
    {/* 光の映り込み */}
    <line x1={-26} y1={-140} x2={-26} y2={-30} stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeLinecap="round" />
  </g>
);

const passedIndex = (frame: number) => Math.floor((frame * SPEED + X0 - SENSOR_X) / SPACING);

export const conveyorCounts = (frame: number, errorStart: number | null) => {
  const k = passedIndex(frame);
  const actual = BASE_COUNT + k;
  let extra = 0;
  let lastErrorFrame: number | null = null;
  if (errorStart !== null && frame >= errorStart) {
    const k0 = passedIndex(errorStart);
    for (let i = k0 + 1; i <= k; i++) {
      // 5 本に 2 本、不規則に二重カウントしてしまう（「時々」誤動作）
      const r = ((i % 5) + 5) % 5;
      if (r === 1 || r === 3) {
        extra++;
        lastErrorFrame = (i * SPACING + SENSOR_X - X0) / SPEED;
      }
    }
  }
  // 直近でボトルがセンサを通過した（＝カウントが増えた）フレーム
  const lastPassFrame = (k * SPACING + SENSOR_X - X0) / SPEED;
  return {actual, count: actual + extra, extra, lastErrorFrame, lastPassFrame};
};

export const Conveyor: React.FC<{
  frame: number;
  sensorStart: number;
  errorStart: number | null;
}> = ({frame, sensorStart, errorStart}) => {
  const sensorP = progress(frame, sensorStart, 18);
  const {lastErrorFrame} = conveyorCounts(frame, errorStart);
  const sinceError = lastErrorFrame === null ? Infinity : frame - lastErrorFrame;
  const errorFlash = sinceError < 24;

  const travel = frame * SPEED + X0;
  const kMin = Math.ceil((travel - W - 120) / SPACING);
  const kMax = Math.floor((travel + 120) / SPACING);
  const bottles = [];
  for (let k = kMin; k <= kMax; k++) {
    const x = travel - k * SPACING;
    const hit = sensorP > 0.9 && Math.abs(x - SENSOR_X) < 46;
    bottles.push(<Bottle key={k} x={x} hit={hit} />);
  }

  const dashOffset = -(frame * SPEED) % 40;
  const beamColor = errorFlash ? '#FF2030' : C.redOnDark;

  return (
    <svg width={W} height={1080} style={{position: 'absolute', inset: 0}}>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={beamColor} stopOpacity={0.95} />
          <stop offset="1" stopColor={beamColor} stopOpacity={0.35} />
        </linearGradient>
      </defs>
      {/* コンベア */}
      <rect x={0} y={BELT_Y} width={W} height={26} fill="#1E2126" stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
      <line x1={0} y1={BELT_Y + 13} x2={W} y2={BELT_Y + 13} stroke="rgba(255,255,255,0.18)" strokeWidth={2} strokeDasharray="18 22" strokeDashoffset={dashOffset} />
      {Array.from({length: 13}, (_, i) => (
        <circle key={i} cx={i * 160 + 40} cy={BELT_Y + 48} r={16} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2} />
      ))}
      <line x1={0} y1={BELT_Y + 80} x2={W} y2={BELT_Y + 80} stroke="rgba(255,255,255,0.12)" strokeWidth={2} />

      {bottles}

      {/* 光電センサ（上から検出） */}
      <g opacity={sensorP} transform={`translate(0, ${(1 - sensorP) * -30})`}>
        <line x1={SENSOR_X + 70} y1={140} x2={SENSOR_X + 70} y2={330} stroke="rgba(255,255,255,0.4)" strokeWidth={8} />
        <line x1={SENSOR_X + 40} y1={330} x2={SENSOR_X + 70} y2={330} stroke="rgba(255,255,255,0.4)" strokeWidth={8} />
        <rect x={SENSOR_X - 44} y={300} width={88} height={92} rx={6} fill="#2A2D33" stroke="rgba(255,255,255,0.7)" strokeWidth={2} />
        <rect x={SENSOR_X - 30} y={314} width={60} height={10} rx={2} fill="rgba(255,255,255,0.25)" />
        <circle cx={SENSOR_X} cy={392} r={14} fill={beamColor} filter="url(#glow)" />
        {/* 光 */}
        <rect
          x={SENSOR_X - 3}
          y={400}
          width={6}
          height={BELT_Y - 400}
          fill="url(#beam)"
          filter="url(#glow)"
          opacity={interpolate(Math.sin(frame / 5), [-1, 1], [0.75, 1])}
        />
        <text x={SENSOR_X + 64} y={372} fill="rgba(255,255,255,0.75)" fontSize={20} fontWeight={700} letterSpacing={2}>
          PHOTOELECTRIC SENSOR
        </text>
      </g>

      {/* 誤カウントの瞬間 */}
      {errorFlash ? (
        <g opacity={interpolate(sinceError, [0, 4, 18, 24], [0, 1, 1, 0])}>
          <circle cx={SENSOR_X} cy={560} r={70 + sinceError * 2} fill="none" stroke="#FF2030" strokeWidth={3} />
          <text x={SENSOR_X - 150} y={520 - sinceError * 1.5} fill="#FF2030" fontSize={44} fontWeight={900} textAnchor="end">
            +1
          </text>
        </g>
      ) : null}
    </svg>
  );
};
