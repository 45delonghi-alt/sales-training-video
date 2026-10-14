# シーン画像の生成プロンプト

> `npm run experience:export` で src/experience/data/plates.json から自動生成。直接編集せず、データを直してから書き出してください。

画像生成（ElevenLabs の無料枠は1日3枚まで）で作れない分は、お手持ちの画像生成ツールで下のプロンプトを使って作り、`public/experience/plates/<画像ID>.jpg` に置いてください。
置いたら `src/experience/data/plates.json` のその画像の `status` を `generated` にして、`npm run experience:validate` → `npm run experience:render`。届くまでは人物マスター（CAST）などの仮画像で動きます。

## 共通のルール

- **1920×1080（16:9）以上**。画像の中に**文字・ロゴ・名札・型式を入れない**（字幕・説明・グラフは動画側で重ねる）。
- 人物は**人物マスター（CAST.jpg）を参照画像として渡し**、顔・衛生帽・服装をそろえる（森さん・中田さん＝淡いブルーグレーの作業ジャンパー、佐藤さん・高橋さん＝白い衛生作業服、全員が白い衛生帽）。
- **センサ製品の外観を作らない。**写るセンサは、ロゴのない汎用の小さな箱（既設の他社製センサ、または比較用の汎用表現）に限る。OPTEX-FA 製品は公式画像だけを使う。
- センサが写る画像は**配置ルール**を必ず確認する：センサはコンベアの片側で横向き、反射板は反対側の同じ高さで正対、検出位置はボトルの下部。光の線は描かせない（動画側で描く）。合わない画像は使わない。
- 生成した画像は、生成元・日付を `plates.json` の `source` に書く。

| 画像ID | 使う場面 | 内容 | 人物 | 状態 |
|---|---|---|---|---|
| CAST | 人物マスター | 登場人物の基準画像（左から 森さん・中田さん・佐藤さん・高橋さん）。人物画像が届くまでの仮画像にも使う | mori・nakata・sato・takahashi | 生成済み（顔・服装の基準。ロゴ・名札・文字なし） |
| F01 | SCENE 01 | ライン全景（センサと反射板がボトル下部の高さで向かい合う） | — | 要確認（センサのレンズが反射板ではなく手前を向き、反射板も下流側にずれている＝配置ルール不適合。センサ部分は使わず、左側のラインだけをトリミングして使う） |
| F01L | SCENE 01・背景 | F01 の左側（センサが写らない部分）をトリミングしたライン全景 | — | 採用（センサ・反射板は写っていない。配置は CG の配置図で示す） |
| F02 | SCENE 02 | お客様（佐藤さん・高橋さん）からの相談。学生の目線 | sato・takahashi | 未生成 |
| F03 | SCENE 02 | 佐藤さん（前向き・協力的） | sato | 未生成 |
| F04 | SCENE 02 | 佐藤さん（心配・迷い） | sato | 未生成 |
| F05 | SCENE 02 | 佐藤さん（落ち着いた・控えめ） | sato | 未生成 |
| F06 | SCENE 03 | 高橋さん（品質管理・記録の説明。右半分はグラフ用の余白） | takahashi | 未生成 |
| F07 | SCENE 03 | 高橋さん（確認作業の負担を話す） | takahashi | 未生成 |
| F08 | SCENE 04 | 既設センサと反射板のクローズアップ（ボトル下部の高さ） | — | 未生成 |
| F09 | SCENE 05・06 | ボトルの揺れ・接近（センサは映さない） | — | 生成済み（ボトルが空・キャップなし（充填前に見える）。差し替え候補） |
| F10 | SCENE 07 | ボトル下部のマクロ（光の屈折・反射） | — | 未生成 |
| F11 | SCENE 08 | 制御盤（PLC）と佐藤さん。右側にグラフ用の黒い画面 | sato | 未生成 |
| F12 | SCENE 03 | ライン停止・人手での数え直し | takahashi | 未生成 |
| F13 | SCENE 09 | ライン脇での打ち合わせ（森さん・佐藤さん・高橋さん） | mori・sato・takahashi | 未生成 |
| F14 | SCENE 09 | 森さん（先輩社員・助言） | mori | 未生成 |
| F15 | SCENE 09 | 中田さん（説明。右半分は製品カード用の余白） | nakata | 未生成 |
| F16 | SCENE 10 | 比較デモの試験台（センサと反射板・中田さん・佐藤さん） | nakata・sato | 未生成 |
| F17 | SCENE 11 | 結果を4人で確認（画面は見せない） | mori・nakata・sato・takahashi | 未生成 |
| F18 | SCENE 12 | 次のアクションに合意（森さんと佐藤さんの握手） | mori・sato・takahashi | 未生成 |

