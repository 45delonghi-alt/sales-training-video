// v3（写真ベース）の画面の枠：写真＋カメラの動き、黒帯の見出し、字幕カード、状態の表示。
// デザイン基準：添付のインフォグラフィック（黒・白・赤 #D7141E、黒帯の見出し、白い説明カード、赤の強調）
import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {characterById} from '../../data';
import platesJson from '../../data/plates.json';
import type {Plate, Shot, Speaker} from '../../types';
import {FONT, X} from '../theme';

export const plates = platesJson as Plate[];
export const plateById = new Map(plates.map((p) => [p.plateId, p]));

// 写真が届くまでの代わり（人物マスターや、届いている写真の一部を使う）
const FALLBACK: Record<string, Shot['focus'] & {plate: string}> = {
  F02: {plate: 'CAST', x: 0.7, y: 0.36, z0: 1.55, z1: 1.62},
  F03: {plate: 'CAST', x: 0.615, y: 0.3, z0: 2.5, z1: 2.6},
  F04: {plate: 'CAST', x: 0.615, y: 0.3, z0: 2.7, z1: 2.8},
  F05: {plate: 'CAST', x: 0.615, y: 0.34, z0: 2.2, z1: 2.25},
  F06: {plate: 'CAST', x: 0.82, y: 0.32, z0: 2.3, z1: 2.4},
  F07: {plate: 'CAST', x: 0.82, y: 0.3, z0: 2.7, z1: 2.8},
  F08: {plate: 'F01L', x: 0.6, y: 0.6, z0: 1.1, z1: 1.2},
  F10: {plate: 'F09', x: 0.45, y: 0.72, z0: 2.4, z1: 2.5},
  F11: {plate: 'F01L', x: 0.2, y: 0.4, z0: 1.3, z1: 1.35},
  F12: {plate: 'F09', x: 0.35, y: 0.6, z0: 1.3, z1: 1.35},
  F13: {plate: 'CAST', x: 0.45, y: 0.4, z0: 1.15, z1: 1.2},
  F14: {plate: 'CAST', x: 0.185, y: 0.3, z0: 2.5, z1: 2.6},
  F15: {plate: 'CAST', x: 0.39, y: 0.3, z0: 2.4, z1: 2.5},
  F16: {plate: 'F01L', x: 0.5, y: 0.5, z0: 1.0, z1: 1.1},
  F17: {plate: 'CAST', x: 0.5, y: 0.4, z0: 1.05, z1: 1.1},
  F18: {plate: 'CAST', x: 0.5, y: 0.42, z0: 1.08, z1: 1.12},
};

export const plateReady = (id: string) => {
  const p = plateById.get(id);
  return !!p && p.status !== 'awaiting';
};

// 使う写真と注視点（届いていなければ代わりの写真）
export const resolvePlate = (shot: Shot) => {
  if (plateReady(shot.plate)) return {plate: plateById.get(shot.plate)!, focus: shot.focus, substitute: false};
  const fb = FALLBACK[shot.plate];
  if (fb && plateReady(fb.plate)) return {plate: plateById.get(fb.plate)!, focus: fb, substitute: true};
  return {plate: undefined, focus: shot.focus, substitute: true};
};

