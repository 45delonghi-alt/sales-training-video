"""
データ取得モジュール

- 取得元はクラスで切り替え可能（yfinance / stooq / 手動CSV）
- 取得に失敗した銘柄は「失敗」として記録し、架空データは絶対に生成しない
- 無料データは REALTIME ではないため、結果には必ず遅延の注意書きを付ける
"""
from __future__ import annotations

import hashlib
import io
import pickle
import time
from dataclasses import dataclass, field
from datetime import datetime
from zoneinfo import ZoneInfo

import pandas as pd

import config

OHLCV = ["Open", "High", "Low", "Close", "Volume"]
INTRADAY_INTERVALS = {"5m": "5d", "15m": "30d", "60m": "60d"}


@dataclass
class FetchResult:
    """取得結果。frames は 証券コード -> 日足DataFrame(Open/High/Low/Close/Volume)"""
    frames: dict[str, pd.DataFrame] = field(default_factory=dict)
    failed: list[str] = field(default_factory=list)
    source: str = ""
    fetched_at: str = ""
    is_realtime: bool = False
    notice: str = config.DELAY_NOTICE


def now_jst() -> datetime:
    return datetime.now(ZoneInfo(config.TIMEZONE))


def market_session_label(ts: datetime | None = None) -> str:
    """場中かどうかの表示用ラベル"""
    ts = ts or now_jst()
    if ts.weekday() >= 5:
        return "休場日（直近営業日の終値ベース）"
    hm = ts.hour * 100 + ts.minute
    if hm < 900:
        return "寄付前（前営業日の終値ベース）"
    if hm <= 1530:
        return "場中（当日の値は暫定・遅延あり）"
    return "大引け後（当日終値ベース・遅延あり）"


def _clean_frame(df: pd.DataFrame) -> pd.DataFrame | None:
    """列名・インデックスを揃え、欠損行を除去する。使えなければ None。"""
    if df is None or df.empty:
        return None
    df = df.copy()
    missing = [c for c in OHLCV if c not in df.columns]
    if missing:
        return None
    df = df[OHLCV]
    idx = pd.to_datetime(df.index)
    if getattr(idx, "tz", None) is not None:
        idx = idx.tz_convert(config.TIMEZONE).tz_localize(None)
    df.index = idx
    df = df.apply(pd.to_numeric, errors="coerce")
    df = df.dropna(subset=["Open", "High", "Low", "Close"])
    df["Volume"] = df["Volume"].fillna(0)
    df = df[~df.index.duplicated(keep="last")].sort_index()
    return df if not df.empty else None


# ============================================================
# 東証上場銘柄一覧
# ============================================================
def load_universe(mode: str | None = None) -> pd.DataFrame:
    """
    分析対象の銘柄一覧を返す（columns: code, name, market）
    jpx_all: JPX公表の上場銘柄一覧(data_j.xls)。取得失敗時は前回キャッシュ → 監視リストの順に使う。
    """
    mode = mode or config.UNIVERSE
    cache = config.DATA_DIR / "jpx_listed.csv"
    if mode == "jpx_all":
        try:
            import requests

            resp = requests.get(config.JPX_LIST_URL, timeout=30)
            resp.raise_for_status()
            raw = pd.read_excel(io.BytesIO(resp.content), dtype=str)
            uni = pd.DataFrame({
                "code": raw["コード"].str.strip(),
                "name": raw["銘柄名"].str.strip(),
                "market": raw["市場・商品区分"].fillna("").str.strip(),
            })
            uni.to_csv(cache, index=False, encoding="utf-8-sig")
        except Exception as e:  # noqa: BLE001
            print(f"[WARN] JPX上場銘柄一覧の取得に失敗: {e}")
            if cache.exists():
                print("       → 前回保存した一覧を使用します")
                uni = pd.read_csv(cache, dtype=str).fillna("")
            else:
                print("       → 監視リスト(config.WATCHLIST)のみで分析します")
                uni = _watchlist_universe()
        uni = uni[~uni["market"].apply(
            lambda m: any(k in m for k in config.EXCLUDE_MARKET_KEYWORDS))]
    else:
        uni = _watchlist_universe()
    if config.JDI_CODE not in set(uni["code"]):
        uni = pd.concat([pd.DataFrame([{"code": config.JDI_CODE, "name": config.JDI_NAME,
                                        "market": ""}]), uni])
    uni = uni[uni["code"].str.fullmatch(r"[0-9A-Z]{4}")]
    return uni.drop_duplicates("code").reset_index(drop=True)


def _watchlist_universe() -> pd.DataFrame:
    names = {}
    cache = config.DATA_DIR / "jpx_listed.csv"
    if cache.exists():
        c = pd.read_csv(cache, dtype=str).fillna("")
        names = dict(zip(c["code"], c["name"]))
    names.setdefault(config.JDI_CODE, config.JDI_NAME)
    return pd.DataFrame([{"code": c, "name": names.get(c, c), "market": ""}
                         for c in dict.fromkeys(config.WATCHLIST)])


# ============================================================
# データ取得クラス
# ============================================================
class BaseProvider:
    name = "base"

    def get_daily(self, codes: list[str], period: str) -> FetchResult:
        raise NotImplementedError

    def get_intraday(self, code: str, interval: str = "5m") -> pd.DataFrame | None:
        return None


