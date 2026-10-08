// コンサルティング営業体験（60分）のデータ検証と書き出し。
//   npm run experience:validate … 分岐・素材の対応を機械的に検査（エラーがあれば終了コード1）
//   npm run experience:export   … data/branches.json・素材管理表（CSV）・音読さん用セリフを書き出す
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {assetById, assetSeconds, assets, branches, lineSchedule, linesForAsset, phases, questions, readSeconds, sceneById, scenes, videoPathFor} from '../src/experience/data';
import {VARIANTS} from '../src/experience/remotion/variants';
import {allLines} from '../src/consulting/timeline';
import {script as introScript} from '../src/consulting/script';

const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');

type Issue = {level: 'error' | 'warn'; msg: string};

export const validate = (): Issue[] => {
  const issues: Issue[] = [];
  const err = (msg: string) => issues.push({level: 'error', msg});
  const warn = (msg: string) => issues.push({level: 'warn', msg});

  // 場面
  const ids = new Set<string>();
  for (const s of scenes) {
    if (ids.has(s.sceneId)) err(`場面IDが重複：${s.sceneId}`);
    ids.add(s.sceneId);
    if (!phases.some((p) => p.phaseId === s.phaseId)) err(`${s.sceneId}：phaseId ${s.phaseId} がない`);
    if (s.nextSceneId !== null && !sceneById.has(s.nextSceneId)) err(`${s.sceneId}：nextSceneId ${s.nextSceneId} がない`);
    const refs: string[] = [];
    if (s.type === 'clip' || s.type === 'demo') refs.push(s.assetId);
    if (s.type === 'question') refs.push(s.backdropAssetId);
    if (s.type === 'reflection' && s.assetId) refs.push(s.assetId);
    for (const r of refs) if (!assetById.has(r)) err(`${s.sceneId}：素材 ${r} が assets.json にない`);
  }

  // 選択肢 → 映像
  const used = new Map<string, string>();
  for (const q of questions) {
    const letters = q.choices.map((c) => c.choiceId).join('');
    if (letters !== 'ABC') err(`${q.sceneId}：選択肢が A/B/C の3つになっていない（${letters}）`);
    if (!q.choices.some((c) => c.choiceId === q.recommendedChoice)) err(`${q.sceneId}：推奨選択肢 ${q.recommendedChoice} がない`);
    if (q.requiresDemoPass && !(q.fallbackSceneId && sceneById.has(q.fallbackSceneId)))
      err(`${q.sceneId}：実機結果しだいの問いに、基準未達時の行き先（fallbackSceneId）がない`);
    for (const c of q.choices) {
      const key = `${q.sceneId}-${c.choiceId}`;
      if (!assetById.has(c.assetId)) err(`${key}：素材 ${c.assetId} が assets.json にない`);
      // 別の選択肢と同じ映像を使い回さない
      const prev = used.get(c.assetId);
      if (prev) err(`${key}：映像 ${c.assetId} が ${prev} と重複`);
      used.set(c.assetId, key);
      for (const f of ['choiceText', 'customerResponse', 'discovered', 'learningPoint'] as const)
        if (!c[f]?.trim()) err(`${key}：${f} が空`);
    }
  }

  // 映像の途中で止めるポイント
  const introIds = new Set(allLines(introScript).map((l) => l.line.id));
  for (const sc of scenes) {
    if (sc.type !== 'clip' && sc.type !== 'video') continue;
    for (const p of sc.pauses ?? []) {
      if (p.atLineId && !introIds.has(p.atLineId)) err(`${sc.sceneId}：止めるポイントの文ID ${p.atLineId} が導入動画の台本にない`);
      if (p.beforeLine !== undefined && (sc.type !== 'clip' || p.beforeLine >= sc.lines.length)) err(`${sc.sceneId}：止めるポイント（${p.beforeLine}文目の前）が範囲外`);
    }
  }

  // 選択肢ごとの映像の属性（visual-branches）
  const paths = new Set<string>();
  for (const b of branches()) {
    for (const f of ['visualSubject', 'cameraDirection', 'animationDirection', 'customerResponse', 'assetPath', 'fallbackVisual'] as const)
      if (!String(b[f]).trim()) err(`${b.branchId}：${f} が空`);
    if (paths.has(b.assetPath)) err(`${b.branchId}：映像の置き場所 ${b.assetPath} が他の選択肢と重複`);
    paths.add(b.assetPath);
  }

  // 素材
  const referenced = new Set<string>();
  for (const s of scenes) {
    if (s.type === 'clip' || s.type === 'demo') referenced.add(s.assetId);
    if (s.type === 'question') {
      referenced.add(s.backdropAssetId);
      s.choices.forEach((c) => referenced.add(c.assetId));
    }
    if (s.type === 'reflection' && s.assetId) referenced.add(s.assetId);
  }
  for (const a of assets) {
    if (!referenced.has(a.assetId)) warn(`素材 ${a.assetId} はどの場面からも使われていない`);
    if (!VARIANTS[a.kind]?.includes(a.variant)) err(`素材 ${a.assetId}：描画できない種類 ${a.kind}/${a.variant}`);
    for (const p of [a.videoPath, a.imagePath])
      if (p && !existsSync(join(PUBLIC, p))) warn(`素材 ${a.assetId}：${p} が未配置（CG・仮表示で代用中）`);
  }

  // 最初から最後までたどれるか（基準未達時の分岐も含む）
  const seen = new Set<string>();
  const stack = [scenes[0].sceneId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const s = sceneById.get(id);
    if (!s) continue;
    if (s.nextSceneId) stack.push(s.nextSceneId);
    if (s.type === 'question' && s.fallbackSceneId) stack.push(s.fallbackSceneId);
  }
  for (const s of scenes) if (!seen.has(s.sceneId)) err(`場面 ${s.sceneId} に到達できない`);
  if (!scenes.some((s) => s.nextSceneId === null)) err('終わりの場面（nextSceneId: null）がない');

  // 時間配分
  const total = phases.reduce((n, p) => n + p.minutes, 0);
  if (total !== 60) err(`合計時間が60分ではない（${total}分）`);
  const exp = phases.filter((p) => /^p\d$/.test(p.phaseId)).reduce((n, p) => n + p.minutes, 0);
  if (exp !== 45) err(`営業体験（Phase1〜5）が45分ではない（${exp}分）`);

  return issues;
};


