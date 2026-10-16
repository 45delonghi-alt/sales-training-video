// PLCとは？（2026-10-16 修正指示 第8章・修正前P29）。PLCを初めて聞く学生向けの説明。
//   左：PLCの外観のイメージ（受領した画像。メーカー・型式の入っていない一般的な形）
//   右：センサとPLCの関係。光電センサが「検出信号」を出し、PLCがその信号を受けて数える（PLCはセンサではない）
import React from 'react';
import {Img, interpolate, staticFile} from 'remotion';
import {C, Panel, Red, RedLabel, ap, useSec} from './Kit';

// PLCの外観（2026-10-16 受領した画像に置き換え。元画像は assets-src/products/plc-provided.webp、上下の余白を切ったもの）
const PlcImage: React.FC = () => (
  <Img src={staticFile('experience/products/general/plc.jpg')} style={{display: 'block', margin: '0 auto', height: 355, width: 355 * (1254 / 1010), objectFit: 'contain'}} />
);

// 横一列の流れ：PETボトル → 光電センサ →（検出信号）→ PLC → カウント処理
const Box: React.FC<{label: string; sub: string; strong?: boolean; at: number; frame: number; fps: number}> = ({label, sub, strong, at, frame, fps}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, ...ap(frame, at, fps, {dy: 10})}}>
    <div style={{width: 150, textAlign: 'center', fontSize: 26, fontWeight: 900, padding: '14px 4px', background: strong ? C.red : C.white, color: strong ? C.white : C.ink, border: strong ? `3px solid ${C.red}` : `3px solid ${C.ink}`}}>{label}</div>
    <div style={{fontSize: 20, fontWeight: 700, color: strong ? C.red : C.gray, whiteSpace: 'nowrap'}}>{sub}</div>
  </div>
);
const Arrow: React.FC<{text?: string; at: number; frame: number; fps: number; glow?: number}> = ({text, at, frame, fps, glow = 1}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 70, marginTop: 2, ...ap(frame, at, fps)}}>
    <span style={{fontSize: 16, fontWeight: 900, color: C.red, height: 22, whiteSpace: 'nowrap', opacity: glow}}>{text ?? ''}</span>
    <span style={{fontSize: 34, color: C.red, fontWeight: 900, lineHeight: 1}}>▶</span>
  </div>
);

export const PlcExplain: React.FC = () => {
  const {frame, fps} = useSec();
  const glow = interpolate(frame % (2 * fps), [0, fps, 2 * fps], [0.3, 1, 0.3]);
  return (
    <>
      {/* 左：外観のイメージと正式名称（左下の顔ワイプより上に収める） */}
      <Panel style={{left: 140, top: 190, width: 700, height: 500, padding: '24px 36px', ...ap(frame, 0.2, fps)}}>
        <RedLabel size={24}>PLC（外観のイメージ）</RedLabel>
        <div style={{marginTop: 18}}>
          <PlcImage />
        </div>
        <div style={{fontSize: 22, fontWeight: 700, color: C.gray, marginTop: 6}}>※ 一般的な形のイメージ（特定の製品ではありません）</div>
      </Panel>
      {/* 右：やさしい説明と、センサとの関係 */}
      <Panel accent="top" style={{left: 880, right: 140, top: 190, height: 500, padding: '24px 40px', ...ap(frame, 0.6, fps)}}>
        <div style={{fontSize: 26, fontWeight: 800, color: C.gray}}>正式名称：プログラマブルロジックコントローラ</div>
        <div style={{fontSize: 34, fontWeight: 900, lineHeight: 1.5, marginTop: 10}}>
          PLCは、工場の機械を動かす<Red>頭脳</Red>のような装置です。
          <br />
          センサからの信号を受け取り、
          <br />
          機械の動作やカウントを制御します。
        </div>
        <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginTop: 34}}>
          <Box label="PETボトル" sub="流れてくる" at={1.4} frame={frame} fps={fps} />
          <Arrow at={1.8} frame={frame} fps={fps} />
          <Box label="光電センサ" sub="ボトルを見つける" at={2.2} frame={frame} fps={fps} />
          <Arrow text="検出信号" at={2.6} frame={frame} fps={fps} glow={glow} />
          <Box label="PLC" sub="信号を受けて数える" strong at={3.0} frame={frame} fps={fps} />
          <Arrow at={3.4} frame={frame} fps={fps} />
          <Box label="カウント" sub="本数を記録" at={3.8} frame={frame} fps={fps} />
        </div>
        <div style={{fontSize: 22, fontWeight: 800, color: C.ink2, marginTop: 22}}>※ PLCはセンサではありません。センサの信号を受け取って、数えたり機械を動かしたりします</div>
      </Panel>
    </>
  );
};
