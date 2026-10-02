// 会議室の舞台。素材なし版は図形で描き、useImages=true なら画像に差し替える。

import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile} from 'remotion';
import type {CharacterKey, Pose, Script} from '../types';
import {FONT_FAMILY} from '../theme';

// 人物の立ち位置（横位置は画面幅に対する割合）
export const CHARACTER_X: Record<'left' | 'right', number> = {
  left: 0.27,
  right: 0.73,
};
const FOCUS_Y = 0.4;

type Props = {
  script: Script;
  poses: Record<CharacterKey, Pose>;
  focus: CharacterKey | null;
  // 現在のショット（同じ人物に寄り続けている区間）の経過フレーム
  framesInShot: number;
  desaturate: boolean;
};

export const Stage: React.FC<Props> = ({
  script,
  poses,
  focus,
  framesInShot,
  desaturate,
}) => {
  const {kenBurns, fps, width, useImages, backgroundImage} = script.meta;
  const focusChar = focus ? script.characters[focus] : null;

  // Ken Burns：話している人物に向かって、kenBurns.seconds 秒かけて kenBurns.scale 倍まで寄る
  const scale = focusChar
    ? interpolate(framesInShot, [0, kenBurns.seconds * fps], [1, kenBurns.scale], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;
  const originX = focusChar ? CHARACTER_X[focusChar.position] * 100 : 50;

  return (
    <AbsoluteFill
      style={{
        filter: desaturate ? 'saturate(0.35) brightness(0.96)' : undefined,
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          transformOrigin: `${originX}% ${FOCUS_Y * 100}%`,
        }}
      >
        {useImages ? (
          <Img
            src={staticFile(backgroundImage)}
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
          />
        ) : (
          <Room />
        )}
        {Object.entries(script.characters).map(([key, c]) =>
          useImages ? (
            <Img
              key={key}
              src={staticFile(c.images[poses[key] ?? 'front'])}
              style={{
                position: 'absolute',
                bottom: 0,
                height: '88%',
                left: CHARACTER_X[c.position] * width,
                transform: 'translateX(-50%)',
              }}
            />
          ) : (
            <Silhouette
              key={key}
              x={CHARACTER_X[c.position] * width}
              facing={c.position === 'left' ? 1 : -1}
              pose={poses[key] ?? 'front'}
              fill={key === 'tanaka' ? '#3a4150' : '#4a5247'}
              glasses={key === 'tanaka'}
            />
          ),
        )}
        {!useImages && <TableAndLaptop script={script} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 製造業の事務所の小会議室：蛍光灯、ホワイトボード、時計（18時）
const Room: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(#e2dfd7, #cfcac0 70%)'}}>
    {/* 蛍光灯 */}
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 560,
        width: 800,
        height: 22,
        background: '#fbfbf6',
        boxShadow: '0 0 60px 20px rgba(255,255,245,0.55)',
      }}
    />
    {/* ホワイトボード */}
    <div
      style={{
        position: 'absolute',
        left: 700,
        top: 130,
        width: 520,
        height: 300,
        background: '#f7f8f8',
        border: '10px solid #b8bcc0',
        borderRadius: 4,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 40,
            top: 50 + i * 60,
            width: 280 - i * 70,
            height: 5,
            borderRadius: 3,
            background: 'rgba(60,90,160,0.18)',
          }}
        />
      ))}
    </div>
    {/* 時計：18時 */}
    <svg
      style={{position: 'absolute', left: 1420, top: 150}}
      width={110}
      height={110}
      viewBox="0 0 110 110"
    >
      <circle cx={55} cy={55} r={50} fill="#fafafa" stroke="#8a8f96" strokeWidth={6} />
      <line x1={55} y1={55} x2={55} y2={88} stroke="#333" strokeWidth={5} strokeLinecap="round" />
      <line x1={55} y1={55} x2={55} y2={18} stroke="#333" strokeWidth={3} strokeLinecap="round" />
    </svg>
    {/* 腰壁 */}
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 640,
        height: 6,
        background: 'rgba(0,0,0,0.08)',
      }}
    />
  </AbsoluteFill>
);

