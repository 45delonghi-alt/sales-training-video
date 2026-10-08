// 映像の再生。Remotion のクリップをその場で描画する（書き出した MP4 は不要）。
// 実写・実機映像が public/ に置かれていれば、それに自動で切り替わる。
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import {ExperienceClip} from '../remotion/ExperienceClip';
import {clipFrames} from '../remotion/Compositions';
import {assetById, videoPathFor} from '../data';
import {ConsultingSales} from '../../consulting/ConsultingSales';
import {buildTimeline} from '../../consulting/timeline';
import {script as introScript} from '../../consulting/script';
import narrationTiming from '../../consulting/narrationTiming.json';
import type {NarrationTiming} from '../../consulting/types';

export type PlayerControl = {play: () => void; pause: () => void};

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
}> = ({assetId, autoPlay, playToken, loop, muted, controls = true, volume, showSubtitles, showStatus, available, overrideVideoUrl, onEnded, controlRef}) => {
  const ref = useRef<PlayerRef>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  const ended = useRef(onEnded);
  ended.current = onEnded;

  const intro = assetId === 'intro';
  const asset = assetById.get(assetId);
  const useVideo = !!asset && available.has(videoPathFor(assetId));
  const hasImage = !!asset?.imagePath && available.has(asset.imagePath);
  const timeline = useMemo(() => (intro ? buildTimeline(introScript, narrationTiming as NarrationTiming) : null), [intro]);

  const inputProps = useMemo(
    () =>
      intro
        ? {timeline, hasBgm: available.has(introScript.meta.bgmFile)}
        : {assetId, showSubtitles, showStatus, useVideo, hasImage},
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

  if (controlRef) {
    controlRef.current = {
      play: () => (videoRef.current ? videoRef.current.play().catch(() => setBlocked(true)) : ref.current?.play()),
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
