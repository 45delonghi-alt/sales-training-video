// 導入動画（public/consulting/video/intro-final.mp4・3分58秒）を PowerPoint にする。
// 画面ごとの静止画（字幕を消したもの）は docs/intro-slides/assets/intro_NN.jpg。
// ナレーションは動画の字幕と同じ文。動画が止まって考える3か所は、問いのスライドとして挟む。
// 使い方：node scripts/program60/build-intro-pptx.mjs
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const pptxgen = require('pptxgenjs');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ASSETS = join(ROOT, 'docs', 'intro-slides', 'assets');
const OUT = process.argv[2] || join(ROOT, 'docs', 'intro-slides', 'intro-slides.pptx');

// [画像番号, 場面, 動画の開始, 終了, ナレーション]
export const SHOTS = [
  [1, 'オープニング', '0:00', '0:05', '「営業」と聞いて、皆さんはどんな仕事を想像するでしょうか。'],
  [2, 'オープニング', '0:05', '0:10', '商品を紹介する。価格を伝える。もちろん、それも営業の仕事です。'],
  [3, 'オープニング', '0:10', '0:15', 'でも、オプテックス・エフエーの営業は、それだけではありません。'],
  [4, '営業とは', '0:15', '0:27', 'お客様の話を聞き、現場で何が起きているのかを整理し、本当の課題を考え、最適な解決策を提案する。これが今回体験してもらう、コンサルティング営業です。'],
  [5, 'MISSION', '0:27', '0:30', '今回のお客様は、飲料工場です。'],
  [6, 'MISSION', '0:30', '0:48', 'コンベア上を、中身の入ったペットボトルが次々と流れています。工場では光電センサを使って、ペットボトルの本数をカウントしています。ところが最近、センサが時々誤動作し、実際よりも多くカウントしてしまうという問題が起きています。'],
  ['STOP', 1],
  [7, '何を確認する？', '0:48', '1:01', 'この課題を解決するために、営業である皆さんは、お客様に何を確認しますか？　センサの種類でしょうか。ペットボトルの形でしょうか。設置位置でしょうか。'],
  [8, '何を確認する？', '1:01', '1:05', '実は、ここからが営業の仕事です。'],
  [9, 'お客様が実現したいこと', '1:05', '1:19', '大切なのは、いきなり「このセンサを使いましょう」と提案することではありません。まず確認するのは、「お客様は本当は、何を実現したいのか」ということです。'],
  ['STOP', 2],
  [10, '放っておくと何が起きる？', '1:19', '1:38', 'さらに重要なのは、その問題を放っておくと、何が起きるのか。カウントがずれる。数量確認が必要になる。人が確認する。作業時間が増える。センサの問題に見えていたものが、生産性や作業負担の問題につながっているかもしれません。'],
  [11, '光電センサの基本', '1:38', '1:52', '提案の前に、光電センサの基本を押さえておきましょう。光電センサは、光を出し、その光の変化で、モノを検出するセンサです。光を出す側を「投光器」、受ける側を「受光器」と呼びます。'],
  [12, '光電センサの基本', '1:52', '1:56', '光の当て方の違いで、大きく3種類の方式に分かれます。'],
  [13, '光電センサの基本：透過型', '1:56', '2:12', '1つめは「透過型」。投光器と受光器が、別々の筐体です。モノが光を遮ったら検出します。色や形に左右されにくく、長い距離でも安定して検出できます。ただし、両側に配線が必要です。'],
  [14, '光電センサの基本：回帰反射型', '2:12', '2:27', '2つめは「回帰反射型」。投光と受光が1つの筐体です。反射板で折り返した光が、遮られたら検出します。配線は片側だけ。透過型に近い安定性で、設置がラクです。'],
  [15, '光電センサの基本：回帰反射型', '2:27', '2:31', '鏡のように光るモノは、偏光フィルタ付きで対策します。'],
  [16, '光電センサの基本：透明体専用', '2:31', '2:44', '回帰反射型には「透明体専用」タイプもあります。ペットボトルやガラスは光をほとんど通すので、見逃しがちです。透明体専用は、光がわずかに減る変化をとらえて検出します。'],
  [17, '光電センサの基本：反射型', '2:44', '2:56', '3つめは「反射型」。モノに当たって返ってきた光で検出します。反射板が要らず、センサ1台で済むのが強みです。ただ、黒いモノは光が返りにくく、不安定になりがちです。'],
  [18, '光電センサの基本：距離設定型（BGS）', '2:56', '3:13', 'そこで「距離設定型（BGS）」です。普通の反射型は、光の「量」で判断します。BGSは三角測距で、光が受光素子の「どの位置」に戻ったかから距離を判別します。手前だけを検出するので、黒いモノや背景に強くなります。'],
  [19, 'まとめ：どれを選ぶ？', '3:13', '3:33', '確実さなら透過型、配線をラクにするなら回帰反射型。透明なモノは透明体専用、色や背景が気になるなら距離設定型。しかし、どれが高性能か、ではありません。今回のお客様には、どれが最適なのか。それを考えるのが営業です。'],
  ['STOP', 3],
  [20, 'YOUR MISSION', '3:33', '3:49', '皆さんにお願いするのは、センサを当てることではありません。お客様に質問し、情報を集め、本当の課題を考え、解決策を提案してください。まずはお客様に現状を確認します。'],
  [21, 'エンディング', '3:49', '3:58', 'それでは、オプテックス・エフエーの営業になったつもりで、お客様の課題を解決してみましょう。'],
];
// 動画が止まる場所（体験アプリと同じ：0:54.9／1:23.8／3:32.8）
export const STOPS = {
  1: {at: '0:54.9', q: '営業である皆さんは、\nお客様に何を確認しますか？', hint: '15秒で、ワークシートに1つ書こう'},
  2: {at: '1:23.8', q: '誤カウントを放っておくと、\n現場では何が起きると思う？', hint: '15秒、となりの人と話してみよう'},
  3: {at: '3:32.8', q: '今回のお客様のボトルは「透明」。\nどの方式が合いそう？', hint: '15秒で、理由を1つ考えよう'},
};

