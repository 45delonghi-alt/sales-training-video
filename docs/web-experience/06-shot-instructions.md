# 06　シーン別映像指示書

全編のビジュアル基準は `docs/reference/pet_count_reference.png`（参考画像・12コマ）。ただし技術的に誤っている描写は直す（01-reference-analysis.md の 4-2）。

## 1. 共通ルール

| 項目 | 指示 |
|---|---|
| 解像度 | 1920×1080・16:9・30fps |
| 配色 | 黒・白・赤（OPTEX-FA #E60012、強調だけ）・シルバー（ステンレス）・ブルーグレー（作業服・背景） |
| 見出し | 黒い帯に赤い番号と白い太字（導入動画・参考画像と同じ） |
| 字幕 | 導入動画と同じ黒い帯＋赤い縦線。重要語は赤 |
| 工場 | 明るく清潔な飲料工場。透明PETボトル、ステンレスのコンベアとガイド |
| 人物 | お客様＝白い衛生作業服・白い衛生帽。OPTEX-FA＝淡いブルーグレーの作業ジャンパー・白い衛生帽。**製造エリアでスーツ・ネクタイは着ない** |
| センサ | コンベアの**片側**に投光・受光一体のセンサ、**反対側**に反射板。どちらも**ボトル下部の高さ**。光はセンサ→ボトル下部→反射板→センサ（往復）。上から真下に照らす図は使わない |
| 技術の図 | 光路・センサ信号（ON/OFFの2値）・カウントはCGで描く。「研修用シミュレーション」「光の線は説明用の表現」と表示 |
| 数値 | 実測でない数値には「研修用の架空データ」「仮想データ（教育用）」と表示 |
| 製品写真 | OPTEX-FAの公式画像（利用許諾後）だけを使う。生成した製品の絵は使わない |

## 2. 実写風の写真の枠（12枠）

写真は `src/experience/data/photos.json` の枠ごとに、`public/` の指定の場所に置き、`npx tsx scripts/web-experience/assign-photos.ts` を実行すると使われる（置くまでは導入動画と同じ線画で描く）。会話の場面は、話している人の写真が自動で背景になる。

**今回の制作では生成できていない**（接続していた画像生成サービス ElevenLabs が無料プランの上限に達していた）。下の指示文で生成するか、撮影した写真を置く。

| 枠 | ファイル | 使う場面 | 生成・撮影の指示（共通：photorealistic, 16:9, bright clean Japanese beverage bottling plant, transparent PET water bottles, stainless steel, blue-gray and silver tones, no text, no logos） |
|---|---|---|---|
| factory-line | experience/photos/factory-line.jpg | 予備（背景） | Wide shot. A stainless conveyor carries a single row of transparent PET bottles left to right at waist height, thin stainless guide rails on both sides. No people. |
| sensor-side | experience/photos/sensor-side.jpg | P2 現場のセンサ | Side close-up at bottle-bottom height. A small black rectangular photoelectric sensor mounted LOW on the near-side guide rail, facing straight across; a small square reflector on the far-side rail at exactly the same height, directly opposite. Nothing above the bottles. |
| sato | experience/photos/sato.jpg | 佐藤さんが話す場面すべて | Japanese woman, early 30s, equipment engineer, white hygiene work uniform and white hygiene cap covering all hair, holding a tablet, slightly troubled serious expression, beside the conveyor. Waist-up, subject on the right third. |
| sato-smile | experience/photos/sato-smile.jpg | 佐藤さんの前向きな反応 | Same woman, smiling with relief and nodding. Same uniform and framing. |
| takahashi | experience/photos/takahashi.jpg | 高橋さんが話す場面 | Japanese woman in her 40s with glasses, quality control manager, white hygiene uniform and cap, holding a clipboard with count records. Waist-up, subject on the right third. |
| recount | experience/photos/recount.jpg | P3 お客様の本当の課題 | A worker in white hygiene uniform manually recounting PET bottles next to a stopped conveyor while a colleague checks a clipboard. |
| plc-panel | experience/photos/plc-panel.jpg | 予備（P2 数える装置） | Open control cabinet: row of PLC modules with status LEDs, neat wiring ducts, small operator panel with blank screen. |
| nakata | experience/photos/nakata.jpg | 中田さんが話す場面 | Calm Japanese man around 50, sensor-maker application engineer, light blue-gray work jacket, white hygiene cap, no necktie, crouching and pointing at a small black sensor mounted low on the side rail. |
| mori | experience/photos/mori.jpg | 森さんが話す場面 | Friendly Japanese woman, early 30s, sensor-maker sales, light blue-gray work jacket, white hygiene cap with hair tucked in, holding a tablet, asking a question warmly. Subject on the right third. |
| demo-rig | experience/photos/demo-rig.jpg | 予備（比較デモの準備） | Short stainless demo conveyor. Two small black sensors on the SAME near-side rail, side by side ~30 cm apart, both at bottle-bottom height; a reflector directly opposite each on the far-side rail. Laptop with blank screen. |
| team-demo | experience/photos/team-demo.jpg | 予備（次の一歩） | Two factory women (white uniforms/caps) and two sensor-maker staff (light blue-gray jackets, white caps; a woman and a man ~50) looking together at a laptop beside the demo conveyor. No suits. |
| line-wobble | experience/photos/line-wobble.jpg | 予備（P2 ボトルの動き） | Low angle at the bottom part of the bottles: bottles wobbling and bunched with uneven spacing, motion blur. |

