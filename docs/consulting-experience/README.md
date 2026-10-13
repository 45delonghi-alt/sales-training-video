# YOUR MISSION ペットボトルの誤カウントを解決せよ！

OPTEX-FA CONSULTING SALES EXPERIENCE — 28卒向け WEB参加型 コンサルティング営業体験（60分）

学生が OPTEX-FA の営業担当になり、飲料工場の「PETボトルの誤カウント」の相談に向き合います。**聞く → 考える → 課題を見つける → 提案する**、そして実機で**確かめる**までを、10の問い（30の選択肢）で体験します。

## まず動かす

```bash
npm run experience:validate   # 分岐・素材・技術表現・時間配分を検査
npm run experience:build      # 体験アプリを dist/experience/ に書き出す
npm run experience:serve      # http://localhost:4173/ で配信（会場PC）。スマートフォン回答のAPIも起動
```

- 進行役：`http://localhost:4173/` を開き、右上で「進行役モード」に切り替える。
- 投影用：進行役パネルの「投影用ウィンドウを開く」（`?view=projector`）。
- スマートフォン回答：進行役パネルの「回答の受付を始める」→ 投影画面のURLとコード（`?view=vote&session=コード`）。
- 操作は [app-manual.md](app-manual.md)、進め方は [facilitator-guide.md](facilitator-guide.md)。

## 納品物（14点）と状態（2026-10-13 時点）

状態の区分：実装済み／テスト済み／仮素材使用中／実写素材待ち／許諾確認待ち

| # | 納品物 | 場所 | 状態 |
|---|---|---|---|
| 1 | 全体ストーリー | [complete-story.md](complete-story.md)・[concept.md](concept.md)・[schedule.md](schedule.md) | 実装済み |
| 2 | 会話台本 | [dialogue-script.md](dialogue-script.md) | 実装済み |
| 3 | 問い一覧 | [question-list.md](question-list.md) | 実装済み |
| 4 | 選択肢別分岐表 | `src/experience/data/visual-branches.json`（30分岐）・[question-list.md](question-list.md) | 実装済み・検証済み |
| 5 | ストーリーボード | [storyboard.md](storyboard.md)・[setting.md](setting.md) | 実装済み |
| 6 | 素材リスト | [asset-list.md](asset-list.md)・[asset-manifest.csv](asset-manifest.csv)・[recording-guide.md](recording-guide.md) | 実装済み（素材は**実写素材待ち**） |
| 7 | 音声原稿 | [voice-script.md](voice-script.md)・`out/experience/ondoku/*.tsv` | 実装済み（**音声は未収録**） |
| 8 | 実機デモ台本 | [demo-script.md](demo-script.md)・[demo-checklist.md](demo-checklist.md)・[demo-record-sheet.md](demo-record-sheet.md) | 実装済み |
| 9 | Reactアプリ | `src/experience/app/` | **テスト済み** |
| 10 | Remotionプロジェクト | `src/experience/remotion/`（48本）・導入動画 `src/consulting/` | 実装済み（**仮素材使用中**：線画CG） |
| 11 | アプリ操作マニュアル | [app-manual.md](app-manual.md) | 実装済み |
| 12 | 進行役マニュアル | [facilitator-guide.md](facilitator-guide.md)・[worksheet.md](worksheet.md) | 実装済み |
| 13 | テスト結果 | [qa-report.md](qa-report.md)・[qa-checklist.md](qa-checklist.md) | テスト済み |
| 14 | ライセンス表 | [asset-license-check.md](asset-license-check.md) | 作成済み（**許諾確認待ち**） |

関連資料：[technical-rules.md](technical-rules.md)（技術表現のルール）、[technical-review.md](technical-review.md)（表現ごとの確認状況）、[generation-prompts.md](generation-prompts.md)（素材生成用プロンプト）。

## ご判断が必要な事項

勝手に決めずに止めている項目です。決まり次第、置くだけ・設定するだけで反映できます。

