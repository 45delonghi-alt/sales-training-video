import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import type {SceneSpec} from '../types';
import {C} from '../theme';
import {Backdrop} from '../components/Backdrop';
import {useCue} from '../components/SceneShell';
import {appear, fadeOut, keyZoom, progress} from '../components/anim';
import {Icon} from '../components/Icon';

// 表紙 → 「営業＝商品紹介・価格提示」という一般的なイメージ → 「それだけではない。」
export const Scene01Opening: React.FC<{spec: SceneSpec<'Scene01Opening'>}> = ({spec}) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const {visual: v, animation: a} = spec;
  const cardStarts = a.showOldImage.map(cue);
  const coverEnd = cardStarts[0] - 12;
  const check = cue(a.showCheck);
  const statement = cue(a.showStatement);
  const stmtP = progress(frame, statement, 16);

  return (
    <AbsoluteFill>
      <Backdrop tone="light" sceneNo={1} />

      {/* 従来の営業イメージ */}
      <div
        style={{
          position: 'absolute',
          top: 200 - stmtP * 40,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 64,
          opacity: interpolate(stmtP, [0, 1], [1, 0.35]),
          transform: `scale(${interpolate(stmtP, [0, 1], [1, 0.86])})`,
        }}
      >
        {v.oldImage.map((item, i) => (
          <div
            key={item.label}
            style={{
              ...appear(frame, cardStarts[i], {dy: 30}),
              width: 520,
              height: 300,
              background: C.white,
              border: `2px solid ${C.line}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 26,
              position: 'relative',
            }}
          >
            <Icon name={item.icon} size={92} color={C.ink2} />
            <div style={{fontSize: 52, fontWeight: 700, color: C.ink}}>{item.label}</div>
            {/* 「それも営業の仕事」のチェック */}
            <div
              style={{
                position: 'absolute',
                right: 22,
                top: 20,
                width: 56,
                height: 56,
                borderRadius: 28,
                background: C.ink,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: progress(frame, check + i * 6, 10),
                transform: `scale(${keyZoom(frame, check + i * 6, 1.3)})`,
              }}
            >
              <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth={3.2}>
                <path d="M4 12.5 L10 18 L20 6" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* それだけではない。 */}
      <div
        style={{
          position: 'absolute',
          top: 600,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: stmtP,
          transform: `scale(${keyZoom(frame, statement)})`,
        }}
      >
        <div style={{fontSize: 120, fontWeight: 900, color: C.ink, letterSpacing: 6}}>{v.statement}</div>
        <div
          style={{
            height: 10,
            background: C.red,
            width: 820 * progress(frame, statement + 8, 16),
            marginTop: 6,
          }}
        />
      </div>

      {/* 表紙 */}
      <AbsoluteFill style={{opacity: fadeOut(frame, coverEnd, 14)}}>
        <Img
          src={staticFile(v.coverImage)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${interpolate(frame, [0, coverEnd + 14], [1.0, 1.06], {extrapolateRight: 'clamp'})})`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
