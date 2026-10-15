// 素材ID → 映像。導入動画（src/consulting）と同じ見た目：白・黒の背景、線画のライン、白いパネル、赤の強調、黒い字幕帯。
// assets.json の shots（どの場面を、どのセリフから出すか）を、セリフに合わせて切り替える。
// セリフ・字幕・音声は場面データ（phases.json）から取り、収録した音声の長さに合わせてタイミングが決まる。
import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Backdrop} from '../../consulting/components/Backdrop';
import {script as introScript} from '../../consulting/script';
import {cardByKey, clipById, scenes, lineAudioPath, lineSchedule, linesForAsset, videoPathFor} from '../data';
import {FONT, Heading, Subtitle, Tags} from './v4/Kit';
import {PhotoLayer, photoFile} from './v4/Connect';
import {QUOTE, Scene, toneOf} from './v4/Scenes';

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

const PHASE: Record<string, string> = {p1: '聞く', p2: '考える', p3: '課題を見つける', p4: '提案する'};

const SIM = new Set(['signal-double', 'demo-normal', 'demo-wobble', 'demo-gap', 'demo-height']);
const DATA = new Set(['figures', 'chart', 'result']);
const BEAM = new Set(['sensor-existing', 'beam', 'sensor-check', 'line-walk', 'setup', 'signal-double', 'cause-wobble', 'cause-gap', 'demo-normal', 'demo-wobble', 'demo-gap', 'demo-height']);

export const ExperienceClip: React.FC<ExperienceClipProps> = ({assetId, showSubtitles, showStatus, useVideo, hasImage, hasAudio}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const a = clipById.get(assetId);
  if (!a) return <AbsoluteFill style={{background: '#000', color: '#fff', fontSize: 40}}>素材 {assetId} がありません</AbsoluteFill>;
  const sched = lineSchedule(linesForAsset(assetId), a.dialogAt ?? 0.8, assetId);
  const t = frame / fps;
  const current = sched.find((l) => t >= l.from && t < l.to);
  // いちばん最近に話し始めたセリフ（会話の場面で、次のセリフまで出しておく）
  const lastStarted = [...sched].reverse().find((l) => t >= l.from - 0.15);
  const card = cardByKey.get(assetId);
  const clipScene = scenes.find((sc) => sc.type === 'clip' && sc.videoAsset === assetId);
  const clear = clipScene && clipScene.type === 'clip' ? clipScene.clear : undefined;
  const phase = card ? (card.kind === 'reflection' ? '振り返り' : PHASE[card.scene.phaseId]) : PHASE[assetId.slice(0, 2)];

  // ショットの開始フレーム
  const starts = a.shots.map((s, i) => (i === 0 || s.atLine === undefined ? (i === 0 ? 0 : null) : Math.round((sched[s.atLine]?.from ?? 0) * fps) - 4));
  const shotStart = (i: number) => starts[i] ?? 0;
  const shotEnd = (i: number) => (i + 1 < a.shots.length ? shotStart(i + 1) : durationInFrames);
  const idx = a.shots.reduce((k, _, i) => (frame >= shotStart(i) ? i : k), 0);
  const shot = a.shots[idx];
  const tone = toneOf(shot.overlay);

  const tags: string[] = [];
  if (showStatus && !useVideo) {
    if (SIM.has(shot.overlay)) tags.push('研修用シミュレーション');
    if (DATA.has(shot.overlay)) tags.push('研修用の架空データ');
    if (BEAM.has(shot.overlay)) tags.push('光の線は説明用の表現');
    if (a.status.includes('awaiting-license') && !hasImage) tags.push('公式製品画像：許諾確認待ち');
  }

  return (
    <AbsoluteFill style={{background: '#0D0E10', fontFamily: FONT}}>
      {useVideo ? (
        <OffthreadVideo src={staticFile(videoPathFor(a.assetId))} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      ) : (
        a.shots.map((s, i) => {
          const from = shotStart(i);
          const to = shotEnd(i);
          if (frame < from - 1 || frame > to + XFADE) return null;
          const o = i === 0 ? 1 : interpolate(frame, [from, from + XFADE], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const st = toneOf(s.overlay);
          return (
            <AbsoluteFill key={i} style={{opacity: o}}>
              <Sequence from={from} layout="none">
                <Backdrop tone={st} sceneNo={Number(s.header?.no ?? 0)} total={s.header?.no ? 12 : null} decor={photoFile(s.photo) ? <PhotoLayer slot={s.photo} tone={st} /> : undefined} />
                <Scene overlay={s.overlay} photo={s.photo} clear={clear} card={s.card} cardScene={card?.scene} imagePath={hasImage ? a.imagePath : undefined} quote={lastStarted ? {speaker: lastStarted.speaker, text: lastStarted.text, from: lastStarted.from - from / fps} : undefined} />
                {s.header ? <Heading phase={phase} title={s.header.title} tone={st} frame={frame - from} /> : null}
              </Sequence>
            </AbsoluteFill>
          );
        })
      )}
      {/* BGM：導入動画と同じ曲・同じ音量。セリフの間は下げる（導入動画の bgmVolume・bgmDuck と同じ値） */}
      {hasAudio !== false ? (
        <Audio
          src={staticFile(introScript.meta.bgmFile)}
          loop
          volume={(f) => {
            const sec = f / fps;
            const talking = sched.some((l) => sec >= l.from - 0.2 && sec < l.to + 0.1);
            const fade = Math.min(1, f / (0.6 * fps), (durationInFrames - f) / (0.6 * fps));
            return introScript.meta.bgmVolume * (talking ? introScript.meta.bgmDuck : 1) * Math.max(0, fade);
          }}
        />
      ) : null}
      {hasAudio !== false
        ? sched
            .filter((l) => l.recorded && l.lineId)
            .map((l) => (
              <Sequence key={l.lineId} from={Math.round(l.from * fps)} layout="none">
                <Audio src={staticFile(lineAudioPath(l.lineId!))} />
              </Sequence>
            ))
        : null}
      {/* 会話の場面はセリフを画面中央に大きく出すので、下の字幕は出さない */}
      {showSubtitles && current && (useVideo || !QUOTE.has(shot.overlay)) ? <Subtitle speaker={current.speaker} text={current.text} from={Math.round(current.from * fps)} frame={frame} /> : null}
      <Tags tags={tags} tone={useVideo ? 'dark' : tone} />
    </AbsoluteFill>
  );
};
