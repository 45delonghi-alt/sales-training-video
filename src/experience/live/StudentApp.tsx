// 学生の画面（各自のPC・スマートフォン）。進行役が進めた場面を、自分の端末で見て・選んで・書く。
// 回答前に正解は出さない。回答を締め切ると、自分が選んだ選択肢の映像（お客様の反応）が流れる。
import React, {useEffect, useMemo, useState} from 'react';
import {ClipPlayer, pauseFrames} from '../app/ClipPlayer';
import {characterById, phases, salesLineOf, sceneById} from '../data';
import type {Choice, PitchScene, QuestionScene, ReflectionScene, Scene} from '../types';
import {api, demoOf, pass, rate, savePid, savedPid, type StudentState, useAvailable, useLiveState, useNow} from './client';

const STEPS = [
  {id: 'p1', label: '聞く'},
  {id: 'p2', label: '考える'},
  {id: 'p3', label: '課題を見つける'},
  {id: 'p4', label: '提案する'},
];

const nameOf = (s: string) => characterById.get(s as never)?.name ?? '';

export const StudentApp: React.FC<{sessionId: string}> = ({sessionId}) => {
  const [pid, setPid] = useState(() => savedPid(sessionId));
  const url = pid ? `api/live/${sessionId}/events?role=student&pid=${pid}` : null;
  const {state, online, gone} = useLiveState<StudentState>(url);
  if (!sessionId) return <Center title="参加コードがありません" text="進行役から届いたURLを開いてください。" />;
  if (!pid || gone) return <Join sessionId={sessionId} onJoined={(p) => (savePid(sessionId, p), setPid(p))} again={gone} />;
  if (!state) return <Center title="接続しています…" text="少し待っても変わらないときは、ページを再読み込みしてください。" />;
  return <Live s={state} online={online} />;
};

const Center: React.FC<{title: string; text?: string; children?: React.ReactNode}> = ({title, text, children}) => (
  <div className="lv-center">
    <div className="lv-brand">
      <span className="lv-slash">/</span> OPTEX FA　CONSULTING SALES EXPERIENCE
    </div>
    <h1>{title}</h1>
    {text ? <p>{text}</p> : null}
    {children}
  </div>
);

const Join: React.FC<{sessionId: string; onJoined: (pid: string) => void; again?: boolean}> = ({sessionId, onJoined, again}) => {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Center title="コンサルティング営業体験に参加する" text={again ? '接続が切れました。もう一度参加してください。' : 'あなたは、OPTEX-FAの営業担当になります。'}>
      <label className="lv-field">
        表示名（ニックネームで構いません）
        <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="例：たろう" />
      </label>
      <button
        className="lv-primary"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setErr('');
          api
            .join(sessionId, name.trim(), savedPid(sessionId) || undefined)
            .then((r) => onJoined(r.pid))
            .catch((e) => setErr(e.status === 409 ? 'このセッションは満員です（最大5名）。進行役に連絡してください。' : e.status === 404 ? '参加コードが見つかりません。URLを確認してください。' : '参加できませんでした。通信を確認して、もう一度押してください。'))
            .finally(() => setBusy(false));
        }}
      >
        参加する
      </button>
      {err ? <p className="lv-error">{err}</p> : null}
      <p className="lv-note">参加コード：{sessionId}　／　音声が出ます。イヤホンの使用をおすすめします。</p>
    </Center>
  );
};

const Live: React.FC<{s: StudentState; online: boolean}> = ({s, online}) => {
  const scene = sceneById.get(s.sceneId);
  const phase = scene?.phaseId;
  return (
    <div className="lv">
      <header className="lv-top">
        <div className="lv-brand">
          <span className="lv-slash">/</span> OPTEX FA
        </div>
        <ol className="lv-steps">
          {STEPS.map((x, i) => {
            const idx = STEPS.findIndex((y) => y.id === phase);
            return (
              <li key={x.id} className={x.id === phase ? 'now' : idx > i || phase === 'reflection' ? 'done' : ''}>
                <b>{i + 1}</b>
                {x.label}
              </li>
            );
          })}
        </ol>
        <div className={`lv-conn ${online ? 'on' : ''}`}>{online ? `${s.me?.name ?? ''}・参加中（${s.count}名）` : '再接続しています…'}</div>
      </header>
      <main className="lv-main">{scene ? <SceneView s={s} scene={scene} /> : null}</main>
    </div>
  );
};

const titleOf = (scene: Scene) => {
  const p = phases.find((x) => x.phaseId === scene.phaseId);
  return `${p?.phaseTitle ?? ''}　${scene.title}`;
};