写真を置いたら、文字の読みやすさ（左側を暗く／明るくするグラデーションは自動で重なる）と、人物の顔が文字に隠れないか（人物は画面の右1/3に）を確認する。

## 3. 場面ごとの指示（自動生成）

| 映像（素材ID） | 画面の流れ（ショット） | 写真の枠 | 内容 | セリフ数 |
|---|---|---|---|---|
| bridge | bridge | ― | 黒背景・赤のアクセント。YOUR MISSION「ここからは、あなたが営業担当です。」導入P23と同じ4ステップを表示し、1つめ「聞く」を点灯 | 4 |
| p1-open | miscount「オープニング・課題発生」 → talk「お客様からの相談」 | sato | 線画のラインで「実際よりも多くカウントされる…」。続いて佐藤さん・高橋さんが学生（営業）に相談 | 3 |
| p1-q1-a | sensor-existing「既設センサの確認」 | ― | 既設の他社製回帰反射型センサと反射板（型式は表示しない） | 3 |
| p1-q1-b | talk「お客様からの相談」 → figures「現状データの確認」 | sato | 佐藤さんが数字で答える。通常＋0.5〜0.8%、最大＋3.0%のカードが出る | 2 |
| p1-q1-c | talk「お客様からの相談」 | sato | 佐藤さんが迷いながら答える | 2 |
| p1-data | chart「現状データの確認」 | ― | 高橋さんが記録を説明。右に4週間の推移グラフ（10,060／10,300／10,050／10,080） | 3 |
| p1-q2-a | talk「お客様からの相談」 | sato | 佐藤さんが「ボトルの流れが乱れるときに多く数える気がします」と答える。背景にラインの乱れ | 2 |
| p1-q2-b | talk「お客様からの相談」 | sato | 佐藤さんが控えめに断る | 2 |
| p1-q2-c | talk-card「お客様からの相談」 | sato | 佐藤さんが設備の年数を答える | 2 |
| p2-open | talk「センサの設置位置（現状）」 → sensor-existing「センサの設置位置（現状）」 → beam「センサの設置位置（現状）」 | sato | 既設センサの確認。光の往復（センサ→ボトル下部→反射板→同じセンサ）を行き・戻りで分けてCG表示 | 5 |
| p2-q1-a | cause-wobble「原因の候補① ボトルの揺れ」 → cause-gap「原因の候補② ボトルの接近」 | ― | ボトルの揺れと接近。原因の候補①② | 3 |
| p2-q1-b | sensor-check「既設センサの確認」 | ― | センサと反射板の状態を確認（高さ・角度・汚れ・光の戻り） | 3 |
| p2-q1-c | control「原因の候補④ 制御側の条件」 | ― | 制御盤（PLC）。数え方の設定は保全担当が把握 | 4 |
| p2-signal | signal-double「原因の候補③ 透明ボトルの光の変化」 | ― | 研修用の仮想検証：ボトル1本の通過中に、出力が2回変化する。光の通り方の変化（仮説） | 5 |
| p2-q2-a | talk「お客様からの相談」 | sato | 佐藤さんの不安 | 2 |
| p2-q2-b | compare-plc「原因の候補④ 制御側の条件」 | ― | センサの出力とPLCのカウントを同時に記録して比べる（例：実測ではない） | 4 |
| p2-q2-c | talk-card「お客様からの相談」 | sato | 速度は落とせない | 2 |
| p2-isolation | isolation「原因の候補を整理する」 | ― | 原因の候補4つ（揺れ・接近・光の変化・制御側）を並べる | 3 |
| p3-open | talk「本当の困りごとは？」 | sato | 佐藤さん「何とか対応できてはいる」。高橋さんが照合を担当 | 2 |
| p3-q1-a | burden「数が合わないと、何が起きる？」 | ― | ライン停止・人手で数え直す | 3 |
| p3-q1-b | talk「本当の困りごとは？」 | sato | 価格の前に原因を知りたい | 2 |
| p3-q1-c | talk「本当の困りごとは？」 | takahashi | 高橋さん「うちの現場を見てほしい」 | 2 |
| p3-q2-a | talk-card「本当の困りごとは？」 | sato | メーカーを原因と決めつけない | 2 |
| p3-q2-b | talk「本当の困りごとは？」 | sato-smile | 佐藤さんが同意。表面の問題→業務への影響→実現したいこと | 3 |
| p3-q2-c | talk-card「本当の困りごとは？」 | takahashi | 価格より安定生産 | 2 |
| p3-summary | talk「お客様の本当の課題」 → issue-photo「お客様の本当の課題」 | sato・recount | 課題3つ：正確な本数管理・確認の手戻り削減・安定した生産 | 3 |
| p4-open | talk「どの方式が合いそう？」 | mori | 先輩の森さん「センサを提案してみましょう」 | 1 |
| p4-q1-a | talk「どの方式を提案する？」 | sato | 佐藤さん「何が違うんですか？」 | 2 |
| p4-q1-b | talk「どの方式を提案する？」 | sato | 実際のボトルで比較しようと提案→佐藤さんが前向き | 2 |
| p4-q1-c | talk-card「どの方式を提案する？」 | takahashi | 高橋さん「人の作業は増やしたくない」 | 2 |
| p4-product | product「解決提案（OPTEX-FA KR-Qシリーズ）」 | ― | KR-Qシリーズの紹介。製品画像は公式画像のみ（届くまでは枠） | 4 |
| p4-setup | setup「設置と比較デモ」 | ― | 比較デモの準備。同じボトル・速度・高さで、既設センサとKR-Qシリーズを比べる | 4 |
| p4-demo-normal | demo-normal「設置と比較デモ」 | ― | 比較デモ（通常搬送）。シミュレーションは見方の説明だけ。結果は実機で記録 | 0 |
| p4-demo-wobble | demo-wobble「設置と比較デモ」 | ― | 比較デモ（ボトルの揺れ）。シミュレーションは見方の説明だけ。結果は実機で記録 | 0 |
| p4-demo-gap | demo-gap「設置と比較デモ」 | ― | 比較デモ（間隔の変化）。シミュレーションは見方の説明だけ。結果は実機で記録 | 0 |
| p4-result | result「結果の比較」 | ― | 結果の比較の見方：改善前（現状）は通常＋0.5〜0.8%・最大＋3.0%。改善後は実測が得られるまで未確定。実測・シミュレーション・期待効果を分ける | 3 |
| p4-q3-a | talk「お客様の評価・次のアクション」 | sato | 佐藤さん「実際のラインでも同じように？」 | 2 |
| p4-q3-b | next-actions「お客様の評価・次のアクション」 | ― | 実ラインでの検証に合意。次のアクションのチェックリスト | 3 |
| p4-q3-c | talk-card「お客様の評価・次のアクション」 | takahashi | カタログだけでは判断が難しい | 2 |
| p4-followup | followup「結果が基準に届かなかったとき」 | ― | 基準未達のときの次の一手（設置・感度・PLC・別方式） | 3 |
| p4-message | message「お客様の評価・次のアクション」 | ― | 実機の比較で確かめた。次は実際のラインで、お客様と一緒に | 3 |
| closing | closing | ― | 営業は、商品を売るだけの仕事ではない | 4 |
| ending | ending | ― | 聞く・考える・課題を見つける・提案する、そして確かめる | 0 |
| clear-p1 | clear | ― | PHASE 1 CLEAR。「現状が具体的になった。」→ NEXT：考える | 1 |
| clear-p2 | clear | ― | PHASE 2 CLEAR。「原因の可能性が見えてきた。」→ NEXT：課題を見つける | 2 |
| clear-p3 | clear | ― | PHASE 3 CLEAR。「お客様の本当の課題が見えた。」→ NEXT：提案する | 2 |
| clear-p4 | clear | ― | PHASE 4 CLEAR。「提案を、実機で確かめた。」→ NEXT：振り返り | 1 |
| p4-why | talk「なぜ、透明体専用なのか」 → why-clear「なぜ、透明体専用なのか」 | mori | 森さんが導入P18（透明体専用）を想起させ、なぜ今回のお客様に合うかを話す。最後に「試して確かめる」 | 3 |
| q-P1-Q1 | question「問い P1-Q1」 | ― | 問いと選択肢 | 1 |
| hint-P1-Q1 | hint「先輩のヒント（P1-Q1）」 | ― | 先輩のヒント | 1 |
| q-P1-Q2 | question「問い P1-Q2」 | ― | 問いと選択肢 | 1 |
| hint-P1-Q2 | hint「先輩のヒント（P1-Q2）」 | ― | 先輩のヒント | 1 |
| q-P2-Q1 | question「問い P2-Q1」 | ― | 問いと選択肢 | 1 |
| hint-P2-Q1 | hint「先輩のヒント（P2-Q1）」 | ― | 先輩のヒント | 1 |
| q-P2-Q2 | question「問い P2-Q2」 | ― | 問いと選択肢 | 1 |
| hint-P2-Q2 | hint「先輩のヒント（P2-Q2）」 | ― | 先輩のヒント | 1 |
| q-P3-Q1 | question「問い P3-Q1」 | ― | 問いと選択肢 | 1 |
| hint-P3-Q1 | hint「先輩のヒント（P3-Q1）」 | ― | 先輩のヒント | 1 |
| q-P3-Q2 | question「問い P3-Q2」 | ― | 問いと選択肢 | 1 |
| hint-P3-Q2 | hint「先輩のヒント（P3-Q2）」 | ― | 先輩のヒント | 1 |
| q-P4-Q1 | question「問い P4-Q1」 | ― | 問いと選択肢 | 1 |
| hint-P4-Q1 | hint「先輩のヒント（P4-Q1）」 | ― | 先輩のヒント | 1 |
| q-P4-Q3 | question「問い P4-Q3」 | ― | 問いと選択肢 | 1 |
| hint-P4-Q3 | hint「先輩のヒント（P4-Q3）」 | ― | 先輩のヒント | 1 |
| r-r-q1 | reflection「振り返り」 | ― | 振り返りの問い | 1 |
| r-r-q2 | reflection「振り返り」 | ― | 振り返りの問い | 1 |
| r-r-q3 | reflection「振り返り」 | ― | 振り返りの問い | 1 |
| r-r-q4 | reflection「振り返り」 | ― | 振り返りの問い | 1 |