// 写真＋ゆっくりしたカメラの動き（寄り・引き）
export const PlatePhoto: React.FC<{shot: Shot; progress: number; dim?: number; blur?: number}> = ({shot, progress, dim = 0, blur = 0}) => {
  const {plate, focus} = resolvePlate(shot);
  const z = focus.z0 + (focus.z1 - focus.z0) * progress;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#C9D3DC'}}>
      {plate ? (
        <Img
          src={staticFile(plate.file)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`,
            transform: `scale(${z})`,
            filter: blur ? `blur(${blur}px)` : undefined,
          }}
        />
      ) : (
        <AbsoluteFill style={{background: 'linear-gradient(135deg, #DDE5EC, #AEBBC7)'}} />
      )}
      {dim ? <AbsoluteFill style={{background: `rgba(10,12,16,${dim})`}} /> : null}
    </AbsoluteFill>
  );
};

// 黒帯の見出し（番号は赤）
export const Header: React.FC<{no?: string; title: string; frame: number}> = ({no, title, frame}) => {
  const p = interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 44,
        display: 'flex',
        alignItems: 'baseline',
        gap: 18,
        background: 'rgba(14,15,17,0.92)',
        padding: '14px 44px 16px 56px',
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        fontFamily: FONT,
      }}
    >
      {no ? <span style={{fontSize: 54, fontWeight: 900, color: X.redOnDark, lineHeight: 1}}>{Number(no)}.</span> : null}
      <span style={{fontSize: 46, fontWeight: 900, color: X.white, lineHeight: 1.1}}>{title}</span>
    </div>
  );
};

export const Brand: React.FC = () => (
  <div style={{position: 'absolute', right: 52, top: 52, display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT, color: X.white, textShadow: '0 1px 6px rgba(0,0,0,0.5)'}}>
    <div style={{width: 12, height: 26, background: X.red, transform: 'skewX(-18deg)'}} />
    <span style={{fontSize: 24, fontWeight: 900, letterSpacing: 2}}>OPTEX-FA</span>
    <span style={{width: 1, height: 22, background: 'rgba(255,255,255,0.7)'}} />
    <span style={{fontSize: 17, letterSpacing: 3, fontWeight: 700}}>CONSULTING SALES EXPERIENCE</span>
  </div>
);

const roleLabel = (sp: Speaker) => {
  const c = characterById.get(sp);
  if (!c || sp === 'narration') return '';
  if (sp === 'sales') return 'あなた（営業）';
  const unit = c.title.replace(/（.*）/, '').replace(/^飲料工場 /, '');
  return `${c.name}（${unit}）`;
};

// 字幕：白いカード。話者名は赤
export const Subtitle: React.FC<{speaker: Speaker; text: string; from: number; frame: number}> = ({speaker, text, from, frame}) => {
  const o = interpolate(frame - from, [0, 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const label = roleLabel(speaker);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 56, display: 'flex', justifyContent: 'center', opacity: o, fontFamily: FONT}}>
      <div
        style={{
          maxWidth: 1560,
          background: speaker === 'narration' ? 'rgba(14,15,17,0.86)' : 'rgba(255,255,255,0.96)',
          color: speaker === 'narration' ? X.white : X.ink,
          borderRadius: 14,
          padding: '18px 34px 20px',
          boxShadow: '0 10px 36px rgba(0,0,0,0.28)',
          borderLeft: speaker === 'narration' ? `8px solid ${X.red}` : undefined,
          fontSize: 40,
          fontWeight: 700,
          lineHeight: 1.45,
        }}
      >
        {label ? <span style={{color: X.red, fontWeight: 900, fontSize: 28, marginRight: 18, verticalAlign: 2}}>{label}</span> : null}
        {text}
      </div>
    </div>
  );
};

// 左下の状態表示（仮画像・架空データ・シミュレーションなど）
export const Tags: React.FC<{tags: string[]}> = ({tags}) =>
  tags.length ? (
    <div style={{position: 'absolute', left: 40, bottom: 14, display: 'flex', gap: 10, fontFamily: FONT}}>
      {tags.map((t) => (
        <span key={t} style={{fontSize: 17, fontWeight: 700, color: X.white, background: 'rgba(14,15,17,0.72)', padding: '3px 12px', borderRadius: 4}}>
          {t}
        </span>
      ))}
    </div>
  ) : null;

// 白い説明カード
export const Card: React.FC<{style?: React.CSSProperties; children: React.ReactNode; accent?: boolean}> = ({style, children, accent}) => (
  <div
    style={{
      position: 'absolute',
      background: 'rgba(255,255,255,0.96)',
      borderRadius: 16,
      boxShadow: '0 14px 40px rgba(0,0,0,0.25)',
      padding: '26px 32px',
      fontFamily: FONT,
      color: X.ink,
      borderTop: accent ? `8px solid ${X.red}` : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

// ふわっと出す（フックではない純粋な関数。ループや条件の中でも使える）
export const ap = (frame: number, at: number, dur = 10) => {
  const p = interpolate(frame, [at, at + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return {opacity: p, transform: `translateY(${(1 - p) * 18}px)`};
};

export const useSec = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {frame, fps, t: frame / fps, f: (s: number) => Math.round(s * fps)};
};
