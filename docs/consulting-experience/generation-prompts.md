# 素材生成用プロンプト一覧

> `npm run experience:export` で自動生成（データ：`src/experience/data/assets.json` の `production`）。

## 共通ルール

- **センサ製品は生成しない。**実機を撮影するか、OPTEX-FA の公式画像（許諾済み）を合成する。他社製品・ロゴは映さない。
- 舞台・人物・設備の位置関係は [setting.md](setting.md) に合わせる（LINE 03、手前にセンサ、奥に反射板、左から右へ流れる）。
- お客様役は全カットで同一人物にする。AI画像で作る場合は、1枚目を参照画像にして人物を固定する（実写撮影を推奨）。
- 画面に数値を出す素材（カウント・検出結果）は、実測値かシミュレーション表示のCGだけを使う。生成画像に数値を描かせない。
- 共通のスタイル指定（各プロンプトの末尾に付ける）：`photorealistic, Japanese factory, natural color grading, 16:9, 1920x1080, documentary style, no text overlay`
- 共通のネガティブ指定：`no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces`

## 作り方の内訳

| 作り方 | 本数 |
|---|---|
| 実写撮影 | 9 |
| AI画像（実写風） | 12 |
| CG（Remotion） | 13 |
| 合成（AI背景＋実写・公式画像） | 5 |

## 素材ごとのプロンプト

### `p1-situation`　合成（AI背景＋実写・公式画像）

- **内容**：飲料工場 LINE 03。透明PETボトルがコンベアを流れ、光電センサでカウント。右上の表示で「実際の本数」より「センサのカウント」が1多くなる。
- **カメラ**：ライン正面の全景（カメラA）→ 誤カウントの瞬間にセンサへズームイン。

```text
Front view at bottle height of a stainless steel conveyor line in a modern Japanese beverage factory, clear 500ml PET bottles of green tea with ribbed bodies and white labels moving left to right, evenly spaced, steady motion, bright clean LED lighting, 35mm lens
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：センサ部分は実機撮影または公式画像を合成。HUDはCGで重ねる
- **置き場所**：`public/experience/videos/p1-situation.mp4`（動画）

### `p1-q1-a`　実写撮影

- **内容**：既設センサにカメラが寄る。本体の外観、取付金具、反射板への向き、型式ラベル（読み取れない）。メーカーロゴは表示しない。
- **カメラ**：一人称で近づく（カメラA→センサ寄り）。ラベルでいったん止まる。

```text
Close-up push-in on an industrial photoelectric sensor mounted on a bracket beside a conveyor, label area out of focus
```
- **注意**：既設センサは実物を撮影し、メーカー・型式が読めない撮り方にする（AI生成しない）
- **置き場所**：`public/experience/videos/p1-q1-a.mp4`（動画）

### `p1-q1-b`　合成（AI背景＋実写・公式画像）

- **内容**：通常運転のコンベア → ボトルの流れが乱れる（間隔が詰まり、位置がずれる）→ その場面でカウント表示が実際より増える。
- **カメラ**：少し引いたライン正面 → 流れが乱れ始めたらスローモーションでセンサへズームイン。

```text
stainless steel conveyor line in a modern Japanese beverage factory, clear 500ml PET bottles of green tea with ribbed bodies and white labels moving left to right; after a few seconds the bottles bunch together and wobble, filmed at 120fps slow motion, front view at bottle height
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：カウント表示はCGで重ねる
- **置き場所**：`public/experience/videos/p1-q1-b.mp4`（動画）

### `p1-q1-c`　AI画像（実写風）

- **内容**：お客様が腕を組んで考え込む。背景にライン。
- **カメラ**：営業担当の一人称。お客様を正面からバストショット。

