// 使うアニメーションは Fade / Slide / Scale / Line / 順次表示 に限定する。
import {Easing, interpolate} from 'remotion';

const ease = Easing.bezier(0.22, 1, 0.36, 1);

// 0→1 の進み具合（start から dur フレームかけて）
export const progress = (frame: number, start: number, dur = 14) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

// フェード＋スライド（px）で現れる
export const appear = (frame: number, start: number, opts: {dur?: number; dx?: number; dy?: number} = {}) => {
  const p = progress(frame, start, opts.dur ?? 14);
  const dx = (opts.dx ?? 0) * (1 - p);
  const dy = (opts.dy ?? 24) * (1 - p);
  return {opacity: p, transform: `translate(${dx}px, ${dy}px)`};
};

// 重要キーワードの軽いズーム（1.08 → 1.0）
export const keyZoom = (frame: number, start: number, from = 1.08) =>
  interpolate(frame, [start, start + 18], [from, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

// フェードアウト（1→0）
export const fadeOut = (frame: number, start: number, dur = 12) => 1 - progress(frame, start, dur);