const SPEAKER: Record<string, string> = {customer: 'お客様', narration: 'ナレーション', sales: '営業'};
const sec = (n: number) => `${n.toFixed(1)}秒`;

// 全体台本（docs/consulting-experience/script.md）
const scriptMd = () => {
  const out: string[] = [
    '# 全体台本',
    '',
    '> このファイルは `npm run experience:export` で `src/experience/data/*.json` から自動生成しています。直接編集せず、JSON を直してから書き出してください。',
    '',
  ];
  for (const p of phases) {
    out.push(`## ${p.title}（${p.minutes}分）`, '', `**目的**：${p.goal}`, '');
    for (const s of scenes.filter((x) => x.phaseId === p.phaseId)) {
      out.push(`### ${s.title}　\`${s.sceneId}\``, '');
      if (s.type === 'video') out.push(`導入動画（既存）。${s.description}`, '');
      if (s.type === 'clip') {
        out.push(`映像：\`${s.assetId}\`（約${sec(assetSeconds(s.assetId))}）`, '');
        s.lines.forEach((l) => out.push(`- **${SPEAKER[l.speaker]}**：${l.text}`));
        if (!s.lines.length) out.push('- （セリフなし。タイポグラフィのみ）');
        out.push('');
      }
      if (s.type === 'question') {
        if (s.situationLine) out.push(`**お客様**：「${s.situationLine}」`, '');
        out.push(`**問い**：${s.questionText}（考える時間 ${s.thinkSeconds}秒）`, '');
        out.push('| 選択肢 | 質問・発言 | お客様の回答 | 分かること | ポイント | 映像 |', '|---|---|---|---|---|---|');
        s.choices.forEach((c) => out.push(`| ${c.choiceId}${c.choiceId === s.recommendedChoice ? '（推奨）' : ''} | ${c.choiceText} | ${c.customerResponse} | ${c.discovered} | ${c.learningPoint} | \`${c.assetId}\` |`));
        out.push('', `**解説**：${s.learningPoint}`);
        if (s.technicalInsight) out.push('', `**技術の視点**：${s.technicalInsight}`);
        if (s.requiresDemoPass) out.push('', `**出す条件**：それまでの実測が基準を満たしたときだけ。満たさない・未記録のときは \`${s.fallbackSceneId}\` へ。`);
        out.push('');
      }
      if (s.type === 'pitch') {
        out.push(`${s.seconds}秒の提案トーク。`, '');
        s.parts.forEach((x) => out.push(`- **${x.label}**：${x.hint}`));
        out.push('', '**例**（発表後に表示）：', '');
        s.example.forEach((l) => out.push(`> ${l}`));
        out.push('');
      }
      if (s.type === 'demo') {
        out.push(`**条件**：${s.condition}`, '', '**確かめること**：', '');
        s.checks.forEach((c) => out.push(`- ${c}`));
        out.push('', `シミュレーション映像：\`${s.assetId}\`（説明用。結果は実機で記録する）`, '');
      }
      if (s.type === 'reflection') {
        out.push(`**問い**：${s.question}（${s.minutes}分）`, '');
        s.examples?.forEach((e) => out.push(`- 例：${e}`));
        if (s.examples) out.push('');
      }
      if (s.facilitatorNote) out.push(`> 進行役メモ：${s.facilitatorNote}`, '');
    }
  }
  return out.join('\n');
};

