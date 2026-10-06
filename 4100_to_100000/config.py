"""
4100_TO_100000_CHALLENGE 設定ファイル

ここにある値を書き換えると、システム全体の挙動が変わります。
※ PAPER_TRADE / AVERAGING_DOWN / MARGIN_TRADING / LEVERAGE は安全のため固定値です。
   変更しても verify_safety() でエラーになり、システムは起動しません。
"""
from pathlib import Path

# ============================================================
# 安全設定（固定値・変更禁止）
# ============================================================
PAPER_TRADE = True          # 常にペーパートレード。実発注コードは存在しない
AVERAGING_DOWN = False      # ナンピン禁止
MARGIN_TRADING = False      # 信用取引禁止
SHORT_SELLING = False       # 空売り禁止
LEVERAGE = 1.0              # レバレッジ禁止（現物1倍のみ）
MAX_POSITIONS = 1           # 最大同時保有 1銘柄

# ============================================================
# 取引モード
# ============================================================
# REALISTIC_MODE: 100株単位・資金内のみ・現物のみ（松井証券の通常取引を想定）
# RESEARCH_MODE : 1株単位の仮想売買を許可（松井証券でそのまま実行できるとは限らない）
# 両方 True の場合は RESEARCH_MODE が優先されます（コマンド --research でも切替可能）
REALISTIC_MODE = True
RESEARCH_MODE = False

LOT_SIZE_REALISTIC = 100
LOT_SIZE_RESEARCH = 1

# ============================================================
# チャレンジ条件
# ============================================================
INITIAL_ASSET = 4_100               # 初期資産（円）
TARGET_ASSET = 100_000              # 仮想目標（円）
CHALLENGE_DAYS = 5                  # 運用期間（営業日）
REQUIRED_MULTIPLE = TARGET_ASSET / INITIAL_ASSET  # 約24.39倍

# 初期ポジション：6740 ジャパンディスプレイ 100株
JDI_CODE = "6740"
JDI_NAME = "ジャパンディスプレイ"
JDI_SHARES = 100
# 取得単価（円）。実際の取得単価に書き換えると含み損益が正しくなります。
# 初期値は「評価額 約4,100円 ÷ 100株」= 41円
JDI_COST_PRICE = 41.0
INITIAL_CASH = 0                    # 初期現金（JDI 100株のみ保有でスタート）

# ============================================================
# 売買コスト（松井証券の現物取引：1日の約定代金合計50万円以下は手数料0円）
# ============================================================
COMMISSION_YEN = 0
SLIPPAGE_TICKS = 1                  # 約定価格を不利側に何ティックずらすか

# ============================================================
# 売却ルール
# ============================================================
STOP_LOSS = -0.05                   # 損切り -5%
TAKE_PROFIT = 0.10                  # 利確 +10%
TRAILING_STOP = 0.05                # 高値から -5% でトレーリングストップ
ATR_STOP_MULTIPLIER = 1.5           # ATRベース損切り = エントリー - ATR×1.5
ATR_TARGET_MULTIPLIER = 3.0         # ATRベース利確   = エントリー + ATR×3.0
MAX_HOLD_DAYS = 5                   # バックテストでの最大保有日数

# ============================================================
# スクリーニング（除外条件）
# ============================================================
MIN_HISTORY_DAYS = 25               # 指標計算に必要な最低日数
MIN_AVG_VOLUME_20 = 50_000          # 20日平均出来高がこれ未満は除外
MIN_TURNOVER_YEN = 5_000_000        # 当日売買代金がこれ未満は除外
MAX_TICK_RATIO = 0.035              # 1ティック÷株価 がこれを超えると「スプレッド異常」として除外
MAX_DAY_RANGE_RATIO = 0.60          # (高値-安値)/前日終値 が異常に大きい銘柄を除外
STALE_DAYS = 3                      # 最新日付から何営業日以上更新がないと売買停止扱いにするか
# 除外したい証券コード（整理銘柄・監理銘柄などを手動で追加）
EXCLUDE_CODES: list[str] = []
# 除外する市場区分（JPX上場銘柄一覧の「市場・商品区分」に含まれる文字列）
EXCLUDE_MARKET_KEYWORDS = ["ETF", "ETN", "REIT", "PRO Market", "出資証券", "外国株"]

# ============================================================
# エントリー判定（BUY候補条件）
# ============================================================
ENTRY_MIN_VOLUME_RATIO = 2.0
ENTRY_RSI_MIN = 50
ENTRY_RSI_MAX = 78
ENTRY_MIN_SCORE = 70
WATCH_MIN_SCORE = 60
OVERHEAT_WARN_CHANGE = 0.15         # 当日上昇率 +15%以上で「飛び乗り注意」警告
OVERHEAT_BLOCK_CHANGE = 0.25        # 当日上昇率 +25%以上はBUYにしない

