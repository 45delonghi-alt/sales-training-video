// 素材ID → 映像。assets.json の kind / variant で描き分け、セリフは場面データから取る。
import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';
import {assetById, audioPathFor, linesForAsset, phases, scenes, videoPathFor} from '../data';
import type {Mood} from './Person';
import {ClipShell} from './ClipShell';
import {FactoryScene} from './scenes/FactoryScene';
import {SensorScene, BottleScene} from './scenes/CloseupScenes';
import {CustomerScene} from './scenes/CustomerScene';
import {DocumentScene} from './scenes/DocumentScene';
import {TechScene} from './scenes/TechScene';
import {ProductScene} from './scenes/ProductScene';
import {DemoScene} from './scenes/DemoScene';
import {ApplicationsScene, EndingScene} from './scenes/EndingScenes';

export type ExperienceClipProps = {
  assetId: string;
  showSubtitles: boolean;
  showStatus: boolean;
  // 実写・実機映像が配置済みなら、それを使う（アプリ側で存在を確認して渡す）
  useVideo?: boolean;
  // 製品画像が配置済みか
  hasImage?: boolean;
  // 音声（public/experience/audio/<素材ID>.mp3）が配置済みか
  hasAudio?: boolean;
};

// この素材でお客様が話すときの表情（選択肢のデータから。場面のセリフなら困っている顔）
const moodFor = (assetId: string): Mood | undefined => {
  for (const s of scenes) {
    if (s.type === 'question') {
      const c = s.choices.find((ch) => ch.assetId === assetId);
      if (c) return c.customerMood;
    }
    if (s.type === 'clip' && s.assetId === assetId && s.lines.some((l) => l.speaker === 'customer')) return 'worried';
  }
  return undefined;
};

const LIGHT = new Set(['document', 'tech', 'product', 'applications']);

export const phaseLabelFor = (assetId: string) => {
  const s = scenes.find(
    (sc) =>
      ((sc.type === 'clip' || sc.type === 'demo') && sc.assetId === assetId) ||
      (sc.type === 'question' && (sc.backdropAssetId === assetId || sc.choices.some((c) => c.assetId === assetId))) ||
      (sc.type === 'reflection' && sc.assetId === assetId),
  );
  const p = s ? phases.find((ph) => ph.phaseId === s.phaseId) : undefined;
  return p ? p.title.toUpperCase() : 'CONSULTING SALES EXPERIENCE';
};

export const ExperienceClip: React.FC<ExperienceClipProps> = ({assetId, showSubtitles, showStatus, useVideo, hasImage, hasAudio}) => {
  const a = assetById.get(assetId);
  if (!a) return <AbsoluteFill style={{background: '#000', color: '#fff', fontSize: 40}}>素材 {assetId} がありません</AbsoluteFill>;
  const lines = linesForAsset(assetId);
  const tone = a.variant === 'message' ? 'dark' : LIGHT.has(a.kind) ? 'light' : 'dark';
  const simulation = a.kind === 'demo' && ['normal', 'offset', 'gap', 'orientation'].includes(a.variant);
  const status = useVideo ? [] : a.status;
  return (
    <ClipShell
      assetId={assetId}
      tone={tone}
      label={phaseLabelFor(assetId)}
      lines={lines}
      dialogAt={a.dialogAt ?? 0.8}
      showSubtitles={showSubtitles}
      showStatus={showStatus}
      status={hasImage ? status.filter((s) => s !== 'awaiting-license') : status}
      kind={a.kind}
      simulation={simulation && !useVideo}
      customerMood={moodFor(assetId)}
      audioPath={hasAudio ? audioPathFor(assetId) : undefined}
    >
      {useVideo ? (
        <AbsoluteFill>
          <OffthreadVideo src={staticFile(videoPathFor(a.assetId))} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </AbsoluteFill>
      ) : (
        <Visual kind={a.kind} variant={a.variant} hasImage={!!hasImage} imagePath={a.imagePath} />
      )}
    </ClipShell>
  );
};

const Visual: React.FC<{kind: string; variant: string; hasImage: boolean; imagePath?: string}> = ({kind, variant, hasImage, imagePath}) => {
  switch (kind) {
    case 'factory':
      return <FactoryScene variant={variant} />;
    case 'sensor':
      return <SensorScene variant={variant} />;
    case 'bottle':
      return <BottleScene variant={variant} />;
    case 'customer':
      return <CustomerScene variant={variant} />;
    case 'document':
      return <DocumentScene variant={variant} />;
    case 'tech':
      return <TechScene variant={variant} />;
    case 'product':
      return <ProductScene variant={variant} imagePath={hasImage ? imagePath : undefined} />;
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