class YFinanceProvider(BaseProvider):
    """Yahoo Finance（yfinance）。東証銘柄は『コード.T』。研究目的・遅延データ。"""
    name = "yfinance (Yahoo Finance, 遅延データ)"

    def get_daily(self, codes: list[str], period: str) -> FetchResult:
        import yfinance as yf

        res = FetchResult(source=self.name, fetched_at=now_jst().isoformat(timespec="seconds"))
        codes = list(dict.fromkeys(codes))
        bs = config.DOWNLOAD_BATCH_SIZE
        for i in range(0, len(codes), bs):
            batch = codes[i:i + bs]
            tickers = [f"{c}.T" for c in batch]
            print(f"  データ取得中 {i + 1}-{i + len(batch)} / {len(codes)} 銘柄 ...", flush=True)
            raw = None
            for attempt in range(3):
                try:
                    raw = yf.download(tickers, period=period, interval="1d", group_by="ticker",
                                      auto_adjust=False, threads=True, progress=False,
                                      multi_level_index=True)
                    break
                except Exception as e:  # noqa: BLE001
                    print(f"  [WARN] 取得エラー（{attempt + 1}回目）: {e}")
                    time.sleep(2 * (attempt + 1))
            for c, t in zip(batch, tickers):
                df = None
                if raw is not None and not raw.empty:
                    try:
                        if isinstance(raw.columns, pd.MultiIndex):
                            if t in raw.columns.get_level_values(0):
                                df = raw[t]
                        else:
                            df = raw
                    except Exception:  # noqa: BLE001
                        df = None
                df = _clean_frame(df)
                if df is None:
                    res.failed.append(c)
                else:
                    res.frames[c] = df
        return res

    def get_intraday(self, code: str, interval: str = "5m") -> pd.DataFrame | None:
        import yfinance as yf

        if interval not in INTRADAY_INTERVALS:
            raise ValueError(f"interval は {list(INTRADAY_INTERVALS)} のいずれか")
        try:
            raw = yf.download(f"{code}.T", period=INTRADAY_INTERVALS[interval], interval=interval,
                              auto_adjust=False, progress=False, multi_level_index=False)
        except Exception as e:  # noqa: BLE001
            print(f"[WARN] {code} 分足取得失敗: {e}")
            return None
        return _clean_frame(raw)


class StooqProvider(BaseProvider):
    """Stooq の日足CSV（1銘柄ずつ）。yfinanceが使えない場合の予備。"""
    name = "stooq (日足・遅延データ)"

    def get_daily(self, codes: list[str], period: str) -> FetchResult:
        res = FetchResult(source=self.name, fetched_at=now_jst().isoformat(timespec="seconds"))
        days = {"1mo": 31, "3mo": 92, "6mo": 183, "1y": 366, "2y": 732}.get(period, 183)
        for c in codes:
            try:
                url = f"https://stooq.com/q/d/l/?s={c.lower()}.jp&i=d"
                df = pd.read_csv(url, parse_dates=["Date"], index_col="Date")
                df = _clean_frame(df)
                if df is not None:
                    df = df[df.index >= df.index.max() - pd.Timedelta(days=days)]
            except Exception:  # noqa: BLE001
                df = None
            if df is None:
                res.failed.append(c)
            else:
                res.frames[c] = df
        return res


class CsvProvider(BaseProvider):
    """
    手動CSV: data/manual/{コード}.csv（列: Date,Open,High,Low,Close,Volume）
    証券会社の画面等から自分でダウンロードした「実データ」を使いたい場合用。
    """
    name = "手動CSV (data/manual)"

    def get_daily(self, codes: list[str], period: str) -> FetchResult:
        res = FetchResult(source=self.name, fetched_at=now_jst().isoformat(timespec="seconds"))
        for c in codes:
            path = config.MANUAL_DATA_DIR / f"{c}.csv"
            df = None
            if path.exists():
                try:
                    df = _clean_frame(pd.read_csv(path, parse_dates=["Date"], index_col="Date"))
                except Exception:  # noqa: BLE001
                    df = None
            if df is None:
                res.failed.append(c)
            else:
                res.frames[c] = df
        return res


PROVIDERS = {"yfinance": YFinanceProvider, "stooq": StooqProvider, "csv": CsvProvider}


def get_provider(name: str | None = None) -> BaseProvider:
    return PROVIDERS[name or config.DATA_PROVIDER]()


def fetch_daily(codes: list[str], period: str | None = None, provider: BaseProvider | None = None,
                use_cache: bool = True) -> FetchResult:
    """
    日足を取得（キャッシュ付き）。JDIが取れなければ予備ソースでJDIのみ再試行する。
    失敗銘柄は FetchResult.failed に入り、分析対象から外れる（架空データで埋めない）。
    """
    config.ensure_dirs()
    period = period or config.HISTORY_PERIOD
    provider = provider or get_provider()
    digest = hashlib.md5(",".join(sorted(codes)).encode()).hexdigest()[:10]
    key = f"{provider.__class__.__name__}_{period}_{len(codes)}_{digest}"
    cache_file = config.CACHE_DIR / f"{key}.pkl"
    if use_cache and cache_file.exists():
        age_min = (time.time() - cache_file.stat().st_mtime) / 60
        if age_min < config.CACHE_MINUTES:
            with open(cache_file, "rb") as f:
                cached: FetchResult = pickle.load(f)
            print(f"  キャッシュを使用（{age_min:.0f}分前に取得 / {cached.source}）")
            return cached

    res = provider.get_daily(codes, period)
    if config.JDI_CODE in codes and config.JDI_CODE not in res.frames \
            and not isinstance(provider, StooqProvider):
        print("  JDIの取得に失敗したため予備ソース(stooq)で再試行します")
        alt = StooqProvider().get_daily([config.JDI_CODE], period)
        if config.JDI_CODE in alt.frames:
            res.frames[config.JDI_CODE] = alt.frames[config.JDI_CODE]
            res.failed = [c for c in res.failed if c != config.JDI_CODE]
            res.source += " + stooq(JDIのみ)"
    if res.frames:
        with open(cache_file, "wb") as f:
            pickle.dump(res, f)
    return res
