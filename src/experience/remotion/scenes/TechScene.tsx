// 技術・考え方の解説CG。ナレーションの各文が出るタイミングに合わせて図を進める。
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {X} from '../theme';
import {assetById, linesForAsset} from '../../data';
import {lineSchedule} from '../ClipShell';
import {appear, keyZoom, progress} from '../../../consulting/components/anim';
import {Optics3D, receivedLight} from '../Optics3D';

const ASSET: Record<string, string> = {
  'transparent-light': 'p2-light',
  isolation: 'p2-isolation',
  chain: 'p3-chain',
  followup: 'p5-followup',
  message: 'p5-message',
};

// 各文の開始フレーム
const useSteps = (variant: string) => {
  const {fps} = useVideoConfig();
  const id = ASSET[variant];
  const a = assetById.get(id);
  return lineSchedule(linesForAsset(id), a?.dialogAt ?? 0.8).map((l) => Math.round(l.from * fps));
};

export const TechScene: React.FC<{variant: string}> = ({variant}) => {
  switch (variant) {
    case 'transparent-light':
      return <TransparentLight />;
    case 'isolation':
      return <Isolation />;
    case 'chain':
      return <Chain />;
    case 'followup':
      return <Followup />;
    case 'message':
    default:
      return <Message />;
  }
};

// ---- 透明なボトルと光（受光量のグラフ）
const bump = (u: number) => (u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) ** 2);
const OPAQUE = (u: number) => 1 - 0.82 * bump(u);
// 透明ボトル：全体にわずかに減り、曲面（肩・胴の端）で2回くぼむ → 基準を2回下回る
const dip = (u: number, c: number) => Math.exp(-(((u - c) / 0.1) ** 2));
const CLEAR = (u: number) => (u <= 0 || u >= 1 ? 1 : 1 - 0.1 * bump(u) - 0.16 * (dip(u, 0.32) + dip(u, 0.68)));
const TH = 0.8; // 判定の基準（模式図）

