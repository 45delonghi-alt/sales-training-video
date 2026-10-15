// 体験コンテンツの全クリップを、素材ごとに独立したコンポジション（XP-<素材ID>）として登録する。
// 選択肢ごとの映像を個別に MP4 で書き出せる（npm run experience:render）。
import React from 'react';
import {Composition, Folder} from 'remotion';
import {allClips, clipSeconds, compositionIdFor, linesForAsset} from '../data';
import {ExperienceClip} from './ExperienceClip';
import {IntroFix, introFixFrames} from './IntroFix';
import {FPS, H, W} from './theme';

export const clipFrames = (assetId: string) => {
  const a = allClips.find((x) => x.assetId === assetId);
  if (!a) return FPS * 5;
  return Math.ceil(clipSeconds(a.seconds, linesForAsset(assetId), a.dialogAt ?? 0.8, assetId) * FPS);
};

export const ExperienceCompositions: React.FC = () => (
  <Folder name="Experience">
    <Composition id="IntroP6Fix" component={IntroFix} fps={FPS} width={W} height={H} durationInFrames={introFixFrames} />
    {allClips.map((a) => (
      <Composition
        key={a.assetId}
        id={compositionIdFor(a.assetId)}
        component={ExperienceClip}
        fps={FPS}
        width={W}
        height={H}
        durationInFrames={clipFrames(a.assetId)}
        defaultProps={{assetId: a.assetId, showSubtitles: true, showStatus: true}}
      />
    ))}
  </Folder>
);
