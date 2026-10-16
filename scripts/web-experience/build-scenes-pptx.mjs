// 本編（WEB参加型）の最新版を、場面ごとの静止画でスライドにする。
// 先に npx tsx scripts/web-experience/scene-stills.ts（静止画）と、場面データの書き出し（下の json）を実行しておく。
//   node scripts/web-experience/build-scenes-pptx.mjs
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {addIntroSlides} from '../program60/build-intro-pptx.mjs';

const require = createRequire(import.meta.url);
const pptxgen = require('pptxgenjs');
const ROOT = new URL('../..', import.meta.url).pathname;
const STILLS = join(ROOT, 'out', 'scene-stills');
// 完成動画と同じフェーズナビゲーション（背景透過・scripts/web-experience/nav-overlays.ts で書き出し）
const NAV = join(ROOT, 'out', 'experience', 'nav');
// WEBアプリの画面（SHOTS=out/live-shots node tests/live.e2e.mjs と tests/phase-nav.e2e.mjs で撮ったもの）
const SHOTS = join(ROOT, 'out', 'live-shots');
const VOICE = {narration: 'Yann', sales: 'Ash', sato: 'Ash', takahashi: 'Misa', mori: 'Leo', nakata: 'Ellis'};
// 全体版：導入（24枚）＋後半（場面ごと）。2026-10-16 から1つのファイルにまとめる
const OUT = process.argv[2] || join(ROOT, 'docs', 'web-experience', 'web-experience-all.pptx');
const man = JSON.parse(readFileSync(join(STILLS, 'manifest.json'), 'utf8'));
// 場面・人物・素材のデータ（tsx で書き出したもの）
const data = JSON.parse(execFileSync('npx', ['tsx', '-e', `
  const d = require('./src/experience/data');
  console.log(JSON.stringify({phases: d.phases, scenes: d.scenes, characters: d.characters, assets: d.allClips.map(a => ({assetId: a.assetId, visualDescription: a.visualDescription})), place: d.PLACE}));
`], {cwd: ROOT, maxBuffer: 64 << 20}).toString());
const sceneById = Object.fromEntries(data.scenes.map((s) => [s.sceneId, s]));
const assetDesc = Object.fromEntries(data.assets.map((a) => [a.assetId, a.visualDescription]));
const who = (id) => data.characters.find((c) => c.id === id)?.name ?? id;
const fullName = (id) => {
  const c = data.characters.find((x) => x.id === id);
  return c?.fullName && c.fullName !== c.name ? `${c.fullName}さん` : c?.name ?? id;
};
const role = (id) => data.characters.find((c) => c.id === id)?.title ?? '';
const PLACE_JA = {'factory-line': '飲料工場のライン', 'sensor-side': 'センサの設置箇所（コンベアの横・ボトル下部の高さ）', recount: '止めたラインの横（数え直しの現場）', 'demo-rig': '比較デモの装置（同じ側に2台のセンサ）', 'line-wobble': '揺れて間隔が乱れたボトル（ボトル下部の高さ）'};
const OVERLAY_JA = {
  cast: '登場する名前と役割（受領画像）',
  'plc-explain': 'PLCとは？（外観のイメージ・正式名称・センサとPLCの関係）',
  talk: '会話（話す人の名前カードと、いま話している言葉）', 'talk-card': '会話＋赤い要点カード', question: '問いとA/B/Cの選択肢', hint: '先輩のヒント', reflection: '振り返りの問い',
  bridge: 'YOUR MISSION（導入P23からのつなぎ）', clear: 'PHASE CLEAR → NEXT', 'why-clear': '導入P18の想起と、今回のお客様に合う理由', 'issue-photo': 'お客様が解決したいこと（現場の写真の上に）',
  miscount: 'ラインと誤カウントの表示', figures: '誤カウント率の数字', chart: '週ごとの誤カウント率のグラフ', 'sensor-existing': '既設センサの設置（片側・ボトル下部・反対側に反射板）', beam: '光の往復（センサ→反射板→センサ）',
  'sensor-check': 'センサと反射板の点検', 'line-walk': 'ラインの見学', 'cause-wobble': '原因の候補：ボトルの揺れ', 'cause-gap': '原因の候補：ボトルの接近', control: '数える装置（PLC）', 'compare-plc': 'センサ出力とPLCカウントの同時記録',
  'signal-double': '1本なのに信号が2回（仮想検証）', isolation: '原因の候補の整理', product: 'OPTEX-FA KR-Qシリーズ（製品写真は許諾待ち）', setup: '比較デモの設置と条件', 'demo-normal': '比較デモ：通常搬送', 'demo-wobble': '比較デモ：揺れ', 'demo-gap': '比較デモ：間隔',
  result: '結果の比較', 'next-actions': '次のアクション', followup: '基準に届かなかったとき', message: 'お客様と一緒に確かめる', closing: '最後のメッセージ', ending: 'エンディング',
};

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.title = 'コンサルティング営業体験　全体（導入＋後半）';
pres.author = 'OPTEX-FA 営業企画';
const W = 13.333, H = 7.5, FONT = 'Meiryo';
const T = (s, text, o) => s.addText(text, {fontFace: FONT, margin: 0, isTextBox: true, ...o});

