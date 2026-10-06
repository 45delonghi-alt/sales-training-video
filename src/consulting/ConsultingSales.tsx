// 導入動画「コンサルティング営業体験」全体：Scene の連結（フェード）、BGM、フォント読み込み
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';
import '@fontsource/noto-sans-jp/900.css';

import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, interpolate, staticFile} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {script} from './script';
import type {AnySceneSpec, SceneSpec} from './types';
import type {SceneTiming, Timeline} from './timeline';
import {FONT, C} from './theme';
import {SceneShell} from './components/SceneShell';
import {Scene01Opening} from './scenes/Scene01Opening';
import {Scene02WhatIsSales} from './scenes/Scene02WhatIsSales';
import {Scene03Mission} from './scenes/Scene03Mission';
import {Scene04Question} from './scenes/Scene04Question';
import {Scene05CustomerGoal} from './scenes/Scene05CustomerGoal';
import {Scene06Impact} from './scenes/Scene06Impact';
import {Scene07YourMission} from './scenes/Scene07YourMission';
import {Scene08SensorOptions} from './scenes/Scene08SensorOptions';
import {Scene09Ending} from './scenes/Scene09Ending';

export type ConsultingProps = {
  timeline: Timeline | null;
  hasBgm: boolean;
};

const useFonts = () => {
  const [handle] = useState(() => delayRender('Noto Sans JP の読み込み'));
  useEffect(() => {
    const text = JSON.stringify(script) + '0123456789+±⚠/｜＝“―';
    Promise.all([400, 500, 700, 900].map((w) => document.fonts.load(`${w} 40px "Noto Sans JP"`, text))).finally(() =>
      continueRender(handle),
    );
  }, [handle]);
};

const SceneView: React.FC<{spec: AnySceneSpec}> = ({spec}) => {
  switch (spec.id) {
    case 'Scene01Opening':
      return <Scene01Opening spec={spec as SceneSpec<'Scene01Opening'>} />;
    case 'Scene02WhatIsSales':
      return <Scene02WhatIsSales spec={spec as SceneSpec<'Scene02WhatIsSales'>} />;
    case 'Scene03Mission':
      return <Scene03Mission spec={spec as SceneSpec<'Scene03Mission'>} />;
    case 'Scene04Question':
      return <Scene04Question spec={spec as SceneSpec<'Scene04Question'>} />;
    case 'Scene05CustomerGoal':
      return <Scene05CustomerGoal spec={spec as SceneSpec<'Scene05CustomerGoal'>} />;
    case 'Scene06Impact':
      return <Scene06Impact spec={spec as SceneSpec<'Scene06Impact'>} />;
    case 'Scene07YourMission':
      return <Scene07YourMission spec={spec as SceneSpec<'Scene07YourMission'>} />;
    case 'Scene08SensorOptions':
      return <Scene08SensorOptions spec={spec as SceneSpec<'Scene08SensorOptions'>} />;
    case 'Scene09Ending':
      return <Scene09Ending spec={spec as SceneSpec<'Scene09Ending'>} />;
  }
};

// BGM：ナレーション中は下げ、最初と最後はフェード
const Bgm: React.FC<{timeline: Timeline}> = ({timeline}) => {
  const {bgmFile, bgmVolume, bgmDuck} = script.meta;
  const speaking = timeline.scenes.flatMap((s: SceneTiming) =>
    s.lines.map((l) => [s.globalFrom + l.from - 6, s.globalFrom + l.from + l.speechFrames + 6] as const),
  );
  const total = timeline.totalFrames;
  return (
    <Audio
      src={staticFile(bgmFile)}
      loop
      volume={(f) => {
        const duck = speaking.some(([a, b]) => f >= a && f <= b) ? bgmDuck : 1;
        const edge = interpolate(f, [0, 30, total - 75, total], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return bgmVolume * duck * edge;
      }}
    />
  );
};

export const ConsultingSales: React.FC<ConsultingProps> = ({timeline, hasBgm}) => {
  useFonts();
  if (!timeline) return null;
  return (
    <AbsoluteFill style={{background: C.dark, fontFamily: FONT}}>
      <TransitionSeries>
        {timeline.scenes.flatMap((timing, i) => [
          ...(i > 0
            ? [
                <TransitionSeries.Transition
                  key={`t-${timing.spec.id}`}
                  presentation={fade()}
                  timing={linearTiming({durationInFrames: timeline.fadeFrames})}
                />,
              ]
            : []),
          <TransitionSeries.Sequence key={timing.spec.id} durationInFrames={timing.durationInFrames}>
            <SceneShell timing={timing}>
              <SceneView spec={timing.spec} />
            </SceneShell>
          </TransitionSeries.Sequence>,
        ])}
      </TransitionSeries>
      {hasBgm ? <Bgm timeline={timeline} /> : null}
    </AbsoluteFill>
  );
};