// ストーリーボード（docs/consulting-experience/storyboard.md）
const storyboardMd = () => {
  const STATUS: Record<string, string> = {implemented: '実装済み', placeholder: '仮素材', 'awaiting-footage': '実写待ち', 'awaiting-license': '許諾待ち'};
  const out: string[] = [
    '# ストーリーボード（映像設計）',
    '',
    '> `npm run experience:export` で自動生成。各素材は Remotion のコンポジション `XP-<素材ID>` として描画され、`npm run experience:render` で MP4 に書き出せます。',
    '> 静止画（各クリップの60%地点）：`npm run experience:stills` → `out/experience/stills/`',
    '',
    '## 設備配置（全シーン共通）',
    '',
    '- 飲料工場 LINE 03。コンベアは画面の左から右へ流れる。',
    '- 光電センサは**手前側**、反射板は**奥側**（回帰反射型）。光はコンベアを横切って往復する。',
    '- 透明PETボトル（500mL相当・リブ付き・ラベル付き）を一定間隔で搬送。',
    '- カメラA：ライン正面（基本）／カメラB：真上（光の経路の説明）／カメラC：高所からの全景。',
    '- お客様：飲料工場 設備課の担当者（30〜40代・作業着・帽子・名札）。営業担当の一人称で向き合う。',
    '',
  ];
  for (const a of assets) {
    const lines = lineSchedule(linesForAsset(a.assetId), a.dialogAt ?? 0.8);
    const used = branches().find((b) => b.assetId === a.assetId);
    out.push(`## \`${a.assetId}\`　${a.kind}/${a.variant}（約${sec(assetSeconds(a.assetId))}）`, '');
    if (used) out.push(`**使う場面**：${used.questionId} の選択肢 ${used.choiceId}`, '');
    out.push(
      `| 項目 | 内容 |`,
      `|---|---|`,
      `| 映像内容 | ${a.visualDescription} |`,
      `| カメラ | ${a.cameraDirection} |`,
      `| 動き | ${a.animationDirection} |`,
      `| 状態 | ${a.status.map((x) => STATUS[x]).join('・')} |`,
    );
    if (a.needs?.length) out.push(`| 不足素材 | ${a.needs.join('／')} |`);
    if (a.imagePath) out.push(`| 製品画像の置き場所 | \`public/${a.imagePath}\` |`);
    out.push('');
    if (lines.length) {
      out.push('| 秒 | 話者 | 表示テキスト（字幕） |', '|---|---|---|');
      lines.forEach((l) => out.push(`| ${l.from.toFixed(1)}–${l.to.toFixed(1)} | ${SPEAKER[l.speaker] ?? l.speaker} | ${l.text} |`));
      out.push('');
    }
  }
  return out.join('\n');
};

