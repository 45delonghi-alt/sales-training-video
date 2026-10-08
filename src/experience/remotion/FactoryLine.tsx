// 飲料工場 LINE 03（全シーン共通の設備配置）。斜め上から見た線画。
// コンベアは左→右に流れ、センサは手前側、反射板は奥側に置く回帰反射型。光はコンベアを横切って往復する。
// 世界座標：x＝流れ方向、y＝高さ、z＝奥行き（0＝手前の端、DEPTH＝奥の端）
import React from 'react';
import {X} from './theme';

export const DEPTH = 170;
export const BOTTLE_H = 228;
export const SENSOR_Y = 120; // センサ・光の高さ（ボトルの胴）
const KX = 0.55;
const KY = 0.36;

export type View = {ox: number; oy: number; s: number};

export const project = (v: View, x: number, y: number, z: number): [number, number] => [
  v.ox + (x + z * KX) * v.s,
  v.oy - (y + z * KY) * v.s,
];

// 透明PETボトル（底面中央が原点、高さ228）
export const BOTTLE_PATH =
  'M -12 -228 L -12 -208 C -12 -188 -42 -180 -42 -150 L -42 -14 Q -42 0 -28 0 L 28 0 Q 42 0 42 -14 L 42 -150 C 42 -180 12 -188 12 -208 L 12 -228 Z';
// 胴の凹凸（リブ）
const RIBS = [-120, -96, -72];

export type BottleState = {
  key: number;
  x: number;
  z: number;
  tilt?: number;
  state?: 'normal' | 'hit' | 'error';
  // ラベル・凹凸の向き（-1〜1）。向きの違いを見せるとき
  turn?: number;
};

export const Bottle: React.FC<{v: View; b: BottleState; dark: boolean}> = ({v, b, dark}) => {
  const [px, py] = project(v, b.x, 0, b.z);
  const stroke = b.state === 'error' ? X.redOnDark : b.state === 'hit' ? X.redOnDark : dark ? X.petLine : X.petLineLight;
  const sw = (b.state && b.state !== 'normal' ? 3.6 : 2.4) / v.s;
  const turn = b.turn ?? 0;
  return (
    <g transform={`translate(${px}, ${py}) scale(${v.s}) rotate(${b.tilt ?? 0})`}>
      <path d={BOTTLE_PATH} fill={dark ? 'rgba(160,210,240,0.10)' : 'rgba(120,180,220,0.14)'} />
      {/* 中身（飲料） */}
      <path d="M -42 -138 L 42 -138 L 42 -14 Q 42 0 28 0 L -28 0 Q -42 0 -42 -14 Z" fill={dark ? 'rgba(140,200,235,0.20)' : 'rgba(110,170,215,0.20)'} />
      {RIBS.map((y) => (
        <path key={y} d={`M -42 ${y} Q 0 ${y + 6} 42 ${y}`} fill="none" stroke={stroke} strokeOpacity={0.45} strokeWidth={sw * 0.7} />
      ))}
      {/* ラベル（向きで位置が変わる） */}
      <rect x={-42 + 18 * (turn + 1)} y={-190} width={48} height={30} fill={dark ? 'rgba(255,255,255,0.10)' : 'rgba(20,21,23,0.08)'} />
      <path d={BOTTLE_PATH} fill="none" stroke={stroke} strokeWidth={sw} />
      <rect x={-16} y={-250} width={32} height={24} rx={3} fill="none" stroke={stroke} strokeWidth={sw} />
      <line x1={-27} y1={-140} x2={-27} y2={-34} stroke="rgba(255,255,255,0.4)" strokeWidth={4 / v.s} strokeLinecap="round" />
    </g>
  );
};

