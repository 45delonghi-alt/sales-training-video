// 背景：白（説明パート）と黒（現場パート）。うっすらグリッドと計測器風の目盛りで製造業・センサUIを想起させる。
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, H, W} from '../theme';
import {BrandMark} from './BrandMark';

export const Backdrop: React.FC<{
  tone: 'light' | 'dark';
  sceneNo: number;
  label?: string;
  // 背景とラベルの間に描く装飾（赤い帯など）
  decor?: React.ReactNode;
}> = ({tone, sceneNo, label = 'CONSULTING SALES EXPERIENCE', decor}) => {
  const frame = useCurrentFrame();
  const dark = tone === 'dark';
  const grid = dark ? C.darkLine : 'rgba(17,18,20,0.045)';
  const text = dark ? 'rgba(255,255,255,0.55)' : C.gray;
  // グリッドはごくゆっくり流す（静止画っぽさを避ける）
  const shift = (frame * 0.25) % 60;
  return (
    <AbsoluteFill style={{background: dark ? C.dark : C.paper}}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${grid} 1px, transparent 1px), linear-gradient(90deg, ${grid} 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          backgroundPosition: `${shift}px 0px`,
        }}
      />
      {dark ? (
        <AbsoluteFill
          style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.06), rgba(0,0,0,0.55) 75%)'}}
        />
      ) : null}
      {decor}
      {/* 左上：ラベル */}
      <div style={{position: 'absolute', left: 72, top: 50, display: 'flex', alignItems: 'center', gap: 18}}>
        <BrandMark size={24} color={dark ? 'rgba(255,255,255,0.8)' : '#5A5D63'} />
        <div style={{width: 1, height: 22, background: text, opacity: 0.6}} />
        <div style={{fontSize: 18, letterSpacing: 4, fontWeight: 700, color: text}}>{label}</div>
      </div>
      {/* 右上：シーン番号 */}
      <div
        style={{
          position: 'absolute',
          right: 72,
          top: 52,
          fontSize: 20,
          letterSpacing: 3,
          color: text,
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span style={{color: C.red, fontWeight: 700}}>{String(sceneNo).padStart(2, '0')}</span> / 09
      </div>
      {/* 四隅の目盛り */}
      <CornerMarks color={dark ? 'rgba(255,255,255,0.25)' : 'rgba(17,18,20,0.18)'} />
    </AbsoluteFill>
  );
};

const CornerMarks: React.FC<{color: string}> = ({color}) => {
  const L = 28;
  const m = 36;
  const s = {position: 'absolute' as const, width: L, height: L, borderColor: color, borderStyle: 'solid'};
  return (
    <>
      <div style={{...s, left: m, top: m, borderWidth: '2px 0 0 2px'}} />
      <div style={{...s, right: m, top: m, borderWidth: '2px 2px 0 0'}} />
      <div style={{...s, left: m, bottom: m, borderWidth: '0 0 2px 2px'}} />
      <div style={{...s, right: m, bottom: m, borderWidth: '0 2px 2px 0'}} />
      <div style={{position: 'absolute', left: W / 2 - 1, top: m, width: 2, height: 10, background: color}} />
      <div style={{position: 'absolute', left: W / 2 - 1, top: H - m - 10, width: 2, height: 10, background: color}} />
    </>
  );
};

// 表紙と同じ斜めの赤い帯
export const RedSlash: React.FC<{
  progress: number;
  left: number;
  width: number;
  skew?: number;
  color?: string;
  opacity?: number;
}> = ({progress, left, width, skew = -18, color = C.red, opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      top: -100,
      bottom: -100,
      left: left + (1 - progress) * 500,
      width,
      background: color,
      transform: `skewX(${skew}deg)`,
      opacity: progress * opacity,
    }}
  />
);