// 体験のストーリー（Scene 1〜8）と、アプリの場面の対応
const STORY: {no: number; title: string; feeling: string; sceneIds: string[]}[] = [
  {no: 1, title: '工場で誤カウント発生', feeling: '何が起きたのか分からない', sceneIds: ['intro-video', 'p1-situation']},
  {no: 2, title: '学生が質問を選択', feeling: '選んだ質問によって、違う現場の映像を見る', sceneIds: ['p1-q1', 'p2-situation']},
  {no: 3, title: '透明PETの検出条件を発見', feeling: 'なぜ検出が難しいのか、疑問が生まれる', sceneIds: ['p2-q2']},
  {no: 4, title: '光の仕組みをCGで解説', feeling: 'OPTEX-FAのセンシング技術に興味を持つ', sceneIds: ['p2-light', 'p2-isolation', 'p3-q3', 'p3-chain']},
  {no: 5, title: '課題に合ったセンサを提案', feeling: '本当に解決できるのか、確かめたくなる', sceneIds: ['p4-situation', 'p4-q4', 'p4-product', 'p4-pitch']},
  {no: 6, title: '実機デモ', feeling: 'ボトルを通して、出力とカウントを検証する', sceneIds: ['p5-s1-q', 'p5-s1-plan', 'p5-s2-demo', 'p5-s3-q', 'p5-s3-offset', 'p5-s3-gap', 'p5-s3-orientation']},
  {no: 7, title: 'お客様の評価', feeling: '営業の提案が、お客様の課題解決につながる', sceneIds: ['p5-s4-q', 'p5-followup', 'p5-message']},
  {no: 8, title: 'エンディング', feeling: '営業の仕事の価値と技術力を印象に残す', sceneIds: ['r-q1', 'r-q2', 'r-q3', 'r-q4', 'ending']},
];

const clipBlock = (assetId: string, heading: string) => {
  const a = assetById.get(assetId)!;
  const out = [
    `#### ${heading}　\`${assetId}\`（約${sec(assetSeconds(assetId))}）`,
    '',
    `- **映像**：${a.visualDescription}`,
    `- **カメラ**：${a.cameraDirection}`,
    `- **動き**：${a.animationDirection}`,
  ];
  const lines = lineSchedule(linesForAsset(assetId), a.dialogAt ?? 0.8);
  if (lines.length) {
    out.push('- **音声・字幕**：');
    lines.forEach((l) => out.push(`  - ${l.from.toFixed(1)}秒〜 ${SPEAKER[l.speaker] ?? l.speaker}「${l.text}」`));
  }
  out.push('');
  return out;
};

