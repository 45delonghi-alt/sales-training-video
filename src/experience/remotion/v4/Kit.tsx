// 体験パート（後半）の画面の枠。導入動画（src/consulting）の部品・配色・字幕をそのまま使い、前半と同じ見た目にそろえる。
//   背景：導入動画の Backdrop（白＝説明・データ、黒＝現場・会話）。写真は使わない
//   見出し：導入動画の「MISSION」と同じ、赤いラベル＋太字のタイトル
//   字幕：導入動画と同じ黒い帯＋赤い縦線。重要な語は赤
//   色：OPTEX-FA のコーポレートカラー 赤 #E60012／白／黒
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {appear} from '../../../consulting/components/anim';
import {C, FONT} from '../../../consulting/theme';
import {characterById, displayLines} from '../../data';
import type {Speaker} from '../../types';

export {C, FONT};

export const useSec = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {frame, fps, t: frame / fps};
};

// 導入動画と同じ動き（フェード＋スライド）。at は秒
export const ap = (frame: number, atSec: number, fps = 30, opts: {dx?: number; dy?: number; dur?: number} = {}) => appear(frame, atSec * fps, opts);

export type Tone = 'light' | 'dark';

// 説明用のパネル。角は丸めない（導入動画と同じ）
export const Panel: React.FC<{tone?: Tone; accent?: 'left' | 'top'; style?: React.CSSProperties; children: React.ReactNode}> = ({tone = 'light', accent, style, children}) => {
  const dark = tone === 'dark';
  return (
    <div
      style={{
        position: 'absolute',
        background: dark ? 'rgba(13,14,16,0.82)' : C.white,
        border: `2px solid ${dark ? 'rgba(255,255,255,0.3)' : C.line}`,
        borderLeft: accent === 'left' ? `10px solid ${C.red}` : undefined,
        borderTop: accent === 'top' ? `10px solid ${C.red}` : undefined,
        color: dark ? C.white : C.ink,
        padding: '30px 40px',
        fontFamily: FONT,
        boxShadow: dark ? undefined : '0 18px 40px rgba(17,18,20,0.08)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// 赤い四角のラベル（導入動画の「MISSION」と同じ）
export const RedLabel: React.FC<{children: React.ReactNode; size?: number; style?: React.CSSProperties}> = ({children, size = 26, style}) => (
  <span style={{display: 'inline-block', fontSize: size, fontWeight: 900, letterSpacing: 3, color: C.white, background: C.red, padding: '3px 16px 5px', whiteSpace: 'nowrap', ...style}}>{children}</span>
);

// 黒い四角のラベル（明るい背景用）
export const InkLabel: React.FC<{children: React.ReactNode; size?: number; style?: React.CSSProperties}> = ({children, size = 24, style}) => (
  <span style={{display: 'inline-block', fontSize: size, fontWeight: 900, letterSpacing: 2, color: C.white, background: C.ink, padding: '3px 14px 5px', whiteSpace: 'nowrap', ...style}}>{children}</span>
);

export const Red: React.FC<{children: React.ReactNode; onDark?: boolean}> = ({children, onDark}) => <span style={{color: onDark ? C.redOnDark : C.red}}>{children}</span>;

// 見出し：フェーズ名（赤いラベル）＋タイトル
export const Heading: React.FC<{phase?: string; title: string; tone: Tone; frame: number}> = ({phase, title, tone, frame}) => (
  <div style={{position: 'absolute', left: 72, top: 104, display: 'flex', alignItems: 'center', gap: 22, fontFamily: FONT, ...appear(frame, 0, {dx: -30, dy: 0, dur: 12})}}>
    {phase ? <RedLabel size={28}>{phase}</RedLabel> : null}
    <span style={{fontSize: 40, fontWeight: 900, color: tone === 'dark' ? C.white : C.ink}}>{title}</span>
  </div>
);

// 字幕で赤く強調する語
const EMPHASIS = ['本当の困りごと', '安定した生産', '同じ条件', '課題', '原因', '仮説', '確かめ', '実測', '記録', '未確定', 'KR-Qシリーズ', 'ボトルの下部', '1本なのに'];

export const Emph: React.FC<{text: string; color?: string}> = ({text, color = C.redOnDark}) => {
  const re = new RegExp(`(${EMPHASIS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  return (
    <>
      {text.split(re).map((part, i) =>
        EMPHASIS.includes(part) ? (
          <span key={i} style={{color, fontWeight: 900}}>
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
};

// 表示用の改行（data/displayBreaks.json）を反映した文。行ごとに強調語を赤くする
export const BrokenText: React.FC<{lineId?: string; text: string; color?: string}> = ({lineId, text, color}) => {
  const {lines, nowrap} = displayLines(lineId, text);
  return (
    <span style={nowrap ? {whiteSpace: 'nowrap'} : undefined}>
      {lines.map((l, i) => (
        <React.Fragment key={i}>
          {i ? <br /> : null}
          <Emph text={l} color={color} />
        </React.Fragment>
      ))}
    </span>
  );
};

// 話者の表示（お客様／OPTEX-FA）
export const speakerInfo = (sp: Speaker) => {
  const c = characterById.get(sp);
  if (!c || sp === 'narration') return null;
  const unit = c.title.replace(/（.*）/, '').replace(/^OPTEX-FA\s*/, '');
  const side = c.role === 'customer' ? 'お客様' : 'OPTEX-FA';
  return {name: c.name, unit, side, customer: c.role === 'customer'};
};

// 字幕：導入動画と同じ黒い帯＋赤い縦線。話者名を赤で前に置く
export const Subtitle: React.FC<{speaker: Speaker; text: string; from: number; frame: number; lineId?: string}> = ({speaker, text, from, frame, lineId}) => {
  const opacity = Math.min(1, Math.max(0, (frame - from) / 4));
  const who = speakerInfo(speaker);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 64, display: 'flex', justifyContent: 'center', opacity, fontFamily: FONT}}>
      <div
        style={{
          // 左右の下にワイプ（SpeakerFace・幅300）が出るので、字幕は中央に収める
          maxWidth: 1160,
          background: 'rgba(13,14,16,0.84)',
          color: C.white,
          fontSize: 44,
          fontWeight: 700,
          letterSpacing: 1.5,
          padding: '14px 40px 16px',
          borderLeft: `6px solid ${C.red}`,
          lineHeight: 1.35,
        }}
      >
        {who ? <span style={{color: C.redOnDark, fontWeight: 900, fontSize: 30, marginRight: 20, verticalAlign: 3}}>{who.name}</span> : null}
        <BrokenText lineId={lineId} text={text} />
      </div>
    </div>
  );
};

// 右上の状態表示（シミュレーション・架空データ・説明用の表現）
export const Tags: React.FC<{tags: string[]; tone: Tone}> = ({tags, tone}) =>
  tags.length ? (
    <div style={{position: 'absolute', right: 72, top: 92, display: 'flex', gap: 8, fontFamily: FONT}}>
      {tags.map((t) => (
        <span
          key={t}
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 1,
            color: tone === 'dark' ? 'rgba(255,255,255,0.8)' : C.gray,
            border: `1.5px solid ${tone === 'dark' ? 'rgba(255,255,255,0.35)' : C.grayLight}`,
            padding: '2px 10px',
          }}
        >
          {t}
        </span>
      ))}
    </div>
  ) : null;
