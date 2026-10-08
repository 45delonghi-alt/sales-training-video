// 寄りのカット：既設センサ／透明PETボトルと光の経路
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {X} from '../theme';
import {BOTTLE_PATH} from '../FactoryLine';
import {appear, progress} from '../../../consulting/components/anim';

// 既設センサ。メーカー・型式が特定できない描き方にする（教育用の架空設定）
export const SensorScene: React.FC<{variant: string}> = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const zoom = interpolate(frame, [0, 2.8 * fps], [0.72, 1.1], {extrapolateRight: 'clamp', easing: (x) => 1 - (1 - x) ** 3});
  const focus = progress(frame, 3.0 * fps, 12);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(960, 560) scale(${zoom}) translate(-960, -560)`}>
          {/* 取付金具とポール */}
          <rect x={560} y={300} width={40} height={700} fill="#24272C" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
          <path d="M 600 470 L 760 470 L 760 520 L 600 520" fill="#2A2D33" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
          {/* 本体 */}
          <rect x={740} y={360} width={420} height={330} rx={22} fill="#2C2F35" stroke="rgba(255,255,255,0.85)" strokeWidth={3} />
          <rect x={760} y={380} width={380} height={44} rx={8} fill="rgba(255,255,255,0.06)" />
          {/* 表示灯 */}
          <circle cx={800} cy={402} r={10} fill="#FFB020" />
          <circle cx={840} cy={402} r={10} fill="#3BC46E" />
          <text x={866} y={410} fill="rgba(255,255,255,0.6)" fontSize={20}>出力 ／ 安定</text>
          {/* レンズ（反射板の方を向く） */}
          <rect x={1160} y={470} width={50} height={120} rx={10} fill="#1A1C20" stroke="rgba(255,255,255,0.7)" strokeWidth={3} />
          <circle cx={1185} cy={530} r={18} fill={X.beam} opacity={0.9} />
          {/* 型式ラベル（読み取れない） */}
          <rect x={790} y={470} width={300} height={150} rx={6} fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={812} y={492 + i * 30} width={[220, 160, 240, 120][i]} height={14} rx={3} fill="rgba(255,255,255,0.28)" />
          ))}
          {/* ケーブル */}
          <path d="M 950 690 C 950 820 820 860 760 1000" fill="none" stroke="#3A3D44" strokeWidth={18} />
          {/* 光の向き */}
          <g opacity={progress(frame, 0.8 * fps, 14)}>
            <line x1={1216} y1={530} x2={1560} y2={530} stroke={X.beam} strokeWidth={4} strokeDasharray="16 12" strokeDashoffset={-frame * 4} />
            <text x={1300} y={500} fill="rgba(255,255,255,0.75)" fontSize={26} fontWeight={700}>反射板の方へ →</text>
          </g>
        </g>
        {/* 型式ラベルにフォーカス */}
        <g opacity={focus}>
          <rect x={960 + (790 - 960) * 1.1 - 14} y={560 + (470 - 560) * 1.1 - 14} width={300 * 1.1 + 28} height={150 * 1.1 + 28} fill="none" stroke={X.redOnDark} strokeWidth={4} />
        </g>
      </svg>
      <div style={{position: 'absolute', left: 120, top: 190, color: X.white, ...appear(frame, 3.1 * fps, {dx: -20, dy: 0})}}>
        <div style={{fontSize: 22, letterSpacing: 2, color: 'rgba(255,255,255,0.65)', fontWeight: 700}}>既設センサ</div>
        <div style={{fontSize: 44, fontWeight: 900, marginTop: 6}}>
          型式：<span style={{color: X.redOnDark}}>確認中</span>
        </div>
        <div style={{fontSize: 22, color: 'rgba(255,255,255,0.6)', marginTop: 8}}>ラベルが小さく、すぐには読み取れない</div>
      </div>
    </AbsoluteFill>
  );
};

// 透明PETボトルの接写 → 真上から見た光の経路
export const BottleScene: React.FC<{variant: string}> = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const SWITCH = 6.5;
  if (t < SWITCH) {
    const draw = interpolate(frame, [0, 2.2 * fps], [1, 0], {extrapolateRight: 'clamp'});
    const call = (i: number) => appear(frame, (2.2 + i * 1.0) * fps, {dx: -20, dy: 0});
    const o = 1 - progress(frame, (SWITCH - 0.4) * fps, 10);
    return (
      <AbsoluteFill style={{opacity: o}}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <g transform={`translate(700, 1000) scale(3.4)`}>
            <path d={BOTTLE_PATH} fill="rgba(150,205,240,0.10)" />
            <path d="M -42 -138 L 42 -138 L 42 -14 Q 42 0 28 0 L -28 0 Q -42 0 -42 -14 Z" fill="rgba(140,200,235,0.16)" />
            {[-120, -96, -72].map((y) => (
              <path key={y} d={`M -42 ${y} Q 0 ${y + 6} 42 ${y}`} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1} />
            ))}
            <path d={BOTTLE_PATH} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={1.2} pathLength={1} strokeDasharray={1} strokeDashoffset={draw} />
            <line x1={-27} y1={-140} x2={-27} y2={-34} stroke="rgba(255,255,255,0.45)" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        </svg>
        {[
          {y: 330, text: '曲面', note: '肩の部分で光が曲がる'},
          {y: 560, text: '凹凸（リブ）', note: '胴のくぼみ'},
          {y: 760, text: '透明', note: '光をほとんど通す'},
        ].map((c, i) => (
          <div key={c.text} style={{position: 'absolute', left: 1000, top: c.y, color: X.white, display: 'flex', alignItems: 'center', gap: 20, ...call(i)}}>
            <div style={{width: 120, height: 2, background: X.redOnDark}} />
            <div>
              <div style={{fontSize: 46, fontWeight: 900}}>{c.text}</div>
              <div style={{fontSize: 24, color: 'rgba(255,255,255,0.65)'}}>{c.note}</div>
            </div>
          </div>
        ))}
      </AbsoluteFill>
    );
  }
  // 真上から見た図
  const f0 = SWITCH * fps;
  const p = progress(frame, f0, 14);
  const beamP = progress(frame, f0 + 20, 20);
  const belt = {y0: 440, y1: 700};
  const sx = 960;
  const bottles = Array.from({length: 7}, (_, i) => -300 + (t - SWITCH) * 230 + i * 300 - 600);
  return (
    <AbsoluteFill style={{opacity: p}}>
      <div style={{position: 'absolute', left: 72, top: 150, fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.75)'}}>真上から見た図</div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <rect x={0} y={belt.y0} width={1920} height={belt.y1 - belt.y0} fill="#1C1F24" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
        <line x1={0} y1={belt.y0 + 14} x2={1920} y2={belt.y0 + 14} stroke="rgba(255,255,255,0.45)" strokeWidth={3} />
        <line x1={0} y1={belt.y1 - 14} x2={1920} y2={belt.y1 - 14} stroke="rgba(255,255,255,0.45)" strokeWidth={3} />
        <text x={60} y={belt.y1 + 44} fill="rgba(255,255,255,0.5)" fontSize={22}>コンベア →</text>
        {/* センサ（手前）・反射板（奥） */}
        <rect x={sx - 50} y={belt.y1 + 40} width={100} height={70} rx={8} fill="#2C2F35" stroke="rgba(255,255,255,0.85)" strokeWidth={3} />
        <rect x={sx - 60} y={belt.y0 - 80} width={120} height={34} fill="#2A2D33" stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
        <g opacity={beamP}>
          <line x1={sx - 12} y1={belt.y1 + 40} x2={sx - 12} y2={belt.y0 - 46} stroke={X.beam} strokeWidth={4} strokeDasharray="14 10" strokeDashoffset={-frame * 4} />
          <line x1={sx + 12} y1={belt.y0 - 46} x2={sx + 12} y2={belt.y1 + 40} stroke={X.beam} strokeWidth={4} strokeDasharray="14 10" strokeDashoffset={-frame * 4} opacity={0.6} />
        </g>
        {bottles.map((x, i) => {
          const near = Math.abs(x - sx) < 70;
          return (
            <g key={i}>
              <circle cx={x} cy={(belt.y0 + belt.y1) / 2} r={62} fill="rgba(150,205,240,0.12)" stroke={near ? X.redOnDark : 'rgba(255,255,255,0.85)'} strokeWidth={near ? 4 : 2.5} />
              <circle cx={x} cy={(belt.y0 + belt.y1) / 2} r={20} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      <div style={{position: 'absolute', left: sx + 90, top: belt.y1 + 48, color: X.white, fontSize: 28, fontWeight: 700}}>光電センサ（片側）</div>
      <div style={{position: 'absolute', left: sx + 90, top: belt.y0 - 86, color: X.white, fontSize: 28, fontWeight: 700}}>反射板（反対側）</div>
      <div style={{position: 'absolute', left: 120, top: 250, color: X.white, ...appear(frame, f0 + 40)}}>
        <div style={{fontSize: 40, fontWeight: 900}}>
          光が<span style={{color: X.redOnDark}}>往復</span>し、ボトルが横切る
        </div>
        <div style={{fontSize: 24, color: 'rgba(255,255,255,0.65)', marginTop: 6}}>回帰反射型：戻ってくる光の変化でボトルを検出する</div>
      </div>
    </AbsoluteFill>
  );
};
