// センサ配置のマスター図。全シーンの光学配置はこの図を基準にする（docs/consulting-experience/technical-rules.md）。
//   搬送方向：左 → 右
//   センサ（投光・受光一体）：コンベアの手前側。レンズは奥（反射板）を向く
//   反射板（リフレクタ）：コンベアの奥側。センサと同じ高さで正対。光を出さず、受けもしない（光を戻すだけ）
//   検出の高さ：ボトルの下部（底から約20%）。キャップ・肩は検出位置にしない
//   光の経路：センサ → ボトル下部 → 反射板 → 同じセンサ（行きと戻りを分けて描く。赤い線は説明用の表現）
import React from 'react';
import {X} from '../theme';

export const LAYOUT = {
  flow: '左 → 右',
  sensorSide: '手前（コンベアの片側）',
  reflectorSide: '奥（反対側・同じ高さで正対）',
  detectHeight: 0.2, // ボトルの高さに対する検出位置（底から）
};

const beamDash = (frame: number) => ({strokeDasharray: '16 10', strokeDashoffset: -frame * 3});

// 上から見た図。bottlesX：ボトルの中心のx座標（px, 0〜w）。blocked：光を横切っているボトルがあるか
export const TopView: React.FC<{w: number; h: number; frame: number; bottlesX: number[]; tilt?: number[]; showLabels?: boolean; beamOn?: boolean}> = ({
  w,
  h,
  frame,
  bottlesX,
  tilt = [],
  showLabels = true,
  beamOn = true,
}) => {
  const beltTop = h * 0.3;
  const beltBot = h * 0.7;
  const sx = w * 0.5;
  const r = (beltBot - beltTop) * 0.36;
  return (
    <svg width={w} height={h} style={{display: 'block'}}>
      <rect x={0} y={beltTop} width={w} height={beltBot - beltTop} fill="#E9EDF1" stroke="#9AA3AD" strokeWidth={2} />
      {Array.from({length: Math.ceil(w / 40)}, (_, i) => (
        <line key={i} x1={((i * 40 + frame * 2) % (w + 40)) - 20} y1={beltTop} x2={((i * 40 + frame * 2) % (w + 40)) - 20} y2={beltBot} stroke="#D3D9DF" strokeWidth={2} />
      ))}
      {/* 搬送方向 */}
      <g fill="#5A6470" fontSize={18} fontWeight={700}>
        <path d={`M ${w * 0.06} ${beltBot + 34} L ${w * 0.2} ${beltBot + 34}`} stroke="#5A6470" strokeWidth={3} markerEnd="url(#arrowG)" />
        <text x={w * 0.22} y={beltBot + 40}>搬送方向</text>
      </g>
      <defs>
        <marker id="arrowG" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="#5A6470" />
        </marker>
      </defs>
      {/* 光：行き（センサ→反射板）・戻り（反射板→センサ） */}
      {beamOn ? (
        <g>
          <line x1={sx - 6} y1={beltBot + 4} x2={sx - 6} y2={beltTop - 4} stroke={X.red} strokeWidth={4} {...beamDash(frame)} />
          <line x1={sx + 6} y1={beltTop - 4} x2={sx + 6} y2={beltBot + 4} stroke={X.red} strokeWidth={3} opacity={0.5} {...beamDash(frame)} />
        </g>
      ) : null}
      {/* ボトル（上から見ると円） */}
      {bottlesX.map((bx, i) => (
        <g key={i} transform={`translate(${bx}, ${(beltTop + beltBot) / 2 + (tilt[i] ?? 0) * r * 0.5})`}>
          <circle r={r} fill="rgba(170,215,240,0.45)" stroke="#5E8FB0" strokeWidth={2.5} />
          <circle r={r * 0.32} fill="rgba(255,255,255,0.8)" stroke="#5E8FB0" strokeWidth={1.5} />
        </g>
      ))}
      {/* センサ（手前）と反射板（奥） */}
      <rect x={sx - 34} y={beltBot + 6} width={68} height={42} rx={6} fill="#3A3F46" />
      <circle cx={sx} cy={beltBot + 8} r={7} fill={X.red} />
      <rect x={sx - 34} y={beltTop - 22} width={68} height={14} fill="#B9C1CA" stroke="#7D8792" strokeWidth={2} />
      {showLabels ? (
        <g fontSize={19} fontWeight={800}>
          <text x={sx + 50} y={beltBot + 36} fill={X.ink}>センサ（投光・受光）</text>
          <text x={sx + 50} y={beltTop - 10} fill={X.ink}>反射板（光を戻すだけ）</text>
        </g>
      ) : null}
    </svg>
  );
};

