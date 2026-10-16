// 話している人のワイプ。お客様から受領したバッジ（顔＋役割＋名前）を、話している間だけ出す。
//   OPTEX-FA＝画面の左下、お客様＝右下（全場面で統一）。0.25秒でフェード。ナレーションには出さない
//   字幕は中央（Kit の Subtitle の最大幅）に収め、左右のワイプと重ねない
import React from 'react';
import {Img, interpolate, staticFile} from 'remotion';
import type {FaceCue} from '../../data';

const FADE = 0.25;
// 1人ずつの受領画像（2026-10-16・丸い顔写真＋役割・名前の枠。assets-src/characters/badges-v3）。
// 高さは前のバッジ（約326px・上端 y≈714）以下に収め、図・表の左下・右下の角に重ならないようにする
export const BADGE_W = 320;
const SIDE = 40;
const BOTTOM = 24; // 高さ約347px。上端 y≈709（前のバッジの上端 714 とほぼ同じ）
// バッジ画像の縦横比（public/experience/people/<id>-badge.png・700×760）
const RATIO = 760 / 700;

export const SpeakerFaceOverlay: React.FC<{cues: FaceCue[]; t: number}> = ({cues, t}) => (
  <>
    {cues.map((c) => {
      if (t < c.audioStart - FADE || t > c.audioEnd + FADE) return null;
      const o = interpolate(t, [c.audioStart - FADE, c.audioStart, c.audioEnd, c.audioEnd + FADE], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      const left = c.displayPosition === 'bottom-left';
      return (
        <Img
          key={`${c.speakerId}-${c.audioStart}`}
          data-speaker={c.speakerId}
          src={staticFile(c.speakerImage)}
          style={{
            position: 'absolute',
            bottom: BOTTOM,
            [left ? 'left' : 'right']: SIDE,
            width: BADGE_W,
            height: BADGE_W * RATIO,
            objectFit: 'contain',
            opacity: o,
            transform: `scale(${0.94 + 0.06 * o})`,
            transformOrigin: left ? 'bottom left' : 'bottom right',
            filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.35))',
          }}
        />
      );
    })}
  </>
);