// 表紙
{
  const s = pres.addSlide();
  s.background = {color: '0D0E10'};
  s.addShape(pres.shapes.RECTANGLE, {x: 10.6, y: 0, w: W - 10.6, h: H, fill: {color: 'E60012'}, line: {type: 'none'}});
  T(s, 'コンサルティング営業体験　全体版', {x: 0.7, y: 2.2, w: 9.5, h: 0.7, fontSize: 30, bold: true, color: 'FFFFFF'});
  T(s, '導入＋後半　場面一覧', {x: 0.7, y: 2.95, w: 9.5, h: 0.7, fontSize: 26, bold: true, color: 'E60012'});
  T(s, [
    {text: `1枚＝1つの場面（画面の切り替わりごと）。全${man.length}場面`, options: {breakLine: true}},
    {text: '画像は完成動画と同じ画面（上部のフェーズナビゲーション・話している人の顔ワイプ入り。字幕はノートに記載）', options: {breakLine: true}},
    {text: '音声：音読さん Beta（あなた・佐藤さん＝Ash／森さん＝Leo／中田さん＝Ellis／高橋さん＝Misa／ナレーション＝Yann）', options: {breakLine: true}},
    {text: 'ノート：先頭にセリフ（話す人：セリフ）。続けて選択肢・進行メモ、最後に制作用の情報（場面の想定・音声ファイル名）', options: {breakLine: true}},
    {text: '構成：導入動画（24枚）→ 後半（WEB参加型の体験）'},
  ], {x: 0.7, y: 4.0, w: 9.5, h: 1.8, fontSize: 14, color: 'C9CED4', paraSpaceAfter: 6});
  s.addNotes('表紙。場面の静止画は scripts/web-experience/scene-stills.ts で作成（1920×1080・字幕なし）。');
}

