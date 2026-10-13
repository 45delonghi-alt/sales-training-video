// お客様との対話（営業担当＝学生の一人称）。実写が届くまでは線画の仮素材。
// variant：「人物-表情」（例：sato-uneasy）、2人の場面は pair-thinking（佐藤さん＋高橋さん）・together（前向きにうなずく2人）
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {X} from '../theme';
import {Bust, type Mood} from '../Person';
import {BOTTLE_PATH} from '../FactoryLine';
import {characterById} from '../../data';
import {appear, progress} from '../../../consulting/components/anim';

type Who = 'sato' | 'takahashi';
type Cast = {who: Who; mood: Mood; x: number; scale: number; delay?: number}[];

const castOf = (variant: string): Cast => {
  if (variant === 'pair-thinking')
    return [
      {who: 'sato', mood: 'thinking', x: 720, scale: 1.15},
      {who: 'takahashi', mood: 'neutral', x: 1240, scale: 1.0, delay: 1.0},
    ];
  if (variant === 'together')
    return [
      {who: 'sato', mood: 'positive', x: 760, scale: 1.2},
      {who: 'takahashi', mood: 'positive', x: 1290, scale: 1.0, delay: 1.6},
    ];
  const [who, pose] = variant.split('-') as [Who, string];
  const mood: Mood = pose === 'frown' ? 'worried' : (pose as Mood);
  return [{who, mood, x: 960, scale: 1.25}];
};

export const peopleIn = (variant: string) => castOf(variant).map((c) => c.who);

export const CustomerScene: React.FC<{variant: string}> = ({variant}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const blink = t % 3.2 > 3.05;
  const cast = castOf(variant);
  const pose = variant.split('-')[1];
  return (
    <AbsoluteFill>
      <BackgroundLine frame={frame} />
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <rect x={0} y={960} width={1920} height={120} fill="#1A1C20" />
        <line x1={0} y1={960} x2={1920} y2={960} stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
        {cast.map((c) => {
          const tilt = c.mood === 'uneasy' ? -8 * progress(frame, 0.6 * fps, 18) : c.mood === 'thinking' ? 4 : pose === 'frown' ? -3 : 0;
          const nod = c.mood === 'positive' && variant === 'together' ? Math.max(0, Math.sin((t - 1) * 4)) * 4 : 0;
          return (
            <g key={c.who} transform={`translate(${c.x}, ${760 + nod}) scale(${c.scale})`} opacity={progress(frame, (c.delay ?? 0) * fps, 14)}>
              <Bust who={c.who} mood={c.mood} blink={blink} tilt={tilt} />
            </g>
          );
        })}
        {variant === 'sato-worried' ? <ThoughtBubble frame={frame} fps={fps} /> : null}
      </svg>
      <div style={{position: 'absolute', left: 72, top: 150, color: 'rgba(255,255,255,0.75)', fontSize: 22, ...appear(frame, 4)}}>
        {cast.map((c) => `${characterById.get(c.who)?.name}（${characterById.get(c.who)?.title.replace(/^飲料工場 /, '')}）`).join('　')}
      </div>
    </AbsoluteFill>
  );
};

// ぼかした工場の背景（清潔な飲料ラインのシルエット）
const BackgroundLine: React.FC<{frame: number}> = ({frame}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, filter: 'blur(5px)', opacity: 0.45}}>
    <rect x={0} y={600} width={1920} height={40} fill="#23262B" />
    {Array.from({length: 12}, (_, i) => {
      const x = ((i * 190 + frame * 3) % 2100) - 100;
      return <rect key={i} x={x} y={470} width={56} height={130} rx={14} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={3} />;
    })}
    {Array.from({length: 6}, (_, i) => (
      <rect key={i} x={i * 340 + 40} y={180} width={18} height={420} fill="rgba(255,255,255,0.12)" />
    ))}
  </svg>
);

const ThoughtBubble: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const o = progress(frame, 0.6 * fps, 14);
  const t = frame / fps;
  return (
    <g opacity={o}>
      <circle cx={1270} cy={420} r={14} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={3} />
      <circle cx={1310} cy={370} r={22} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={3} />
      <rect x={1330} y={130} width={500} height={230} rx={40} fill="rgba(16,17,19,0.9)" stroke="rgba(255,255,255,0.7)" strokeWidth={3} />
      <line x1={1360} y1={300} x2={1800} y2={300} stroke="rgba(255,255,255,0.5)" strokeWidth={3} />
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 1380 + i * 80 + (i % 2 ? 20 : -10) + Math.sin(t * 4 + i) * 6;
        return (
          <g key={i} transform={`translate(${x}, 298) scale(0.45) rotate(${Math.sin(t * 5 + i) * 8})`}>
            <path d={BOTTLE_PATH} fill="rgba(150,205,240,0.2)" stroke={i === 2 ? X.redOnDark : 'rgba(255,255,255,0.9)'} strokeWidth={4} />
          </g>
        );
      })}
      <text x={1580} y={180} fill="rgba(255,255,255,0.75)" fontSize={24} fontWeight={700} textAnchor="middle">
        流れが乱れたときは……？
      </text>
    </g>
  );
};