```text
Japanese male maintenance engineer in his late 30s, navy work jacket and cap, name badge, arms crossed, thinking, factory line softly blurred behind, eye-level medium close-up, natural light
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：同一人物で全カットを通すため、実写撮影を推奨。AIで作る場合は参照画像で人物を固定
- **置き場所**：`public/experience/videos/p1-q1-c.mp4`（動画）

### `p2-situation`　合成（AI背景＋実写・公式画像）

- **内容**：ボトルが寄り合い、揺れながら流れる様子をスローモーションで。センサ付近の乱れに注目させる。
- **カメラ**：センサ付近をローアングルで寄る。スロー（約0.4倍）。

```text
Low-angle close shot near the middle of a stainless steel conveyor line in a modern Japanese beverage factory, clear 500ml PET bottles of green tea with ribbed bodies and white labels moving left to right, bottles jostling and tilting slightly, 120fps slow motion, shallow depth of field
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：センサは実機撮影を合成
- **置き場所**：`public/experience/videos/p2-situation.mp4`（動画）

### `p2-q2-a`　AI画像（実写風）

- **内容**：透明PETボトルの接写（曲面・凹凸・透明部分）→ 真上から見たライン：片側にセンサ、反対側に反射板。光の経路をCGで表示。
- **カメラ**：ボトル接写 → 俯瞰（カメラB：真上）に切り替え。

```text
Macro shot of a clear ribbed 500ml PET bottle of green tea on a dark background, rim light revealing the curved shoulder and ribs, transparent highlights
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：後半の真上からの光路図はCG
- **置き場所**：`public/experience/videos/p2-q2-a.mp4`（動画）

### `p2-q2-b`　AI画像（実写風）

- **内容**：生産ライン全体を俯瞰し、ライン速度の表示と生産計画の進み具合を示す。
- **カメラ**：センサ付近からクレーンで引き、ライン全体の俯瞰へ（カメラC）。

```text
High-angle wide establishing shot of a large modern Japanese beverage factory floor, long stainless steel conveyor line in a modern Japanese beverage factory, clear 500ml PET bottles of green tea with ribbed bodies and white labels moving left to right, workers in the distance, clean and orderly
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：速度表示はCGで重ねる
- **置き場所**：`public/experience/videos/p2-q2-b.mp4`（動画）

### `p2-q2-c`　CG（Remotion）

- **内容**：設備の点検履歴（導入日・点検日・内容）を確認する。故障の記録はない。
- **カメラ**：書類（タブレット）を一人称で覗き込む。わずかに傾いた状態から正面へ起こし、ゆっくり寄る。
- **制作**：Remotion で実装済み（`XP-p2-q2-c`）。表はCG（教育用の架空データ）

### `p2-light`　CG（Remotion）

- **内容**：左：3D CG（回帰反射型。手前にセンサ、奥に反射板。光がコンベアを横切って往復）。不透明なモノは光を遮り、透明なボトルは光を通す。その場の受光量と出力ON/OFFを表示。右：受光量のグラフ（模式図）。透明ボトルはわずかに減り、曲面で2回くぼむ → 出力が2回ON。
- **カメラ**：3D：カメラがゆっくり回り込む（オービット）。右は2Dグラフ。
- **制作**：Remotion で実装済み（`XP-p2-light`）。光学原理はCGで制作。数値は入れない

### `p2-isolation`　CG（Remotion）

- **内容**：センサ → 配線 → PLC（カウント処理）のつながりを示し、数が増えうる場所を3つ挙げる。
- **カメラ**：CG。左から右への信号の流れ。
- **制作**：Remotion で実装済み（`XP-p2-isolation`）。CG

### `p3-backdrop`　AI画像（実写風）

- **内容**：ラインが通常どおり動いている全景。問いの背景に使う。
- **カメラ**：ライン正面（カメラA）。横へゆっくり移動。

