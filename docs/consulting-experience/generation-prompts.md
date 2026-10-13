# 素材の作り方と生成用プロンプト

> `npm run experience:export` で src/experience/data/assets.json から自動生成。直接編集せず、データを直してから書き出してください。

- **センサ製品は生成しない。**実機を撮影するか、正式な製品写真（許諾済み）を使う。他社製品の写真を使う場合も正式な写真のみ。ロゴや型式をAIで作らない。
- 工場内の人物は全員、清潔な作業服と衛生帽（髪・耳を覆う）。スーツで工場に入らない。装飾品なし。
- センサと反射板はコンベアを挟んで正対し、ボトルの下部を横から検出する配置に統一する。
- 数値の映る素材（カウント・結果）は、実測値か「シミュレーション」表示のCGだけ。

## `bridge`　CG（Remotion）

- 内容：タイトル「YOUR MISSION　ペットボトルの誤カウントを解決せよ！」と「それでは、あなたが営業担当です。」。導入動画の世界観（黒・白・赤）のまま本編へ。
- 制作：Remotion で実装済み（`XP-bridge`）。CG

## `p1-open`　合成（背景＋実写・公式画像）

- 内容：飲料工場 LINE 03。透明PETボトルがコンベアを流れ、光電センサでカウント。右上の表示で「実際の本数」より「センサのカウント」が1多くなる。

```text
Front view at bottle height of a stainless steel conveyor line in a modern Japanese beverage factory, clear 500ml PET bottles of green tea with ribbed bodies and white labels moving left to right, evenly spaced, steady motion, bright clean LED lighting, 35mm lens
```

- ネガティブ：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- 注意：センサ部分は実機撮影または公式画像を合成。HUDはCGで重ねる
- 置き場所：`public/experience/videos/p1-open.mp4`

## `p1-q1-a`　実写撮影

- 内容：既設センサ（透明体用の回帰反射型）にカメラが寄る。本体の外観、取付金具、反射板の方向、型式ラベル（読み取れない）。メーカーの正式な製品写真が届けば差し替える。

```text
Close-up push-in on an industrial photoelectric sensor mounted on a bracket beside a conveyor, label area out of focus
```


- 注意：既設センサは実物を撮影し、メーカー・型式が読めない撮り方にする（AI生成しない）
- 置き場所：`public/experience/videos/p1-q1-a.mp4`

## `p1-q1-b`　CG（Remotion）

- 内容：生産数の管理画面：4週間の実際の本数（10,000本）とカウント値（10,060／10,300／10,050／10,080）、差（＋0.6／＋3.0／＋0.5／＋0.8%）の表と棒グラフ。第1週 → 最大の第2週の順に強調。
- 制作：Remotion で実装済み（`XP-p1-q1-b`）。CG（研修用の架空データ。画面に明記）

## `p1-q1-c`　実写撮影

- 内容：設備課の佐藤さんが少し困った表情で答える。

```text
Japanese male maintenance engineer, late 30s, workers wear clean white factory uniforms and hygiene caps that cover all hair, no jewelry, slightly troubled expression, eye-level medium close-up, clean beverage factory behind
```


- 注意：人物は全カット同一（撮影推奨）
- 置き場所：`public/experience/videos/p1-q1-c.mp4`

## `p1-q2-a`　合成（背景＋実写・公式画像）

- 内容：画面を左右に分割：左＝通常運転（等間隔で流れる）、右＝流れが乱れた状態（間隔が詰まり、揺れる）。右側でだけカウントが余分に増える。

```text
Split-screen of the same conveyor: left steady flow, right bottles bunching and wobbling, PET bottles of tea, front view at bottle height
```

- ネガティブ：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces, no suits on the factory floor
- 注意：左右は同じ画角で撮影。カウント表示はCG
- 置き場所：`public/experience/videos/p1-q2-a.mp4`

## `p1-q2-b`　CG（Remotion）

