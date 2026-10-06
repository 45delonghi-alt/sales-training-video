import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {SceneSpec} from '../types';
import {C} from '../theme';
import {Backdrop} from '../components/Backdrop';
import {useCue} from '../components/SceneShell';
import {appear, keyZoom, progress} from '../components/anim';

// 誤カウント → 数量が合わない → 確認作業が増える → 生産効率が下がる
// 「見えている問題」と「本当の課題」を括弧で示す
export const Scene06Impact: React.FC<{spec: SceneSpec<'Scene06Impact'>}> = ({spec}) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const {visual: v, animation: a} = spec;
  const chain = a.chain.map(cue);
  const surface = cue(a.surface);
  const root = cue(a.root);

  const BOX_W = 620;
  const BOX_H = 104;
  const GAP = 40;
  const LEFT = 420;
  const TOP = 150;
  const yOf = (i: number) => TOP + i * (BOX_H + GAP);
  // 下に行くほど深刻（白 → 黒）
  const shade = ['#FFFFFF', '#E9EAEC', '#3A3D44', C.ink];
  const textColor = [C.ink, C.ink, C.white, C.white];

  return (
    <AbsoluteFill>
      <Backdrop tone="light" sceneNo={6} />

      {v.chain.map((label, i) => (
        <React.Fragment key={label}>
          {i > 0 ? (
            <svg
              width={40}
              height={GAP}
              style={{position: 'absolute', left: LEFT + BOX_W / 2 - 20, top: yOf(i) - GAP}}
            >
              <line x1={20} y1={4} x2={20} y2={4 + (GAP - 14) * progress(frame, chain[i] - 6, 8)} stroke={C.red} strokeWidth={4} />
              <path d={`M 20 ${GAP - 2} L 11 ${GAP - 14} L 29 ${GAP - 14} Z`} fill={C.red} opacity={progress(frame, chain[i] - 2, 4)} />
            </svg>
          ) : null}
          <div
            style={{
              position: 'absolute',
              left: LEFT,
              top: yOf(i),
              width: BOX_W,
              height: BOX_H,
              ...appear(frame, chain[i], {dy: -20}),
              background: shade[i],
              border: `2px solid ${i < 2 ? C.line : shade[i]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 52,
              fontWeight: 900,
              color: textColor[i],
            }}
          >
            <span style={{display: 'inline-block', transform: `scale(${keyZoom(frame, chain[i])})`}}>{label}</span>
          </div>
        </React.Fragment>
      ))}

      {/* 見えている問題 */}
      <Bracket
        top={yOf(0)}
        height={BOX_H}
        left={LEFT + BOX_W + 40}
        p={progress(frame, surface, 16)}
        color={C.gray}
        label={v.surfaceTag.label}
        text={v.surfaceTag.text}
        textColor={C.ink2}
      />
      {/* 本当の課題 */}
      <Bracket
        top={yOf(2)}
        height={BOX_H * 2 + GAP}
        left={LEFT + BOX_W + 40}
        p={progress(frame, root, 16)}
        color={C.red}
        label={v.rootTag.label}
        text={v.rootTag.text}
        textColor={C.red}
        zoom={keyZoom(frame, root)}
      />
      {/* 見えている問題 → 本当の課題 の流れ */}
      <svg
        width={60}
        height={yOf(2) - yOf(0) - BOX_H}
        style={{position: 'absolute', left: LEFT + BOX_W + 120, top: yOf(0) + BOX_H + 8, opacity: progress(frame, root - 10, 10)}}
      >
        <line x1={30} y1={0} x2={30} y2={interpolate(progress(frame, root - 10, 14), [0, 1], [0, yOf(2) - yOf(0) - BOX_H - 30])} stroke={C.grayLight} strokeWidth={3} strokeDasharray="8 6" />
      </svg>
    </AbsoluteFill>
  );
};

const Bracket: React.FC<{
  top: number;
  height: number;
  left: number;
  p: number;
  color: string;
  label: string;
  text: string;
  textColor: string;
  zoom?: number;
}> = ({top, height, left, p, color, label, text, textColor, zoom = 1}) => (
  <div style={{position: 'absolute', top, left, height, display: 'flex', alignItems: 'center', opacity: p}}>
    <div
      style={{
        width: 26,
        height: height * p,
        borderTop: `4px solid ${color}`,
        borderRight: `4px solid ${color}`,
        borderBottom: `4px solid ${color}`,
      }}
    />
    <div style={{marginLeft: 34, transform: `translateX(${(1 - p) * 20}px) scale(${zoom})`, transformOrigin: 'left center'}}>
      <div style={{fontSize: 26, fontWeight: 700, color, letterSpacing: 2}}>{label}</div>
      <div style={{fontSize: 52, fontWeight: 900, color: textColor, marginTop: 4}}>{text}</div>
    </div>
  </div>
);
