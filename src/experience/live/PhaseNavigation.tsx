// チャプター型フェーズナビゲーション（WEB参加型体験の画面最上部）。
// 状態は進行役が管理するセッションの場面（sceneId）だけから決める。学生が動画を止めても、回答を待っていても進まない。
// 再接続したときは、その時点の場面から現在地と完了状態を復元する（切り替えの演出は出さない）。
import React, {useEffect, useRef, useState} from 'react';
import {NAV_PHASES, navState} from '../data/phaseNav';

const CHAPTER_MS = 2600;

export const PhaseNavigation: React.FC<{sceneId: string; compact?: boolean}> = ({sceneId, compact}) => {
  const st = navState(sceneId);
  const prev = useRef<number | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  // フェーズが進んだときだけ、画面中央に短くチャプタータイトルを出す（最初の表示・再接続では出さない）
  useEffect(() => {
    const before = prev.current;
    prev.current = st.currentPhase;
    if (before === null || st.currentPhase === before || st.currentPhase < 0 || st.currentPhase > 3) return;
    setChapter(st.currentPhase);
    const t = setTimeout(() => setChapter(null), CHAPTER_MS);
    return () => clearTimeout(t);
  }, [st.currentPhase]);

  if (st.isIntro) {
    return (
      <nav className="pn pn-intro" aria-label="フェーズ">
        <ol className="pn-steps">
          {NAV_PHASES.map((p) => (
            <li key={p.id} className="pn-step">
              <span className="pn-no">PHASE {p.no}</span>
              <span className="pn-name">
                <span className="pn-long">{p.name}</span>
                <span className="pn-short">{Number(p.no)} {p.short}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="pn-where">導入</div>
      </nav>
    );
  }
  const cur = NAV_PHASES[st.currentPhase];
  return (
    <>
      <nav className={`pn ${compact ? 'pn-compact' : ''}`} aria-label="フェーズ" data-phase={st.isReflection ? 'complete' : cur.id}>
        <ol className="pn-steps">
          {NAV_PHASES.map((p, i) => {
            const state = i === st.currentPhase ? 'now' : st.completedPhases.includes(i) ? 'done' : 'todo';
            return (
              <li key={p.id} className={`pn-step ${state}`} aria-current={state === 'now' ? 'step' : undefined}>
                <span className="pn-no">
                  {state === 'done' ? <span className="pn-check" aria-label="完了">✓</span> : null}PHASE {p.no}
                </span>
                <span className="pn-name">
                  <span className="pn-long">{p.name}</span>
                  <span className="pn-short">{Number(p.no)} {p.short}</span>
                </span>
                <span className="pn-sub">{p.sub}</span>
              </li>
            );
          })}
        </ol>
        <div className="pn-where">
          {st.isReflection ? (
            <b className="pn-done">MISSION COMPLETE</b>
          ) : (
            <>
              <span>PHASE {cur.no} / 04</span>
              <b>{cur.name}</b>
            </>
          )}
        </div>
        <div className="pn-bar" aria-hidden>
          <i style={{width: `${Math.round(st.progress * 1000) / 10}%`}} />
        </div>
      </nav>
      {chapter !== null ? (
        <div className="pn-chapter" role="status">
          <span className="pn-chapter-no">PHASE {NAV_PHASES[chapter].no}</span>
          <b>{NAV_PHASES[chapter].name}</b>
          <span className="pn-chapter-msg">「{NAV_PHASES[chapter].chapter}」</span>
        </div>
      ) : null}
    </>
  );
};