// シーン別映像台本（docs/consulting-experience/scene-script.md）
const sceneScriptMd = () => {
  const out: string[] = [
    '# シーン別映像台本',
    '',
    '> `npm run experience:export` で自動生成。体験のストーリー（Scene 1〜8）ごとに、アプリの場面・分岐映像・カメラ・字幕・操作のタイミングを並べています。',
    '',
    '| Scene | 内容 | 学生の気持ちの動き | アプリの場面 |',
    '|---|---|---|---|',
    ...STORY.map((st) => `| ${st.no} | ${st.title} | ${st.feeling} | ${st.sceneIds.map((id) => sceneById.get(id)?.title).join('／')} |`),
    '',
  ];
  for (const st of STORY) {
    out.push(`## Scene ${st.no}　${st.title}`, '', `**ねらい**：${st.feeling}`, '');
    for (const id of st.sceneIds) {
      const s = sceneById.get(id)!;
      out.push(`### ${s.title}（${phases.find((p) => p.phaseId === s.phaseId)?.title}）`, '');
      if (s.type === 'video') {
        out.push(`既存の導入動画（約4分30秒）。途中で止めて考えさせるポイント：`, '');
        (s.pauses ?? []).forEach((p) => out.push(`- 「${p.prompt}」（${p.hint ?? ''}）`));
        out.push('');
      }
      if (s.type === 'clip') {
        out.push(...clipBlock(s.assetId, '映像'));
        (s.pauses ?? []).forEach((p) => out.push(`- **一時停止（考えよう）**：「${p.prompt}」`, ''));
      }
      if (s.type === 'question') {
        if (s.situationLine) out.push(`お客様：「${s.situationLine}」`, '');
        out.push(`**問い**：${s.questionText}`, '', `**操作**：考える時間（${s.thinkSeconds}秒）→ 選択肢を表示 → 選択 → 選んだ選択肢の映像 → お客様の反応 → 新しく分かったこと → 比較・解説`, '');
        for (const c of s.choices) out.push(...clipBlock(c.assetId, `選択肢 ${c.choiceId}${c.choiceId === s.recommendedChoice ? '（推奨）' : ''}：${c.choiceText}`), `  → 新しく分かったこと：${c.discovered}`, '');
      }
      if (s.type === 'demo') {
        out.push(...clipBlock(s.assetId, 'シミュレーション（見方の説明）'), `**実機**：${s.condition}。確かめること：${s.checks.join('／')}。結果はアプリに記録する。`, '');
      }
      if (s.type === 'pitch') out.push(`30秒の提案トーク（${s.parts.map((p) => p.label).join('・')}）。`, '');
      if (s.type === 'reflection') {
        out.push(`**問い**：${s.question}（${s.minutes}分）`, '');
        if (s.assetId) out.push(...clipBlock(s.assetId, '現場の例'));
      }
    }
  }
  return out.join('\n');
};

const MOOD_JA: Record<string, string> = {neutral: '普通', thinking: '考え込む', uneasy: '不安', worried: '困っている', cool: '反応が薄い', positive: '前向き', request: '身を乗り出す'};
const STATUS_JA: Record<string, string> = {implemented: '実装済み', placeholder: '仮素材', 'awaiting-footage': '実写待ち', 'awaiting-license': '許諾待ち'};

// 選択肢別の映像素材一覧（docs/consulting-experience/choice-visuals.md）
const choiceVisualsMd = () => {
  const out: string[] = [
    '# 選択肢別の映像素材一覧',
    '',
    '> `npm run experience:export` で自動生成（データ：`src/experience/data/visual-branches.json`）。1つの選択肢に、専用の映像が1本だけ対応します。同じ映像の使い回しは `npm run experience:validate` がエラーにします。',
    '> **assetPath** に実写・実機の映像を置くと、それが再生されます。置くまでは **fallbackVisual**（同じ内容のCG）が再生されます。別の内容の映像で代用することはありません。',
    '',
  ];
  for (const q of questions) {
    out.push(`## ${q.title}　\`${q.sceneId}\`（${phases.find((p) => p.phaseId === q.phaseId)?.title}）`, '', `**問い**：${q.questionText}`, '');
    out.push('| 項目 | A | B | C |', '|---|---|---|---|');
    const bs = branches().filter((b) => b.questionId === q.sceneId);
    const row = (label: string, f: (b: (typeof bs)[number]) => string) => out.push(`| ${label} | ${bs.map(f).join(' | ')} |`);
    row('選択肢', (b) => `${b.choiceText}${b.recommended ? '（推奨）' : ''}`);
    row('visualSubject', (b) => b.visualSubject);
    row('cameraDirection', (b) => b.cameraDirection);
    row('animationDirection', (b) => b.animationDirection);
    row('customerResponse', (b) => `「${b.customerResponse}」（表情：${MOOD_JA[b.customerMood]}）`);
    row('technicalInsight', (b) => b.technicalInsight || '—');
    row('assetPath', (b) => `\`public/${b.assetPath}\``);
    row('fallbackVisual', (b) => `\`${b.fallbackVisual}\``);
    row('状態', (b) => b.assetStatus.map((x) => STATUS_JA[x]).join('・'));
    out.push('');
  }
  return out.join('\n');
};

