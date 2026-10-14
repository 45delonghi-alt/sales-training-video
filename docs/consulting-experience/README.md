# YOUR MISSION ペットボトルの誤カウントを解決せよ！

OPTEX-FA CONSULTING SALES EXPERIENCE — 28卒向け WEB参加型 コンサルティング営業体験（60分）

学生が OPTEX-FA の営業担当になり、飲料工場の「PETボトルの過剰カウント」の相談に向き合います。既設は**他社製の回帰反射型センサ**。**聞く → 考える → 課題を見つける → 提案する**で原因と本当の困りごとを整理し、**OPTEX-FA KR-Qシリーズ（透明体検出タイプ）**を提案して、既設センサと**同じ条件で実機比較**します。

## まず動かす

```bash
npm run experience:validate   # 分岐・素材・画像・技術表現・時間配分を検査
npm run experience:build      # 体験アプリを dist/experience/ に書き出す
npm run experience:serve      # http://localhost:4173/ で配信（会場PC）。スマートフォン回答のAPIも起動
```

- 進行役：`http://localhost:4173/` → 右上で「進行役モード」。投影用：「投影用ウィンドウを開く」（`?view=projector`）。
- スマートフォン回答：進行役パネル「回答の受付を始める」→ 投影画面のURLとコード。
- 操作は [app-manual.md](app-manual.md)、進め方は [facilitator-guide.md](facilitator-guide.md)。

## 声と画像の差し替え（いちばん多い作業）

| 作業 | 手順 | 詳しく |
|---|---|---|
| 声（音読さん） | `ondoku/` の原稿を読み上げ → `audio_import/experience/` に置く → `npm run experience:import-audio` | [talk-script.md](talk-script.md)、[recording-guide.md](recording-guide.md) |
| シーン画像 | プロンプトで生成 → `public/experience/plates/<画像ID>.jpg` → `plates.json` の status を更新 | [generation-prompts.md](generation-prompts.md) |
| 公式製品画像 | `public/experience/products/optex-fa/transparent-sensor.png` | 許諾確認後 |
| 実写・実機の映像 | `public/experience/videos/<素材ID>.mp4` | [recording-guide.md](recording-guide.md) |

音声を取り込むと、映像の長さ・字幕・ショットの切り替えが音声の長さに合わせて自動で調整されます。

## 成果物と状態（2026-10-14 時点）

| 成果物 | 場所 | 状態 |
|---|---|---|
| 全体ストーリー・12シーン構成 | [concept.md](concept.md)、[complete-story.md](complete-story.md)、[schedule.md](schedule.md) | 実装済み |
| トークスクリプト（音読さん用） | [talk-script.md](talk-script.md)、`ondoku/` | **完成**（133文・6話者）。収録待ち |
| 会話台本・問い一覧・分岐表 | [dialogue-script.md](dialogue-script.md)、[question-list.md](question-list.md)、`src/experience/data/visual-branches.json` | 実装済み（9問・27分岐） |
| ビジュアルマスター（人物・工場・センサ配置） | `public/experience/plates/CAST.jpg`、`src/experience/remotion/v3/Layout.tsx`、[technical-rules.md](technical-rules.md) | 実装済み |
| シーン画像（写真） | `public/experience/plates/`、[generation-prompts.md](generation-prompts.md) | **一部**：CAST・F01L・F09 の3点。残り15点は生成待ち（仮画像で動作） |
| ストーリーボード・素材リスト | [storyboard.md](storyboard.md)、[asset-list.md](asset-list.md)、[asset-manifest.csv](asset-manifest.csv) | 実装済み |
| 実機比較デモ台本・チェックリスト・記録シート | [demo-script.md](demo-script.md)、[demo-checklist.md](demo-checklist.md)、[demo-record-sheet.md](demo-record-sheet.md) | 実装済み |
| React アプリ（比較記録・結果の比較・スマホ回答） | `src/experience/app/` | **テスト済み** |
| Remotion 動画（写真ベース・47本） | `src/experience/remotion/`、`out/experience/videos/` | 実装済み（**仮画像使用中**） |
| マニュアル | [app-manual.md](app-manual.md)、[facilitator-guide.md](facilitator-guide.md)、[worksheet.md](worksheet.md) | 実装済み |
| テスト結果・品質チェック | [qa-report.md](qa-report.md)、[qa-checklist.md](qa-checklist.md) | テスト済み |
| ライセンス表 | [asset-license-check.md](asset-license-check.md) | 作成済み（許諾確認待ち） |

## ご判断が必要な事項

| # | 事項 | 選択肢 | 影響 |
|---|---|---|---|
| 1 | **シーン画像の残り15点** | (a) ElevenLabs を有料プランにする（1枚約0.12ドル、15点×2案で約4ドル＋月額）／(b) お手持ちの画像生成ツールで、こちらのプロンプトを使って作る／(c) 無料枠で1日3枚ずつ作る（約5日） | 届くまでは仮画像で動く |
| 2 | 音読さんの声の割り当て | 話者6人ぶん（[talk-script.md](talk-script.md) の表に記入） | 届くまでは字幕で進行 |
| 3 | OPTEX-FA 製品画像 | 社内から公式画像を入手（許諾） | 届くまでは「公式製品画像」の枠 |
| 4 | KR-Qシリーズの型式・仕様の確定 | 公式ページで照合（この環境からは公式サイトに接続できない） | 画面は「型式・仕様は公式資料で確認」と表示 |
| 5 | 既設センサ（他社製）の扱い | メーカー・型式を表示しない（現状）／OMRON・KEYENCE の公式画像を許諾を得て使う | 現状は表示しない |
| 6 | Remotion の会社ライセンス | 利用条件の確認 | — |

## 仕組み

```
src/experience/
  data/        phases.json（台本の元データ）・assets.json（映像47本＝ショットの並び）・plates.json（シーン画像）
               characters.json・glossary.json・audioTiming.json（収録した声の長さ）・visual-branches.json（自動生成）
  remotion/    ExperienceClip.tsx（写真＋カメラの動き＋重ねる情報）、v3/（枠・配置図・重ねる情報）
  app/         体験アプリ（進行・分岐・比較記録・結果の比較・投影同期・スマートフォン回答）
scripts/
  experience.ts          検証・書き出し（台本・問い一覧・ストーリーボード・素材リスト・デモ台本・画像プロンプト）
  talk-script.ts         トークスクリプト・音読さん原稿の書き出し、音声の取り込み
  experience-app.ts      アプリのビルド・配信・回答API
  experience-render.ts   クリップの静止画・MP4 の書き出し
tests/experience.e2e.mjs 全分岐の自動テスト（Playwright）
```

## テスト

```bash
npm run typecheck && npm run experience:validate
npm run experience:build && npm run experience:serve   # 別のターミナルで
node tests/experience.e2e.mjs
```