const SceneView: React.FC<{s: StudentState; scene: Scene}> = ({s, scene}) => {
  switch (scene.type) {
    case 'question':
      return <QuestionView s={s} q={scene} />;
    case 'pitch':
      return <PitchView s={s} p={scene} />;
    case 'reflection':
      return <ReflectView s={s} r={scene} />;
    case 'video':
      return <Watch s={s} sceneId={scene.sceneId} assetId="intro" title={scene.title} videoFile={scene.videoFile} />;
    case 'demo':
      return (
        <>
          <Watch s={s} sceneId={scene.sceneId} assetId={scene.videoAsset} title={scene.title} />
          <DemoTable s={s} ids={[scene.sceneId]} />
        </>
      );
    case 'result':
      return (
        <>
          <Watch s={s} sceneId={scene.sceneId} assetId={scene.videoAsset} title={scene.title} />
          <DemoTable s={s} ids={['p4-demo-normal', 'p4-demo-wobble', 'p4-demo-gap']} />
        </>
      );
    default:
      return <Watch s={s} sceneId={scene.sceneId} assetId={scene.videoAsset} title={titleOf(scene)} />;
  }
};

// 映像を見る。書き出し済みのMP4があればそれを再生（端末に負担をかけない）。見終わったら進行役に知らせる
const Watch: React.FC<{s: StudentState; sceneId: string; assetId: string; title: string; videoFile?: string; onEnded?: () => void; auto?: boolean}> = ({s, sceneId, assetId, title, videoFile, onEnded, auto = true}) => {
  const available = useAvailable();
  const [ended, setEnded] = useState(false);
  const pauses = useMemo(() => pauseFrames(sceneId, assetId), [sceneId, assetId]);
  useEffect(() => setEnded(false), [assetId, s.stageAt]);
  const rendered = `experience/rendered/${assetId}.mp4`;
  const file = videoFile ?? (available.has(rendered) ? rendered : undefined);
  return (
    <section className="lv-watch">
      <h2>{title}</h2>
      <ClipPlayer
        assetId={assetId}
        autoPlay={auto}
        playToken={auto ? s.stageAt : 0}
        volume={0.9}
        showSubtitles
        showStatus
        available={available}
        overrideVideoUrl={file}
        pauses={pauses}
        onEnded={() => {
          setEnded(true);
          onEnded?.();
          if (s.me) void api.done(s.sessionId, s.me.pid, sceneId).catch(() => undefined);
        }}
      />
      {ended && !onEnded ? <p className="lv-wait">見終わりました。進行役が次へ進めるまで、お待ちください。</p> : null}
    </section>
  );
};

const Think: React.FC<{s: StudentState}> = ({s}) => {
  const now = useNow();
  const left = Math.max(0, Math.ceil((s.stageAt + s.thinkSeconds * 1000 - now) / 1000));
  return <div className={`lv-timer ${left === 0 ? 'over' : ''}`}>{left > 0 ? `考える時間 ${left}秒` : '回答してください'}</div>;
};

