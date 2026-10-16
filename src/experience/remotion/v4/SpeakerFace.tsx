// 話している人のワイプ。お客様から受領したバッジ（顔＋役割＋名前）を、話している間だけ出す。
//   OPTEX-FA＝画面の左下、お客様＝右下（全場面で統一）。0.25秒でフェード。ナレーションには出さない
//   字幕は中央（Kit の Subtitle の最大幅）に収め、左右のワイプと重ねない
import React from 'react';
import {Img, interpolate, staticFile} from 'remotion';
import type {FaceCue} from '../../data';

const FADE = 0.25;
export const BADGE_W = 300;
const SIDE = 40;
const BOTTOM = 40;
// バッジ画像の縦横比（public/experience/people/<id>-badge.png・約340×462。役割＋名前の帯つき）
const RATIO = 462 / 340;

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