```text
Calm front view of a stainless steel conveyor line in a modern Japanese beverage factory, clear 500ml PET bottles of green tea with ribbed bodies and white labels moving left to right, steady production, soft light
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：静かな背景用
- **置き場所**：`public/experience/videos/p3-backdrop.mp4`（動画）

### `p3-q3-a`　CG（Remotion）

- **内容**：生産記録・カウント履歴。誤カウントの発生日に印（教育用の架空データ）。
- **カメラ**：タブレットの画面を一人称で。わずかに傾いた状態から正面へ起こし、ゆっくり寄る。
- **制作**：Remotion で実装済み（`XP-p3-q3-a`）。CG（教育用の架空データ）

### `p3-q3-b`　実写撮影

- **内容**：ラインが停止し、作業者がボトルを数え直す。現場担当者が対応に追われる。
- **カメラ**：ライン正面 → 停止後、数え直す作業者へ寄る。

```text
The conveyor line stops, a red stop lamp lights up, two workers in navy work jackets count bottles by hand along the stainless steel conveyor line in a modern Japanese beverage factory, clear 500ml PET bottles of green tea with ribbed bodies and white labels moving left to right
```
- **注意**：作業者役2名で撮影
- **置き場所**：`public/experience/videos/p3-q3-b.mp4`（動画）

### `p3-q3-c`　CG（Remotion）

- **内容**：お客様が設備予算の資料を開く（金額は表示しない）。
- **カメラ**：資料を一人称で。わずかに傾いた状態から正面へ起こし、ゆっくり寄る。
- **制作**：Remotion で実装済み（`XP-p3-q3-c`）。CG

### `p3-chain`　CG（Remotion）

- **内容**：誤カウント → 数量不一致 → 確認作業 → 作業負担 → 生産効率への影響。最後に「正確な数量管理と安定した生産」。
- **カメラ**：CG。上から下へ連鎖。
- **制作**：Remotion で実装済み（`XP-p3-chain`）。CG

### `p4-situation`　AI画像（実写風）

- **内容**：お客様がまっすぐこちらを見て要望を伝える。背景にライン。
- **カメラ**：営業の一人称。正面バストショット。

```text
Same Japanese maintenance engineer (late 30s, navy work jacket and cap, name badge) leaning slightly forward, earnest expression, speaking to camera, factory line blurred behind, eye-level medium close-up
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：人物は全カットで同一に
- **置き場所**：`public/experience/videos/p4-situation.mp4`（動画）

### `p4-q4-a`　CG（Remotion）

- **内容**：一般的な製品紹介（「高性能」「高速応答」などの言葉が並ぶ）。メーカー名・型式は表示しない。
- **カメラ**：カタログを一人称で。わずかに傾いた状態から正面へ起こし、ゆっくり寄る。
- **制作**：Remotion で実装済み（`XP-p4-q4-a`）。CG（メーカー名・型式なし）

### `p4-q4-b`　合成（AI背景＋実写・公式画像）

- **内容**：OPTEX-FA の透明体検出センサ（公式製品画像）が登場 → 透明PETボトルの特徴 → 検出の考え方を簡単なCGで。
- **カメラ**：製品画像を大きく → 横にボトルと光路の図。

```text
Clean product presentation background, soft gradient, space on the left for a product photo
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：製品は公式画像のみ（許諾後）
- **置き場所**：`public/experience/videos/p4-q4-b.mp4`（動画）

### `p4-q4-c`　AI画像（実写風）

- **内容**：作業者がラインの横で目視で数を確認し続ける。
- **カメラ**：作業者の寄り → ライン全体へ引く。

```text
A worker in a navy work jacket standing beside a stainless steel conveyor line in a modern Japanese beverage factory, clear 500ml PET bottles of green tea with ribbed bodies and white labels moving left to right, counting bottles by eye with a handheld tally counter
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：—
- **置き場所**：`public/experience/videos/p4-q4-c.mp4`（動画）

### `p4-product`　合成（AI背景＋実写・公式画像）

- **内容**：OPTEX-FA 透明体検出センサの紹介：外観（公式画像）、用途（PETボトル等の透明体）、検出の考え方、期待できる改善、検証が必要な条件。
- **カメラ**：左に製品、右に説明。

