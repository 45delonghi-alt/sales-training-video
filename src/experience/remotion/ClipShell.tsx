// すべての体験クリップ共通の枠：背景・見出し・素材の状態表示・字幕（セリフ）。
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {BrandMark} from '../../consulting/components/BrandMark';
import type {AssetStatus} from '../types';
import {lineSchedule} from '../data';
import {FONT, X} from './theme';
import {progress} from '../../consulting/components/anim';

export type ClipLine = {speaker: string; text: string};

export type ClipProps = {
  assetId: string;
  tone: 'light' | 'dark';
  label: string; // 左上のラベル（フェーズ名など）
  title?: string;
  lines: ClipLine[];
  dialogAt: number;
  showSubtitles: boolean;
  showStatus: boolean;
  status: AssetStatus[];
  kind: string;
  simulation?: boolean;
};

export {clipSeconds, lineSchedule} from '../data';

export const ClipShell: React.FC<ClipProps & {children: React.ReactNode}> = (p) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dark = p.tone === 'dark';
  const grid = dark ? X.darkLine : 'rgba(20,21,23,0.045)';
  const text = dark ? 'rgba(255,255,255,0.6)' : X.gray;
  const sched = lineSchedule(p.lines, p.dialogAt);
  const t = frame / fps;
  const current = sched.find((l) => t >= l.from && t < l.to);
  return (
    <AbsoluteFill style={{background: dark ? X.dark : X.paper, fontFamily: FONT, color: dark ? X.white : X.ink}}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${grid} 1px, transparent 1px), linear-gradient(90deg, ${grid} 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      {dark ? <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.05), rgba(0,0,0,0.55) 78%)'}} /> : null}
      {p.children}
      {/* 左上：ブランドとフェーズ */}
      <div style={{position: 'absolute', left: 72, top: 48, display: 'flex', alignItems: 'center', gap: 18}}>
        <BrandMark size={24} color={dark ? 'rgba(255,255,255,0.85)' : '#5A5D63'} />
        <div style={{width: 1, height: 22, background: text, opacity: 0.6}} />
        <div style={{fontSize: 18, letterSpacing: 3, fontWeight: 700, color: text}}>{p.label}</div>
      </div>
      {p.title ? (
        <div style={{position: 'absolute', left: 72, top: 92, fontSize: 40, fontWeight: 700, ...fade(frame, 4)}}>{p.title}</div>
      ) : null}
      {p.simulation ? <SimulationBadge /> : null}
      {p.showStatus ? <StatusTag status={p.status} kind={p.kind} dark={dark} /> : null}
      {p.showSubtitles && current ? <Subtitle line={current} frame={frame} fromFrame={Math.round(current.from * fps)} /> : null}
    </AbsoluteFill>
  );
};

const fade = (frame: number, start: number) => ({opacity: progress(frame, start, 12)});

const SPEAKER: Record<string, string> = {customer: 'お客様', sales: '営業', narration: ''};

const Subtitle: React.FC<{line: ClipLine; frame: number; fromFrame: number}> = ({line, frame, fromFrame}) => {
  const o = interpolate(frame - fromFrame, [0, 6], [0, 1], {extrapolateRight: 'clamp'});
  const who = SPEAKER[line.speaker] ?? '';
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 64, display: 'flex', justifyContent: 'center', opacity: o}}>
      <div
        style={{
          maxWidth: 1560,
          background: 'rgba(14,15,17,0.86)',
          borderLeft: `6px solid ${who ? X.red : 'transparent'}`,
          padding: '16px 34px 18px',
          display: 'flex',
          alignItems: 'baseline',
          gap: 22,
        }}
      >
        {who ? <span style={{fontSize: 26, fontWeight: 700, color: X.redOnDark, whiteSpace: 'nowrap'}}>{who}</span> : null}
        <span style={{fontSize: 40, fontWeight: 700, color: X.white, lineHeight: 1.45}}>{line.text}</span>
      </div>
    </div>
  );
};

// シミュレーションであることを常に示す（実測と誤解させない）
export const SimulationBadge: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      right: 72,
      top: 44,
      border: `3px solid ${X.red}`,
      color: X.red,
      background: 'rgba(255,255,255,0.92)',
      padding: '6px 18px 8px',
      fontSize: 24,
      fontWeight: 900,
      letterSpacing: 2,
    }}
  >
    シミュレーション
    <span style={{fontSize: 16, fontWeight: 700, marginLeft: 12, letterSpacing: 0}}>実測結果ではありません</span>
  </div>
);

const StatusTag: React.FC<{status: AssetStatus[]; kind: string; dark: boolean}> = ({status, kind, dark}) => {
  let label = '';
  if (status.includes('placeholder')) label = '仮映像：実写素材待ち';
  else if (status.includes('awaiting-license')) label = '公式製品画像：許諾確認待ち';
  else if (status.includes('awaiting-footage')) label = kind === 'demo' ? 'CG：実機映像に差し替え予定' : 'CG：実写に差し替え予定';
  if (!label) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 72,
        bottom: 26,
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: 1,
        color: dark ? 'rgba(255,255,255,0.55)' : X.gray,
        border: `1px dashed ${dark ? 'rgba(255,255,255,0.35)' : X.grayLight}`,
        padding: '3px 10px',
      }}
    >
      {label}
    </div>
  );
};