- 内容：お客様が設備予算の資料を開く（金額は表示しない）。
- 制作：Remotion で実装済み（`XP-p1-q2-b`）。CG

## `p1-q2-c`　CG（Remotion）

- 内容：設備の点検履歴（導入日・点検日・内容）を確認する。故障の記録はない。
- 制作：Remotion で実装済み（`XP-p1-q2-c`）。表はCG（教育用の架空データ）

## `p2-open`　実写撮影

- 内容：コンベアの側面から、ボトルの下部を横方向に検出している設備。片側に投光・受光一体型のセンサ、反対側に反射板。高さを合わせて正対。光はセンサ → ボトル下部 → 反射板 → センサへ戻る（行き・戻りを区別）。

```text
Close shot of a conveyor side: photoelectric sensor mounted sideways at the lower part of clear PET bottles, reflector on the opposite side at the same height
```


- 注意：センサは実機を撮影（AI生成しない）
- 置き場所：`public/experience/videos/p2-open.mp4`

## `p2-q1-a`　合成（背景＋実写・公式画像）

- 内容：ボトルが寄り合い、揺れながら流れる様子をスローモーションで。センサ付近の乱れに注目させる。

```text
Low-angle close shot near the middle of a stainless steel conveyor line in a modern Japanese beverage factory, clear 500ml PET bottles of green tea with ribbed bodies and white labels moving left to right, bottles jostling and tilting slightly, 120fps slow motion, shallow depth of field
```

- ネガティブ：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- 注意：センサは実機撮影を合成
- 置き場所：`public/experience/videos/p2-q1-a.mp4`

## `p2-q1-b`　実写撮影

- 内容：センサと反射板を近くで確認。チェック項目：センサの高さ／反射板の角度／汚れ／光が当たる位置。

```text
Close-up of a sideways-mounted sensor and its reflector across a conveyor, checking height and angle
```


- 注意：実機を撮影
- 置き場所：`public/experience/videos/p2-q1-b.mp4`

## `p2-q1-c`　CG（Remotion）

- 内容：センサの信号（ON/OFF の波形）と、PLC のカウンターを並べて表示。1本につき信号1回でも、PLC側で余分に数える場合がある、という図。
- 制作：Remotion で実装済み（`XP-p2-q1-c`）。CG（仮定の説明であることを表示）

## `p2-light`　CG（Remotion）

- 内容：左：3D CG（回帰反射型。手前にセンサ、奥に反射板。光がコンベアを横切って往復）。不透明なモノは光を遮り、透明なボトルは光を通す。その場の受光量と出力ON/OFFを表示。右：受光量のグラフ（模式図）。透明ボトルはわずかに減り、曲面で2回くぼむ → 出力が2回ON。
- 制作：Remotion で実装済み（`XP-p2-light`）。光学原理はCGで制作。数値は入れない

## `p2-q2-a`　実写撮影

- 内容：佐藤さんが眉をひそめ、交換して直らなかったらと心配する。

```text
Same male engineer frowning, worried, workers wear clean white factory uniforms and hygiene caps that cover all hair, no jewelry
```


- 注意：人物を固定
- 置き場所：`public/experience/videos/p2-q2-a.mp4`

## `p2-q2-b`　CG（Remotion）

- 内容：記録の画面：ボトル1本ごとに「センサ信号の変化回数」と「PLCのカウント」を並べた表と波形。1本で信号が2回出ている行があれば「センサ側？」、信号1回でカウント2なら「PLC側？」と切り分ける考え方（例示）。
- 制作：Remotion で実装済み（`XP-p2-q2-b`）。CG（例示であり実測ではないことを表示）

## `p2-q2-c`　AI画像（実写風）

- 内容：生産ライン全体を俯瞰し、ライン速度の表示と生産計画の進み具合を示す。