```text
Clean product presentation layout
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：製品は公式画像のみ（許諾後）。型式は公式情報で確定してから表示
- **置き場所**：`public/experience/videos/p4-product.mp4`（動画）

### `p5-bench`　実写撮影

- **内容**：実機デモの検証台：小型コンベア、センサ、反射板、透明PETボトル、検出表示、カウンター。
- **カメラ**：検証台の全景（正面）。

```text
Demo bench: small conveyor, OPTEX-FA sensor and reflector, clear PET bottles, counter display
```
- **注意**：実機を撮影（AI生成しない）
- **置き場所**：`public/experience/videos/p5-bench.mp4`（動画）

### `p5-s1-a`　AI画像（実写風）

- **内容**：お客様が不安そうに首をかしげる。
- **カメラ**：営業の一人称。正面バストショット。

```text
Same engineer tilting his head, uneasy expression, eye-level medium close-up, factory office meeting table
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：人物を固定
- **置き場所**：`public/experience/videos/p5-s1-a.mp4`（動画）

### `p5-s1-b`　AI画像（実写風）

- **内容**：お客様が実際の製品ボトルを持ってくる。
- **カメラ**：営業の一人称。お客様がボトルを差し出す。

```text
Same engineer placing two clear PET bottles of green tea on the table toward the camera, friendly expression
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：人物を固定
- **置き場所**：`public/experience/videos/p5-s1-b.mp4`（動画）

### `p5-s1-c`　CG（Remotion）

- **内容**：価格表を開こうとする（金額は表示しない）。
- **カメラ**：資料を一人称で。わずかに傾いた状態から正面へ起こし、ゆっくり寄る。
- **制作**：Remotion で実装済み（`XP-p5-s1-c`）。CG

### `p5-plan`　CG（Remotion）

- **内容**：検証項目と合格基準（試す前に決める）：①1本ずつ検出 ②出力が何度も切り替わらない ③カウント値＝実際の本数 ④位置ずれ等でも①〜③を満たす。
- **カメラ**：ホワイトボードを正面から。わずかに傾いた状態から正面へ起こし、ゆっくり寄る。
- **制作**：Remotion で実装済み（`XP-p5-plan`）。CG（実際の基準は当日に設備担当と決める）

### `p5-demo-normal`　実写撮影

- **内容**：シミュレーション：最初の1本だけで、検出表示がONになりカウントが1増える「見方」を示す。2本目以降の結果は見せず、「この先は実機で確かめる」につなぐ（結果をネタバレしない）。
- **カメラ**：実機全景 → センサ → ボトル通過 → 検出表示 → カウンターの順に寄る。

```text
Live demo: bottles pass the sensor one by one, indicator lamp and counter visible
```
- **注意**：実機を撮影。数値は実測としてのみ扱う
- **置き場所**：`public/experience/videos/p5-demo-normal.mp4`（動画）

### `p5-demo-offset`　実写撮影

- **内容**：シミュレーション：ボトルの位置がコンベアの手前・奥にずれて流れる。観察ポイントを示し、結果は実機で測る。
- **カメラ**：俯瞰（カメラB）で位置ずれを見せる。

```text
Live demo: bottles pass with positions shifted toward and away from the sensor
```
- **注意**：実機を撮影
- **置き場所**：`public/experience/videos/p5-demo-offset.mp4`（動画）

### `p5-demo-gap`　実写撮影

- **内容**：シミュレーション：ボトルどうしの間隔が詰まって流れる。結果は実機で測る。
- **カメラ**：ライン正面（カメラA）。

```text
Live demo: bottles pass with very small gaps
```
- **注意**：実機を撮影
- **置き場所**：`public/experience/videos/p5-demo-gap.mp4`（動画）

### `p5-demo-orientation`　実写撮影

- **内容**：シミュレーション：ボトルの向き（凹凸の位置）が変わって流れる。結果は実機で測る。
- **カメラ**：ライン正面（カメラA）。

```text
Live demo: bottles pass with labels and ribs facing different directions
```
- **注意**：実機を撮影
- **置き場所**：`public/experience/videos/p5-demo-orientation.mp4`（動画）

### `p5-s3-a`　AI画像（実写風）

- **内容**：お客様が「流れが乱れたとき」を思い浮かべて心配する（吹き出しに乱れたライン）。
- **カメラ**：営業の一人称。

```text
Same engineer looking worried, imagining bunched bottles, eye-level medium close-up
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：人物を固定
- **置き場所**：`public/experience/videos/p5-s3-a.mp4`（動画）