// 導入（導入動画の24枚。scripts/program60/build-intro-pptx.mjs と同じもの）。後半は導入P23「YOUR MISSION」から続く
const introSec = `${data.phases[0].phaseTitle}（${data.phases[0].minutes}分）`;
addIntroSlides(pres, {sectionPrefix: '導入：'});
// 後半の最初（YOUR MISSION・登場人物）は導入のフェーズに入る
pres.addSection({title: introSec});
let curPhase = 'intro';
const phaseOf = (id) => data.phases.find((p) => p.phaseId === id);
for (const m of man) {
  const ph = phaseOf(m.phaseId);
  const sec = `${ph.phaseTitle}（${ph.minutes}分）`;
  if (m.phaseId !== curPhase) {
    pres.addSection({title: sec});
    curPhase = m.phaseId;
    {
      const d = pres.addSlide({sectionTitle: sec});
      d.background = {color: '0D0E10'};
      const chapter = join(NAV, `chapter-${m.phaseId}.png`);
      if (existsSync(chapter)) {
        // 完成動画のチャプタータイトル（扉）と同じ画面
        if (existsSync(join(NAV, `${m.sceneId}.png`))) d.addImage({path: join(NAV, `${m.sceneId}.png`), x: 0, y: 0, w: W, h: H});
        d.addImage({path: chapter, x: 0, y: 0, w: W, h: H, altText: `${ph.phaseTitle} チャプタータイトル`});
        T(d, `${ph.minutes}分　／　${ph.goal}`, {x: 0.7, y: 6.6, w: 12, h: 0.5, fontSize: 14, color: '8A939D', align: 'center'});
      } else {
        d.addShape(pres.shapes.RECTANGLE, {x: 11.2, y: 0, w: W - 11.2, h: H, fill: {color: 'E60012'}, line: {type: 'none'}});
        T(d, ph.phaseTitle, {x: 0.7, y: 2.6, w: 10, h: 1.0, fontSize: 44, bold: true, color: 'FFFFFF'});
        T(d, `${ph.minutes}分　／　${ph.goal}`, {x: 0.7, y: 3.7, w: 10, h: 0.6, fontSize: 18, color: 'C9CED4'});
      }
      d.addNotes(`${ph.phaseTitle}（${ph.minutes}分）の扉。ねらい：${ph.goal}`);
    }
  }
  const s = pres.addSlide({sectionTitle: sec});
  s.background = {color: '000000'};
  s.addImage({path: join(STILLS, m.file), x: 0, y: 0, w: W, h: H, altText: `${m.sceneTitle}（${m.role}）`, objectName: `SCENE_${m.file.replace('.jpg', '')}`});
  const navPng = join(NAV, `${m.sceneId}.png`);
  if (existsSync(navPng)) s.addImage({path: navPng, x: 0, y: 0, w: W, h: H, altText: 'フェーズナビゲーション', objectName: `NAV_${m.sceneId}`});
  const sc = sceneById[m.sceneId];
  const people = [...new Set(m.lines.map((l) => l.speaker).filter((x) => x !== 'narration'))];
  const ch = sc?.type === 'question' && m.choiceId ? sc.choices.find((c) => c.choiceId === m.choiceId) : null;
  if (ch && !people.includes(ch.responder)) people.push(ch.responder);
  // ノートの先頭はセリフ（話す人：セリフ）。そのあとに、選択肢・進行メモ・制作用の情報
  const speakerLabel = (sp) => (sp === 'narration' ? 'ナレーション' : sp === 'sales' ? 'あなた（営業担当）' : who(sp));
  const serif = m.lines.length
    ? m.lines.map((l) => `${speakerLabel(l.speaker)}：${l.text}`)
    : [m.assetId === 'cast' ? '（セリフなし・BGMのみ。画面の文字「皆さんは、左上の『あなた（営業担当）』になります。」を読ませる）' : '（セリフなし・BGMのみ）'];
  const onScreenChoices = sc?.type === 'question' && m.role === '問い' ? ['', '画面の選択肢', ...sc.choices.map((c) => `　${c.choiceId}：${c.choiceText}`)] : [];
  const notes = [
    '■ セリフ',
    ...serif,
    ...onScreenChoices,
    m.role === '問い' ? '\n■ THINK TIME：この画面は通常より5秒長い。WEBアプリではここで自動で止まり、約60秒の回答時間。進行役が締め切ると、各自の選択肢の映像へ' : '',
    ...(ch
      ? [`\n■ 選択肢 ${ch.choiceId}：${ch.choiceText}${sc.recommendedChoice === ch.choiceId ? '（推奨。解説の段階まで学生には見せない）' : ''}`, `分かったこと：${ch.gained}`, `まだ分からないこと：${ch.missing}`]
      : []),
    sc?.type === 'question' && m.role === '問い' ? `\n■ 推奨：${sc.recommendedChoice ?? 'なし'}（${sc.recommendReason}）` : '',
    sc?.facilitatorNote && m.shot === 1 && !m.choiceId ? `\n■ 進行メモ：${sc.facilitatorNote}` : '',
    '\n―――――― 以下、制作用の情報',
    `${ph.phaseTitle}｜${m.sceneTitle}｜${m.role}${m.shots > 1 ? `（画面 ${m.shot}/${m.shots}）` : ''}｜映像 ${m.assetId}（${m.seconds}秒）`,
    `場所：${m.photo ? PLACE_JA[m.photo] ?? m.photo : '―（説明の図・文字の画面）'}`,
    `登場人物：${people.length ? people.map((p) => `${fullName(p)}（${role(p)}・声 ${VOICE[p]}）`).join('、') : 'なし（ナレーション）'}`,
    `画面の要素：${OVERLAY_JA[m.overlay] ?? m.overlay}${m.header ? `／見出し「${m.header}」` : ''}`,
    assetDesc[m.assetId] ? `演出：${assetDesc[m.assetId]}` : '',
    m.lines.length ? `音声ファイル：${m.lines.map((l) => `${l.lineId}.mp3（${VOICE[l.speaker]}）`).join('、')}` : '',
  ].filter((x) => x !== '');
  s.addNotes(notes.join('\n'));

  // 最初の問いのあとに、WEBアプリで止まったときの学生の画面（THINK TIME）を1枚入れる
  if (m.assetId === 'q-P1-Q1' && existsSync(join(SHOTS, 'nav-03-think-time-pc.png'))) {
    const p = pres.addSlide({sectionTitle: sec});
    p.background = {color: '0D0E10'};
    p.addImage({path: join(SHOTS, 'nav-03-think-time-pc.png'), x: 0.4, y: 0.35, w: 9.6, h: 9.6 * (900 / 1366), altText: '学生の画面：THINK TIME'});
    T(p, 'THINK TIME', {x: 10.3, y: 0.5, w: 2.8, h: 0.6, fontSize: 22, bold: true, color: 'FFFFFF'});
    T(p, [
      {text: '問いと選択肢が出そろうと自動で停止', options: {breakLine: true}},
      {text: '約60秒、各自の端末で A/B/C と理由を送信', options: {breakLine: true}},
      {text: '進行役が締め切ると、各自の選択肢の映像へ'},
    ], {x: 10.3, y: 1.3, w: 2.8, h: 2.6, fontSize: 14, color: 'C9CED4', paraSpaceAfter: 8});
    T(p, 'WEBアプリの画面（全問共通）', {x: 10.3, y: 6.6, w: 2.8, h: 0.4, fontSize: 11, color: '8A939D'});
    p.addNotes('WEBアプリ（学生の画面）。問いの映像は、問いと選択肢が出そろったところで自動で止まり、THINK TIME（約60秒）。止まっている間も回答でき、進行役はいつでも締め切れる。画面上部はフェーズナビゲーション。全8問で同じ。');
  }

  // 30秒の提案（映像のない場面）は、P4の映像のあとに学生の画面を入れる
  if (m.assetId === 'p4-product') {
    const ps = sceneById['p4-pitch'];
    const img = join(SHOTS, '07-student-pitch-share.png');
    const p = pres.addSlide({sectionTitle: sec});
    p.background = {color: '0D0E10'};
    if (existsSync(img)) p.addImage({path: img, x: 0.4, y: 0.35, w: 9.6, h: 9.6 * (860 / 1280), altText: '学生の画面：30秒の提案（共有）'});
    T(p, ps.title, {x: 10.3, y: 0.5, w: 2.8, h: 1.0, fontSize: 22, bold: true, color: 'FFFFFF'});
    T(p, ps.parts.map((x, i) => ({text: `${i + 1}. ${x.label}`, options: {breakLine: i < ps.parts.length - 1}})), {x: 10.3, y: 1.7, w: 2.8, h: 2.6, fontSize: 14, color: 'C9CED4', paraSpaceAfter: 6});
    T(p, '映像なし（WEBの入力画面）', {x: 10.3, y: 6.6, w: 2.8, h: 0.4, fontSize: 11, color: '8A939D'});
    p.addNotes(`${ph.phaseTitle}｜${ps.title}｜学生が各自の端末で入力（映像はない）\n\n${ps.prompt}\n${ps.parts.map((x, i) => `${i + 1}. ${x.label}（${x.placeholder}）`).join('\n')}\n\n■ 進行メモ：${ps.facilitatorNote}`);
  }
}
await pres.writeFile({fileName: OUT});
console.log(`${OUT}：${man.length}場面`);
