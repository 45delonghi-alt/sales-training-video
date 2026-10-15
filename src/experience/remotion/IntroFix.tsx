// 導入動画（intro-final.mp4）0:30.8〜0:48.75 の差し替え用。センサを「コンベアの片側・ボトル下部の高さ・反対側に反射板」の
// 回帰反射型に描き直す（元の動画は、上から真下に光を出す概念図だった）。音声・字幕は元の動画のものをそのまま使う。
// 0:47.0（intro-slides P6）で「実際の本数 1,260／センサのカウント 1,262」になるように、ラインの位置と誤カウントの時刻を合わせている。
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../../consulting/components/Backdrop';
import {Conveyor} from '../../consulting/components/Conveyor';
import {CountHud, MissionHeader} from '../../consulting/scenes/Scene03Mission';
import {script} from '../../consulting/script';
import {FONT} from '../../consulting/theme';
import '@fontsource/noto-sans-jp/700.css';
import '@fontsource/noto-sans-jp/900.css';

export const INTRO_FIX = {from: 30.8, to: 48.75, offset: 112, sensorAt: 35.9, errorStart: 444};
export const introFixFrames = Math.round((INTRO_FIX.to - INTRO_FIX.from) * 30);

const spec = script.scenes.find((s) => s.id === 'Scene03Mission')! as unknown as {visual: {label: string; title: string; hud: React.ComponentProps<typeof CountHud>['hud']}};

export const IntroFix: React.FC = () => {
  const f = useCurrentFrame() + INTRO_FIX.offset;
  const sensor = INTRO_FIX.offset + Math.round((INTRO_FIX.sensorAt - INTRO_FIX.from) * 30);
  return (
    <AbsoluteFill style={{fontFamily: FONT, background: '#0D0E10'}}>
      <Backdrop tone="dark" sceneNo={3} />
      <Conveyor frame={f} sensorStart={sensor} errorStart={INTRO_FIX.errorStart} />
      <MissionHeader label={spec.visual.label} title={spec.visual.title} />
      <CountHud frame={f} start={sensor} error={INTRO_FIX.errorStart} hud={spec.visual.hud} />
    </AbsoluteFill>
  );
};