const W = 13.333, H = 7.5, FONT = 'Meiryo';

// 導入の24枚を pres に足す（全体版の PowerPoint からも使う）。ノートは先頭にセリフ（ナレーション）
export const addIntroSlides = (pres, {sectionPrefix = ''} = {}) => {
  let section = null;
  for (const shot of SHOTS) {
    if (shot[0] === 'STOP') {
      const st = STOPS[shot[1]];
      const s = pres.addSlide({sectionTitle: section});
      s.background = {color: '141517'};
      s.addText('THINK', {x: 0.8, y: 1.3, w: 6, h: 0.4, fontSize: 14, bold: true, color: 'E60012', charSpacing: 4, fontFace: FONT, margin: 0, isTextBox: true});
      s.addText(st.q, {x: 0.8, y: 1.9, w: 11.7, h: 2.4, fontSize: 40, bold: true, color: 'FFFFFF', fontFace: FONT, margin: 0, valign: 'middle', isTextBox: true});
      s.addShape(pres.shapes.OVAL, {x: 0.8, y: 4.75, w: 1.2, h: 1.2, fill: {color: 'E60012'}, line: {type: 'none'}});
      s.addText([{text: '15', options: {fontSize: 30, bold: true, breakLine: true}}, {text: '秒', options: {fontSize: 12}}], {x: 0.8, y: 4.85, w: 1.2, h: 1.0, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: FONT, margin: 0, isTextBox: true});
      s.addText(st.hint, {x: 2.3, y: 4.75, w: 9, h: 1.2, fontSize: 22, color: 'C9CED4', valign: 'middle', fontFace: FONT, margin: 0, isTextBox: true});
      s.addNotes(`■ セリフ\n（セリフなし。動画が ${st.at} で止まり、考える時間）\n\n■ 問いかけ\n${st.q.replace('\n', '')}\n\n■ 進め方\n${st.hint}。答えは言わせっぱなしでよい（正解は言わない）。`);
      continue;
    }
    const [n, scene, from, to, text] = shot;
    const sec = sectionPrefix + scene.split('：')[0];
    if (sec !== section) {
      pres.addSection({title: sec});
      section = sec;
    }
    const s = pres.addSlide({sectionTitle: section});
    s.background = {color: '000000'};
    s.addImage({path: join(ASSETS, `intro_${String(n).padStart(2, '0')}.jpg`), x: 0, y: 0, w: W, h: H, altText: `導入動画 ${from}〜${to}　${scene}`, objectName: `INTRO_${String(n).padStart(2, '0')}`});
    s.addNotes(`■ セリフ\nナレーション：${text}\n\n―――――― 以下、制作用の情報\n導入動画｜${scene}｜動画の位置：${from}〜${to}`);
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = 'コンサルティング営業体験　導入（動画のスライド版）';
  pres.author = 'OPTEX-FA 営業企画';
  pres.theme = {headFontFace: FONT, bodyFontFace: FONT};
  addIntroSlides(pres);
  await pres.writeFile({fileName: OUT});
  console.log(`${OUT}：${SHOTS.length}枚`);
}