## F02　お客様（佐藤さん・高橋さん）からの相談。学生の目線

- 置き場所：`public/experience/plates/F02.jpg`
- 参照画像：CAST.jpg（人物マスター）

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. Medium shot next to the conveyor. Camera at eye level as the visiting sales person. Mr. Sato center-left explains a problem with a slightly troubled, sincere expression and an open hand; Ms. Takahashi slightly behind on the right holds a clipboard, listening seriously. Right third calmer for captions. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F03　佐藤さん（前向き・協力的）

- 置き場所：`public/experience/plates/F03.jpg`
- 参照画像：CAST.jpg（人物マスター）

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. Medium close-up of Mr. Sato on the left third, relieved, cooperative, gently positive expression, nodding slightly. Conveyor with PET bottles blurred behind. 85mm. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F04　佐藤さん（心配・迷い）

- 置き場所：`public/experience/plates/F04.jpg`
- 参照画像：CAST.jpg（人物マスター）

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. Medium close-up of Mr. Sato on the right third, looking down and aside, worried and hesitant, hand on chin. Conveyor blurred behind. 85mm. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F05　佐藤さん（落ち着いた・控えめ）

- 置き場所：`public/experience/plates/F05.jpg`
- 参照画像：CAST.jpg（人物マスター）

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. Medium shot of Mr. Sato beside the conveyor, arms loosely folded, calm, neutral, slightly reserved expression. 50mm. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F06　高橋さん（品質管理・記録の説明。右半分はグラフ用の余白）

- 置き場所：`public/experience/plates/F06.jpg`
- 参照画像：CAST.jpg（人物マスター）

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. Medium shot of Ms. Takahashi at a quality-control station, on the left third, holding a tablet with the screen facing away, crisp attentive expression. Right half: softly blurred line, clean space for an on-screen chart. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F07　高橋さん（確認作業の負担を話す）

- 置き場所：`public/experience/plates/F07.jpg`
- 参照画像：CAST.jpg（人物マスター）

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. Medium close-up of Ms. Takahashi on the right third, serious, slightly tired and concerned, clipboard against her chest. Stopped conveyor blurred behind. 85mm. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F08　既設センサと反射板のクローズアップ（ボトル下部の高さ）

- 置き場所：`public/experience/plates/F08.jpg`
- 参照画像：なし／**センサ配置ルールを確認**

```text
Photorealistic close-up at conveyor level. The conveyor crosses the frame left to right, slightly angled, with two or three upright transparent PET water bottles in the center. Sensor on the RIGHT edge of the conveyor pointing LEFT; reflector on the LEFT edge facing it. No people. Sensor layout (must follow exactly): on ONE side of the conveyor, a small plain dark-gray rectangular photoelectric sensor (matchbox size, one round lens on its front face, cable out of the back, no logo, no text) on a short stainless bracket points horizontally ACROSS the conveyor. Directly opposite on the OTHER side, at exactly the same height and facing the sensor, is a small square gray prismatic retroreflector plate (about 5 cm square, no text) on its own bracket. Both are low, at the height of the LOWER part of the bottles (about one fifth of the bottle height above the belt), never at the shoulder or cap. No visible light beams, no lasers. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F10　ボトル下部のマクロ（光の屈折・反射）

- 置き場所：`public/experience/plates/F10.jpg`
- 参照画像：なし

```text
Photorealistic macro of the lower part of a transparent PET water bottle on a stainless conveyor: curved ribs and petaloid base with clear water, side light creating refractions and caustics, dark-to-light gradient background. 100mm macro. No light beams. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F11　制御盤（PLC）と佐藤さん。右側にグラフ用の黒い画面