### `p5-s3-b`　実写撮影

- **内容**：悪条件（位置ずれ・間隔・向き）の再現を準備する。
- **カメラ**：検証台の正面。

```text
Preparing test conditions on the demo bench: shifting bottle positions, narrowing gaps, rotating bottles
```
- **注意**：実機を撮影
- **置き場所**：`public/experience/videos/p5-s3-b.mp4`（動画）

### `p5-s3-c`　CG（Remotion）

- **内容**：カタログの仕様表（項目名のみ、数値は伏せる）。
- **カメラ**：資料を一人称で。わずかに傾いた状態から正面へ起こし、ゆっくり寄る。
- **制作**：Remotion で実装済み（`XP-p5-s3-c`）。CG

### `p5-s4-a`　AI画像（実写風）

- **内容**：お客様の反応が薄い。
- **カメラ**：営業の一人称。

```text
Same engineer with a lukewarm, polite expression, looking slightly away
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：人物を固定
- **置き場所**：`public/experience/videos/p5-s4-a.mp4`（動画）

### `p5-s4-b`　CG（Remotion）

- **内容**：見積書（金額は表示しない）をお客様が受け取りかねる。
- **カメラ**：資料を一人称で。わずかに傾いた状態から正面へ起こし、ゆっくり寄る。
- **制作**：Remotion で実装済み（`XP-p5-s4-b`）。CG

### `p5-s4-c`　AI画像（実写風）

- **内容**：お客様が前向きにうなずき、設備担当者と一緒に確認することを提案する。
- **カメラ**：営業の一人称。お客様の横に設備担当者。

```text
Same engineer nodding positively, a colleague in the same navy work jacket joins beside him, eye-level medium shot
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：人物を固定
- **置き場所**：`public/experience/videos/p5-s4-c.mp4`（動画）

### `p5-followup`　CG（Remotion）

- **内容**：結果が基準に届かなかったときの次の手：設置位置・角度、感度設定、PLC側の処理、別の検出方式。
- **カメラ**：CG。
- **制作**：Remotion で実装済み（`XP-p5-followup`）。CG

### `p5-message`　CG（Remotion）

- **内容**：「実機デモは売り込みではない。お客様と一緒に確かめる活動」というメッセージ。
- **カメラ**：CG（黒背景）。
- **制作**：Remotion で実装済み（`XP-p5-message`）。CG

### `r-applications`　AI画像（実写風）

- **内容**：さまざまな製造現場（食品・容器・包装・設備の位置確認）をテンポよく見せる。
- **カメラ**：現場ごとに短いカット（各約3秒）。

```text
Four quick shots of Japanese factories: food trays on a conveyor, cups on a filling line, cardboard boxes being packed, a robotic jig arriving at position
```

- **ネガティブ**：no logos, no brand names, no readable text, no sensors or electronic devices (unless filmed for real), no distorted hands or faces
- **注意**：自社の導入事例の実写があれば優先
- **置き場所**：`public/experience/videos/r-applications.mp4`（動画）

### `ending`　実写撮影

- **内容**：「売るだけでは、終わらない。」→ 聞く。考える。提案する。そして、確かめる。→ 「お客様と一緒に、課題解決を実現する。」→ OPTEX-FA CONSULTING SALES EXPERIENCE。
- **カメラ**：黒背景のタイポグラフィ。

```text
Montage: factory floor, OPTEX-FA product (official footage), demo bench, sales rep talking with customer
```
- **注意**：実写・公式素材で構成
- **置き場所**：`public/experience/videos/ending.mp4`（動画）