const QuestionView: React.FC<{s: StudentState; q: QuestionScene}> = ({s, q}) => {
  const mine = s.answers[q.sceneId] ?? null;
  const [pick, setPick] = useState<string>(mine?.choiceId ?? '');
  const [reason, setReason] = useState(mine?.reason ?? '');
  const [hint, setHint] = useState(false);
  const [msg, setMsg] = useState('');
  const [watch, setWatch] = useState<string | null>(null);
  useEffect(() => {
    setPick(mine?.choiceId ?? '');
    setReason(mine?.reason ?? '');
    setWatch(null);
    setHint(false);
  }, [q.sceneId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (s.stage === 'answer') {
    return (
      <section className="lv-q">
        <div className="lv-qhead">
          <span className="lv-tag">QUESTION</span>
          <Think s={s} />
        </div>
        {q.situation ? (
          <p className="lv-situ">
            <b>{nameOf(q.situation.speaker)}</b>「{q.situation.text}」
          </p>
        ) : null}
        <h2>{q.questionText}</h2>
        <div className="lv-choices">
          {q.choices.map((c) => (
            <button key={c.choiceId} className={`lv-choice ${pick === c.choiceId ? 'on' : ''}`} onClick={() => setPick(c.choiceId)}>
              <b>{c.choiceId}</b>
              {c.choiceText}
            </button>
          ))}
        </div>
        <label className="lv-field">
          選んだ理由（ひとこと）
          <input value={reason} maxLength={140} onChange={(e) => setReason(e.target.value)} placeholder="例：まず困りごとの大きさを知りたいから" />
        </label>
        <div className="lv-row">
          <button
            className="lv-primary"
            disabled={!pick}
            onClick={() =>
              s.me &&
              api
                .answer(s.sessionId, s.me.pid, q.sceneId, pick, reason.trim())
                .then(() => setMsg('回答しました。締め切りまでは変更できます。'))
                .catch((e) => setMsg(e.status === 409 ? '回答の受付は終わりました。' : '送れませんでした。もう一度押してください。'))
            }
          >
            {mine ? '回答を変更する' : 'この選択肢で回答する'}
          </button>
          {q.hint ? (
            <button className="lv-ghost" onClick={() => setHint((h) => !h)}>
              先輩のヒント
            </button>
          ) : null}
        </div>
        {hint && q.hint ? (
          <p className="lv-hint">
            <b>{nameOf(q.hint.speaker)}</b>「{q.hint.text}」
          </p>
        ) : null}
        {msg || mine ? <p className="lv-ok">{msg || `回答済み：${mine?.choiceId}`}</p> : null}
      </section>
    );
  }

  // 締め切り後：自分の選択肢の映像 → 解説（推奨と全員の人数）
  const chosen = q.choices.find((c) => c.choiceId === mine?.choiceId);
  const showing = q.choices.find((c) => c.choiceId === (watch ?? chosen?.choiceId));
  return (
    <section className="lv-q">
      <h2>{q.questionText}</h2>
      {!chosen ? <p className="lv-note">回答が締め切られました（未回答）。下のボタンから、どの選択肢の結果も見られます。</p> : null}
      {s.stage === 'explain' && !watch ? <Explain s={s} q={q} chosen={chosen} /> : null}
      {showing ? (
        <>
          <div className="lv-yours">
            {watch && watch !== chosen?.choiceId ? 'ほかの選択肢' : 'あなたの選択'}：<b>{showing.choiceId}</b> {showing.choiceText}
          </div>
          <Watch key={showing.choiceId} s={s} sceneId={q.sceneId} assetId={showing.videoAsset} title={`「${salesLineOf(showing)}」`} onEnded={() => undefined} auto={s.stage === 'branch' || !!watch} />
          <Outcome c={showing} />
        </>
      ) : null}
      {s.stage === 'explain' ? (watch ? <Explain s={s} q={q} chosen={chosen} /> : null) : <p className="lv-wait">全員が見終わったら、進行役が解説します。</p>}
      {s.stage === 'explain' ? (
        <div className="lv-others">
          ほかの選択肢を見る：
          {q.choices.map((c) => (
            <button key={c.choiceId} className={`lv-ghost ${showing?.choiceId === c.choiceId ? 'on' : ''}`} onClick={() => setWatch(c.choiceId)}>
              {c.choiceId}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
};

const Outcome: React.FC<{c: Choice}> = ({c}) => (
  <div className="lv-outcome">
    <p className="lv-resp">
      <b>{nameOf(c.responder)}</b>「{c.customerResponse}」
    </p>
    <dl>
      <dt>分かったこと</dt>
      <dd>{c.gained}</dd>
      <dt>まだ分からないこと</dt>
      <dd>{c.missing}</dd>
    </dl>
  </div>
);

const Explain: React.FC<{s: StudentState; q: QuestionScene; chosen?: Choice}> = ({s, q}) => {
  const rec = q.choices.find((c) => c.choiceId === q.recommendedChoice);
  return (
    <div className="lv-explain">
      <div className="lv-tag">解説</div>
      {rec ? (
        <p className="lv-rec">
          おすすめ：<b>{rec.choiceId}</b> {rec.choiceText}
        </p>
      ) : (
        <p className="lv-rec">どれも大切な確認です（順番に確かめます）</p>
      )}
      <p>{q.recommendReason}</p>
      <p className="lv-point">POINT　{q.learningPoint}</p>
      {s.tally ? (
        <div className="lv-tally">
          <div className="lv-tag">みんなの回答（{s.tally.total}名）</div>
          <ul>
            {q.choices.map((c) => (
              <li key={c.choiceId}>
                <b>{c.choiceId}</b>：{s.tally!.counts[c.choiceId] ?? 0}名
              </li>
            ))}
          </ul>
          {s.tally.reasons.length ? (
            <ul className="lv-reasons">
              {s.tally.reasons.map((r, i) => (
                <li key={i}>
                  <b>{r.choiceId}</b> {r.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const PitchView: React.FC<{s: StudentState; p: PitchScene}> = ({s, p}) => {
  const [text, setText] = useState<Record<string, string>>(s.myText ?? {});
  const [msg, setMsg] = useState('');
  const joined = p.parts.map((x) => text[x.key]).filter(Boolean).join('。');
  const sec = Math.round([...joined].length / 7); // 1秒に7文字ほどで話す目安
  if (s.stage === 'share') return <Shared s={s} title={p.title} labels={p.parts.map((x) => [x.key, x.label])} own={s.myText} />;
  return (
    <section className="lv-pitch">
      <span className="lv-tag">PROPOSAL</span>
      <h2>{p.prompt}</h2>
      {p.parts.map((part, i) => (
        <div key={part.key} className="lv-part">
          <div className="lv-plabel">
            {i + 1}. {part.label}
          </div>
          <div className="lv-chips">
            {part.options.map((o) => (
              <button key={o} className="lv-chip" onClick={() => setText((t) => ({...t, [part.key]: o}))}>
                {o}
              </button>
            ))}
          </div>
          <textarea rows={2} maxLength={300} value={text[part.key] ?? ''} placeholder={part.placeholder} onChange={(e) => setText((t) => ({...t, [part.key]: e.target.value}))} />
        </div>
      ))}
      <div className={`lv-sec ${sec > p.seconds ? 'over' : ''}`}>読み上げの目安：約{sec}秒（{p.seconds}秒以内を目指そう）</div>
      <button
        className="lv-primary"
        onClick={() =>
          s.me &&
          api
            .text(s.sessionId, s.me.pid, p.sceneId, text)
            .then(() => setMsg('提出しました。進行役に呼ばれたら、声に出して提案してみましょう。'))
            .catch(() => setMsg('送れませんでした。もう一度押してください。'))
        }
      >
        提案を提出する
      </button>
      {msg ? <p className="lv-ok">{msg}</p> : null}
    </section>
  );
};

const ReflectView: React.FC<{s: StudentState; r: ReflectionScene}> = ({s, r}) => {
  const [t, setT] = useState(s.myText?.answer ?? '');
  const [msg, setMsg] = useState('');
  if (s.stage === 'share') return <Shared s={s} title={r.question} labels={[['answer', '']]} own={s.myText} />;
  return (
    <section className="lv-reflect">
      <span className="lv-tag">REFLECTION</span>
      <h2>{r.question}</h2>
      <textarea rows={4} maxLength={300} value={t} onChange={(e) => setT(e.target.value)} placeholder="自分の言葉で書いてみよう" />
      <button
        className="lv-primary"
        onClick={() =>
          s.me &&
          api
            .text(s.sessionId, s.me.pid, r.sceneId, {answer: t})
            .then(() => setMsg('提出しました。'))
            .catch(() => setMsg('送れませんでした。もう一度押してください。'))
        }
      >
        提出する
      </button>
      {msg ? <p className="lv-ok">{msg}</p> : null}
    </section>
  );
};

const Shared: React.FC<{s: StudentState; title: string; labels: string[][]; own: Record<string, string> | null}> = ({s, title, labels, own}) => {
  const list = s.shared ?? (own ? [{name: s.me?.name ?? 'あなた', text: own}] : []);
  return (
    <section className="lv-shared">
      <span className="lv-tag">{s.shared ? 'みんなの答え' : 'あなたの答え'}</span>
      <h2>{title}</h2>
      {list.length ? (
        list.map((x, i) => (
          <div key={i} className="lv-card">
            <b>{x.name}</b>
            {labels.map(([k, l]) => (x.text[k] ? <p key={k}>{l ? `${l}：` : ''}{x.text[k]}</p> : null))}
          </div>
        ))
      ) : (
        <p className="lv-note">提出はありません。</p>
      )}
    </section>
  );
};

const DemoTable: React.FC<{s: StudentState; ids: string[]}> = ({s, ids}) => {
  const rows = ids.map((id) => ({id, title: sceneById.get(id)?.title.replace(/^比較デモ\d：/, '') ?? id, d: demoOf(s.demo, id)}));
  const virtual = rows.some((r) => r.d?.source !== 'live');
  return (
    <div className="lv-demo">
      <div className="lv-tag">比較の記録{virtual ? '（仮想データ・教育用）' : '（実測）'}</div>
      <table>
        <thead>
          <tr>
            <th>条件</th>
            <th>既設（他社製・回帰反射型）</th>
            <th>OPTEX-FA KR-Qシリーズ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.title}</td>
              <td className={pass(r.d?.existing) ? 'ok' : 'ng'}>
                通過 {r.d?.existing.passed || '―'}／PLC {r.d?.existing.counted || '―'}（{rate(r.d?.existing)}）
              </td>
              <td className={pass(r.d?.optex) ? 'ok' : 'ng'}>
                通過 {r.d?.optex.passed || '―'}／PLC {r.d?.optex.counted || '―'}（{rate(r.d?.optex)}）
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {virtual ? <p className="lv-note">実測の記録がない条件は、教育用の仮想データです。実際の性能を示すものではありません。</p> : null}
    </div>
  );
};
