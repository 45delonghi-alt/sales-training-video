// 人物の線画（実写に差し替えるまでの仮素材）。お客様＝飲料工場の設備担当（作業着・帽子・名札）。
import React from 'react';
import {X} from './theme';

export type Mood = 'neutral' | 'thinking' | 'uneasy' | 'worried' | 'cool' | 'positive' | 'request';

// バストアップ。中心 (0,0) は首元。幅およそ 520
export const Bust: React.FC<{mood: Mood; color?: string; blink?: boolean; tilt?: number; name?: string}> = ({
  mood,
  color = X.white,
  blink = false,
  tilt = 0,
  name = '設備課',
}) => {
  const sw = 4;
  const brow =
    mood === 'uneasy' || mood === 'worried'
      ? {l: 'M -62 -214 L -26 -222', r: 'M 26 -222 L 62 -214'} // 困り眉
      : mood === 'thinking'
        ? {l: 'M -62 -220 L -26 -216', r: 'M 26 -224 L 62 -218'}
        : {l: 'M -62 -218 L -26 -220', r: 'M 26 -220 L 62 -218'};
  const eyeDx = mood === 'cool' ? 14 : 0;
  const mouth =
    mood === 'positive' || mood === 'request'
      ? 'M -26 -134 Q 0 -116 26 -134'
      : mood === 'uneasy' || mood === 'worried'
        ? 'M -22 -126 Q 0 -138 22 -126'
        : mood === 'cool'
          ? 'M -18 -130 L 18 -130'
          : 'M -22 -130 Q 0 -124 22 -130';
  return (
    <g fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {/* 胴（作業着） */}
      <path d="M -250 220 C -250 90 -190 40 -96 22 L -40 6 L 0 60 L 40 6 L 96 22 C 190 40 250 90 250 220" />
      <path d="M -40 6 L -18 120 M 40 6 L 18 120" />
      <path d="M 0 60 L 0 220" strokeOpacity={0.5} />
      {/* 名札 */}
      <rect x={-200} y={90} width={110} height={56} rx={6} />
      <text x={-145} y={126} fill={color} stroke="none" fontSize={22} fontWeight={700} textAnchor="middle">
        {name}
      </text>
      {mood === 'thinking' ? (
        // 腕組み
        <path d="M -230 200 C -160 150 -60 150 40 170 M 230 200 C 160 150 60 150 -40 170" />
      ) : null}
      <g transform={`rotate(${tilt}, 0, -150)`}>
        {/* 首・頭 */}
        <path d="M -30 6 L -30 -40 M 30 6 L 30 -40" />
        <ellipse cx={0} cy={-170} rx={92} ry={112} fill={X.dark} fillOpacity={0.0001} />
        {/* 帽子 */}
        <path d="M -98 -214 C -96 -300 96 -300 98 -214 Z" fill={color} fillOpacity={0.12} />
        <path d="M -98 -214 L 128 -214" />
        {/* 耳 */}
        <path d="M -92 -176 q -18 4 -12 30 q 4 14 14 12 M 92 -176 q 18 4 12 30 q -4 14 -14 12" />
        <path d={brow.l} />
        <path d={brow.r} />
        {blink ? (
          <path d={`M ${-52 + eyeDx} -190 l 22 0 M ${30 + eyeDx} -190 l 22 0`} />
        ) : (
          <>
            <circle cx={-42 + eyeDx} cy={-190} r={5} fill={color} />
            <circle cx={42 + eyeDx} cy={-190} r={5} fill={color} />
          </>
        )}
        <path d="M 0 -184 L -6 -152 L 6 -150" strokeOpacity={0.7} />
        <path d={mouth} />
        {mood === 'thinking' ? <path d="M 110 -60 q 20 -10 34 6" strokeOpacity={0.6} /> : null}
      </g>
    </g>
  );
};

// 全身（作業者）。足元 (0,0)、高さおよそ 300
export const Worker: React.FC<{color?: string; pose?: 'stand' | 'count' | 'bend'; t?: number}> = ({color = X.white, pose = 'stand', t = 0}) => {
  const arm = pose === 'count' ? Math.sin(t * 6) * 10 : 0;
  const bend = pose === 'bend' ? 18 : 0;
  return (
    <g fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M -26 0 L -16 -120 M 26 0 L 16 -120" />
      <g transform={`rotate(${bend}, 0, -120)`}>
        <path d="M -40 -120 L -44 -230 Q 0 -250 44 -230 L 40 -120 Z" />
        <circle cx={0} cy={-272} r={30} />
        <path d="M -34 -282 C -32 -318 32 -318 34 -282 Z" fill={color} fillOpacity={0.15} />
        <path d={`M -44 -224 L -70 ${-150 + arm} M 44 -224 L 76 ${-170 - arm}`} />
        {pose === 'count' ? <rect x={66} y={-196 - arm} width={22} height={28} rx={4} /> : null}
      </g>
    </g>
  );
};
