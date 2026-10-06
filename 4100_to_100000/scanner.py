"""
対象銘柄スクリーニング

1. ユニバース（東証上場銘柄 or 監視リスト）の日足を取得
2. 指標・スコアを計算
3. 除外条件（出来高過少・売買停止の疑い・スプレッド異常・データ不足・手動除外）を適用
4. 資金で100株(または1株)買えるかを判定
"""
from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

import config
import data_provider
import risk_manager
from indicators import add_indicators, latest_snapshot
from strategy import score_frame


@dataclass
class ScanResult:
    table: pd.DataFrame                       # 最新日のスナップショット（1行=1銘柄）
    frames: dict[str, pd.DataFrame]           # 指標・スコア付きの日足
    excluded: pd.DataFrame                    # 除外銘柄と理由
    failed: list[str] = field(default_factory=list)
    source: str = ""
    fetched_at: str = ""
    latest_date: str = ""
    universe_size: int = 0


def exclusion_reason(snap: dict, n_rows: int, latest_market_date: pd.Timestamp, last_date: pd.Timestamp) -> str | None:
    if snap["code"] in config.EXCLUDE_CODES:
        return "手動除外（整理銘柄等）"
    if n_rows < config.MIN_HISTORY_DAYS:
        return f"価格データ不足（{n_rows}日）"
    if (latest_market_date - last_date).days > config.STALE_DAYS + 2:
        return "最新データなし（売買停止の疑い）"
    if (snap.get("Volume") or 0) <= 0:
        return "出来高ゼロ（売買停止の疑い）"
    if (snap.get("vol_avg20") or 0) < config.MIN_AVG_VOLUME_20:
        return "出来高が極端に少ない"
    if (snap.get("turnover") or 0) < config.MIN_TURNOVER_YEN:
        return "売買代金が極端に少ない"
    if (snap.get("tick_ratio") or 0) > config.MAX_TICK_RATIO:
        return f"スプレッド異常（1ティック={snap['tick_ratio']:.1%}）"
    if (snap.get("day_range_ratio") or 0) > config.MAX_DAY_RANGE_RATIO:
        return "値幅異常"
    return None


def scan(universe: pd.DataFrame, available_cash: float, research: bool,
         period: str | None = None, use_cache: bool = True,
         provider: data_provider.BaseProvider | None = None) -> ScanResult:
    names = dict(zip(universe["code"], universe["name"]))
    codes = list(universe["code"])
    fetch = data_provider.fetch_daily(codes, period=period, provider=provider, use_cache=use_cache)
    if not fetch.frames:
        raise RuntimeError("価格データを1銘柄も取得できませんでした。ネットワーク接続またはデータソースを確認してください。"
                           "（架空データでの分析は行いません）")

    latest_market_date = max(df.index[-1] for df in fetch.frames.values())
    rows, excluded, frames = [], [], {}
    for code, df in fetch.frames.items():
        d = score_frame(add_indicators(df))
        frames[code] = d
        snap = latest_snapshot(d)
        snap["code"] = code
        snap["name"] = names.get(code, code)
        reason = exclusion_reason(snap, len(d), latest_market_date, d.index[-1])
        snap["required_cash"] = risk_manager.required_cash(snap["price"], research)
        snap["affordable"] = risk_manager.is_affordable(snap["price"], available_cash, research)
        if reason and code != config.JDI_CODE:   # JDIは保有中なので除外せず常に分析
            excluded.append({"code": code, "name": snap["name"], "reason": reason})
            continue
        snap["exclusion_note"] = reason or ""
        rows.append(snap)

    table = pd.DataFrame(rows)
    if not table.empty:
        table = table.sort_values("momentum_score", ascending=False, na_position="last").reset_index(drop=True)
    return ScanResult(
        table=table,
        frames=frames,
        excluded=pd.DataFrame(excluded, columns=["code", "name", "reason"]),
        failed=fetch.failed,
        source=fetch.source,
        fetched_at=fetch.fetched_at,
        latest_date=latest_market_date.strftime("%Y-%m-%d"),
        universe_size=len(codes),
    )
