import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import type {SceneSpec} from '../types';
import {C} from '../theme';
import {Backdrop} from '../components/Backdrop';
import {useCue, useSceneDuration} from '../components/SceneShell';
import {appear, progress} from '../components/anim';
import {script} from '../script';
import {Highlight} from './Scene04Question';

const coverImage = script.scenes[0].id === 'Scene01Opening' ? script.scenes[0].visual.coverImage : '';

// 最後の画面：現場の課題を見つけ、解決策を提案する。／CONSULTING SALES EXPERIENCE／OPTEX FA
export const Scene09Ending: React.FC<{spec: SceneSpec<'Scene09Ending'>}> = ({spec}) => {
  const frame = useCurrentFrame();
  const duration = useSceneDuration();
  const cue = useCue();
  const {visual: v, animation: a} = spec;
  const english = cue(a.english);
  const brand = cue(a.brand);
  const panelP = progress(frame, 0, 24);

  return (
    <AbsoluteFill>
      <Backdrop tone="light" sceneNo={9} />

      {/* 右：表紙の人物（斜めに切り抜き） */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 980 + (1 - panelP) * 200,
          right: 0,
          clipPath: 'polygon(18% 0, 100% 0, 100% 100%, 0 100%)',
          overflow: 'hidden',
          opacity: panelP,
        }}
      >
        <Img
          src={staticFile(coverImage)}
          style={{
            // 表紙の人物部分だけを見せる（右側のコピー文字は枠の外に出す）
            position: 'absolute',
            height: 1788,
            left: -1380,
            top: -40,
            transform: `scale(${interpolate(frame, [0, duration], [1.0, 1.05])})`,
            transformOrigin: '1900px 500px',
          }}
        />
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(244,244,242,0.25), rgba(0,0,0,0) 40%)'}} />
      </div>
      {/* 斜めの赤い帯 */}
      <div
        style={{
          position: 'absolute',
          top: -60,
          bottom: -60,
          left: 960 + (1 - panelP) * 200,
          width: 34,
          background: C.red,
          transform: 'skewX(-9.6deg)',
          transformOrigin: 'bottom',
          opacity: panelP,
        }}
      />

      <div style={{position: 'absolute', left: 140, top: 250}}>
        {v.catchCopy.map((l, i) => (
          <div key={l} style={{fontSize: 80, fontWeight: 900, color: C.ink, lineHeight: 1.35, ...appear(frame, 8 + i * 10, {dx: -30, dy: 0, dur: 18})}}>
            <Highlight text={l} word={i === 0 ? '課題' : '提案'} />
          </div>
        ))}
        <div style={{height: 6, width: 300 * progress(frame, 26, 18), background: C.red, margin: '34px 0 30px'}} />
        <div style={{fontSize: 30, letterSpacing: 8, fontWeight: 700, color: C.ink2, ...appear(frame, english, {dy: 14})}}>{v.english}</div>

        {/* ブランド表記（正式ロゴのデータを受領したら画像に差し替える） */}
        <div style={{marginTop: 80, ...appear(frame, brand, {dy: 20, dur: 18})}}>
          <div style={{fontSize: 76, fontWeight: 900, letterSpacing: 2, color: C.ink, lineHeight: 1, fontStyle: 'italic'}}>
            OPTEX <span style={{color: C.red}}>FA</span>
          </div>
          <div style={{fontSize: 24, fontWeight: 700, color: C.ink2, marginTop: 12, letterSpacing: 2}}>オプテックス・エフエー株式会社</div>
        </div>
      </div>

      {/* 最後に暗転 */}
      <AbsoluteFill style={{background: C.dark, opacity: progress(frame, duration - 24, 22)}} />
    </AbsoluteFill>
  );
};
