// 映像の再生。Remotion のクリップをその場で描画する（書き出した MP4 は不要）。
// 実写・実機映像が public/ に置かれていれば、それに自動で切り替わる。
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import {ExperienceClip} from '../remotion/ExperienceClip';
import {clipFrames} from '../remotion/Compositions';
import {assetById, audioPathFor, linesForAsset, lineSchedule, sceneById, videoPathFor} from '../data';
import type {Pause} from '../types';
import {ConsultingSales} from '../../consulting/ConsultingSales';
import {buildTimeline} from '../../consulting/timeline';
import {script as introScript} from '../../consulting/script';
import narrationTiming from '../../consulting/narrationTiming.json';
import type {NarrationTiming} from '../../consulting/types';

export type PlayerControl = {play: () => void; pause: () => void};

// 「考えよう」で止めるフレーム（導入動画は台本の文ID、体験クリップは何文目の前か）
export const pauseFrames = (sceneId: string, assetId: string, fps = 30): {frame: number; prompt: string; hint?: string}[] => {
  const s = sceneById.get(sceneId);
  const pauses: Pause[] = s && (s.type === 'clip' || s.type === 'video') ? s.pauses ?? [] : [];
  return pauses.flatMap((p) => {
    if (p.atLineId && assetId === 'intro') {
      const tl = buildTimeline(introScript, narrationTiming as NarrationTiming);
      for (const sc of tl.scenes) {
        const l = sc.lines.find((x) => x.line.id === p.atLineId);
        if (l) return [{frame: sc.globalFrom + l.from + l.speechFrames + 6, prompt: p.prompt, hint: p.hint}];
      }
      return [];
    }
    if (p.beforeLine !== undefined) {
      const a = assetById.get(assetId);
      const sched = lineSchedule(linesForAsset(assetId), a?.dialogAt ?? 0.8);
      const l = sched[p.beforeLine];
      return l ? [{frame: Math.max(0, Math.round(l.from * fps) - 4), prompt: p.prompt, hint: p.hint}] : [];
    }
    return [];
  });
};

export const ClipPlayer: React.FC<{
  assetId: string; // 'intro' で導入動画
  autoPlay: boolean;
  playToken: number;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  volume: number;
  showSubtitles: boolean;
  showStatus: boolean;
  available: Set<string>;
  // 進行役が読み込んだ実機デモ動画（このブラウザだけで再生）
  overrideVideoUrl?: string;
  onEnded?: () => void;
  controlRef?: React.MutableRefObject<PlayerControl | null>;
  // 途中で止めて考えさせるポイント
  pauses?: {frame: number; prompt: string; hint?: string}[];
  // 投影用ウィンドウでは「続きを見る」を出さない（進行役の再生で再開）
  readOnly?: boolean;
  onResume?: () => void;
}> = ({assetId, autoPlay, playToken, loop, muted, controls = true, volume, showSubtitles, showStatus, available, overrideVideoUrl, onEnded, controlRef, pauses = [], readOnly, onResume}) => {
  const ref = useRef<PlayerRef>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  const ended = useRef(onEnded);
  ended.current = onEnded;
  const [thinking, setThinking] = useState<{prompt: string; hint?: string} | null>(null);
  const done = useRef(new Set<number>());

  const intro = assetId === 'intro';
  const asset = assetById.get(assetId);
  const useVideo = !!asset && available.has(videoPathFor(assetId));
  const hasImage = !!asset?.imagePath && available.has(asset.imagePath);
  const timeline = useMemo(() => (intro ? buildTimeline(introScript, narrationTiming as NarrationTiming) : null), [intro]);

  const inputProps = useMemo(
    () =>
      intro
        ? {timeline, hasBgm: available.has(introScript.meta.bgmFile)}
        : {assetId, showSubtitles, showStatus, useVideo, hasImage, hasAudio: available.has(audioPathFor(assetId))},
    [intro, timeline, available, assetId, showSubtitles, showStatus, useVideo, hasImage],
  );

  // 再生の合図（playToken）が来たら頭から
  useEffect(() => {
    const p = ref.current;
    const v = videoRef.current;
    const start = (fn: () => unknown) => {
      try {
        const r = fn();
        if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => setBlocked(true));
        setBlocked(false);
      } catch {
        setBlocked(true);
      }
    };
    if (v) {
      v.currentTime = 0;
      if (autoPlay) start(() => v.play());
      return;
    }
    done.current.clear();
    setThinking(null);
    if (!p) return;
    p.seekTo(0);
    if (autoPlay) start(() => p.play());
    else p.pause();
  }, [playToken, autoPlay, assetId, overrideVideoUrl]);

  useEffect(() => {
    ref.current?.setVolume(volume);
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume, assetId]);

  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const onEnd = () => ended.current?.();
    p.addEventListener('ended', onEnd);
    return () => p.removeEventListener('ended', onEnd);
  }, [assetId, overrideVideoUrl]);

  // 止めるポイントに来たら一時停止して「考えよう」を出す
  const pauseKey = pauses.map((x) => x.frame).join(',');
  useEffect(() => {
    const p = ref.current;
    if (!p || !pauses.length) return;
    const onFrame = (e: {detail: {frame: number}}) => {
      const hit = pauses.find((x) => !done.current.has(x.frame) && e.detail.frame >= x.frame && e.detail.frame < x.frame + 15);
      if (hit) {
        done.current.add(hit.frame);
        p.pause();
        setThinking({prompt: hit.prompt, hint: hit.hint});
      }
    };
    p.addEventListener('frameupdate', onFrame);
    return () => p.removeEventListener('frameupdate', onFrame);
  }, [assetId, pauseKey]);

  if (controlRef) {
    controlRef.current = {
      play: () => {
        setThinking(null);
        return videoRef.current ? videoRef.current.play().catch(() => setBlocked(true)) : ref.current?.play();
      },
      pause: () => (videoRef.current ? videoRef.current.pause() : ref.current?.pause()),
    };
  }

  const durationInFrames = intro ? timeline!.totalFrames : clipFrames(assetId);

  return (
    <div className="player-box">
      {overrideVideoUrl ? (
        <video ref={videoRef} src={overrideVideoUrl} className="player" controls muted={muted} loop={loop} onEnded={() => ended.current?.()} />
      ) : (
        <Player
          ref={ref}
          component={(intro ? ConsultingSales : ExperienceClip) as React.FC<Record<string, unknown>>}
          inputProps={inputProps as Record<string, unknown>}
          durationInFrames={durationInFrames}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={30}
          className="player"
          style={{width: '100%', aspectRatio: '16 / 9'}}
          controls={controls}
          loop={loop}
          initiallyMuted={muted}
          clickToPlay
          doubleClickToFullscreen={false}
          spaceKeyToPlayOrPause
          numberOfSharedAudioTags={8}
        />
      )}
      {thinking ? (
        <div className="think-pause">
          <div className="tp-label">考えよう</div>
          <div className="tp-prompt">{thinking.prompt}</div>
          {thinking.hint ? <div className="tp-hint">{thinking.hint}</div> : null}
          {readOnly ? null : (
            <button
              className="primary"
              onClick={() => {
                setThinking(null);
                ref.current?.play();
                onResume?.();
              }}
            >
              続きを見る ▶
            </button>
          )}
        </div>
      ) : null}
      {blocked ? (
        <button
          className="play-overlay"
          onClick={() => {
            setBlocked(false);
            if (videoRef.current) videoRef.current.play().catch(() => setBlocked(true));
            else ref.current?.play();
          }}
        >
          ▶ 再生する
        </button>
      ) : null}
    </div>
  );
};