```text
High-angle wide establishing shot of a large modern Japanese beverage factory floor, long stainless steel conveyor line in a modern Japanese beverage factory, clear 500ml PET bottles of green tea with ribbed bodies and white labels moving left to right, workers in the distance, clean and orderly
```

- ネガティブ：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- 注意：速度表示はCGで重ねる
- 置き場所：`public/experience/videos/p2-q2-c.mp4`

## `p2-isolation`　CG（Remotion）

- 内容：センサ → 配線 → PLC（カウント処理）のつながりを示し、数が増えうる場所を3つ挙げる。
- 制作：Remotion で実装済み（`XP-p2-isolation`）。CG

## `p3-open`　実写撮影

- 内容：佐藤さん（設備課）と高橋さん（品質管理課・女性）が並ぶ。佐藤さんが言いよどむ。

```text
Japanese male engineer (late 30s) and female quality control staff (early 30s) standing side by side, workers wear clean white factory uniforms and hygiene caps that cover all hair, no jewelry
```


- 注意：人物を固定
- 置き場所：`public/experience/videos/p3-open.mp4`

## `p3-q1-a`　実写撮影

- 内容：ラインが停止し、作業者がボトルを数え直す。現場担当者が対応に追われる。

```text
The conveyor line stops, a red stop lamp lights up, two workers in navy work jackets count bottles by hand along the stainless steel conveyor line in a modern Japanese beverage factory, clear 500ml PET bottles of green tea with ribbed bodies and white labels moving left to right
```


- 注意：作業者役2名で撮影
- 置き場所：`public/experience/videos/p3-q1-a.mp4`

## `p3-q1-b`　CG（Remotion）

- 内容：価格表を開こうとする（金額は表示しない）。
- 制作：Remotion で実装済み（`XP-p3-q1-b`）。CG

## `p3-q1-c`　実写撮影

- 内容：高橋さんが少し困ったように答える。

```text
Japanese female quality control staff, early 30s, workers wear clean white factory uniforms and hygiene caps that cover all hair, no jewelry, polite but unimpressed expression
```


- 注意：人物を固定
- 置き場所：`public/experience/videos/p3-q1-c.mp4`

## `p3-q2-a`　実写撮影

- 内容：既設センサに「メーカーが古い？」の問いが重なり、その問いに「？」が残る（原因は決まっていない）。

```text
Close-up of the existing sensor with a question overlay
```


- 注意：既設センサの扱いは p1-q1-a と同じ
- 置き場所：`public/experience/videos/p3-q2-a.mp4`

## `p3-q2-b`　CG（Remotion）

- 内容：誤カウント → 数量不一致 → 確認作業 → 作業負担 → 生産効率への影響。最後に「正確な数量管理と安定した生産」。
- 制作：Remotion で実装済み（`XP-p3-q2-b`）。CG

## `p3-q2-c`　CG（Remotion）

- 内容：「新しいセンサ」のチラシ（メーカー名・型式なし）。お客様の手が止まる。
- 制作：Remotion で実装済み（`XP-p3-q2-c`）。CG（メーカー名・型式なし）

## `p4-open`　合成（背景＋実写・公式画像）

- 内容：OPTEX-FA の透明体検出センサ（候補：KR-Qシリーズ等）の公式製品画像と、先輩社員の森さん（女性・作業服と衛生帽・来訪者バッジ）。

```text
Product presentation layout with space for an official product photo
```

- ネガティブ：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces, no suits on the factory floor
- 注意：製品は公式画像のみ
- 置き場所：`public/experience/videos/p4-open.mp4`

## `p4-q1-a`　CG（Remotion）

- 内容：一般的な製品紹介（「高性能」「高速応答」などの言葉が並ぶ）。メーカー名・型式は表示しない。
- 制作：Remotion で実装済み（`XP-p4-q1-a`）。CG（メーカー名・型式なし）

## `p4-q1-b`　合成（背景＋実写・公式画像）

