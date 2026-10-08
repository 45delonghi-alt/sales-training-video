// お客様との対話（営業担当の一人称）。実写が届くまでは線画の仮素材。
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {X} from '../theme';
import {Bust, type Mood} from '../Person';
import {BOTTLE_PATH} from '../FactoryLine';
import {appear, progress} from '../../../consulting/components/anim';

const MOOD: Record<string, Mood> = {
  thinking: 'thinking',
  request: 'request',
  uneasy: 'uneasy',
  bottles: 'positive',
  worried: 'worried',
  cool: 'cool',
  together: 'positive',
};

export const CustomerScene: React.FC<{variant: string}> = ({variant}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const blink = t % 3.2 > 3.05;
  const lean = variant === 'request' ? interpolate(frame, [0, 1.2 * fps], [1, 1.06], {extrapolateRight: 'clamp'}) : 1;
  const tilt = variant === 'uneasy' ? -8 * progress(frame, 0.6 * fps, 18) : variant === 'thinking' ? 4 : 0;
  const cx = variant === 'together' ? 760 : 960;
  return (
    <AbsoluteFill>
      <BackgroundLine frame={frame} />
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {/* 机（手前） */}
        <rect x={0} y={960} width={1920} height={120} fill="#1A1C20" />
        <line x1={0} y1={960} x2={1920} y2={960} stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
        <g transform={`translate(${cx}, 760) scale(${1.25 * lean})`}>
          <Bust mood={MOOD[variant] ?? 'neutral'} blink={blink} tilt={tilt} />
        </g>
        {variant === 'together' ? (
          <g transform="translate(1290, 800) scale(1.0)" opacity={progress(frame, 1.6 * fps, 16)}>
            <Bust mood="positive" name="設備担当" color="rgba(255,255,255,0.85)" />
          </g>
        ) : null}
        {variant === 'bottles' ? (
          <g opacity={progress(frame, 0.8 * fps, 14)}>
            {[860, 1060].map((x, i) => (
              <g key={x} transform={`translate(${x}, ${interpolate(frame, [0.8 * fps, 1.8 * fps], [900, 990], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}) scale(1.1)`}>
                <path d={BOTTLE_PATH} fill="rgba(150,205,240,0.18)" stroke="rgba(255,255,255,0.95)" strokeWidth={2.4} />
                <rect x={-16} y={-250} width={32} height={24} rx={3} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={2.4} />
                {i === 0 ? null : <rect x={-30} y={-190} width={60} height={34} fill="rgba(255,255,255,0.14)" />}
              </g>
            ))}
          </g>
        ) : null}
        {variant === 'worried' ? <ThoughtBubble frame={frame} fps={fps} /> : null}
      </svg>
      <div style={{position: 'absolute', left: 72, top: 150, color: 'rgba(255,255,255,0.7)', fontSize: 22, ...appear(frame, 4)}}>
        お客様：飲料工場 設備課の担当者
      </div>
    </AbsoluteFill>
  );
};

// ぼかした工場の背景（ラインのシルエット）
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
