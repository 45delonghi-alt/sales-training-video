"""
テクニカル指標の計算

すべて「その日の終わり時点までに分かる情報だけ」で計算する（未来のデータを使わない）。
ライブ分析とバックテストで同じ関数を使うことで、判定ロジックのズレを防ぐ。
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def tick_size(price: float) -> float:
    """東証の標準的な呼値（TOPIX100構成銘柄以外）"""
    if price <= 3_000:
        return 1.0
    if price <= 5_000:
        return 5.0
    if price <= 30_000:
        return 10.0
    if price <= 50_000:
        return 50.0
    if price <= 300_000:
        return 100.0
    return 500.0


def round_to_tick(price: float, direction: str = "nearest") -> float:
    t = tick_size(price)
    if direction == "up":
        return float(np.ceil(price / t) * t)
    if direction == "down":
        return float(np.floor(price / t) * t)
    return float(np.round(price / t) * t)


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    """RSI（Wilder方式）"""
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    out = 100 - 100 / (1 + rs)
    out = out.where(avg_loss != 0, 100.0)  # 下落ゼロなら100
    return out.where(avg_gain.notna())


def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """ATR（Wilder方式）"""
    prev_close = df["Close"].shift(1)
    tr = pd.concat([
        df["High"] - df["Low"],
        (df["High"] - prev_close).abs(),
        (df["Low"] - prev_close).abs(),
    ], axis=1).max(axis=1)
    return tr.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()


def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """日足DataFrameに指標列を追加して返す"""
    d = df.copy()
    c, h, v = d["Close"], d["High"], d["Volume"]
    d["prev_close"] = c.shift(1)
    d["prev_high"] = h.shift(1)
    d["change_pct"] = c / d["prev_close"] - 1                      # 前日比
    d["from_open_pct"] = c / d["Open"] - 1                         # 始値からの上昇率
    d["gap_up_pct"] = d["Open"] / d["prev_close"] - 1              # ギャップアップ率
    d["vol_avg20"] = v.shift(1).rolling(20, min_periods=15).mean()  # 当日を含まない20日平均出来高
    d["volume_ratio"] = v / d["vol_avg20"].replace(0, np.nan)      # 出来高倍率
    d["ma5"] = c.rolling(5).mean()
    d["ma20"] = c.rolling(20).mean()
    d["rsi14"] = rsi(c, 14)
    d["atr14"] = atr(d, 14)
    d["atr_pct"] = d["atr14"] / c
    d["high20"] = h.shift(1).rolling(20, min_periods=15).max()     # 前日までの20日高値
    d["break_high20"] = c > d["high20"]                            # 20日高値ブレイク
    d["break_prev_high"] = c > d["prev_high"]                      # 前日高値ブレイク
    d["ret5"] = c / c.shift(5) - 1                                 # 直近5日騰落率
    d["pullback_from_high"] = c / h - 1                            # 当日高値からの下落率
    d["drawdown_from_high5"] = c / h.rolling(5).max() - 1          # 直近5日高値からの下落率
    d["volatility20"] = c.pct_change().rolling(20).std()           # 日次リターンの標準偏差
    d["turnover"] = c * v                                          # 売買代金（概算）
    d["tick_ratio"] = c.apply(tick_size) / c                       # 1ティックの価格比
    d["day_range_ratio"] = (h - d["Low"]) / d["prev_close"]
    return d


def latest_snapshot(df_ind: pd.DataFrame) -> dict:
    """指標付きDataFrameの最終行を辞書にする（表示・ログ用）"""
    row = df_ind.iloc[-1]
    snap = {k: (None if (isinstance(v, float) and np.isnan(v)) else v) for k, v in row.items()}
    snap["date"] = df_ind.index[-1].strftime("%Y-%m-%d")
    snap["price"] = float(row["Close"])
    for b in ("break_high20", "break_prev_high"):
        snap[b] = bool(row[b])
    return snap
