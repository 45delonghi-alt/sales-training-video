// 光電センサの検出原理図（製品写真ではなく、方式の違いが一目で分かる図）
import React from 'react';
import type {SensorKind} from '../types';
import {C} from '../theme';

const Head: React.FC<{x: number; label?: string; flip?: boolean}> = ({x, label, flip}) => (
  <g>
    <rect x={x} y={58} width={46} height={54} rx={4} fill={C.ink} />
    <circle cx={flip ? x + 4 : x + 42} cy={85} r={7} fill={C.red} />
    {label ? (
      <text x={x + 23} y={136} fontSize={13} fill={C.gray} textAnchor="middle" fontWeight={500}>
        {label}
      </text>
    ) : null}
  </g>
);

const Arrow: React.FC<{x1: number; x2: number; y: number; opacity?: number; dashed?: boolean}> = ({x1, x2, y, opacity = 1, dashed}) => {
  const dir = Math.sign(x2 - x1);
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y} x2={x2 - dir * 8} y2={y} stroke={C.red} strokeWidth={3} strokeDasharray={dashed ? '6 5' : undefined} />
      <path d={`M ${x2} ${y} L ${x2 - dir * 11} ${y - 6} L ${x2 - dir * 11} ${y + 6} Z`} fill={C.red} />
    </g>
  );
};

const Reflector: React.FC<{x: number}> = ({x}) => (
  <g>
    <rect x={x} y={56} width={18} height={58} fill={C.white} stroke={C.ink} strokeWidth={2} />
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={i} d={`M ${x + 2} ${62 + i * 11} l 7 5 l -7 5`} fill="none" stroke={C.gray} strokeWidth={1.5} />
    ))}
    <text x={x + 9} y={136} fontSize={13} fill={C.gray} textAnchor="middle" fontWeight={500}>
      反射板
    </text>
  </g>
);

const Box: React.FC<{x: number}> = ({x}) => (
  <g>
    <rect x={x} y={62} width={40} height={46} fill="#E9EAEC" stroke={C.ink2} strokeWidth={2} />
    <text x={x + 20} y={136} fontSize={13} fill={C.gray} textAnchor="middle" fontWeight={500}>
      対象物
    </text>
  </g>
);

export const SensorDiagram: React.FC<{kind: SensorKind}> = ({kind}) => (
  <svg viewBox="0 0 320 150" width="100%" height="100%">
    <line x1={8} y1={146} x2={312} y2={146} stroke={C.line} strokeWidth={2} />
    {kind === 'through' ? (
      <>
        <Head x={14} label="投光器" />
        <Head x={260} label="受光器" flip />
        <Arrow x1={60} x2={258} y={85} />
        <rect x={138} y={102} width={40} height={36} fill="#E9EAEC" stroke={C.ink2} strokeWidth={2} strokeDasharray="5 4" />
        <path d="M 158 100 L 158 92" stroke={C.ink2} strokeWidth={2} />
        <path d="M 152 96 L 158 90 L 164 96" fill="none" stroke={C.ink2} strokeWidth={2} />
      </>
    ) : null}
    {kind === 'retro' ? (
      <>
        <Head x={14} label="センサ" />
        <Reflector x={282} />
        <Arrow x1={60} x2={280} y={76} />
        <Arrow x1={280} x2={62} y={96} />
      </>
    ) : null}
    {kind === 'retroClear' ? (
      <>
        <Head x={14} label="センサ" />
        <Reflector x={282} />
        <Arrow x1={60} x2={280} y={76} />
        {/* 透明ボトルを通ると光がわずかに弱まる */}
        <line x1={280} y1={96} x2={190} y2={96} stroke={C.red} strokeWidth={3} />
        <Arrow x1={130} x2={62} y={96} opacity={0.4} />
        <line x1={190} y1={96} x2={130} y2={96} stroke={C.red} strokeWidth={3} opacity={0.65} />
        <path
          d="M 152 40 L 152 50 C 152 56 140 58 140 66 L 140 124 Q 140 130 146 130 L 174 130 Q 180 130 180 124 L 180 66 C 180 58 168 56 168 50 L 168 40 Z"
          fill="rgba(140,200,235,0.22)"
          stroke={C.ink2}
          strokeWidth={2}
        />
      </>
    ) : null}
    {kind === 'diffuse' ? (
      <>
        <Head x={14} label="センサ" />
        <Box x={232} />
        <Arrow x1={60} x2={230} y={76} />
        <Arrow x1={230} x2={62} y={96} />
      </>
    ) : null}
    {kind === 'bgs' ? (
      <>
        <Head x={14} label="センサ" />
        <Box x={170} />
        {/* 背景 */}
        <rect x={292} y={40} width={14} height={100} fill="url(#hatch)" stroke={C.grayLight} strokeWidth={1.5} />
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke={C.grayLight} strokeWidth="2" />
          </pattern>
        </defs>
        <text x={299} y={136} fontSize={13} fill={C.gray} textAnchor="middle" fontWeight={500}>
          背景
        </text>
        <Arrow x1={60} x2={168} y={76} />
        <Arrow x1={168} x2={62} y={96} />
        {/* 設定距離 */}
        <line x1={60} y1={30} x2={240} y2={30} stroke={C.ink2} strokeWidth={1.5} />
        <line x1={60} y1={24} x2={60} y2={36} stroke={C.ink2} strokeWidth={1.5} />
        <line x1={240} y1={24} x2={240} y2={36} stroke={C.ink2} strokeWidth={1.5} />
        <text x={150} y={20} fontSize={13} fill={C.ink2} textAnchor="middle" fontWeight={700}>
          設定距離
        </text>
      </>
    ) : null}
  </svg>
);

export const Icon: React.FC<{name: 'box' | 'price'; size?: number; color?: string}> = ({name, size = 84, color = C.ink}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round">
    {name === 'box' ? (
      <>
        <path d="M24 5 L42 14 L42 34 L24 43 L6 34 L6 14 Z" />
        <path d="M6 14 L24 23 L42 14 M24 23 L24 43" />
      </>
    ) : (
      <>
        <path d="M6 24 L24 6 L42 6 L42 24 L24 42 Z" />
        <circle cx="34" cy="14" r="3" />
        <path d="M17 21 L21 26 L25 21 M21 26 L21 34 M17 28 L25 28 M17 31 L25 31" strokeWidth={2} />
      </>
    )}
  </svg>
);
