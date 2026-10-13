// 素材ID → 映像。assets.json の kind / variant で描き分け、セリフは場面データから取る。
import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';
import {assetById, audioPathFor, linesForAsset, phases, responderFor, scenes, videoPathFor} from '../data';
import {ClipShell} from './ClipShell';
import {FactoryScene} from './scenes/FactoryScene';
import {SensorScene, BottleScene} from './scenes/CloseupScenes';
import {CustomerScene, peopleIn} from './scenes/CustomerScene';
import {DocumentScene} from './scenes/DocumentScene';
import {TechScene} from './scenes/TechScene';
import {ProductScene} from './scenes/ProductScene';
import {DemoScene} from './scenes/DemoScene';
import {ApplicationsScene, EndingScene, TitleScene} from './scenes/EndingScenes';

export type ExperienceClipProps = {
  assetId: string;
  showSubtitles: boolean;
  showStatus: boolean;
  // 実写・実機映像が配置済みなら、それを使う（アプリ側で存在を確認して渡す）
  useVideo?: boolean;
  // 正式な製品写真が配置済みか
  hasImage?: boolean;
  // 声の音声（public/experience/audio/<素材ID>.mp3）が配置済みか
  hasAudio?: boolean;
};

const LIGHT = new Set(['document', 'tech', 'product', 'applications']);

export const phaseLabelFor = (assetId: string) => {
  const s = scenes.find(
    (sc) =>
      ((sc.type === 'clip' || sc.type === 'demo') && sc.videoAsset === assetId) ||
      (sc.type === 'question' && (sc.backdropAsset === assetId || sc.choices.some((c) => c.videoAsset === assetId))) ||
      (sc.type === 'reflection' && sc.videoAsset === assetId),
  );
  const p = s ? phases.find((ph) => ph.phaseId === s.phaseId) : undefined;
  return p ? p.phaseTitle.toUpperCase() : 'CONSULTING SALES EXPERIENCE';
};

export const ExperienceClip: React.FC<ExperienceClipProps> = ({assetId, showSubtitles, showStatus, useVideo, hasImage, hasAudio}) => {
  const a = assetById.get(assetId);
  if (!a) return <AbsoluteFill style={{background: '#000', color: '#fff', fontSize: 40}}>素材 {assetId} がありません</AbsoluteFill>;
  const lines = linesForAsset(assetId);
  const tone = a.variant === 'message' || a.kind === 'title' ? 'dark' : LIGHT.has(a.kind) ? 'light' : 'dark';
  const simulation = a.kind === 'demo' && ['normal', 'offset', 'gap', 'wobble', 'shape'].includes(a.variant);
  const status = useVideo ? [] : a.status;
  const onScreen = a.kind === 'customer' ? peopleIn(a.variant) : a.variant === 'intro-senior' ? ['mori'] : [];
  return (
    <ClipShell
      assetId={assetId}
      tone={tone}
      label={phaseLabelFor(assetId)}
      lines={lines}
      dialogAt={a.dialogAt ?? 0.8}
      showSubtitles={showSubtitles && a.kind !== 'title'} // 扉は画面の文字がそのままセリフ
      showStatus={showStatus}
      status={hasImage ? status.filter((s) => s !== 'awaiting-license') : status}
      kind={a.kind}
      simulation={simulation && !useVideo}
      responderMood={responderFor(assetId)?.mood}
      onScreen={useVideo ? ['sato', 'takahashi', 'mori', 'nakata'] : onScreen}
      audioPath={hasAudio ? audioPathFor(assetId) : undefined}
    >
      {useVideo ? (
        <AbsoluteFill>
          <OffthreadVideo src={staticFile(videoPathFor(a.assetId))} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </AbsoluteFill>
      ) : (
        <Visual kind={a.kind} variant={a.variant} imagePath={hasImage ? a.imagePath : undefined} assetId={assetId} />
      )}
    </ClipShell>
  );
};

const Visual: React.FC<{kind: string; variant: string; imagePath?: string; assetId: string}> = ({kind, variant, imagePath, assetId}) => {
  switch (kind) {
    case 'title':
      return <TitleScene />;
    case 'factory':
      return <FactoryScene variant={variant} />;
    case 'sensor':
      return <SensorScene variant={variant} imagePath={imagePath} />;
    case 'bottle':
      return <BottleScene variant={variant} />;
    case 'customer':
      return <CustomerScene variant={variant} />;
    case 'document':
      return <DocumentScene variant={variant} />;
    case 'tech':
      return <TechScene variant={variant} />;
    case 'product':
      return <ProductScene variant={variant} imagePath={imagePath} assetId={assetId} />;
    case 'demo':
      return <DemoScene variant={variant} />;
    case 'applications':
      return <ApplicationsScene />;
    case 'ending':
      return <EndingScene />;
    default:
      return null;
  }
};
