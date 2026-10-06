"""
売買ルール（研究モデル）

- momentum score（100点満点）の計算
- BUY / WATCH / WAIT のエントリー判定
- 損切り・利確・トレーリングストップの計算
- 保有銘柄（JDI含む）の HOLD / SELL / WATCH 判定

※ スコアが高い＝値上がりを保証する、ではありません。
"""
from __future__ import annotations

import numpy as np
import pandas as pd

import config
from indicators import round_to_tick

SCORE_ITEMS = {
    "sc_volume": ("出来高急増", 20),
    "sc_high20": ("20日高値ブレイク", 15),
    "sc_prev_high": ("前日高値ブレイク", 10),
    "sc_trend": ("MA5>MA20", 10),
    "sc_momentum": ("短期モメンタム", 15),
    "sc_rsi": ("RSI", 10),
    "sc_turnover": ("売買代金", 10),
    "sc_atr": ("ATR・値動き", 10),
}


def _steps(x: pd.Series, bins: list[float], points: list[float]) -> pd.Series:
    """x が bins[i] 以上なら points[i]（大きい順に評価）"""
    out = pd.Series(0.0, index=x.index)
    for b, p in sorted(zip(bins, points), key=lambda t: t[0]):
        out = out.where(~(x >= b), p)
    return out.where(x.notna(), 0.0)


def score_frame(d: pd.DataFrame) -> pd.DataFrame:
    """指標付きDataFrameに スコア内訳・減点・合計(momentum_score) 列を追加"""
    s = pd.DataFrame(index=d.index)
    vr = d["volume_ratio"]
    s["sc_volume"] = _steps(vr, [1.0, 1.5, 2.0, 3.0, 5.0], [3, 7, 12, 16, 20])

    near20 = d["Close"] / d["high20"]
    s["sc_high20"] = np.where(d["break_high20"], 15, np.where(near20 >= 0.98, 8, np.where(near20 >= 0.95, 4, 0)))

    nearp = d["Close"] / d["prev_high"]
    s["sc_prev_high"] = np.where(d["break_prev_high"], 10, np.where(nearp >= 0.99, 5, 0))

    s["sc_trend"] = np.where(d["ma5"] > d["ma20"], 10, 0)

    chg_pts = (d["change_pct"] / 0.05 * 8).clip(0, 8).fillna(0)
    r5_pts = (d["ret5"] / 0.10 * 7).clip(0, 7).fillna(0)
    s["sc_momentum"] = chg_pts + r5_pts

    r = d["rsi14"]
    s["sc_rsi"] = np.select(
        [r.between(55, 70), r.between(50, 75), r.between(45, 80)], [10, 7, 4], 0)

    s["sc_turnover"] = _steps(d["turnover"], [1e7, 3e7, 1e8, 3e8, 1e9], [2, 4, 6, 8, 10])

    a = d["atr_pct"]
    s["sc_atr"] = np.select(
        [a.between(0.03, 0.08), a.between(0.02, 0.12), a.between(0.01, 0.2)], [10, 6, 3], 0)

    # ---- 減点 ----
    pen = pd.Series(0.0, index=d.index)
    pen += np.where(r > 85, 15, np.where(r > 80, 10, 0))                       # RSI過熱
    pen += np.where(d["turnover"] < config.MIN_TURNOVER_YEN, 10, 0)             # 流動性不足
    pen += np.where(d["vol_avg20"] < config.MIN_AVG_VOLUME_20, 10, 0)
    pen += np.where(d["pullback_from_high"] <= -0.07, 10, 0)                   # 高値から大きく押し戻し
    pen += np.where(d["drawdown_from_high5"] <= -0.15, 5, 0)                   # 急騰後の崩れ
    s["penalty"] = pen

    total = s[list(SCORE_ITEMS)].sum(axis=1) - s["penalty"]
    s["momentum_score"] = total.clip(0, 100).round(1)
    # 指標が揃っていない行はスコアなし
    s.loc[d["ma20"].isna() | d["rsi14"].isna() | d["vol_avg20"].isna(), "momentum_score"] = np.nan
    return pd.concat([d, s], axis=1)


def entry_signal_frame(d: pd.DataFrame) -> pd.Series:
    """BUY条件（すべて満たすと True）。資金面のチェックは risk_manager 側で行う。"""
    return (
        (d["volume_ratio"] >= config.ENTRY_MIN_VOLUME_RATIO)
        & (d["Close"] > d["prev_high"])
        & (d["ma5"] > d["ma20"])
        & d["rsi14"].between(config.ENTRY_RSI_MIN, config.ENTRY_RSI_MAX)
        & (d["momentum_score"] >= config.ENTRY_MIN_SCORE)
        & (d["change_pct"] < config.OVERHEAT_BLOCK_CHANGE)
    ).fillna(False)