const METHOD_JA: Record<string, string> = {shoot: '実写撮影', 'ai-image': 'AI画像（実写風）', cg: 'CG（Remotion）', composite: '合成（AI背景＋実写・公式画像）'};

// 素材生成用プロンプト一覧（docs/consulting-experience/generation-prompts.md）
const promptsMd = () => {
  const out: string[] = [
    '# 素材生成用プロンプト一覧',
    '',
    '> `npm run experience:export` で自動生成（データ：`src/experience/data/assets.json` の `production`）。',
    '',
    '## 共通ルール',
    '',
    '- **センサ製品は生成しない。**実機を撮影するか、OPTEX-FA の公式画像（許諾済み）を合成する。他社製品・ロゴは映さない。',
    '- 舞台・人物・設備の位置関係は [setting.md](setting.md) に合わせる（LINE 03、手前にセンサ、奥に反射板、左から右へ流れる）。',
    '- お客様役は全カットで同一人物にする。AI画像で作る場合は、1枚目を参照画像にして人物を固定する（実写撮影を推奨）。',
    '- 画面に数値を出す素材（カウント・検出結果）は、実測値かシミュレーション表示のCGだけを使う。生成画像に数値を描かせない。',
    '- 共通のスタイル指定（各プロンプトの末尾に付ける）：`photorealistic, Japanese factory, natural color grading, 16:9, 1920x1080, documentary style, no text overlay`',
    '- 共通のネガティブ指定：`no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces`',
    '',
    '## 作り方の内訳',
    '',
    '| 作り方 | 本数 |',
    '|---|---|',
    ...Object.entries(METHOD_JA).map(([k, v]) => `| ${v} | ${assets.filter((a) => a.production.method === k).length} |`),
    '',
    '## 素材ごとのプロンプト',
    '',
  ];
  for (const a of assets) {
    const pr = a.production;
    out.push(`### \`${a.assetId}\`　${METHOD_JA[pr.method]}`, '', `- **内容**：${a.visualDescription}`, `- **カメラ**：${a.cameraDirection}`);
    if (pr.method === 'cg') out.push(`- **制作**：Remotion で実装済み（\`XP-${a.assetId}\`）。${pr.note}`);
    else {
      out.push('', '```text', pr.prompt, '```');
      if (pr.negativePrompt) out.push('', `- **ネガティブ**：${pr.negativePrompt}`);
      out.push(`- **注意**：${pr.note}`, `- **置き場所**：\`public/${videoPathFor(a.assetId)}\`（動画）`);
    }
    out.push('');
  }
  return out.join('\n');
};

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const exportAll = () => {
  const outData = join(ROOT, 'src', 'experience', 'data');
  writeFileSync(join(outData, 'branches.json'), JSON.stringify(branches(), null, 2) + '\n');
  writeFileSync(join(outData, 'visual-branches.json'), JSON.stringify(branches(), null, 2) + '\n');

  // 素材管理表
  const docs = join(ROOT, 'docs', 'consulting-experience');
  mkdirSync(docs, {recursive: true});
  const usedBy = (id: string) =>
    scenes
      .flatMap((s) => {
        if ((s.type === 'clip' || s.type === 'demo') && s.assetId === id) return [s.sceneId];
        if (s.type === 'question') {
          const c = s.choices.find((ch) => ch.assetId === id);
          if (c) return [`${s.sceneId}-${c.choiceId}`];
          if (s.backdropAssetId === id) return [`${s.sceneId}（背景）`];
        }
        if (s.type === 'reflection' && s.assetId === id) return [s.sceneId];
        return [];
      })
      .join(' / ');
  const STATUS: Record<string, string> = {
    implemented: '実装済み',
    placeholder: '仮素材使用中',
    'awaiting-footage': '実写素材待ち',
    'awaiting-license': '許諾確認待ち',
  };
  const header = ['素材ID', 'フェーズ', '使う場面（選択肢）', '種類', '映像内容', 'カメラ', '動き', '製品画像', '不足素材', '状態'];
  const rows = assets.map((a) => {
    const scene = scenes.find((s) => usedBy(a.assetId).startsWith(s.sceneId));
    return [
      a.assetId,
      scene ? phases.find((p) => p.phaseId === scene.phaseId)?.title : '',
      usedBy(a.assetId),
      `${a.kind}/${a.variant}`,
      a.visualDescription,
      a.cameraDirection,
      a.animationDirection,
      a.imagePath ?? '',
      (a.needs ?? []).join('／'),
      a.status.map((s) => STATUS[s]).join('・'),
    ];
  });
  writeFileSync(
    join(docs, 'asset-manifest.csv'),
    '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n',
  );

  // 音読さん用：お客様のセリフ・ナレーション（話者ごと）
  const voice: Record<string, string[]> = {customer: [], narration: []};
  for (const s of scenes) {
    if (s.type === 'clip') s.lines.forEach((l, i) => voice[l.speaker === 'customer' ? 'customer' : 'narration'].push(`${s.sceneId}_${i + 1}\t${l.text}`));
    if (s.type === 'question') {
      if (s.situationLine) voice.customer.push(`${s.sceneId}_situation\t${s.situationLine}`);
      s.choices.forEach((c) => voice.customer.push(`${s.sceneId}-${c.choiceId}\t${c.customerResponse}`));
    }
  }
  const ondoku = join(ROOT, 'out', 'experience', 'ondoku');
  mkdirSync(ondoku, {recursive: true});
  for (const [who, list] of Object.entries(voice)) writeFileSync(join(ondoku, `${who}.tsv`), list.join('\n') + '\n');

  writeFileSync(join(docs, 'script.md'), scriptMd() + '\n');
  writeFileSync(join(docs, 'storyboard.md'), storyboardMd() + '\n');
  writeFileSync(join(docs, 'scene-script.md'), sceneScriptMd() + '\n');
  writeFileSync(join(docs, 'choice-visuals.md'), choiceVisualsMd() + '\n');
  writeFileSync(join(docs, 'generation-prompts.md'), promptsMd() + '\n');
  const total = assets.reduce((n, a) => n + assetSeconds(a.assetId), 0);
  console.log(`branches.json：${branches().length}分岐／素材管理表：${assets.length}件（映像の合計 約${Math.round(total)}秒）／script.md・storyboard.md／音読さん用：お客様${voice.customer.length}・ナレーション${voice.narration.length}文`);
  console.log(`セリフの目安：最長 ${Math.max(...Object.values(voice).flat().map((l) => readSeconds(l.split('\t')[1]))).toFixed(1)}秒`);
};

const cmd = process.argv[2];
if (cmd === 'validate' || cmd === 'export') {
  const issues = validate();
  for (const i of issues) console.log(`${i.level === 'error' ? '✖' : '△'} ${i.msg}`);
  const errors = issues.filter((i) => i.level === 'error').length;
  console.log(`検証：エラー ${errors}件／注意 ${issues.length - errors}件（場面${scenes.length}・問い${questions.length}・分岐${questions.length * 3}・素材${assets.length}）`);
  if (cmd === 'export') exportAll();
  if (errors) process.exit(1);
} else {
  console.error('usage: experience.ts validate|export');
}