- 内容：OPTEX-FA の透明体検出センサ（公式製品画像）が登場 → 透明PETボトルの特徴 → 検出の考え方を簡単なCGで。

```text
Clean product presentation background, soft gradient, space on the left for a product photo
```

- ネガティブ：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- 注意：製品は公式画像のみ（許諾後）
- 置き場所：`public/experience/videos/p4-q1-b.mp4`

## `p4-q1-c`　AI画像（実写風）

- 内容：作業者がラインの横で目視で数を確認し続ける。

```text
A worker in a navy work jacket standing beside a stainless steel conveyor line in a modern Japanese beverage factory, clear 500ml PET bottles of green tea with ribbed bodies and white labels moving left to right, counting bottles by eye with a handheld tally counter
```

- ネガティブ：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- 注意：—
- 置き場所：`public/experience/videos/p4-q1-c.mp4`

## `p4-setup`　実写撮影

- 内容：実機デモの準備：実際の透明PETボトル、片側に横向きのセンサ、反対側に反射板、高さはボトルの下部。光の往復（行き・戻り）をCGで区別して表示。

```text
Demo bench: small conveyor, sideways-mounted sensor at the lower part of clear PET bottles, reflector opposite
```


- 注意：実機を撮影
- 置き場所：`public/experience/videos/p4-setup.mp4`

## `p4-q2-a`　合成（背景＋実写・公式画像）

- 内容：製品の外観（公式画像の枠）を眺める。お客様は「数えられるか」が大事と返す。

```text
Official product photo close-up
```

- ネガティブ：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces, no suits on the factory floor
- 注意：製品は公式画像のみ
- 置き場所：`public/experience/videos/p4-q2-a.mp4`

## `p4-q2-b`　CG（Remotion）

- 内容：検証項目と合格基準（試す前に決める）：①1本ずつ検出 ②出力が何度も切り替わらない ③カウント値＝実際の本数 ④位置ずれ等でも①〜③を満たす。
- 制作：Remotion で実装済み（`XP-p4-q2-b`）。CG（実際の基準は当日に設備担当と決める）

## `p4-q2-c`　CG（Remotion）

- 内容：カタログ（ページ数の表示だけが目立つ。仕様値は伏せる）。
- 制作：Remotion で実装済み（`XP-p4-q2-c`）。CG

## `p4-demo-normal`　実写撮影

- 内容：シミュレーション：最初の1本だけで、検出表示がONになりカウントが1増える「見方」を示す。2本目以降の結果は見せず、「この先は実機で確かめる」につなぐ（結果をネタバレしない）。

```text
Live demo: bottles pass the sensor one by one, indicator lamp and counter visible
```


- 注意：実機を撮影。数値は実測としてのみ扱う
- 置き場所：`public/experience/videos/p4-demo-normal.mp4`

## `p4-bench`　実写撮影

- 内容：実機デモの検証台：小型コンベア、センサ、反射板、透明PETボトル、検出表示、カウンター。

```text
Demo bench: small conveyor, OPTEX-FA sensor and reflector, clear PET bottles, counter display
```


- 注意：実機を撮影（AI生成しない）
- 置き場所：`public/experience/videos/p4-bench.mp4`

## `p4-q3-a`　AI画像（実写風）

- 内容：お客様が「流れが乱れたとき」を思い浮かべて心配する（吹き出しに乱れたライン）。

```text
Same engineer looking worried, imagining bunched bottles, eye-level medium close-up
```

- ネガティブ：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- 注意：人物を固定
- 置き場所：`public/experience/videos/p4-q3-a.mp4`

## `p4-q3-b`　実写撮影

- 内容：問題が起きていた条件（ボトルの揺れ・位置ずれ・間隔の変化・形状の違い）を再現する準備。

```text
Preparing test conditions on the demo bench: shifting bottle positions, narrowing gaps, rotating bottles
```


- 注意：実機を撮影
- 置き場所：`public/experience/videos/p4-q3-b.mp4`

