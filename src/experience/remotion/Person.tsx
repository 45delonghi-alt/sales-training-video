// 人物の線画（実写に差し替えるまでの仮素材）。
// 飲料工場の衛生ルールに合わせ、全員が清潔な作業服と衛生帽（髪・耳を覆う）を着用。装飾品なし。
//   佐藤さん：設備課（男性）／高橋さん：品質管理課（女性）
//   森さん・中田さん：OPTEX-FA の社員（来訪者として工場の作業服と衛生帽を借用。赤い来訪者バッジ）
import React from 'react';
import {X} from './theme';
import type {Mood, Speaker} from '../types';

export type {Mood};

type Who = 'sato' | 'takahashi' | 'mori' | 'nakata';

const PROFILE: Record<Who, {female: boolean; tag: string; optex: boolean}> = {
  sato: {female: false, tag: '設備課', optex: false},
  takahashi: {female: true, tag: '品質管理課', optex: false},
  mori: {female: true, tag: 'OPTEX-FA', optex: true},
  nakata: {female: false, tag: 'OPTEX-FA', optex: true},
};

export const isPerson = (s: Speaker | string): s is Who => s in PROFILE;

// バストアップ。中心 (0,0) は首元。幅およそ 520
export const Bust: React.FC<{who?: Who; mood: Mood; color?: string; blink?: boolean; tilt?: number}> = ({who = 'sato', mood, color = X.white, blink = false, tilt = 0}) => {
  const p = PROFILE[who];
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
  // 顔の輪郭（女性はやや細く）
  const face = p.female ? 'M -80 -196 C -82 -120 -48 -82 0 -78 C 48 -82 82 -120 80 -196' : 'M -88 -196 C -90 -120 -56 -80 0 -76 C 56 -80 90 -120 88 -196';
  return (
    <g fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {/* 胴（白い作業服・ファスナー） */}
      <path d="M -250 220 C -250 90 -190 40 -96 22 L -40 6 L 0 40 L 40 6 L 96 22 C 190 40 250 90 250 220" />
      <path d="M -40 6 L -30 40 L 0 40 L 30 40 L 40 6" />
      <path d="M 0 40 L 0 220" strokeOpacity={0.55} />
      {/* 名札（来訪者は赤いバッジ） */}
      <rect x={-210} y={86} width={130} height={56} rx={6} fill={p.optex ? X.red : 'none'} stroke={p.optex ? X.red : color} />
      <text x={-145} y={122} fill={p.optex ? X.white : color} stroke="none" fontSize={p.optex ? 20 : 22} fontWeight={700} textAnchor="middle">
        {p.tag}
      </text>
      {mood === 'thinking' ? <path d="M -230 200 C -160 150 -60 150 40 170 M 230 200 C 160 150 60 150 -40 170" /> : null}
      <g transform={`rotate(${tilt}, 0, -150)`}>
        {/* 首 */}
        <path d="M -30 6 L -30 -70 M 30 6 L 30 -70" />
        {/* 衛生帽：髪と耳を覆うフード型。額にゴムのライン */}
        <path d="M -104 -150 C -112 -300 112 -300 104 -150 C 104 -112 96 -86 74 -70 L -74 -70 C -96 -86 -104 -112 -104 -150 Z" fill={color} fillOpacity={0.14} />
        <path d="M -90 -228 Q 0 -250 90 -228" strokeOpacity={0.6} />
        {/* 顔 */}
        <path d={`${face} Q 0 -236 -${p.female ? 80 : 88} -196`} fill={X.dark} fillOpacity={0.35} />
        <path d={brow.l} />
        <path d={brow.r} />
        {blink ? (
          <path d={`M ${-52 + eyeDx} -186 l 22 0 M ${30 + eyeDx} -186 l 22 0`} />
        ) : (
          <>
            <circle cx={-42 + eyeDx} cy={-186} r={5} fill={color} />
            <circle cx={42 + eyeDx} cy={-186} r={5} fill={color} />
            {p.female ? <path d={`M ${-52 + eyeDx} -194 l -8 -4 M ${52 + eyeDx} -194 l 8 -4`} strokeWidth={3} /> : null}
          </>
        )}
        <path d="M 0 -180 L -6 -150 L 6 -148" strokeOpacity={0.7} />
        <path d={mouth} />
        {mood === 'thinking' ? <path d="M 116 -60 q 20 -10 34 6" strokeOpacity={0.6} /> : null}
      </g>
    </g>
  );
};

// 全身（作業者）。足元 (0,0)、高さおよそ 300。作業服と衛生帽
export const Worker: React.FC<{color?: string; pose?: 'stand' | 'count' | 'bend'; t?: number}> = ({color = X.white, pose = 'stand', t = 0}) => {
  const arm = pose === 'count' ? Math.sin(t * 6) * 10 : 0;
  const bend = pose === 'bend' ? 18 : 0;
  return (
    <g fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M -26 0 L -16 -120 M 26 0 L 16 -120" />
      <g transform={`rotate(${bend}, 0, -120)`}>
        <path d="M -40 -120 L -44 -230 Q 0 -250 44 -230 L 40 -120 Z" />
        <circle cx={0} cy={-272} r={30} />
        <path d="M -36 -268 C -40 -320 40 -320 36 -268 C 36 -252 30 -244 24 -242 L -24 -242 C -30 -244 -36 -252 -36 -268 Z" fill={color} fillOpacity={0.18} />
        <path d={`M -44 -224 L -70 ${-150 + arm} M 44 -224 L 76 ${-170 - arm}`} />
        {pose === 'count' ? <rect x={66} y={-196 - arm} width={22} height={28} rx={4} /> : null}
      </g>
    </g>
  );
};