// 人物のシルエット。表情の代わりに頭の傾きで「うつむき」「横向き」を表す
const Silhouette: React.FC<{
  x: number;
  facing: 1 | -1;
  pose: Pose;
  fill: string;
  glasses: boolean;
}> = ({x, facing, pose, fill, glasses}) => {
  const headDy = pose === 'down' ? 16 : 0;
  const headDx = pose === 'side' ? 14 * facing : pose === 'down' ? 6 * facing : 0;
  const headRotate = pose === 'down' ? 12 * facing : pose === 'side' ? 6 * facing : 0;
  return (
    <svg
      style={{position: 'absolute', left: x - 260, top: 230}}
      width={520}
      height={620}
      viewBox="0 0 520 620"
    >
      {/* 胴体 */}
      <path
        d="M 70 620 C 70 440, 120 330, 260 320 C 400 330, 450 440, 450 620 Z"
        fill={fill}
      />
      {/* 首 */}
      <rect x={232} y={250} width={56} height={90} rx={20} fill={fill} />
      {/* 頭 */}
      <g transform={`translate(${headDx} ${headDy}) rotate(${headRotate} 260 190)`}>
        <ellipse cx={260} cy={180} rx={82} ry={96} fill={fill} />
        {glasses && (
          <g
            fill="none"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={4}
            transform={`translate(${18 * facing} 0)`}
          >
            <rect x={206} y={168} width={44} height={28} rx={8} />
            <rect x={270} y={168} width={44} height={28} rx={8} />
            <line x1={250} y1={180} x2={270} y2={180} />
          </g>
        )}
      </g>
    </svg>
  );
};

// 机、ノートPC（評価シート表示中）、名札
const TableAndLaptop: React.FC<{script: Script}> = ({script}) => (
  <>
    <div
      style={{
        position: 'absolute',
        left: -40,
        right: -40,
        top: 740,
        bottom: -40,
        background: 'linear-gradient(#a2988a, #857b6e 18%, #6f665b)',
        boxShadow: '0 -6px 18px rgba(0,0,0,0.18)',
      }}
    />
    {/* ノートPC（背面から見た状態ではなく、斜めから画面が見える） */}
    <div style={{position: 'absolute', left: 960 - 150, top: 560, width: 300}}>
      <div
        style={{
          height: 185,
          background: '#2b2f36',
          borderRadius: '10px 10px 0 0',
          padding: 10,
        }}
      >
        <div style={{width: '100%', height: '100%', background: '#f4f6f9', padding: 12}}>
          <div style={{height: 14, width: '70%', background: '#1f5fbf', opacity: 0.6, marginBottom: 12}} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{display: 'flex', gap: 8, marginBottom: 10}}>
              <div style={{height: 10, flex: 3, background: '#c9ced6'}} />
              <div style={{height: 10, flex: 1, background: '#c9ced6'}} />
              <div style={{height: 10, flex: 1, background: '#c9ced6'}} />
            </div>
          ))}
        </div>
      </div>
      <div style={{height: 16, background: '#b9bdc4', borderRadius: '0 0 12px 12px', margin: '0 -24px'}} />
    </div>
    {/* 名札 */}
    {Object.entries(script.characters).map(([key, c]) => (
      <div
        key={key}
        style={{
          position: 'absolute',
          top: 752,
          left: CHARACTER_X[c.position] * script.meta.width,
          transform: 'translateX(-50%)',
          background: '#fbfaf7',
          borderTop: `8px solid ${c.color}`,
          borderRadius: 6,
          padding: '10px 28px',
          fontFamily: FONT_FAMILY,
          textAlign: 'center',
          boxShadow: '0 6px 14px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{fontSize: 34, fontWeight: 700, color: '#222'}}>{c.name}</div>
        <div style={{fontSize: 22, color: '#555'}}>{c.role}</div>
      </div>
    ))}
  </>
);