- 置き場所：`public/experience/plates/F11.jpg`
- 参照画像：CAST.jpg（人物マスター）

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. An open gray control cabinet with generic PLC modules, status LEDs and tidy wiring (no brand names). Mr. Sato on the left points at the modules. On the right, a wall-mounted monitor with a plain black screen. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F12　ライン停止・人手での数え直し

- 置き場所：`public/experience/plates/F12.jpg`
- 参照画像：CAST.jpg（人物マスター）

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. The PET bottle line is stopped, a red signal tower light is lit. Two staff in white hygienic uniforms, caps, masks and blue gloves recount bottles in crates. Ms. Takahashi in the foreground right with a clipboard, concerned. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F13　ライン脇での打ち合わせ（森さん・佐藤さん・高橋さん）

- 置き場所：`public/experience/plates/F13.jpg`
- 参照画像：CAST.jpg（人物マスター）

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. Medium-wide shot at a stainless standing table beside the line. Ms. Mori on the left explains calmly with a tablet (screen not visible); Mr. Sato and Ms. Takahashi listen across the table on the right. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F14　森さん（先輩社員・助言）

- 置き場所：`public/experience/plates/F14.jpg`
- 参照画像：CAST.jpg（人物マスター）

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. Medium close-up of Ms. Mori on the right third, warm, encouraging, intelligent smile, holding a tablet at her side. 85mm. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F15　中田さん（説明。右半分は製品カード用の余白）

- 置き場所：`public/experience/plates/F15.jpg`
- 参照画像：CAST.jpg（人物マスター）

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. Medium close-up of Mr. Nakata on the left third explaining calmly with one hand toward the right. Small test conveyor blurred behind; right half calm for an on-screen product card. 85mm. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F16　比較デモの試験台（センサと反射板・中田さん・佐藤さん）

- 置き場所：`public/experience/plates/F16.jpg`
- 参照画像：CAST.jpg（人物マスター）／**センサ配置ルールを確認**

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. A compact test bench: a short stainless test conveyor left to right with a few PET water bottles. Mr. Nakata adjusts the sensor bracket height with a small tool; Mr. Sato watches on the right. A laptop on a side table, screen facing away. Sensor layout (must follow exactly): on ONE side of the conveyor, a small plain dark-gray rectangular photoelectric sensor (matchbox size, one round lens on its front face, cable out of the back, no logo, no text) on a short stainless bracket points horizontally ACROSS the conveyor. Directly opposite on the OTHER side, at exactly the same height and facing the sensor, is a small square gray prismatic retroreflector plate (about 5 cm square, no text) on its own bracket. Both are low, at the height of the LOWER part of the bottles (about one fifth of the bottle height above the belt), never at the shoulder or cap. No visible light beams, no lasers. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F17　結果を4人で確認（画面は見せない）

- 置き場所：`public/experience/plates/F17.jpg`
- 参照画像：CAST.jpg（人物マスター）

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. Medium-wide shot: the four people around a laptop on a stainless side table beside the test conveyor, reviewing results calmly; screen faces away. Not celebrating. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

## F18　次のアクションに合意（森さんと佐藤さんの握手）

- 置き場所：`public/experience/plates/F18.jpg`
- 参照画像：CAST.jpg（人物マスター）

```text
Using the attached cast reference sheet (Ms. Mori and Mr. Nakata in light blue-gray work jackets; Mr. Sato and Ms. Takahashi in white food-factory uniforms; everyone in a white hygiene cap), keep faces, caps and clothing exactly the same. Ms. Mori and Mr. Sato shake hands with sincere, hopeful smiles beside the running PET bottle line; Ms. Takahashi nods beside them. No text, no logos, no signs, no labels, no name tags, no badges anywhere. Clean, bright Japanese beverage bottling factory, stainless steel, bright white ceiling lights, pale blue-gray tones, high-end corporate photography, 16:9, 2K.
```

