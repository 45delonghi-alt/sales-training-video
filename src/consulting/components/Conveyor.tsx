// 飲料工場のコンベアライン（線画のセンサUI）。透明ペットボトルが流れ、横から回帰反射型の光電センサが検出する。
//   センサ（投光・受光一体）は手前、反射板は奥。どちらもボトルの下部と同じ高さ。光はセンサ → 反射板 → センサと往復する。
// 誤動作の演出では、ときどき（不規則に、まれに）1 本を 2 回数えて「実際の本数」と「センサのカウント」がずれていく。
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
// 奥行き（コンベアの手前 → 奥）の画面上のずれ
const DX = 110;
const DY = -78;
// 検出の高さ：ボトルの下部（底から 46px）
const DETECT_H = 46;
// ボトルはコンベアの奥行きの中央を流れる
const MID_X = DX / 2;
const MID_Y = DY / 2;

// 透明ペットボトル（底辺中央が原点）
const BOTTLE_PATH =
  'M -12 -228 L -12 -208 C -12 -188 -42 -180 -42 -150 L -42 -14 Q -42 0 -28 0 L 28 0 Q 42 0 42 -14 L 42 -150 C 42 -180 12 -188 12 -208 L 12 -228 Z';

const Bottle: React.FC<{x: number; hit: boolean}> = ({x, hit}) => (
  <g transform={`translate(${x + MID_X}, ${BELT_Y + MID_Y})`}>
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

// センサ（手前）と反射板（奥）の位置。ボトルが光の線を横切る位置が SENSOR_X（奥行き中央）になるように置く
const SX = SENSOR_X + MID_X - DX * 0.75;
const SY = BELT_Y + MID_Y - DY * 0.75 - DETECT_H;
const RX = SENSOR_X + MID_X + DX * 0.75;
const RY = BELT_Y + MID_Y + DY * 0.75 - DETECT_H;

const passedIndex = (frame: number) => Math.floor((frame * SPEED + X0 - SENSOR_X) / SPACING);

export const conveyorCounts = (frame: number, errorStart: number | null) => {
  const k = passedIndex(frame);
  const actual = BASE_COUNT + k;
  let extra = 0;
  let lastErrorFrame: number | null = null;
  if (errorStart !== null && frame >= errorStart) {
    const k0 = passedIndex(errorStart);
    for (let i = k0 + 1; i <= k; i++) {
      // ほとんどは正しく数え、ときどき不規則に二重カウントする（毎回ではない）。最初の1回は見せ場として早めに起こす
      const r = (Math.imul(i, 2654435761) >>> 0) % 100;
      if (i === k0 + 2 || (i > k0 + 4 && r < 14)) {
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
    const hit = sensorP > 0.9 && Math.abs(x - SENSOR_X) < 46; // ボトルの位置 x（奥行き中央）が光の線を横切る
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
      {/* コンベア（斜めから見た帯：手前の辺 → 奥の辺） */}
      <path d={`M 0 ${BELT_Y} L ${W} ${BELT_Y} L ${W} ${BELT_Y + DY} L 0 ${BELT_Y + DY} Z`} fill="#1E2126" stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
      <line x1={0} y1={BELT_Y + DY / 2} x2={W} y2={BELT_Y + DY / 2} stroke="rgba(255,255,255,0.14)" strokeWidth={2} strokeDasharray="18 22" strokeDashoffset={dashOffset} />
      <rect x={0} y={BELT_Y} width={W} height={26} fill="#1E2126" stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
      {Array.from({length: 13}, (_, i) => (
        <circle key={i} cx={i * 160 + 40} cy={BELT_Y + 48} r={16} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2} />
      ))}
      <line x1={0} y1={BELT_Y + 80} x2={W} y2={BELT_Y + 80} stroke="rgba(255,255,255,0.12)" strokeWidth={2} />

      {/* 反射板（奥・ボトル下部と同じ高さ）。光を戻すだけで、光を出さない */}
      <g opacity={sensorP}>
        <line x1={RX} y1={RY + 18} x2={RX} y2={BELT_Y + DY} stroke="rgba(255,255,255,0.35)" strokeWidth={6} />
        <rect x={RX - 8} y={RY - 26} width={16} height={52} fill="#3A3E45" stroke="rgba(255,255,255,0.7)" strokeWidth={2} />
        {Array.from({length: 5}, (_, i) => (
          <line key={i} x1={RX - 6} y1={RY - 20 + i * 10} x2={RX + 6} y2={RY - 20 + i * 10} stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
        ))}
        <text x={RX + 22} y={RY - 34} fill="rgba(255,255,255,0.75)" fontSize={20} fontWeight={700} letterSpacing={2}>
          REFLECTOR
        </text>
      </g>

      {/* 光（説明用の表現）：行き＝センサ → 反射板、戻り＝反射板 → センサ */}
      <g opacity={sensorP * interpolate(Math.sin(frame / 5), [-1, 1], [0.75, 1])} filter="url(#glow)">
        <line x1={SX + 30} y1={SY - 5} x2={RX - 8} y2={RY - 5} stroke={beamColor} strokeWidth={4} strokeDasharray="14 8" strokeDashoffset={-frame * 3} />
        <line x1={RX - 8} y1={RY + 5} x2={SX + 30} y2={SY + 5} stroke={beamColor} strokeWidth={3} strokeDasharray="14 8" strokeDashoffset={-frame * 3} opacity={0.55} />
      </g>

      {bottles}

      {/* 光電センサ（手前・ボトル下部と同じ高さ。投光・受光一体） */}
      <g opacity={sensorP} transform={`translate(0, ${(1 - sensorP) * 30})`}>
        <line x1={SX} y1={SY + 30} x2={SX} y2={BELT_Y + 120} stroke="rgba(255,255,255,0.4)" strokeWidth={8} />
        <rect x={SX - 34} y={SY - 30} width={64} height={60} rx={6} fill="#2A2D33" stroke="rgba(255,255,255,0.7)" strokeWidth={2} />
        <rect x={SX - 24} y={SY - 22} width={30} height={8} rx={2} fill="rgba(255,255,255,0.25)" />
        <circle cx={SX + 30} cy={SY} r={10} fill={beamColor} filter="url(#glow)" />
        <text x={SX - 60} y={SY + 74} fill="rgba(255,255,255,0.75)" fontSize={20} fontWeight={700} letterSpacing={2} textAnchor="end">
          PHOTOELECTRIC SENSOR
        </text>
        <text x={SX - 60} y={SY + 100} fill="rgba(255,255,255,0.5)" fontSize={16} letterSpacing={1} textAnchor="end">
          EMIT + RECEIVE
        </text>
      </g>

      {/* 誤カウントの瞬間 */}
      {errorFlash ? (
        <g opacity={interpolate(sinceError, [0, 4, 18, 24], [0, 1, 1, 0])}>
          <circle cx={SENSOR_X + MID_X} cy={BELT_Y + MID_Y - DETECT_H} r={70 + sinceError * 2} fill="none" stroke="#FF2030" strokeWidth={3} />
          <text x={SENSOR_X + MID_X - 150} y={BELT_Y + MID_Y - DETECT_H - 90 - sinceError * 1.5} fill="#FF2030" fontSize={44} fontWeight={900} textAnchor="end">
            +1
          </text>
        </g>
      ) : null}
    </svg>
  );
};