def judge_candidate(snap: dict, affordable: bool) -> tuple[str, list[str], list[str]]:
    """
    1銘柄の判定。戻り値: (判定, 満たした条件, 危険要因)
    判定: BUY / WATCH / WAIT / 対象外
    """
    ok, risks = [], []
    vr, rsi_v, score = snap.get("volume_ratio"), snap.get("rsi14"), snap.get("momentum_score")
    checks = [
        (vr is not None and vr >= config.ENTRY_MIN_VOLUME_RATIO, f"出来高倍率 {vr or 0:.1f}倍 ≥ {config.ENTRY_MIN_VOLUME_RATIO}"),
        (bool(snap.get("break_prev_high")), "前日高値ブレイク"),
        ((snap.get("ma5") or 0) > (snap.get("ma20") or 0), "MA5 > MA20"),
        (rsi_v is not None and config.ENTRY_RSI_MIN <= rsi_v <= config.ENTRY_RSI_MAX,
         f"RSI {rsi_v or 0:.0f} が {config.ENTRY_RSI_MIN}〜{config.ENTRY_RSI_MAX}"),
        (score is not None and score >= config.ENTRY_MIN_SCORE, f"スコア {score or 0:.0f} ≥ {config.ENTRY_MIN_SCORE}"),
    ]
    ok = [msg for passed, msg in checks if passed]
    all_ok = all(p for p, _ in checks)

    chg = snap.get("change_pct") or 0
    if chg >= config.OVERHEAT_BLOCK_CHANGE:
        risks.append(f"当日+{chg:.0%}：急騰しすぎ。飛び乗り禁止水準")
        all_ok = False
    elif chg >= config.OVERHEAT_WARN_CHANGE:
        risks.append(f"当日+{chg:.0%}：急騰後の飛び乗り注意")
    if rsi_v is not None and rsi_v > 80:
        risks.append(f"RSI {rsi_v:.0f}：過熱圏")
    if (snap.get("pullback_from_high") or 0) <= -0.07:
        risks.append(f"当日高値から{snap['pullback_from_high']:.0%}押し戻されている（上ヒゲ）")
    if (snap.get("tick_ratio") or 0) >= 0.02:
        risks.append(f"1ティック={snap['tick_ratio']:.1%}：低位株のため1ティックの損益影響が大きい")
    if (snap.get("atr_pct") or 0) >= 0.10:
        risks.append(f"ATR {snap['atr_pct']:.0%}：値動きが非常に荒い")
    if (snap.get("turnover") or 0) < 3e7:
        risks.append("売買代金が小さく、板が薄い可能性")
    if (snap.get("gap_up_pct") or 0) >= 0.10:
        risks.append(f"ギャップアップ {snap['gap_up_pct']:.0%}：窓埋めリスク")

    if not affordable:
        return "対象外", ok, risks + ["資金不足で購入不可"]
    if all_ok:
        return "BUY", ok, risks
    if score is not None and score >= config.WATCH_MIN_SCORE:
        return "WATCH", ok, risks
    return "WAIT", ok, risks


def exit_levels(entry: float, atr_value: float | None) -> dict:
    """損切り・利確候補（固定％とATRベースを併記）"""
    fixed_stop = round_to_tick(entry * (1 + config.STOP_LOSS), "down")
    fixed_tp = round_to_tick(entry * (1 + config.TAKE_PROFIT), "up")
    out = {
        "entry": entry,
        "stop_fixed": fixed_stop,
        "tp_fixed": fixed_tp,
        "trailing_pct": config.TRAILING_STOP,
        "stop_atr": None,
        "tp_atr": None,
    }
    if atr_value and atr_value > 0:
        out["stop_atr"] = round_to_tick(entry - config.ATR_STOP_MULTIPLIER * atr_value, "down")
        out["tp_atr"] = round_to_tick(entry + config.ATR_TARGET_MULTIPLIER * atr_value, "up")
    # 採用ストップ：ATRストップが -3%〜-10% に収まるならATR（値動きに合わせる）、それ以外は固定 -5%
    use_atr = out["stop_atr"] is not None and -0.10 <= out["stop_atr"] / entry - 1 <= -0.03
    out["stop_used"] = out["stop_atr"] if use_atr else fixed_stop
    out["stop_basis"] = "ATRベース" if use_atr else "固定-5%"
    out["tp_used"] = fixed_tp
    risk = entry - out["stop_used"]
    out["risk_reward"] = round((out["tp_used"] - entry) / risk, 2) if risk > 0 else None
    return out


def position_decision(snap: dict, cost_price: float, peak_price: float | None = None) -> tuple[str, list[str]]:
    """
    保有銘柄の判定: HOLD / SELL / WATCH
    peak_price: 保有開始後の最高値（トレーリングストップ用。不明ならNone）
    """
    price = snap["price"]
    pnl = price / cost_price - 1
    reasons = []
    lv = exit_levels(cost_price, snap.get("atr14"))
    peak = max(peak_price or cost_price, price)
    trail_line = peak * (1 - config.TRAILING_STOP)

    if price <= lv["stop_used"]:
        return "SELL", [f"損切りライン到達（{lv['stop_basis']} {lv['stop_used']:.0f}円 / 含み損益 {pnl:+.1%}）"]
    if pnl >= config.TAKE_PROFIT:
        return "SELL", [f"利確ライン到達（+{config.TAKE_PROFIT:.0%} / 含み損益 {pnl:+.1%}）"]
    if peak > cost_price * 1.03 and price <= trail_line:
        return "SELL", [f"トレーリングストップ（保有後高値 {peak:.0f}円 から -{config.TRAILING_STOP:.0%}）"]

    score = snap.get("momentum_score") or 0
    trend_up = (snap.get("ma5") or 0) > (snap.get("ma20") or 0)
    rsi_v = snap.get("rsi14") or 50
    if not trend_up and rsi_v < 40 and score < 30:
        return "SELL", [f"トレンド崩れ（MA5<MA20・RSI {rsi_v:.0f}・スコア {score:.0f}）"]
    if trend_up and score >= 50:
        reasons.append(f"MA5>MA20 の上昇基調・スコア {score:.0f}")
        reasons.append(f"損切りライン {lv['stop_used']:.0f}円 まで余裕あり（現在 {price:.0f}円）")
        return "HOLD", reasons
    reasons.append(f"方向感が弱い（スコア {score:.0f}・{'MA5>MA20' if trend_up else 'MA5<MA20'}・RSI {rsi_v:.0f}）")
    reasons.append(f"損切りライン {lv['stop_used']:.0f}円 を割ったら SELL")
    return "WATCH", reasons
