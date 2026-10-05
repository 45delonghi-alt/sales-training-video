// 図解の部品（SVG）。座標はすべて図解エリアの viewBox（1120×640）基準
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_FAMILY} from '../theme';

export const SC = {
  bg: '#eef1f8',
  ink: '#1c1f24',
  subInk: '#5b6068',
  body: '#c9cdd8',
  bodyEdge: '#7b8090',
  beam: '#f07d1e',
  object: '#f5b400',
  objectEdge: '#c48a00',
  good: '#1f5fbf',
  warn: '#c0392b',
  ok: '#1e9e5a',
  panel: '#ffffff',
};

/** start から dur フレームで 0→1 */
export const ramp = (frame: number, start: number, dur = 10) =>
  interpolate(frame, [start, start + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const useSpringIn = (start: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - start, fps, config: {damping: 14, mass: 0.6}});
};

const label: React.CSSProperties = {fontFamily: FONT_FAMILY};

export const SvgText: React.FC<{
  x: number;
  y: number;
  size?: number;
  color?: string;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
  opacity?: number;
  children: React.ReactNode;
}> = ({x, y, size = 26, color = SC.ink, weight = 700, anchor = 'middle', opacity = 1, children}) => (
  <text x={x} y={y} fontSize={size} fill={color} fontWeight={weight} textAnchor={anchor} opacity={opacity} style={label}>
    {children}
  </text>
);

/**
 * センサ本体。(x, y) は筐体の左上。face はレンズの向き。
 * レンズの中心は face=right なら (x+120, y+75)、left なら (x, y+75)
 */
export const SensorBody: React.FC<{
  x: number;
  y: number;
  face: 'right' | 'left';
  led?: string;
  ledOn?: boolean;
}> = ({x, y, face, led = '#e5533d', ledOn = true}) => {
  const lensX = face === 'right' ? x + 120 : x;
  const cableX = face === 'right' ? x + 14 : x + 106;
  return (
    <g>
      <rect x={cableX - 12} y={y + 150} width={24} height={30} rx={4} fill="#6d7280" transform={`rotate(${face === 'right' ? 35 : -35} ${cableX} ${y + 150})`} />
      <rect x={x} y={y} width={120} height={150} rx={12} fill={SC.body} stroke={SC.bodyEdge} strokeWidth={3} />
      <rect x={x + 14} y={y + 16} width={92} height={118} rx={8} fill="#d9dce5" />
      <circle cx={x + 20} cy={y + 20} r={5} fill="#fff" stroke={SC.bodyEdge} />
      <circle cx={x + 100} cy={y + 130} r={5} fill="#fff" stroke={SC.bodyEdge} />
      <rect x={lensX - 7} y={y + 52} width={14} height={46} rx={5} fill="#3a3f4a" />
      <circle cx={x + 60} cy={y - 4} r={8} fill={ledOn ? led : '#9aa0aa'} stroke="#555" strokeWidth={1.5} />
      {ledOn ? <circle cx={x + 60} cy={y - 4} r={16} fill={led} opacity={0.25} /> : null}
    </g>
  );
};

/** 光の矢印。流れるような破線で「光が進んでいる」ことを示す */
export const Beam: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity?: number;
  width?: number;
  color?: string;
  dashed?: boolean;
}> = ({x1, y1, x2, y2, opacity = 1, width = 10, color = SC.beam, dashed = true}) => {
  const frame = useCurrentFrame();
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 4 || opacity <= 0) return null;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const head = Math.min(30, len * 0.5);
  const bx = x2 - ux * head;
  const by = y2 - uy * head;
  const px = -uy * head * 0.6;
  const py = ux * head * 0.6;
  return (
    <g opacity={opacity}>
      <line
        x1={x1}
        y1={y1}
        x2={bx}
        y2={by}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? '26 14' : undefined}
        strokeDashoffset={dashed ? -frame * 3 : undefined}
      />
      <polygon points={`${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}`} fill={color} />
    </g>
  );
};

/** 検出物（黄色の箱）。dropIn は 0→1 で上から落ちてくる */
export const ObjectBox: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  dropIn?: number;
  fill?: string;
  stroke?: string;
  caption?: string;
  shiny?: boolean;
}> = ({x, y, w = 60, h = 170, dropIn = 1, fill = SC.object, stroke = SC.objectEdge, caption = '検出物', shiny}) => {
  if (dropIn <= 0) return null;
  const dy = (1 - dropIn) * -260;
  return (
    <g transform={`translate(0 ${dy})`} opacity={Math.min(1, dropIn * 2)}>
      <defs>
        <linearGradient id="shiny" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f6f9" />
          <stop offset="0.45" stopColor="#a9b1bd" />
          <stop offset="0.55" stopColor="#ffffff" />
          <stop offset="1" stopColor="#8a929e" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={shiny ? 'url(#shiny)' : fill} stroke={shiny ? '#6b7280' : stroke} strokeWidth={3} />
      <SvgText x={x + w / 2} y={y - 16} size={24}>
        {caption}
      </SvgText>
    </g>
  );
};

/** 反射板（回帰反射型のミラー） */
export const Reflector: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g>
    <rect x={x} y={y} width={20} height={200} rx={3} fill="#1d1f24" />
    <rect x={x - 8} y={y} width={8} height={200} fill="#4a4f5a" />
    <SvgText x={x + 10} y={y - 18} size={24}>
      反射板
    </SvgText>
  </g>
);

/** 状態表示のバッジ（検出！／受光中 など） */
export const Badge: React.FC<{x: number; y: number; text: string; color: string; scale?: number}> = ({
  x,
  y,
  text,
  color,
  scale = 1,
}) => {
  if (scale <= 0) return null;
  const w = text.length * 30 + 40;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-w / 2} y={-28} width={w} height={56} rx={28} fill={color} />
      <SvgText x={0} y={10} size={28} color="#fff">
        {text}
      </SvgText>
    </g>
  );
};

/** 右側パネルのポイントカード（◎ 強み／△ 注意） */
export const PointCard: React.FC<{start: number; kind: 'good' | 'warn'; text: string}> = ({start, kind, text}) => {
  const s = useSpringIn(start);
  const color = kind === 'good' ? SC.good : SC.warn;
  return (
    <div
      style={{
        opacity: s,
        transform: `translateX(${(1 - s) * 60}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        background: SC.panel,
        borderLeft: `10px solid ${color}`,
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
        fontFamily: FONT_FAMILY,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 52,
          height: 52,
          borderRadius: 26,
          background: color,
          color: '#fff',
          fontSize: 30,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {kind === 'good' ? '◎' : '△'}
      </div>
      <div style={{fontSize: 34, fontWeight: 700, color: SC.ink, lineHeight: 1.35}}>{text}</div>
    </div>
  );
};