| # | 事項 | 選択肢 | 影響 |
|---|---|---|---|
| 1 | 音声（声） | 音読さん／ElevenLabs などの TTS（有料・クレジット消費）／社員による収録／字幕のみ | 決まるまでは字幕で進行できる |
| 2 | AI 画像の生成 | 生成する（ElevenLabs の場合、画像4枚で約3,300クレジット≒0.33ドルの見積り）／しない | 生成しない場合も CG で進行できる。動画生成は現在の契約では使えない |
| 3 | OPTEX-FA 製品画像 | 社内から公式画像を入手（許諾） | 届くまでは「公式製品画像」の枠を表示 |
| 4 | 提案する製品 | KR-Q シリーズが現行品か確認／代替（DR-Q・ZR-QX など）を選ぶ | 画面の表記は「候補：KR-Qシリーズ等（確認中）」 |
| 5 | 既設センサの画像 | OMRON または KEYENCE の公式画像（型式確認・許諾）／実機を撮影／使わない | 届くまでは型式を読めない仮表示 |
| 6 | Remotion の会社ライセンス | 利用条件を確認し、必要なら購入 | 動画の書き出し・アプリでの再生に使用中 |

## 仕組み

```
src/experience/
  data/        phases.json（フェーズ→場面→問い→選択肢。台本の唯一の元データ）
               assets.json（映像48本）・characters.json（登場人物）・glossary.json（用語メモ）
               visual-branches.json（分岐表。自動生成）
  remotion/    映像の部品（工場ライン・人物・資料・技術解説・製品・実機デモ・扉・エンディング）
  app/         体験アプリ（進行・分岐・記録・投影同期・スマートフォン回答）
src/consulting/  既存の導入動画（Scene03・04 のセンサ表現のみ修正）
scripts/
  experience.ts          検証・書き出し（台本・問い一覧・ストーリーボード・素材リスト・音声原稿・デモ台本）
  experience-app.ts      アプリのビルド・配信・回答API
  experience-render.ts   クリップの静止画・MP4 の書き出し
tests/experience.e2e.mjs 全分岐の自動テスト（Playwright）
```

- セリフ・選択肢を変えるときは `phases.json` を直し、`npm run experience:export` で資料を作り直す。
- アプリは Remotion のクリップをその場で描画する（`@remotion/player`）。書き出した MP4 がなくても動く。
- ビルドには esbuild を使っている（Vite は未導入。新しいパッケージを追加せずに済むため）。

## 素材の差し替え

| 届いたもの | 置き場所 | 設定 |
|---|---|---|
| 声（セリフ） | `public/experience/audio/<素材ID>.mp3` | 置くだけで再生（セリフの開始時刻から） |
| 実写・実機の映像 | `public/experience/videos/<素材ID>.mp4` | 置くだけで切り替わる |
| OPTEX-FA 公式製品画像 | `public/experience/products/optex-fa/transparent-sensor.png` | 置くだけで表示 |
| 既設センサの画像 | `public/experience/products/existing/existing-sensor.png` | 置くだけで表示 |
| 当日の実機デモ動画 | 実機デモ画面 →「実機の動画」→ ファイルを選ぶ | 保存不要 |

差し替えたら `npm run experience:validate` → `npm run experience:build`。詳しくは [recording-guide.md](recording-guide.md)。

## 再レンダリング

```bash
npm run experience:stills                      # 各クリップの静止画 → out/experience/stills/
npm run experience:render                      # 全クリップの MP4 → out/experience/videos/
npx tsx scripts/experience-render.ts videos out/experience/videos p1-q1-b   # 1本だけ
npm run render:consulting                      # 導入動画 → out/consulting-sales.mp4
```

Chrome を自動でダウンロードできない環境では、`REMOTION_BROWSER=<Chrome（headless shell）のパス>`（導入動画は `--browser-executable=<パス>`）を付ける。

## テスト

```bash
npm run typecheck
npm run experience:validate
npm run experience:build && npm run experience:serve   # 別のターミナルで
node tests/experience.e2e.mjs                          # 全分岐・スマートフォン回答の自動テスト
```