// 搬送方向から見た図（ボトルの断面方向）。センサと反射板が同じ高さで向かい合い、光がボトル下部を通る
export const FrontView: React.FC<{w: number; h: number; frame: number; showLabels?: boolean; heightRatio?: number; wobble?: number}> = ({
  w,
  h,
  frame,
  showLabels = true,
  heightRatio = LAYOUT.detectHeight,
  wobble = 0,
}) => {
  const base = h * 0.82;
  const bh = h * 0.62;
  const cx = w * 0.5;
  const bw = bh * 0.34;
  const by = base - bh * heightRatio;
  const ang = wobble * Math.sin(frame / 6) * 6;
  return (
    <svg width={w} height={h} style={{display: 'block'}}>
      <rect x={w * 0.12} y={base} width={w * 0.76} height={16} fill="#B9C1CA" />
      {/* ボトル */}
      <g transform={`rotate(${ang}, ${cx}, ${base})`}>
        <path
          d={`M ${cx - bw / 2} ${base} L ${cx - bw / 2} ${base - bh * 0.62} Q ${cx - bw / 2} ${base - bh * 0.78} ${cx - bw * 0.18} ${base - bh * 0.86} L ${cx - bw * 0.18} ${base - bh * 0.96} L ${cx + bw * 0.18} ${base - bh * 0.96} L ${cx + bw * 0.18} ${base - bh * 0.86} Q ${cx + bw / 2} ${base - bh * 0.78} ${cx + bw / 2} ${base - bh * 0.62} L ${cx + bw / 2} ${base} Z`}
          fill="rgba(170,215,240,0.4)"
          stroke="#5E8FB0"
          strokeWidth={2.5}
        />
        <rect x={cx - bw * 0.2} y={base - bh * 1.02} width={bw * 0.4} height={bh * 0.07} rx={3} fill="#F4F6F8" stroke="#8796A3" strokeWidth={2} />
      </g>
      {/* 光：行き・戻り */}
      <line x1={w * 0.2} y1={by - 5} x2={w * 0.8} y2={by - 5} stroke={X.red} strokeWidth={4} {...beamDash(frame)} />
      <line x1={w * 0.8} y1={by + 5} x2={w * 0.2} y2={by + 5} stroke={X.red} strokeWidth={3} opacity={0.5} {...beamDash(frame)} />
      {/* センサ（左）・反射板（右）。同じ高さ */}
      <rect x={w * 0.12} y={by - 26} width={w * 0.08} height={52} rx={6} fill="#3A3F46" />
      <circle cx={w * 0.2} cy={by} r={7} fill={X.red} />
      <rect x={w * 0.8} y={by - 30} width={12} height={60} fill="#B9C1CA" stroke="#7D8792" strokeWidth={2} />
      <line x1={w * 0.16} y1={by + 26} x2={w * 0.16} y2={base} stroke="#8A939D" strokeWidth={6} />
      <line x1={w * 0.806} y1={by + 30} x2={w * 0.806} y2={base} stroke="#8A939D" strokeWidth={6} />
      {showLabels ? (
        <g fontSize={18} fontWeight={800} fill={X.ink}>
          <text x={w * 0.12} y={by - 40}>センサ</text>
          <text x={w * 0.88} y={by - 40} textAnchor="end">反射板</text>
          <text x={cx + bw * 0.62} y={by + 34} fill={X.red}>検出位置：ボトル下部</text>
          <text x={w * 0.5} y={h * 0.08} textAnchor="middle" fill="#5A6470" fontSize={16}>行き：センサ → 反射板　／　戻り：反射板 → センサ</text>
        </g>
      ) : null}
    </svg>
  );
};

// 配置図カード（上から＋搬送方向から）
export const LayoutCard: React.FC<{frame: number; bottlesX?: number[]; compact?: boolean}> = ({frame, bottlesX, compact}) => {
  const w = compact ? 460 : 560;
  const xs = bottlesX ?? [0, 1, 2, 3].map((i) => ((frame * 3 + i * 150) % (w + 120)) - 60);
  return (
    <div>
      <div style={{fontSize: 22, fontWeight: 900, marginBottom: 6}}>センサの配置（上から）</div>
      <TopView w={w} h={compact ? 170 : 210} frame={frame} bottlesX={xs} />
      <div style={{fontSize: 22, fontWeight: 900, margin: '10px 0 6px'}}>搬送方向から見ると</div>
      <FrontView w={w} h={compact ? 220 : 260} frame={frame} />
      <div style={{fontSize: 15, color: X.gray, marginTop: 4}}>※ 赤い光の線は説明用の表現です</div>
    </div>
  );
};