export const FactoryLine: React.FC<{
  v: View;
  length: number;
  sensorX: number;
  bottles: BottleState[];
  frame: number;
  dark?: boolean;
  speed?: number; // ベルトの模様の流れ（px/フレーム）
  beam?: 'on' | 'hit' | 'off';
  showSensor?: boolean;
  labels?: boolean;
  sensorLabel?: string;
}> = ({v, length, sensorX, bottles, frame, dark = true, speed = 6, beam = 'on', showSensor = true, labels = false, sensorLabel}) => {
  const P = (x: number, y: number, z: number) => project(v, x, y, z);
  const line = dark ? 'rgba(255,255,255,0.45)' : 'rgba(20,21,23,0.45)';
  const faint = dark ? 'rgba(255,255,255,0.18)' : 'rgba(20,21,23,0.16)';
  const pts = (arr: [number, number][]) => arr.map((p) => p.join(',')).join(' ');
  const top = pts([P(0, 0, 0), P(length, 0, 0), P(length, 0, DEPTH), P(0, 0, DEPTH)]);
  const front = pts([P(0, 0, 0), P(length, 0, 0), P(length, -34, 0), P(0, -34, 0)]);
  // ベルトの継ぎ目（流れる）
  const seams = [];
  const step = 90;
  const off = (frame * speed) % step;
  for (let x = off; x < length; x += step) {
    const [a, b] = [P(x, 0, 0), P(x, 0, DEPTH)];
    seams.push(<line key={x} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={faint} strokeWidth={1.5} />);
  }
  const rail = (z: number) => {
    const [a, b] = [P(0, 30, z), P(length, 30, z)];
    return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={line} strokeWidth={3} />;
  };
  // センサ（手前）・反射板（奥）
  const sNear = P(sensorX, SENSOR_Y, -70);
  const sFloor = P(sensorX, -150, -70);
  const rFar = P(sensorX, SENSOR_Y, DEPTH + 60);
  const rFloor = P(sensorX, -110, DEPTH + 60);
  const b0 = P(sensorX, SENSOR_Y, -46);
  const b1 = P(sensorX, SENSOR_Y, DEPTH + 52);
  const beamColor = beam === 'hit' ? '#FF2A36' : X.beam;
  const sorted = [...bottles].sort((a, b) => b.z - a.z);
  return (
    <g>
      <defs>
        <filter id="xglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* 反射板（奥） */}
      {showSensor ? (
        <g>
          <line x1={rFar[0]} y1={rFar[1]} x2={rFloor[0]} y2={rFloor[1]} stroke={line} strokeWidth={5} />
          <rect x={rFar[0] - 22 * v.s} y={rFar[1] - 30 * v.s} width={44 * v.s} height={56 * v.s} fill={dark ? '#2A2D33' : '#E9EAEC'} stroke={line} strokeWidth={2} />
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M ${rFar[0] - 16 * v.s} ${rFar[1] + (-20 + i * 16) * v.s} l ${16 * v.s} ${8 * v.s} l ${16 * v.s} ${-8 * v.s}`}
              fill="none"
              stroke={faint}
              strokeWidth={1.5}
            />
          ))}
        </g>
      ) : null}
      {/* コンベア */}
      <polygon points={top} fill={dark ? '#1C1F24' : '#E4E5E7'} stroke={line} strokeWidth={2} />
      {seams}
      <polygon points={front} fill={dark ? '#15171B' : '#D3D5D8'} stroke={line} strokeWidth={2} />
      {Array.from({length: Math.floor(length / 160) + 1}, (_, i) => {
        const [cx, cy] = P(i * 160 + 40, -60, 0);
        return <circle key={i} cx={cx} cy={cy} r={14 * v.s} fill="none" stroke={faint} strokeWidth={2} />;
      })}
      {rail(-4)}
      {/* 光（センサ ⇄ 反射板）。透明ボトルは光を通すので、ボトルの後ろにも光が続く */}
      {showSensor && beam !== 'off' ? (
        <g filter="url(#xglow)">
          <line x1={b0[0]} y1={b0[1] - 3} x2={b1[0]} y2={b1[1] - 3} stroke={beamColor} strokeWidth={3} strokeDasharray="14 10" strokeDashoffset={-frame * 4} opacity={0.95} />
          <line x1={b1[0]} y1={b1[1] + 3} x2={b0[0]} y2={b0[1] + 3} stroke={beamColor} strokeWidth={3} strokeDasharray="14 10" strokeDashoffset={-frame * 4} opacity={0.6} />
        </g>
      ) : null}
      {sorted.map((b) => (
        <Bottle key={b.key} v={v} b={b} dark={dark} />
      ))}
      {rail(DEPTH + 4)}
      {/* センサ（手前） */}
      {showSensor ? (
        <g>
          <line x1={sNear[0]} y1={sNear[1]} x2={sFloor[0]} y2={sFloor[1]} stroke={line} strokeWidth={6} />
          <rect x={sNear[0] - 34 * v.s} y={sNear[1] - 28 * v.s} width={60 * v.s} height={50 * v.s} rx={5 * v.s} fill={dark ? '#2A2D33' : '#F4F4F4'} stroke={dark ? 'rgba(255,255,255,0.8)' : X.ink} strokeWidth={2} />
          <circle cx={sNear[0] + 22 * v.s} cy={sNear[1] - 8 * v.s} r={9 * v.s} fill={beamColor} filter="url(#xglow)" opacity={beam === 'off' ? 0.25 : 1} />
          <circle cx={sNear[0] - 22 * v.s} cy={sNear[1] - 18 * v.s} r={4 * v.s} fill={beam === 'hit' ? '#FFB020' : 'rgba(255,255,255,0.25)'} />
        </g>
      ) : null}
      {labels && showSensor ? (
        <g fontSize={22} fontWeight={700} fill={dark ? 'rgba(255,255,255,0.75)' : X.gray} letterSpacing={1}>
          <text x={sNear[0] - 40} y={sNear[1] + 64 * v.s + 30}>{sensorLabel ?? '光電センサ（手前）'}</text>
          <text x={rFar[0] - 30} y={rFar[1] - 44 * v.s}>反射板（奥）</text>
        </g>
      ) : null}
    </g>
  );
};

// ボトルの流れのシミュレーション。各ボトルの位置を時刻の関数で与え、センサを横切った回数を数える
export type Flow = (t: number, i: number) => {x: number; z: number; tilt?: number; turn?: number};

export const bottlesAt = (flow: Flow, t: number, range: [number, number], sensorX: number, hitW = 46): BottleState[] => {
  const out: BottleState[] = [];
  for (let i = range[0]; i <= range[1]; i++) {
    const b = flow(t, i);
    out.push({key: i, ...b, state: Math.abs(b.x - sensorX) < hitW ? 'hit' : 'normal'});
  }
  return out;
};

// t までにセンサを通過した本数（先頭が sensorX を越えた本数）と、各ボトルが越えた時刻
export const passTimes = (flow: Flow, tEnd: number, range: [number, number], sensorX: number, fps: number) => {
  const times: {i: number; t: number}[] = [];
  for (let i = range[0]; i <= range[1]; i++) {
    let prev = flow(0, i).x;
    if (prev >= sensorX) continue;
    for (let f = 1; f <= Math.ceil(tEnd * fps); f++) {
      const x = flow(f / fps, i).x;
      if (prev < sensorX && x >= sensorX) {
        times.push({i, t: f / fps});
        break;
      }
      prev = x;
    }
  }
  return times.sort((a, b) => a.t - b.t);
};
