// 単独再生用の完成動画に焼き込むフェーズナビゲーション（WEB参加型体験では React 側で表示するので、各クリップには入れない）。
// 背景透過の静止画として書き出し、scripts/experience-assemble.ts がクリップの上に重ねる。
//   chapter=false：画面上部のナビゲーション（高さ84px＝画面の約7.8%）
//   chapter=true ：フェーズが変わったときに中央に2〜3秒出すチャプタータイトル（完成動画では、そのフェーズの最初のクリップの前に、2.6秒の扉として入れる）
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FONT} from '../../consulting/theme';
import {NAV_PHASES, NAV_RED, navState} from '../data/phaseNav';

export const NAV_H = 84;

export const PhaseNavOverlay: React.FC<{sceneId: string; chapter?: boolean}> = ({sceneId, chapter}) => {
  const st = navState(sceneId);
  if (chapter) {
    const p = NAV_PHASES[st.currentPhase];
    if (!p) return null;
    return (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: FONT}}>
        {/* 中央のメッセージは2倍の大きさ（2026-10-16 修正指示 第3章）。上部のナビゲーション（84px）にかからない位置 */}
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '44px 110px 52px', background: 'rgba(13,14,16,0.9)', borderTop: `10px solid ${NAV_RED}`, color: '#fff', marginTop: 60, maxWidth: 1760, boxSizing: 'border-box'}}>
          <span style={{fontSize: 60, fontWeight: 800, letterSpacing: 10, color: '#FF5A63', lineHeight: 1.1}}>PHASE {p.no}</span>
          <b style={{fontSize: 152, fontWeight: 900, lineHeight: 1.15, whiteSpace: 'nowrap'}}>{p.name}</b>
          <span style={{fontSize: 76, fontWeight: 700, color: '#E6E8EB', lineHeight: 1.25, whiteSpace: 'nowrap'}}>「{p.chapter}」</span>
        </div>
      </AbsoluteFill>
    );
  }
  if (st.isIntro) return null;
  const cur = NAV_PHASES[st.currentPhase];
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: NAV_H, background: '#141518', display: 'flex', gap: 10, padding: '10px 28px 16px', boxSizing: 'border-box'}}>
        {NAV_PHASES.map((p, i) => {
          const now = i === st.currentPhase;
          const done = st.completedPhases.includes(i);
          return (
            <div key={p.id} style={{flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', background: now ? NAV_RED : '#2A2D33', color: now ? '#fff' : done ? '#E6E8EB' : '#8C929A'}}>
              <span style={{fontSize: 17, fontWeight: 800, letterSpacing: 2, whiteSpace: 'nowrap'}}>
                {done ? '✓ ' : ''}PHASE {p.no}
              </span>
              <span style={{fontSize: 27, fontWeight: 900, whiteSpace: 'nowrap'}}>{p.name}</span>
              <span style={{fontSize: 16, fontWeight: 700, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{p.sub}</span>
            </div>
          );
        })}
        <div style={{flex: 'none', width: 230, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', color: '#C9CED4'}}>
          {st.isReflection ? (
            <b style={{fontSize: 21, letterSpacing: 2, color: '#fff'}}>MISSION COMPLETE</b>
          ) : (
            <>
              <span style={{fontSize: 16, fontWeight: 800, letterSpacing: 1.5}}>PHASE {cur.no} / 04</span>
              <b style={{fontSize: 26, color: '#fff'}}>{cur.name}</b>
            </>
          )}
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: '#2A2D33'}}>
          <div style={{height: '100%', width: `${st.progress * 100}%`, background: NAV_RED}} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
