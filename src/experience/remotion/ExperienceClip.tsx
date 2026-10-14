// 素材ID → 映像（v3：写真ベース）。assets.json の shots（写真＋カメラの動き＋重ねる情報）を、セリフに合わせて切り替える。
// セリフ・字幕・音声は場面データ（phases.json）から取り、収録した音声の長さに合わせてタイミングが決まる。
import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {assetById, lineAudioPath, lineSchedule, linesForAsset, videoPathFor} from '../data';
import {FONT} from './theme';
import {Brand, Header, PlatePhoto, Subtitle, Tags, resolvePlate} from './v3/Frame';
import {DIM, Overlay} from './v3/Overlays';

export type ExperienceClipProps = {
  assetId: string;
  showSubtitles: boolean;
  showStatus: boolean;
  // 実写・実機映像が配置済みなら、それを使う（アプリ側で存在を確認して渡す）
  useVideo?: boolean;
  // 正式な製品写真が配置済みか
  hasImage?: boolean;
  // 声を流すか（収録済みの文だけ）
  hasAudio?: boolean;
};

const XFADE = 8;

const SIM = new Set(['signal-double', 'demo-normal', 'demo-wobble', 'demo-gap', 'demo-height']);
const DATA = new Set(['figures', 'chart', 'result']);
const BEAM = new Set(['sensor-existing', 'beam', 'sensor-check', 'line-walk', 'setup', 'signal-double', 'demo-normal', 'demo-wobble', 'demo-gap', 'demo-height']);

export const ExperienceClip: React.FC<ExperienceClipProps> = ({assetId, showSubtitles, showStatus, useVideo, hasImage, hasAudio}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const a = assetById.get(assetId);
  if (!a) return <AbsoluteFill style={{background: '#000', color: '#fff', fontSize: 40}}>素材 {assetId} がありません</AbsoluteFill>;
  const sched = lineSchedule(linesForAsset(assetId), a.dialogAt ?? 0.8, assetId);
  const t = frame / fps;
  const current = sched.find((l) => t >= l.from && t < l.to);

  // ショットの開始フレーム
  const starts = a.shots.map((s, i) => (i === 0 || s.atLine === undefined ? (i === 0 ? 0 : null) : Math.round((sched[s.atLine]?.from ?? 0) * fps) - 4));
  const shotStart = (i: number) => starts[i] ?? 0;
  const shotEnd = (i: number) => (i + 1 < a.shots.length ? shotStart(i + 1) : durationInFrames);
  const idx = a.shots.reduce((k, _, i) => (frame >= shotStart(i) ? i : k), 0);
  const shot = a.shots[idx];
  const substitute = resolvePlate(shot).substitute;

  const tags: string[] = [];
  if (showStatus && !useVideo) {
    if (substitute) tags.push(`仮画像（${shot.plate} の画像待ち）`);
    if (SIM.has(shot.overlay)) tags.push('研修用シミュレーション');
    if (DATA.has(shot.overlay)) tags.push('研修用の架空データ');
    if (BEAM.has(shot.overlay)) tags.push('光の線は説明用の表現');
    if (a.status.includes('awaiting-license') && !hasImage) tags.push('公式製品画像：許諾確認待ち');
  }

  return (
    <AbsoluteFill style={{background: '#0E0F11', fontFamily: FONT}}>
      {useVideo ? (
        <OffthreadVideo src={staticFile(videoPathFor(a.assetId))} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      ) : (
        a.shots.map((s, i) => {
          const from = shotStart(i);
          const to = shotEnd(i);
          if (frame < from - 1 || frame > to + XFADE) return null;
          const o = i === 0 ? 1 : interpolate(frame, [from, from + XFADE], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const p = interpolate(frame, [from, to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <AbsoluteFill key={i} style={{opacity: o}}>
              <Sequence from={from} layout="none">
                <PlatePhoto shot={s} progress={p} dim={DIM[s.overlay] ?? 0} />
                {/* 下部の字幕を読みやすくするグラデーション */}
                <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.35) 100%)'}} />
                <Overlay overlay={s.overlay} card={s.card} imagePath={hasImage ? a.imagePath : undefined} />
              </Sequence>
            </AbsoluteFill>
          );
        })
      )}
      {shot.header && !useVideo ? (
        <Sequence key={`h${idx}`} from={shotStart(idx)} layout="none">
          <HeaderAt no={shot.header.no} title={shot.header.title} />
        </Sequence>
      ) : null}
      <Brand />
      {hasAudio !== false
        ? sched
            .filter((l) => l.recorded && l.lineId)
            .map((l) => (
              <Sequence key={l.lineId} from={Math.round(l.from * fps)} layout="none">
                <Audio src={staticFile(lineAudioPath(l.lineId!))} />
              </Sequence>
            ))
        : null}
      {showSubtitles && current ? <Subtitle speaker={current.speaker} text={current.text} from={Math.round(current.from * fps)} frame={frame} /> : null}
      <Tags tags={tags} />
    </AbsoluteFill>
  );
};

const HeaderAt: React.FC<{no?: string; title: string}> = ({no, title}) => {
  const frame = useCurrentFrame();
  return <Header no={no} title={title} frame={frame} />;
};
