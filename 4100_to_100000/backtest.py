"""
バックテスト と Monte Carlo シミュレーション

- ライブ分析と同じ指標・スコア・BUY条件（strategy.py）を使う
- 4,100円の現金スタート、REALISTIC_MODE なら100株単位・資金内のみ
- シグナルは「当日終値で判定 → 翌営業日の寄付きで仮想買付」（未来のデータを使わない）
- 売却: 損切り / 利確 / トレーリングストップ / 最大保有日数
※ 過去の結果は将来の結果を保証しません。
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd

import config
import risk_manager
from indicators import tick_size
from strategy import entry_signal_frame, exit_levels

FWD_HORIZON = 5  # スコア帯別の将来リターンを測る日数（5営業日チャレンジに合わせる）


def eligible_mask(d: pd.DataFrame) -> pd.Series:
    """各日時点で分かる情報だけを使った流動性・スプレッドのフィルター"""
    return ((d["vol_avg20"] >= config.MIN_AVG_VOLUME_20)
            & (d["turnover"] >= config.MIN_TURNOVER_YEN)
            & (d["tick_ratio"] <= config.MAX_TICK_RATIO)
            & (d["Volume"] > 0)).fillna(False)


def score_bucket_stats(frames: dict[str, pd.DataFrame]) -> dict:
    """スコア帯別：翌日寄付き→5営業日後終値のリターン（参考値）"""
    parts = []
    for d in frames.values():
        fwd = d["Close"].shift(-FWD_HORIZON) / d["Open"].shift(-1) - 1
        x = pd.DataFrame({"score": d["momentum_score"], "fwd": fwd})[eligible_mask(d)].dropna()
        parts.append(x)
    if not parts:
        return {}
    allx = pd.concat(parts)
    if allx.empty:
        return {}
    allx["bucket"] = (allx["score"] // 10).clip(upper=9).astype(int) * 10
    out = {}
    for b, g in allx.groupby("bucket"):
        out[f"{b}-{b + 10}"] = {"n": int(len(g)), "mean_fwd": round(float(g["fwd"].mean()), 4),
                                "median_fwd": round(float(g["fwd"].median()), 4),
                                "win_rate": round(float((g["fwd"] > 0).mean()), 4)}
    return out


def run_backtest(frames: dict[str, pd.DataFrame], names: dict[str, str], research: bool,
                 initial_cash: float = config.INITIAL_ASSET) -> dict:
    config.verify_safety()
    # シグナル一覧（日付ごと）
    sig_rows = []
    for code, d in frames.items():
        m = entry_signal_frame(d) & eligible_mask(d)
        if m.any():
            s = d.loc[m, ["Close", "momentum_score", "atr14"]].copy()
            s["code"] = code
            sig_rows.append(s)
    signals = (pd.concat(sig_rows).rename_axis("date").reset_index()
               .sort_values(["date", "momentum_score"], ascending=[True, False])) if sig_rows else pd.DataFrame()
    sig_by_date = {dt: g for dt, g in signals.groupby("date")} if not signals.empty else {}

    dates = sorted(set().union(*[set(d.index) for d in frames.values()])) if frames else []
    cash, pos, pending = float(initial_cash), None, None
    trades, equity = [], []

    def close_pos(dt, price, reason):
        nonlocal cash, pos
        fill = max(price - tick_size(price) * config.SLIPPAGE_TICKS, 1)
        pnl = (fill - pos["entry"]) * pos["shares"] - 2 * config.COMMISSION_YEN
        cash += fill * pos["shares"] - config.COMMISSION_YEN
        trades.append({"code": pos["code"], "name": names.get(pos["code"], pos["code"]),
                       "entry_date": pos["entry_date"].strftime("%Y-%m-%d"), "exit_date": dt.strftime("%Y-%m-%d"),
                       "entry": round(pos["entry"], 2), "exit": round(fill, 2), "shares": pos["shares"],
                       "pnl": round(pnl, 1), "ret": round(fill / pos["entry"] - 1, 4), "reason": reason,
                       "score": pos["score"], "hold_days": pos["hold"]})
        pos = None

    for dt in dates:
        # 1) 前日のシグナルを寄付きで仮想買付
        if pending is not None and pos is None:
            d = frames[pending["code"]]
            if dt in d.index:
                o = float(d.at[dt, "Open"])
                fill = o + tick_size(o) * config.SLIPPAGE_TICKS
                shares = risk_manager.max_shares(fill, cash, research)
                if shares > 0:
                    cash -= fill * shares + config.COMMISSION_YEN
                    lv = exit_levels(fill, pending["atr"])
                    pos = {"code": pending["code"], "shares": shares, "entry": fill, "entry_date": dt,
                           "peak": fill, "hold": 0, "stop": lv["stop_used"], "tp": lv["tp_used"],
                           "score": pending["score"]}
            pending = None

        # 2) 保有中なら売却判定（同日内の順序が不明な場合は損切りを優先＝保守的）
        if pos is not None and dt in frames[pos["code"]].index:
            bar = frames[pos["code"]].loc[dt]
            pos["hold"] += 1
            trail_active = pos["peak"] > pos["entry"] * 1.03
            down = max(pos["stop"], pos["peak"] * (1 - config.TRAILING_STOP)) if trail_active else pos["stop"]
            reason_down = "トレーリング" if trail_active and down > pos["stop"] else "損切り"
            if bar["Open"] <= down:
                close_pos(dt, float(bar["Open"]), reason_down + "(窓)")
            elif bar["Low"] <= down:
                close_pos(dt, down, reason_down)
            elif bar["Open"] >= pos["tp"]:
                close_pos(dt, float(bar["Open"]), "利確(窓)")
            elif bar["High"] >= pos["tp"]:
                close_pos(dt, pos["tp"], "利確")
            elif pos["hold"] >= config.MAX_HOLD_DAYS:
                close_pos(dt, float(bar["Close"]), "期間満了")
            else:
                pos["peak"] = max(pos["peak"], float(bar["High"]))

        # 3) ノーポジなら当日終値でシグナル判定 → 翌日寄付きで買う予約
        if pos is None and pending is None and dt in sig_by_date:
            for _, s in sig_by_date[dt].iterrows():
                if risk_manager.is_affordable(float(s["Close"]), cash, research):
                    pending = {"code": s["code"], "score": float(s["momentum_score"]), "atr": float(s["atr14"])}
                    break

        mv = 0.0
        if pos is not None:
            d = frames[pos["code"]]
            px = float(d.loc[:dt, "Close"].iloc[-1])
            mv = px * pos["shares"]
        equity.append({"date": dt.strftime("%Y-%m-%d"), "equity": round(cash + mv, 1)})

    if pos is not None and dates:
        d = frames[pos["code"]]
        close_pos(d.index[-1], float(d["Close"].iloc[-1]), "期末決済")
        equity[-1]["equity"] = round(cash, 1)

    return summarize(trades, equity, initial_cash, research) | {"score_bucket_stats": score_bucket_stats(frames),
                                                                "n_symbols": len(frames),
                                                                "period": f"{dates[0]:%Y-%m-%d}〜{dates[-1]:%Y-%m-%d}" if dates else "-"}


def summarize(trades: list[dict], equity: list[dict], initial: float, research: bool) -> dict:
    t = pd.DataFrame(trades)
    eq = pd.DataFrame(equity)
    res = {"mode": "RESEARCH" if research else "REALISTIC", "initial": initial, "trades": trades, "equity": equity}
    if eq.empty:
        res["final"] = initial
    else:
        res["final"] = float(eq["equity"].iloc[-1])
        peak = eq["equity"].cummax()
        res["max_drawdown"] = round(float((eq["equity"] / peak - 1).min()), 4)
    res["total_return"] = round(res["final"] / initial - 1, 4)
    res["n_trades"] = int(len(t))
    if t.empty:
        res.update({"win_rate": None, "avg_win": None, "avg_loss": None, "profit_factor": None,
                    "expectancy_yen": None, "expectancy_pct": None, "max_consec_losses": 0})
        return res
    wins, losses = t[t["pnl"] > 0], t[t["pnl"] <= 0]
    res["win_rate"] = round(len(wins) / len(t), 4)
    res["avg_win"] = round(float(wins["pnl"].mean()), 1) if len(wins) else 0.0
    res["avg_loss"] = round(float(losses["pnl"].mean()), 1) if len(losses) else 0.0
    res["avg_win_pct"] = round(float(wins["ret"].mean()), 4) if len(wins) else 0.0
    res["avg_loss_pct"] = round(float(losses["ret"].mean()), 4) if len(losses) else 0.0
    gl = -losses["pnl"].sum()
    res["profit_factor"] = round(float(wins["pnl"].sum() / gl), 2) if gl > 0 else None
    res["expectancy_yen"] = round(float(t["pnl"].mean()), 1)
    res["expectancy_pct"] = round(float(t["ret"].mean()), 4)
    streak = mx = 0
    for p in t["pnl"]:
        streak = streak + 1 if p <= 0 else 0
        mx = max(mx, streak)
    res["max_consec_losses"] = mx
    return res


def monte_carlo(bt: dict, runs: int = config.MONTE_CARLO_RUNS, days: int = config.CHALLENGE_DAYS,
                seed: int = config.RANDOM_SEED) -> dict:
    """
    バックテストの1トレードあたりリターンをランダムに並べ替え（復元抽出）、5営業日分を runs 回シミュレーション。
    5営業日あたりの取引回数も、バックテストの実績分布から抽出する。
    """
    t = pd.DataFrame(bt.get("trades", []))
    out = {"runs": runs, "days": days, "n_trades_sample": int(len(t)),
           "reliable": len(t) >= config.MONTE_CARLO_MIN_TRADES,
           "note": "将来の結果を保証しません。過去のトレード結果を並べ替えた参考値です。"}
    if t.empty:
        out["message"] = "バックテストの取引が0件のため Monte Carlo を実行できません"
        return out
    if not out["reliable"]:
        out["warning"] = f"統計的信頼性不足（取引サンプル {len(t)}件 < {config.MONTE_CARLO_MIN_TRADES}件）"

    rng = np.random.default_rng(seed)
    rets = t["ret"].to_numpy()
    # 5営業日ウィンドウごとの決済回数の実績分布
    eq_dates = pd.to_datetime([e["date"] for e in bt["equity"]])
    exits = pd.Series(1, index=pd.to_datetime(t["exit_date"])).groupby(level=0).sum()
    daily = exits.reindex(eq_dates, fill_value=0)
    counts = daily.rolling(days).sum().dropna().astype(int).to_numpy()
    if len(counts) == 0:
        counts = np.array([max(1, round(len(t) / max(len(eq_dates), 1) * days))])

    init = float(bt["initial"])
    finals, ruined = np.empty(runs), 0
    for i in range(runs):
        k = int(rng.choice(counts))
        path = init * np.cumprod(1 + rng.choice(rets, size=k)) if k > 0 else np.array([init])
        finals[i] = path[-1]
        if path.min() <= init * config.RUIN_LEVEL:
            ruined += 1
    out.update({
        "median": round(float(np.median(finals)), 1),
        "p90": round(float(np.percentile(finals, 90)), 1),
        "p10": round(float(np.percentile(finals, 10)), 1),
        "max": round(float(finals.max()), 1),
        "ruin_rate": round(ruined / runs, 4),
        "ruin_definition": f"資産が初期の{config.RUIN_LEVEL:.0%}以下に到達",
        "target_reach_rate": round(float((finals >= config.TARGET_ASSET).mean()), 4),
        "finals_sample": [round(float(x), 1) for x in finals[:runs]],
        "approximation": "単元(100株)制約による端数や、資産増加後の銘柄選択の変化は簡略化しています",
    })
    return out


def save_results(bt: dict, mc: dict) -> None:
    config.ensure_dirs()
    payload = {k: v for k, v in bt.items() if k not in ("trades",)} | {"monte_carlo": mc}
    config.LATEST_BACKTEST_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=1, default=str),
                                           encoding="utf-8")
    pd.DataFrame(bt["trades"]).to_csv(config.BACKTEST_TRADES_FILE, index=False, encoding="utf-8-sig")
    pd.DataFrame(bt["equity"]).to_csv(config.REPORT_DIR / "backtest_equity.csv", index=False, encoding="utf-8-sig")


def print_results(bt: dict, mc: dict) -> None:
    def p(x):
        return "-" if x is None else f"{x:+.2%}"
    print("=" * 64)
    print(f"■ バックテスト（{bt['mode']} / {bt['initial']:,.0f}円スタート / {bt.get('n_symbols', 0)}銘柄 / {bt.get('period', '-')}）")
    print("=" * 64)
    print(f"総取引回数   : {bt['n_trades']}")
    wr = bt.get("win_rate")
    print(f"勝率         : {'-' if wr is None else format(wr, '.1%')}")
    print(f"平均利益     : {bt.get('avg_win')}円（{p(bt.get('avg_win_pct'))}）")
    print(f"平均損失     : {bt.get('avg_loss')}円（{p(bt.get('avg_loss_pct'))}）")
    print(f"Profit Factor: {bt.get('profit_factor')}")
    print(f"期待値       : {bt.get('expectancy_yen')}円/回（{p(bt.get('expectancy_pct'))}）")
    print(f"最大DD       : {p(bt.get('max_drawdown'))}")
    print(f"最大連敗     : {bt.get('max_consec_losses')}")
    print(f"最終資産     : {bt['final']:,.0f}円")
    print(f"リターン     : {p(bt['total_return'])}")
    print()
    print("=" * 64)
    print(f"■ Monte Carlo（{mc['runs']}回 × {mc['days']}営業日）")
    print("=" * 64)
    if "message" in mc:
        print(mc["message"])
    else:
        if mc.get("warning"):
            print("⚠ " + mc["warning"])
        print(f"中央値    : {mc['median']:,.0f}円")
        print(f"上位10%   : {mc['p90']:,.0f}円")
        print(f"下位10%   : {mc['p10']:,.0f}円")
        print(f"最大資産  : {mc['max']:,.0f}円")
        print(f"破産率    : {mc['ruin_rate']:.1%}（{mc['ruin_definition']}）")
        print(f"10万円到達率: {mc['target_reach_rate']:.2%}（参考値）")
    print("※ " + mc["note"])
