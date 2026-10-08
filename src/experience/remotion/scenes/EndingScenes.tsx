// 振り返りQ4の現場モンタージュ／エンディング
import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {X} from '../theme';
import {BrandMark} from '../../../consulting/components/BrandMark';
import {appear, keyZoom, progress} from '../../../consulting/components/anim';

type Item = 'food' | 'cup' | 'box' | 'jig';

const CUTS: {item: Item; title: string; note: string}[] = [
  {item: 'food', title: '食品があるか・ないかの検出', note: 'トレイに中身が入っているか'},
  {item: 'cup', title: '容器の通過の検知', note: 'カップや缶が流れてきたか'},
  {item: 'box', title: '包装工程での検出', note: '箱・フィルム包装の位置'},
  {item: 'jig', title: '製造設備の位置の確認', note: '治具が決まった位置に来たか'},
];

const ItemShape: React.FC<{item: Item; k: number}> = ({item, k}) => {
  const s = {fill: 'none', stroke: X.ink, strokeWidth: 3};
  switch (item) {
    case 'food':
      return (
        <g>
          <path d="M -80 0 L 80 0 L 70 -30 L -70 -30 Z" {...s} />
          {k % 3 === 1 ? null : <ellipse cx={0} cy={-46} rx={50} ry={20} fill="rgba(215,20,30,0.12)" stroke={X.ink} strokeWidth={3} />}
        </g>
      );
    case 'cup':
      return <path d="M -40 0 L 40 0 L 52 -130 L -52 -130 Z" {...s} />;
    case 'box':
      return (
        <g>
          <rect x={-80} y={-110} width={160} height={110} {...s} />
          <path d="M -80 -110 L -50 -140 L 110 -140 L 80 -110 M 80 0 L 110 -30 L 110 -140" {...s} />
        </g>
      );
    case 'jig':
    default:
      return (
        <g>
          <rect x={-90} y={-40} width={180} height={40} {...s} />
          <rect x={-20} y={-120} width={40} height={80} {...s} />
        </g>
      );
  }
};

const Cut: React.FC<{item: Item; title: string; note: string}> = ({item, title, note}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const beamX = 980;
  const xs = Array.from({length: 7}, (_, i) => (item === 'jig' ? Math.min(beamX, 200 + t * 500) - i * 2000 : -200 + ((t * 260 + i * 300) % 2100)));
  const hit = xs.some((x) => Math.abs(x - beamX) < 60);
  return (
    <AbsoluteFill style={{opacity: progress(frame, 0, 8)}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <rect x={0} y={700} width={1920} height={26} fill="#E4E5E7" stroke={X.grayLight} strokeWidth={2} />
        {xs.map((x, i) => (
          <g key={i} transform={`translate(${x}, 700)`}>
            <ItemShape item={item} k={i} />
          </g>
        ))}
        <rect x={beamX - 40} y={380} width={80} height={60} rx={8} fill={X.white} stroke={X.ink} strokeWidth={3} />
        <line x1={beamX} y1={440} x2={beamX} y2={700} stroke={X.beam} strokeWidth={4} strokeDasharray="12 9" strokeDashoffset={-frame * 4} />
        {hit ? (
          <text x={beamX + 70} y={420} fill={X.red} fontSize={40} fontWeight={900}>
            検出
          </text>
        ) : null}
      </svg>
      <div style={{position: 'absolute', left: 120, top: 180, ...appear(frame, 3)}}>
        <div style={{fontSize: 22, fontWeight: 700, color: X.red, letterSpacing: 2}}>例</div>
        <div style={{fontSize: 52, fontWeight: 900, color: X.ink}}>{title}</div>
        <div style={{fontSize: 26, color: X.gray, marginTop: 6}}>{note}</div>
      </div>
    </AbsoluteFill>
  );
};

export const ApplicationsScene: React.FC = () => {
  const {fps} = useVideoConfig();
  const each = 4 * fps;
  return (
    <AbsoluteFill>
      {CUTS.map((c, i) => (
        <Sequence key={c.item} from={i * each} durationInFrames={each}>
          <Cut {...c} />
        </Sequence>
      ))}
      <div style={{position: 'absolute', right: 80, bottom: 120, fontSize: 18, color: X.gray}}>※ 具体的な製品が使えるかは、メーカーの仕様と使用条件で判断します</div>
    </AbsoluteFill>
  );
};

export const EndingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const words = ['聞く。', '考える。', '提案する。', 'そして、確かめる。'];
  const phase = frame < f(3.2) ? 0 : frame < f(9.4) ? 1 : frame < f(13.4) ? 2 : 3;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', color: X.white}}>
      {phase === 0 ? <div style={{fontSize: 96, fontWeight: 900, ...appear(frame, f(0.3))}}>売るだけでは、終わらない。</div> : null}
      {phase === 1 ? (
        <div style={{display: 'flex', gap: 46}}>
          {words.map((w, i) => (
            <div key={w} style={{fontSize: 80, fontWeight: 900, color: i === 3 ? X.redOnDark : X.white, ...appear(frame, f(3.4 + i * 1.3), {dy: 30})}}>
              {w}
            </div>
          ))}
        </div>
      ) : null}
      {phase === 2 ? (
        <div style={{fontSize: 84, fontWeight: 900, textAlign: 'center', lineHeight: 1.4, ...appear(frame, f(9.6))}}>
          お客様と一緒に、
          <br />
          <span style={{color: X.redOnDark, display: 'inline-block', transform: `scale(${keyZoom(frame, f(10.4))})`}}>課題解決</span>を実現する。
        </div>
      ) : null}
      {phase === 3 ? (
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, ...appear(frame, f(13.6))}}>
          <BrandMark size={110} color={X.white} />
          <div style={{fontSize: 34, letterSpacing: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)'}}>CONSULTING SALES EXPERIENCE</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