## `p4-q3-c`　CG（Remotion）

- 内容：2社の価格比較表（金額は伏せる）。お客様は価格より使えるかが先と返す。
- 制作：Remotion で実装済み（`XP-p4-q3-c`）。CG

## `p4-demo-wobble`　実写撮影

- 内容：シミュレーション：ボトルが揺れながら流れる。観察すること（1本1回の信号か、カウントのタイミング）を示し、結果は実機で測る。

```text
Live demo with wobbling bottles
```


- 注意：実機を撮影
- 置き場所：`public/experience/videos/p4-demo-wobble.mp4`

## `p4-demo-offset`　実写撮影

- 内容：シミュレーション：ボトルの位置がセンサ側・反射板側にずれて流れる。観察ポイントを示し、結果は実機で測る。

```text
Live demo: bottles pass with positions shifted toward and away from the sensor
```


- 注意：実機を撮影
- 置き場所：`public/experience/videos/p4-demo-offset.mp4`

## `p4-demo-gap`　実写撮影

- 内容：シミュレーション：ボトルどうしの間隔が詰まって流れる。結果は実機で測る。

```text
Live demo: bottles pass with very small gaps
```


- 注意：実機を撮影
- 置き場所：`public/experience/videos/p4-demo-gap.mp4`

## `p4-demo-shape`　実写撮影

- 内容：シミュレーション：形の違うボトル（くびれ・凹凸・容量の違い）が流れる。観察ポイントを示し、結果は実機で測る。

```text
Live demo with differently shaped bottles
```


- 注意：実機を撮影
- 置き場所：`public/experience/videos/p4-demo-shape.mp4`

## `p4-q4-a`　AI画像（実写風）

- 内容：お客様の反応が薄い。

```text
Same engineer with a lukewarm, polite expression, looking slightly away
```

- ネガティブ：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- 注意：人物を固定
- 置き場所：`public/experience/videos/p4-q4-a.mp4`

## `p4-q4-b`　CG（Remotion）

- 内容：カタログを送るメールの画面（宛先・本文のみ）。お客様は判断が難しいと返す。
- 制作：Remotion で実装済み（`XP-p4-q4-b`）。CG

## `p4-q4-c`　AI画像（実写風）

- 内容：お客様が前向きにうなずき、設備担当者と一緒に確認することを提案する。

```text
Same engineer nodding positively, a colleague in the same navy work jacket joins beside him, eye-level medium shot
```

- ネガティブ：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- 注意：人物を固定
- 置き場所：`public/experience/videos/p4-q4-c.mp4`

## `p4-followup`　CG（Remotion）

- 内容：結果が基準に届かなかったときの次の手：設置位置・角度、感度設定、PLC側の処理、別の検出方式。
- 制作：Remotion で実装済み（`XP-p4-followup`）。CG

## `p4-message`　CG（Remotion）

- 内容：「実機デモは売り込みではない。お客様と一緒に確かめる活動」というメッセージ。
- 制作：Remotion で実装済み（`XP-p4-message`）。CG

## `closing`　AI画像（実写風）

- 内容：さまざまな製造現場（食品・容器・包装・設備の位置確認）をテンポよく見せながら、最後のメッセージ。

```text
Four quick shots of Japanese factories: food trays on a conveyor, cups on a filling line, cardboard boxes being packed, a robotic jig arriving at position
```

- ネガティブ：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- 注意：自社の導入事例の実写があれば優先
- 置き場所：`public/experience/videos/closing.mp4`

## `ending`　実写撮影

- 内容：「売るだけでは、終わらない。」→ 聞く。考える。課題を見つける。提案する。→ そして、確かめる。→ OPTEX-FA CONSULTING SALES EXPERIENCE。

```text
Montage: factory floor, OPTEX-FA product (official footage), demo bench, sales rep talking with customer
```


- 注意：実写・公式素材で構成
- 置き場所：`public/experience/videos/ending.mp4`