const TransparentLight: React.FC = () => {
  const frame = useCurrentFrame();
  const s = useSteps('transparent-light');
  const step = s.filter((f) => frame >= f).length; // 0〜5
  const G = {x: 980, y: 220, w: 820, h: 360};
  const trace = (fn: (u: number) => number, start: number, dur: number) => {
    const p = progress(frame, start, dur);
    const pts: string[] = [];
    const N = 120;
    for (let k = 0; k <= N * p; k++) {
      const u = k / N;
      // ボトルが通過する区間を中央に
      const v = fn((u - 0.3) / 0.4);
      pts.push(`${G.x + u * G.w},${G.y + (1 - v) * G.h * 1.05 + 10}`);
    }
    return pts.join(' ');
  };
  const out = (fn: (u: number) => number, start: number, dur: number) => {
    const p = progress(frame, start, dur);
    const pts: string[] = [];
    const N = 240;
    const y0 = G.y + G.h + 140;
    for (let k = 0; k <= N * p; k++) {
      const u = k / N;
      const on = fn((u - 0.3) / 0.4) < TH;
      pts.push(`${G.x + u * G.w},${y0 - (on ? 60 : 0)}`);
    }
    return pts.join(' ');
  };
  const isClear = step >= 2;
  const thY = G.y + (1 - TH) * G.h * 1.05 + 10;
  return (
    <AbsoluteFill>
      {/* 左：真上から見た回帰反射型 */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {/* 右：受光量グラフ */}
        <g opacity={progress(frame, s[0] ?? 0, 14)}>
          <line x1={G.x} y1={G.y} x2={G.x} y2={G.y + G.h + 30} stroke={X.ink} strokeWidth={2} />
          <line x1={G.x} y1={G.y + G.h + 30} x2={G.x + G.w} y2={G.y + G.h + 30} stroke={X.ink} strokeWidth={2} />
          <text x={G.x} y={G.y - 20} fontSize={24} fontWeight={700} fill={X.ink}>受光量（戻ってきた光の量）</text>
          <line x1={G.x} y1={thY} x2={G.x + G.w} y2={thY} stroke={X.red} strokeWidth={2} strokeDasharray="10 8" />
          <text x={G.x + G.w - 6} y={thY - 10} fontSize={22} fill={X.red} fontWeight={700} textAnchor="end">判定の基準</text>
          {step <= 1 ? (
            <polyline points={trace(OPAQUE, s[0] + 30, 70)} fill="none" stroke={X.ink} strokeWidth={4} />
          ) : (
            <polyline points={trace(OPAQUE, 0, 1)} fill="none" stroke={X.grayLight} strokeWidth={3} />
          )}
          {step <= 1 ? (
            <text x={G.x + 16} y={G.y + G.h * 0.62} fontSize={22} fill={X.ink}>不透明なモノ：大きく減る</text>
          ) : null}
          {isClear ? <polyline points={trace(CLEAR, s[1] + 10, 70)} fill="none" stroke={X.red} strokeWidth={4.5} /> : null}
          {isClear ? (
            <text x={G.x + 16} y={G.y + G.h * 0.62} fontSize={24} fill={X.red} fontWeight={700} opacity={progress(frame, s[1] + 40, 12)}>
              透明なボトル：わずかに減るだけ
            </text>
          ) : null}
          {/* 出力（ON/OFF） */}
          <text x={G.x} y={G.y + G.h + 74} fontSize={22} fontWeight={700} fill={X.ink}>センサの出力（ON / OFF）</text>
          <polyline points={step >= 4 ? out(CLEAR, s[3], 50) : out(OPAQUE, s[0] + 30, 70)} fill="none" stroke={step >= 4 ? X.red : X.ink} strokeWidth={4} />
        </g>
      </svg>
      <OpticsPanel clear={isClear} />
      {step >= 3 ? (
        <div style={{position: 'absolute', left: G.x + 16, top: G.y + G.h * 0.62 + 16, fontSize: 24, fontWeight: 700, color: X.ink, background: 'rgba(255,255,255,0.9)', padding: '6px 12px', ...appear(frame, s[2] + 20)}}>
          曲面で光が曲がり、受光量が上下する
        </div>
      ) : null}
      {step >= 4 ? (
        <div style={{position: 'absolute', left: G.x + 40, top: G.y + G.h + 160, ...appear(frame, s[3] + 50)}}>
          <span style={{fontSize: 34, fontWeight: 900, color: X.red}}>1本なのに、出力が2回 ON</span>
          <span style={{fontSize: 26, fontWeight: 700, color: X.ink, marginLeft: 14}}>→ 2回カウントの可能性</span>
        </div>
      ) : null}
      {step >= 5 ? (
        <div style={{position: 'absolute', left: G.x, top: 112, width: 820, background: X.paper, ...appear(frame, s[4])}}>
          <div style={{fontSize: 34, fontWeight: 900, color: X.ink}}>
            透明だから<span style={{color: X.red}}>必ず</span>誤検出する、ではない
          </div>
          <div style={{fontSize: 24, color: X.gray, marginTop: 6}}>方式・設定・設置の条件しだい</div>
        </div>
      ) : null}
      <div style={{position: 'absolute', right: 80, bottom: 200, fontSize: 18, color: X.gray}}>※ 模式図。実際の受光量の変化は、方式・設定・条件で異なります</div>
    </AbsoluteFill>
  );
};

// 左：3D CG と、その場の受光量・出力
const OpticsPanel: React.FC<{clear: boolean}> = ({clear}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const mode = clear ? 'clear' : 'opaque';
  const v = receivedLight(frame, fps, mode);
  const on = v < TH;
  return (
    <div style={{position: 'absolute', left: 60, top: 150, width: 860, height: 640, background: '#14161A', border: `1px solid ${X.line}`}}>
      <Optics3D frame={frame} fps={fps} mode={mode} width={860} height={500} />
      <div style={{position: 'absolute', left: 0, top: 0, padding: '8px 16px', background: 'rgba(20,22,26,0.85)', color: 'rgba(255,255,255,0.85)', fontSize: 20, fontWeight: 700}}>
        3D：回帰反射型（手前にセンサ、奥に反射板）
      </div>
      <div style={{position: 'absolute', left: 24, right: 24, bottom: 22, display: 'flex', alignItems: 'center', gap: 22, color: X.white}}>
        <div style={{fontSize: 20, width: 120, color: 'rgba(255,255,255,0.75)'}}>受光量</div>
        <div style={{position: 'relative', flex: 1, height: 26, background: 'rgba(255,255,255,0.1)'}}>
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${v * 100}%`, background: X.beam}} />
          <div style={{position: 'absolute', left: `${TH * 100}%`, top: -8, bottom: -8, width: 3, background: X.white}} />
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, width: 170}}>
          <div style={{width: 26, height: 26, borderRadius: 13, background: on ? '#FFB020' : 'rgba(255,255,255,0.18)', boxShadow: on ? '0 0 16px #FFB020' : 'none'}} />
          <span style={{fontSize: 22, fontWeight: 700}}>出力 {on ? 'ON' : 'OFF'}</span>
        </div>
      </div>
      <div style={{position: 'absolute', left: 24, bottom: 62, fontSize: 18, color: 'rgba(255,255,255,0.6)'}}>
        {clear ? '透明なボトル：光の大部分が通り抜ける（白線＝判定の基準）' : '不透明なモノ：光が遮られる（白線＝判定の基準）'}
      </div>
    </div>
  );
};

// 旧・真上から見た図（参考として残す）
export const PlanView: React.FC<{frame: number; clear: boolean}> = ({frame, clear}) => {
  const y0 = 300;
  const y1 = 560;
  const sx = 480;
  const cycle = 150;
  const k = frame % cycle;
  const x = 80 + (k / cycle) * 820;
  const near = Math.abs(x - sx) < 70;
  const blocked = near && !clear;
  return (
    <g>
      <text x={110} y={250} fontSize={24} fontWeight={700} fill={X.ink}>真上から見た図（回帰反射型）</text>
      <rect x={80} y={y0} width={820} height={y1 - y0} fill="#ECEDEF" stroke={X.grayLight} strokeWidth={2} />
      <rect x={sx - 44} y={y1 + 30} width={88} height={60} rx={8} fill={X.white} stroke={X.ink} strokeWidth={3} />
      <text x={sx + 60} y={y1 + 70} fontSize={22} fill={X.ink}>センサ</text>
      <rect x={sx - 54} y={y0 - 62} width={108} height={30} fill={X.ink2} />
      <text x={sx + 66} y={y0 - 40} fontSize={22} fill={X.ink}>反射板</text>
      {/* 光：遮られると反射板まで届かない。透明なら通り抜ける（少し弱まる） */}
      <line x1={sx - 10} y1={y1 + 30} x2={sx - 10} y2={blocked ? (y0 + y1) / 2 + 60 : y0 - 32} stroke={X.beam} strokeWidth={4} strokeDasharray="12 9" strokeDashoffset={-frame * 4} />
      {!blocked ? (
        <line x1={sx + 10} y1={y0 - 32} x2={sx + 10} y2={y1 + 30} stroke={X.beam} strokeWidth={4} strokeDasharray="12 9" strokeDashoffset={-frame * 4} opacity={near ? 0.45 : 0.75} />
      ) : null}
      {clear ? (
        <circle cx={x} cy={(y0 + y1) / 2} r={60} fill="rgba(120,180,220,0.18)" stroke={near ? X.red : X.ink} strokeWidth={3} />
      ) : (
        <rect x={x - 60} y={(y0 + y1) / 2 - 60} width={120} height={120} fill="#9A9DA3" stroke={X.ink} strokeWidth={3} />
      )}
      <text x={110} y={y1 + 150} fontSize={26} fontWeight={700} fill={X.ink}>
        {clear ? '透明なボトル：光の大部分が通り抜ける' : '不透明なモノ：光が遮られる'}
      </text>
    </g>
  );
};

// ---- どこで数が増えている？
const Isolation: React.FC = () => {
  const frame = useCurrentFrame();
  const s = useSteps('isolation');
  const boxes = [
    {x: 160, label: 'センサ', sub: '出力（ON / OFF）', q: '出力が何度も\n切り替わる？', at: s[0] + 20},
    {x: 760, label: '配線', sub: '信号を送る', q: 'ノイズが\n乗る？', at: s[1]},
    {x: 1360, label: 'PLC', sub: 'カウント処理', q: '数え方の\n設定・処理？', at: s[1] + 40},
  ];
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <line x1={560} y1={430} x2={760} y2={430} stroke={X.ink} strokeWidth={4} />
        <line x1={1160} y1={430} x2={1360} y2={430} stroke={X.ink} strokeWidth={4} />
        {[0, 1, 2].map((i) => {
          const x = 560 + (((frame * 6 + i * 270) % 820));
          if (x > 760 && x < 1160) return null;
          return <rect key={i} x={x - 10} y={420} width={20} height={20} fill={X.red} />;
        })}
      </svg>
      {boxes.map((b) => (
        <div key={b.label} style={{position: 'absolute', left: b.x, top: 330, width: 400, ...appear(frame, 0)}}>
          <div style={{height: 200, border: `3px solid ${X.ink}`, background: X.white, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{fontSize: 52, fontWeight: 900, color: X.ink}}>{b.label}</div>
            <div style={{fontSize: 26, color: X.gray}}>{b.sub}</div>
          </div>
          <div style={{marginTop: 30, display: 'flex', gap: 16, alignItems: 'flex-start', ...appear(frame, b.at)}}>
            <div style={{width: 56, height: 56, borderRadius: 28, background: X.red, color: X.white, fontSize: 38, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none'}}>?</div>
            <div style={{fontSize: 32, fontWeight: 700, color: X.ink, whiteSpace: 'pre-line', lineHeight: 1.35}}>{b.q}</div>
          </div>
        </div>
      ))}
      <div style={{position: 'absolute', left: 0, right: 0, top: 170, textAlign: 'center', ...appear(frame, s[2] ?? 999)}}>
        <span style={{fontSize: 54, fontWeight: 900, color: X.ink}}>どこで数が増えているかを</span>
        <span style={{fontSize: 54, fontWeight: 900, color: X.red, display: 'inline-block', transform: `scale(${keyZoom(frame, s[2] ?? 999)})`}}>切り分ける</span>
      </div>
    </AbsoluteFill>
  );
};

// ---- 本当の課題（連鎖）
const Chain: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSteps('chain');
  const items = ['誤カウント', '数量が合わない', '確認作業が増える', '現場の作業負担', '生産効率への影響'];
  const at = [s[0], s[0] + 0.9 * fps, s[0] + 1.8 * fps, s[0] + 2.7 * fps, s[1]];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 160, top: 170, width: 620}}>
        {items.map((it, i) => (
          <div key={it} style={appear(frame, at[i], {dy: 16})}>
            <div
              style={{
                height: 92,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                fontWeight: 900,
                color: i >= 3 ? X.white : X.ink,
                background: i >= 3 ? (i === 4 ? X.red : X.ink) : X.white,
                border: `2px solid ${i >= 3 ? 'transparent' : X.line}`,
              }}
            >
              {it}
            </div>
            {i < items.length - 1 ? <div style={{height: 34, display: 'flex', justifyContent: 'center', color: X.red, fontSize: 28}}>▼</div> : null}
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 920, top: 330, width: 860, ...appear(frame, s[2] ?? 999, {dx: 30, dy: 0})}}>
        <div style={{fontSize: 32, fontWeight: 700, color: X.gray}}>お客様が欲しいのは</div>
        <div style={{fontSize: 44, fontWeight: 900, color: X.grayLight, marginTop: 14, textDecoration: 'line-through', textDecorationColor: X.red, textDecorationThickness: 5}}>新しいセンサそのもの</div>
        <div style={{fontSize: 32, fontWeight: 700, color: X.gray, marginTop: 14}}>ではなく</div>
        <div style={{fontSize: 60, fontWeight: 900, color: X.red, marginTop: 10, lineHeight: 1.3}}>
          正確な数量管理と
          <br />
          安定した生産
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---- 結果が基準に届かなかったとき
const Followup: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSteps('followup');
  const cards = [
    {t: '設置位置・角度', d: 'センサと反射板の位置や向きを見直す'},
    {t: '感度の設定', d: '判定の基準や応答の設定を見直す'},
    {t: 'PLC側の処理', d: '信号の取り込みや数え方を確認する'},
    {t: '別の検出方式', d: 'ほかの方式・製品で検証する'},
  ];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 120, top: 170, fontSize: 52, fontWeight: 900, color: X.ink, ...appear(frame, s[0])}}>
        結果が基準に届かなかったら
      </div>
      <div style={{position: 'absolute', left: 120, right: 120, top: 330, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28}}>
        {cards.map((c, i) => (
          <div key={c.t} style={{background: X.white, border: `2px solid ${X.line}`, borderTop: `6px solid ${X.red}`, padding: '28px 26px 32px', minHeight: 250, ...appear(frame, (s[1] ?? 0) + i * 0.6 * fps)}}>
            <div style={{fontSize: 36, fontWeight: 900, color: X.ink}}>{c.t}</div>
            <div style={{fontSize: 26, color: X.gray, marginTop: 14, lineHeight: 1.5}}>{c.d}</div>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 680, textAlign: 'center', fontSize: 44, fontWeight: 900, color: X.ink, ...appear(frame, s[2] ?? 999)}}>
        原因を、<span style={{color: X.red}}>お客様と一緒に</span>調べる
      </div>
    </AbsoluteFill>
  );
};

// ---- 実機デモは売り込みではない
const Message: React.FC = () => {
  const frame = useCurrentFrame();
  const s = useSteps('message');
  const strike = progress(frame, (s[0] ?? 0) + 30, 14);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', color: X.white}}>
      <div style={{marginTop: -80, textAlign: 'center'}}>
        <div style={{fontSize: 40, fontWeight: 700, color: 'rgba(255,255,255,0.7)', ...appear(frame, s[0] ?? 0)}}>実機デモは</div>
        <div style={{position: 'relative', display: 'inline-block', fontSize: 84, fontWeight: 900, marginTop: 20, color: 'rgba(255,255,255,0.55)', ...appear(frame, s[0] ?? 0)}}>
          売り込み
          <div style={{position: 'absolute', left: -10, top: '52%', height: 9, background: X.redOnDark, width: `${strike * 108}%`}} />
        </div>
        <div style={{fontSize: 92, fontWeight: 900, marginTop: 30, ...appear(frame, s[1] ?? 999)}}>
          お客様と<span style={{color: X.redOnDark}}>一緒に確かめる</span>
        </div>
        <div style={{fontSize: 34, color: 'rgba(255,255,255,0.7)', marginTop: 36, ...appear(frame, s[2] ?? 999)}}>結果が不十分なら → 追加の調査・別の方式の検討へ</div>
      </div>
    </AbsoluteFill>
  );
};