# 乗換判定：候補のスコアがJDI(保有銘柄)をこの点数以上上回ったら乗換候補
SWITCH_SCORE_MARGIN = 20

# ============================================================
# データ取得
# ============================================================
DATA_PROVIDER = "yfinance"          # "yfinance" / "stooq" / "csv"
HISTORY_PERIOD = "6mo"              # ライブ分析で取得する日足期間
BACKTEST_PERIOD = "1y"              # バックテストで取得する日足期間
DOWNLOAD_BATCH_SIZE = 100           # 一括ダウンロードの銘柄数
CACHE_MINUTES = 20                  # 同じデータを再取得しない時間（分）

# ユニバース: "jpx_all"（東証全銘柄） / "watchlist"（下のリストのみ）
UNIVERSE = "jpx_all"
JPX_LIST_URL = "https://www.jpx.co.jp/markets/statistics-equities/misc/tvdivq0000001vg2-att/data_j.xls"
# JPX一覧が取得できない場合や --quick 指定時に使う監視リスト（コードのみ。データは必ず実データを取得）
WATCHLIST = [
    "6740",  # ジャパンディスプレイ
    "8306", "8411", "9434", "7201", "5020", "4755", "9501", "4689", "8604",
    "2158", "3350", "6731", "7211", "8202", "9432", "4911", "6178", "3103",
]

# ============================================================
# バックテスト / Monte Carlo
# ============================================================
BACKTEST_MAX_SYMBOLS = None         # None=全銘柄。時間短縮したい場合は 500 などに
MONTE_CARLO_RUNS = 1_000
MONTE_CARLO_MIN_TRADES = 30         # これ未満は「統計的信頼性不足」
RUIN_LEVEL = 0.5                    # 資産が初期の50%以下になったら「破産」と定義
RANDOM_SEED = 42

# ============================================================
# パス
# ============================================================
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
LOG_DIR = BASE_DIR / "logs"
REPORT_DIR = BASE_DIR / "reports"
CACHE_DIR = DATA_DIR / "cache"
MANUAL_DATA_DIR = DATA_DIR / "manual"
STATE_FILE = DATA_DIR / "portfolio_state.json"
LATEST_ANALYSIS_FILE = DATA_DIR / "latest_analysis.json"
LATEST_BACKTEST_FILE = DATA_DIR / "latest_backtest.json"
BACKTEST_TRADES_FILE = REPORT_DIR / "backtest_trades.csv"

TIMEZONE = "Asia/Tokyo"

# ============================================================
# 画面表示文言
# ============================================================
RISK_WARNING = (
    "4,100円を5営業日で100,000円にするには約24.39倍が必要であり、"
    "通常の株式投資では極めて非現実的な目標です。"
    "本システムは投資利益を保証するものではなく、ペーパートレードによる研究目的です。"
)
NOT_ADVICE = (
    "※「推奨」「BUY」等は研究モデル上のシグナルであり、投資助言ではありません。"
    "スコアが高いことは値上がりを保証しません。売買の最終判断はご自身の責任で行ってください。"
)
RESEARCH_MODE_WARNING = (
    "【RESEARCH_MODE】1株単位の仮想売買を含みます。"
    "松井証券でそのまま実行できる取引とは限りません。"
)
DELAY_NOTICE = "データは REALTIME ではありません（無料データソースのため約20分以上遅延・終値ベースの場合あり）"


def lot_size(research: bool | None = None) -> int:
    """現在のモードの売買単位を返す"""
    if research is None:
        research = RESEARCH_MODE
    return LOT_SIZE_RESEARCH if research else LOT_SIZE_REALISTIC


def verify_safety() -> None:
    """安全設定が改変されていないか確認。改変されていたら起動しない。"""
    problems = []
    if PAPER_TRADE is not True:
        problems.append("PAPER_TRADE は True 固定です")
    if AVERAGING_DOWN is not False:
        problems.append("AVERAGING_DOWN は False 固定です（ナンピン禁止）")
    if MARGIN_TRADING is not False:
        problems.append("MARGIN_TRADING は False 固定です（信用取引禁止）")
    if SHORT_SELLING is not False:
        problems.append("SHORT_SELLING は False 固定です（空売り禁止）")
    if LEVERAGE != 1.0:
        problems.append("LEVERAGE は 1.0 固定です")
    if MAX_POSITIONS != 1:
        problems.append("MAX_POSITIONS は 1 固定です")
    if problems:
        raise RuntimeError("安全設定エラー: " + " / ".join(problems))


def ensure_dirs() -> None:
    for d in (DATA_DIR, LOG_DIR, REPORT_DIR, CACHE_DIR, MANUAL_DATA_DIR):
        d.mkdir(parents=True, exist_ok=True)
