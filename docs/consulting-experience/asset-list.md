# 映像素材一覧

> `npm run experience:export` で src/experience/data/assets.json から自動生成。直接編集せず、データを直してから書き出してください。

| 素材ID | 種類 | 内容 | 作り方 | 状態 | 不足素材 | 置き場所 |
|---|---|---|---|---|---|---|
| `bridge` | title/bridge | タイトル「YOUR MISSION　ペットボトルの誤カウントを解決せよ！」と「それでは、あなたが営業担当です。」。導入動画の世界観（黒・白・赤）のまま本編へ。 | CG（Remotion） | 実装済み | — | `public/experience/videos/bridge.mp4` |
| `p1-open` | factory/miscount | 飲料工場 LINE 03。透明PETボトルがコンベアを流れ、光電センサでカウント。右上の表示で「実際の本数」より「センサのカウント」が1多くなる。 | 合成（背景＋実写・公式画像） | 実装済み・実写待ち | 実写：飲料工場のPETボトルライン（正面）／実写：お客様（設備担当）の相談カット | `public/experience/videos/p1-open.mp4` |
| `p1-q1-a` | sensor/existing | 既設センサ（透明体用の回帰反射型）にカメラが寄る。本体の外観、取付金具、反射板の方向、型式ラベル（読み取れない）。メーカーの正式な製品写真が届けば差し替える。 | 実写撮影 | 実装済み・実写待ち | 既設センサの正式な製品写真（OMRON または KEYENCE の公式画像。用途・型式を確認し、許諾を得たもの）、または実機の撮影 | `public/experience/videos/p1-q1-a.mp4`<br>写真：`public/experience/products/existing/existing-sensor.png` |
| `p1-q1-b` | document/weekly-counts | 生産数の管理画面：4週間の実際の本数（10,000本）とカウント値（10,060／10,300／10,050／10,080）、差（＋0.6／＋3.0／＋0.5／＋0.8%）の表と棒グラフ。第1週 → 最大の第2週の順に強調。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p1-q1-b.mp4` |
| `p1-q1-c` | customer/sato-uneasy | 設備課の佐藤さんが少し困った表情で答える。 | 実写撮影 | 仮素材・実写待ち | 実写：佐藤さん役（30代後半・男性）の困った表情 | `public/experience/videos/p1-q1-c.mp4` |
| `p1-q2-a` | factory/split-compare | 画面を左右に分割：左＝通常運転（等間隔で流れる）、右＝流れが乱れた状態（間隔が詰まり、揺れる）。右側でだけカウントが余分に増える。 | 合成（背景＋実写・公式画像） | 実装済み・実写待ち | 実写：通常運転と流れが乱れた状態（同じ画角） | `public/experience/videos/p1-q2-a.mp4` |
| `p1-q2-b` | document/budget | お客様が設備予算の資料を開く（金額は表示しない）。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p1-q2-b.mp4` |
| `p1-q2-c` | document/maintenance-log | 設備の点検履歴（導入日・点検日・内容）を確認する。故障の記録はない。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p1-q2-c.mp4` |
| `p2-open` | factory/side-detect | コンベアの側面から、ボトルの下部を横方向に検出している設備。片側に投光・受光一体型のセンサ、反対側に反射板。高さを合わせて正対。光はセンサ → ボトル下部 → 反射板 → センサへ戻る（行き・戻りを区別）。 | 実写撮影 | 実装済み・実写待ち | 実写：センサと反射板の設置（ボトル下部の高さ） | `public/experience/videos/p2-open.mp4` |
| `p2-q1-a` | factory/wobble | ボトルが寄り合い、揺れながら流れる様子をスローモーションで。センサ付近の乱れに注目させる。 | 合成（背景＋実写・公式画像） | 実装済み・実写待ち | 実写：センサ付近のボトルの揺れ（スロー） | `public/experience/videos/p2-q1-a.mp4` |
| `p2-q1-b` | sensor/reflector-check | センサと反射板を近くで確認。チェック項目：センサの高さ／反射板の角度／汚れ／光が当たる位置。 | 実写撮影 | 実装済み・実写待ち | 実写：センサと反射板の寄り | `public/experience/videos/p2-q1-b.mp4` |
| `p2-q1-c` | tech/signal-vs-plc | センサの信号（ON/OFF の波形）と、PLC のカウンターを並べて表示。1本につき信号1回でも、PLC側で余分に数える場合がある、という図。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p2-q1-c.mp4` |
| `p2-light` | tech/transparent-light | 左：3D CG（回帰反射型。手前にセンサ、奥に反射板。光がコンベアを横切って往復）。不透明なモノは光を遮り、透明なボトルは光を通す。その場の受光量と出力ON/OFFを表示。右：受光量のグラフ（模式図）。透明ボトルはわずかに減り、曲面で2回くぼむ → 出力が2回ON。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p2-light.mp4` |
| `p2-q2-a` | customer/sato-frown | 佐藤さんが眉をひそめ、交換して直らなかったらと心配する。 | 実写撮影 | 仮素材・実写待ち | 実写：佐藤さん役の心配する表情 | `public/experience/videos/p2-q2-a.mp4` |
| `p2-q2-b` | tech/signal-log | 記録の画面：ボトル1本ごとに「センサ信号の変化回数」と「PLCのカウント」を並べた表と波形。1本で信号が2回出ている行があれば「センサ側？」、信号1回でカウント2なら「PLC側？」と切り分ける考え方（例示）。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p2-q2-b.mp4` |
| `p2-q2-c` | factory/overview-speed | 生産ライン全体を俯瞰し、ライン速度の表示と生産計画の進み具合を示す。 | AI画像（実写風） | 実装済み・実写待ち | 実写：工場の全景（俯瞰） | `public/experience/videos/p2-q2-c.mp4` |
| `p2-isolation` | tech/isolation | センサ → 配線 → PLC（カウント処理）のつながりを示し、数が増えうる場所を3つ挙げる。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p2-isolation.mp4` |
| `p3-open` | customer/pair-thinking | 佐藤さん（設備課）と高橋さん（品質管理課・女性）が並ぶ。佐藤さんが言いよどむ。 | 実写撮影 | 仮素材・実写待ち | 実写：佐藤さん役・高橋さん役（30代前半・女性） | `public/experience/videos/p3-open.mp4` |
| `p3-q1-a` | factory/stopped-recount | ラインが停止し、作業者がボトルを数え直す。現場担当者が対応に追われる。 | 実写撮影 | 実装済み・実写待ち | 実写：作業者が数量を確認するカット | `public/experience/videos/p3-q1-a.mp4` |
| `p3-q1-b` | document/price | 価格表を開こうとする（金額は表示しない）。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p3-q1-b.mp4` |
| `p3-q1-c` | customer/takahashi-cool | 高橋さんが少し困ったように答える。 | 実写撮影 | 仮素材・実写待ち | 実写：高橋さん役の表情 | `public/experience/videos/p3-q1-c.mp4` |
| `p3-q2-a` | sensor/maker-question | 既設センサに「メーカーが古い？」の問いが重なり、その問いに「？」が残る（原因は決まっていない）。 | 実写撮影 | 実装済み・実写待ち | 既設センサの正式な製品写真または実機の撮影 | `public/experience/videos/p3-q2-a.mp4`<br>写真：`public/experience/products/existing/existing-sensor.png` |
| `p3-q2-b` | tech/chain | 誤カウント → 数量不一致 → 確認作業 → 作業負担 → 生産効率への影響。最後に「正確な数量管理と安定した生産」。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p3-q2-b.mp4` |
| `p3-q2-c` | document/new-sensor-flyer | 「新しいセンサ」のチラシ（メーカー名・型式なし）。お客様の手が止まる。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p3-q2-c.mp4` |
| `p4-open` | product/intro-senior | OPTEX-FA の透明体検出センサ（候補：KR-Qシリーズ等）の公式製品画像と、先輩社員の森さん（女性・作業服と衛生帽・来訪者バッジ）。 | 合成（背景＋実写・公式画像） | 実装済み・許諾待ち・実写待ち | OPTEX-FA 公式製品画像（許諾後）／実写：森さん役（30代・女性） | `public/experience/videos/p4-open.mp4`<br>写真：`public/experience/products/optex-fa/transparent-sensor.png` |
| `p4-q1-a` | document/catalog-generic | 一般的な製品紹介（「高性能」「高速応答」などの言葉が並ぶ）。メーカー名・型式は表示しない。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p4-q1-a.mp4` |
| `p4-q1-b` | product/proposal | OPTEX-FA の透明体検出センサ（公式製品画像）が登場 → 透明PETボトルの特徴 → 検出の考え方を簡単なCGで。 | 合成（背景＋実写・公式画像） | 実装済み・許諾待ち | OPTEX-FA 公式製品画像（現行の透明体検出センサ。型式確定後・許諾後） | `public/experience/videos/p4-q1-b.mp4`<br>写真：`public/experience/products/optex-fa/transparent-sensor.png` |
| `p4-q1-c` | factory/manual-check | 作業者がラインの横で目視で数を確認し続ける。 | AI画像（実写風） | 実装済み・実写待ち | 実写：目視確認のカット | `public/experience/videos/p4-q1-c.mp4` |
| `p4-setup` | demo/setup | 実機デモの準備：実際の透明PETボトル、片側に横向きのセンサ、反対側に反射板、高さはボトルの下部。光の往復（行き・戻り）をCGで区別して表示。 | 実写撮影 | 実装済み・実写待ち | 実写：検証台の設置（センサ横向き・ボトル下部の高さ） | `public/experience/videos/p4-setup.mp4` |
| `p4-q2-a` | product/exterior | 製品の外観（公式画像の枠）を眺める。お客様は「数えられるか」が大事と返す。 | 合成（背景＋実写・公式画像） | 実装済み・許諾待ち | OPTEX-FA 公式製品画像（許諾後） | `public/experience/videos/p4-q2-a.mp4`<br>写真：`public/experience/products/optex-fa/transparent-sensor.png` |
| `p4-q2-b` | document/test-plan | 検証項目と合格基準（試す前に決める）：①1本ずつ検出 ②出力が何度も切り替わらない ③カウント値＝実際の本数 ④位置ずれ等でも①〜③を満たす。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p4-q2-b.mp4` |
| `p4-q2-c` | document/catalog-pages | カタログ（ページ数の表示だけが目立つ。仕様値は伏せる）。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p4-q2-c.mp4` |
| `p4-demo-normal` | demo/normal | シミュレーション：最初の1本だけで、検出表示がONになりカウントが1増える「見方」を示す。2本目以降の結果は見せず、「この先は実機で確かめる」につなぐ（結果をネタバレしない）。 | 実写撮影 | 実装済み・実写待ち | 実写：実機デモ（センサ正面・側面・反射板・ボトル・配線・検出表示・カウンター・全体） | `public/experience/videos/p4-demo-normal.mp4` |
| `p4-bench` | demo/bench | 実機デモの検証台：小型コンベア、センサ、反射板、透明PETボトル、検出表示、カウンター。 | 実写撮影 | 実装済み・実写待ち | 実写：実機デモ検証台の全景 | `public/experience/videos/p4-bench.mp4` |
| `p4-q3-a` | customer/sato-worried | お客様が「流れが乱れたとき」を思い浮かべて心配する（吹き出しに乱れたライン）。 | AI画像（実写風） | 仮素材・実写待ち | 実写：お客様役の心配するカット | `public/experience/videos/p4-q3-a.mp4` |
| `p4-q3-b` | demo/setup-conditions | 問題が起きていた条件（ボトルの揺れ・位置ずれ・間隔の変化・形状の違い）を再現する準備。 | 実写撮影 | 実装済み・実写待ち | 実写：悪条件を準備するカット | `public/experience/videos/p4-q3-b.mp4` |
| `p4-q3-c` | document/price-compare | 2社の価格比較表（金額は伏せる）。お客様は価格より使えるかが先と返す。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p4-q3-c.mp4` |
| `p4-demo-wobble` | demo/wobble | シミュレーション：ボトルが揺れながら流れる。観察すること（1本1回の信号か、カウントのタイミング）を示し、結果は実機で測る。 | 実写撮影 | 実装済み・実写待ち | 実写：揺れの条件での実機テスト | `public/experience/videos/p4-demo-wobble.mp4` |
| `p4-demo-offset` | demo/offset | シミュレーション：ボトルの位置がセンサ側・反射板側にずれて流れる。観察ポイントを示し、結果は実機で測る。 | 実写撮影 | 実装済み・実写待ち | 実写：位置ずれ条件での実機テスト | `public/experience/videos/p4-demo-offset.mp4` |
| `p4-demo-gap` | demo/gap | シミュレーション：ボトルどうしの間隔が詰まって流れる。結果は実機で測る。 | 実写撮影 | 実装済み・実写待ち | 実写：間隔が詰まる条件での実機テスト | `public/experience/videos/p4-demo-gap.mp4` |
| `p4-demo-shape` | demo/shape | シミュレーション：形の違うボトル（くびれ・凹凸・容量の違い）が流れる。観察ポイントを示し、結果は実機で測る。 | 実写撮影 | 実装済み・実写待ち | 実写：形状の違うボトルでの実機テスト | `public/experience/videos/p4-demo-shape.mp4` |
| `p4-q4-a` | customer/sato-cool | お客様の反応が薄い。 | AI画像（実写風） | 仮素材・実写待ち | 実写：お客様役の反応が薄いカット | `public/experience/videos/p4-q4-a.mp4` |
| `p4-q4-b` | document/catalog-send | カタログを送るメールの画面（宛先・本文のみ）。お客様は判断が難しいと返す。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p4-q4-b.mp4` |
| `p4-q4-c` | customer/together | お客様が前向きにうなずき、設備担当者と一緒に確認することを提案する。 | AI画像（実写風） | 仮素材・実写待ち | 実写：お客様役と設備担当者役の前向きなカット | `public/experience/videos/p4-q4-c.mp4` |
| `p4-followup` | tech/followup | 結果が基準に届かなかったときの次の手：設置位置・角度、感度設定、PLC側の処理、別の検出方式。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p4-followup.mp4` |
| `p4-message` | tech/message | 「実機デモは売り込みではない。お客様と一緒に確かめる活動」というメッセージ。 | CG（Remotion） | 実装済み | — | `public/experience/videos/p4-message.mp4` |
| `closing` | applications/montage | さまざまな製造現場（食品・容器・包装・設備の位置確認）をテンポよく見せながら、最後のメッセージ。 | AI画像（実写風） | 実装済み・実写待ち | 実写：食品・容器・包装・組立など複数の製造現場 | `public/experience/videos/closing.mp4` |
| `ending` | ending/main | 「売るだけでは、終わらない。」→ 聞く。考える。課題を見つける。提案する。→ そして、確かめる。→ OPTEX-FA CONSULTING SALES EXPERIENCE。 | 実写撮影 | 実装済み・実写待ち | 実写：製造現場・実製品・実機デモ・お客様との対話（エンディング用の短いカット） | `public/experience/videos/ending.mp4` |
