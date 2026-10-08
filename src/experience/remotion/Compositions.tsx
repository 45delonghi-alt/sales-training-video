// 体験コンテンツの全クリップを、素材ごとに独立したコンポジション（XP-<素材ID>）として登録する。
// 選択肢ごとの映像を個別に MP4 で書き出せる（npm run experience:render）。
import React from 'react';
import {Composition, Folder} from 'remotion';
import {assets, compositionIdFor, linesForAsset} from '../data';
import {clipSeconds} from './ClipShell';
import {ExperienceClip} from './ExperienceClip';
import {FPS, H, W} from './theme';

export const clipFrames = (assetId: string) => {
  const a = assets.find((x) => x.assetId === assetId);
  if (!a) return FPS * 5;
  return Math.ceil(clipSeconds(a.seconds, linesForAsset(assetId), a.dialogAt ?? 0.8) * FPS);
};

export const ExperienceCompositions: React.FC = () => (
  <Folder name="Experience">
    {assets.map((a) => (
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
