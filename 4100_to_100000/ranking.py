"""
ランキング・JDI判定・乗換判定・本日の最終判断をまとめる

出力はすべて JSON にできる辞書（dashboard と report が同じ結果を表示するため）。
"""
from __future__ import annotations

import json
import math

import pandas as pd

import config
import risk_manager
from indicators import tick_size
from strategy import SCORE_ITEMS, exit_levels, judge_candidate, position_decision

RANK_COLUMNS = {
    "rank": "順位", "code": "証券コード", "name": "銘柄名", "price": "株価", "change_pct": "前日比",
    "volume_ratio": "出来高倍率", "rsi14": "RSI", "ma5": "MA5", "ma20": "MA20", "breakout": "高値ブレイク",
    "momentum_score": "Momentum Score", "required_cash": "100株必要金額", "affordable_label": "購入可能/不可",
    "judgement": "判定",
}


def _f(x, nd=2):
    if x is None:
        return None
    try:
        x = float(x)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(x) else round(x, nd)


def _breakout_label(s: dict) -> str:
    if s.get("break_high20"):
        return "20日高値"
    if s.get("break_prev_high"):
        return "前日高値"
    return "-"


def load_score_bucket_stats() -> dict | None:
    """バックテストで計算したスコア帯別の将来リターン（参考値）"""
    if not config.LATEST_BACKTEST_FILE.exists():
        return None
    try:
        bt = json.loads(config.LATEST_BACKTEST_FILE.read_text(encoding="utf-8"))
        return bt.get("score_bucket_stats")
    except Exception:  # noqa: BLE001
        return None


def bucket_of(score: float | None) -> str | None:
    if score is None or (isinstance(score, float) and math.isnan(score)):
        return None
    lo = min(int(score // 10) * 10, 90)
    return f"{lo}-{lo + 10}"


def analyze_position(snap: dict, pos: dict) -> dict:
    """保有銘柄（JDI含む）の分析"""
    price = snap["price"]
    decision, reasons = position_decision(snap, pos["cost_price"], pos.get("peak_price"))
    lv = exit_levels(pos["cost_price"], snap.get("atr14"))
    return {
        "code": pos["code"], "name": pos["name"], "shares": pos["shares"],
        "cost_price": pos["cost_price"], "price": price,
        "market_value": round(price * pos["shares"], 1),
        "unrealized_yen": round((price - pos["cost_price"]) * pos["shares"], 1),
        "unrealized_pct": _f(price / pos["cost_price"] - 1, 4),
        "decision": decision, "reasons": reasons,
        "stop_used": lv["stop_used"], "stop_basis": lv["stop_basis"], "stop_atr": lv["stop_atr"],
        "take_profit": lv["tp_used"],
        "trailing_line": round(max(pos.get("peak_price") or pos["cost_price"], price) * (1 - config.TRAILING_STOP), 1),
    }


def jdi_analysis(table: pd.DataFrame, portfolio) -> dict:
    """毎回最初に行う 6740 JDI 専用分析"""
    row = table[table["code"] == config.JDI_CODE]
    if row.empty:
        return {"available": False, "message": "JDI(6740)のデータを取得できませんでした。判定できないため WATCH 扱いとします。",
                "decision": "WATCH"}
    s = row.iloc[0].to_dict()
    holding = portfolio.position if portfolio.position and portfolio.position["code"] == config.JDI_CODE else None
    pos = holding or {"code": config.JDI_CODE, "name": config.JDI_NAME, "shares": config.JDI_SHARES,
                      "cost_price": config.JDI_COST_PRICE, "peak_price": None}
    a = analyze_position(s, pos)
    a.update({
        "available": True, "holding": holding is not None, "date": s["date"],
        "change_pct": _f(s.get("change_pct"), 4), "volume_ratio": _f(s.get("volume_ratio")),
        "ma5": _f(s.get("ma5")), "ma20": _f(s.get("ma20")), "rsi14": _f(s.get("rsi14"), 1),
        "high20": _f(s.get("high20")), "atr14": _f(s.get("atr14")), "atr_pct": _f(s.get("atr_pct"), 4),
        "momentum_score": _f(s.get("momentum_score"), 1), "volume": _f(s.get("Volume"), 0),
        "break_high20": bool(s.get("break_high20")), "break_prev_high": bool(s.get("break_prev_high")),
        "score_breakdown": {SCORE_ITEMS[k][0]: _f(s.get(k), 1) for k in SCORE_ITEMS} | {"減点": _f(s.get("penalty"), 1)},
    })
    if not holding:
        a["decision_note"] = "※JDIは現在保有していません（参考判定）"
    return a


def build_ranking(table: pd.DataFrame, budget: float, research: bool, held_code: str | None = None,
                  top_n: int = 10) -> list[dict]:
    rows = []
    t = table.dropna(subset=["momentum_score"])
    for i, (_, r) in enumerate(t.head(top_n).iterrows(), start=1):
        s = r.to_dict()
        judgement, _, _ = judge_candidate(s, bool(s["affordable"]))
        held = s["code"] == held_code
        rows.append({
            "rank": i, "code": s["code"], "name": s["name"], "price": _f(s["price"], 1),
            "change_pct": _f(s.get("change_pct"), 4), "volume_ratio": _f(s.get("volume_ratio")),
            "rsi14": _f(s.get("rsi14"), 1), "ma5": _f(s.get("ma5")), "ma20": _f(s.get("ma20")),
            "breakout": _breakout_label(s), "momentum_score": _f(s.get("momentum_score"), 1),
            "required_cash": _f(s["required_cash"], 0),
            "affordable_label": "保有中" if held else ("購入可能" if s["affordable"] else "購入不可"),
            "judgement": "保有中" if held else judgement,
        })
    return rows


def candidate_detail(s: dict, research: bool, budget: float, held_code: str | None = None) -> dict:
    """TOP3詳細"""
    entry = s["price"] + tick_size(s["price"]) * config.SLIPPAGE_TICKS
    lv = exit_levels(entry, s.get("atr14"))
    judgement, ok, risks = judge_candidate(s, bool(s["affordable"]))
    if s["code"] == held_code:
        judgement = "保有中"
        risks = [r for r in risks if r != "資金不足で購入不可"] + ["現在保有中の銘柄（保有判定はJDI/保有銘柄分析を参照）"]
    reasons = [f"{SCORE_ITEMS[k][0]} {s.get(k, 0):.0f}/{SCORE_ITEMS[k][1]}点"
               for k in SCORE_ITEMS if (s.get(k) or 0) >= SCORE_ITEMS[k][1] * 0.6]
    return {
        "code": s["code"], "name": s["name"], "price": _f(s["price"], 1),
        "required_cash": _f(s["required_cash"], 0),
        "affordable": bool(s["affordable"]),
        "affordability": "保有中" if s["code"] == held_code else (f"購入可能（資金 {budget:,.0f}円）" if s["affordable"]
                          else f"購入不可（必要 {s['required_cash']:,.0f}円 > 資金 {budget:,.0f}円）"),
        "entry_price": _f(entry, 1), "stop_fixed": lv["stop_fixed"], "stop_atr": lv["stop_atr"],
        "stop_used": lv["stop_used"], "stop_basis": lv["stop_basis"],
        "take_profit": lv["tp_fixed"], "tp_atr": lv["tp_atr"],
        "atr14": _f(s.get("atr14")), "atr_pct": _f(s.get("atr_pct"), 4),
        "risk_reward": lv["risk_reward"], "volume_ratio": _f(s.get("volume_ratio")),
        "momentum_score": _f(s.get("momentum_score"), 1), "change_pct": _f(s.get("change_pct"), 4),
        "judgement": judgement,
        "selection_reasons": reasons + [f"条件クリア: {m}" for m in ok],
        "risk_factors": risks or ["特記事項なし（ただしリスクがないという意味ではありません）"],
    }


def switch_comparison(held: dict | None, candidates: list[dict], bucket_stats: dict | None) -> list[dict]:
    """保有銘柄 vs 候補の比較（期待値は過去データの参考値。将来を保証しない）"""
    if not held:
        return []
    out = []
    held_score = held.get("momentum_score") or 0
    held_b = bucket_of(held_score)
    for c in candidates:
        diff = (c["momentum_score"] or 0) - held_score
        # 乗換コスト = 保有株の売りスリッページ + 候補の買いスリッページ（価格比）
        cost = (tick_size(held["price"]) / held["price"] + tick_size(c["price"]) / c["price"]) * config.SLIPPAGE_TICKS
        ev = None
        if bucket_stats:
            hb, cb = bucket_stats.get(held_b or ""), bucket_stats.get(bucket_of(c["momentum_score"]) or "")
            if hb and cb and hb.get("n", 0) >= 30 and cb.get("n", 0) >= 30:
                ev = round(cb["mean_fwd"] - hb["mean_fwd"] - cost, 4)
        is_switch = diff >= config.SWITCH_SCORE_MARGIN and c["affordable"] and c["judgement"] == "BUY"
        out.append({
            "code": c["code"], "name": c["name"], "score": c["momentum_score"], "score_diff": round(diff, 1),
            "switch_cost_pct": round(cost, 4), "ev_diff_reference": ev, "affordable": c["affordable"],
            "judgement": c["judgement"],
            "label": "乗換候補" if is_switch else ("監視" if diff >= config.SWITCH_SCORE_MARGIN else "保有継続優位/差なし"),
        })
    return out


def final_decision(jdi: dict, held: dict | None, ranking: list[dict], buyable: list[dict],
                   switch: list[dict], budget: float) -> dict:
    top = ranking[0] if ranking else None
    buy_cands = [c for c in buyable if c["judgement"] == "BUY"]
    switch_cands = [s for s in switch if s["label"] == "乗換候補"]
    held_decision = held["decision"] if held else None

    if held is None:
        if buy_cands:
            action = f"現金保有中 → {buy_cands[0]['code']} {buy_cands[0]['name']} がBUY条件を満たす（翌寄付き前に再確認）"
        else:
            action = "WAIT：本日は取引候補なし（現金のまま待機）"
    elif held_decision == "SELL":
        if buy_cands:
            action = f"{held['name']}売却後に {buy_cands[0]['code']} {buy_cands[0]['name']} を監視"
        else:
            action = f"{held['name']}売却（現金化）→ 本日は取引候補なし WAIT"
    elif switch_cands:
        s = switch_cands[0]
        action = f"{held['name']}継続（ただし {s['code']} {s['name']} を乗換候補として監視）"
    else:
        action = f"{held['name']}継続" if held_decision == "HOLD" else f"{held['name']}継続（WATCH：損切りラインを監視）"
    if not buy_cands and "WAIT" not in action:
        action += " ／ 新規BUY候補なし"

    return {
        "jdi_decision": jdi.get("decision", "WATCH"),
        "jdi_reasons": jdi.get("reasons", [jdi.get("message", "")]),
        "top1": top,
        "top1_affordable": bool(top and top["affordable_label"] in ("購入可能", "保有中")),
        "budget": round(budget, 1),
        "action": action,
        "no_trade": not buy_cands,
    }


def build_analysis(scan_res, portfolio, research: bool) -> dict:
    table = scan_res.table
    prices = dict(zip(table["code"], table["price"])) if not table.empty else {}
    portfolio.update_peak(prices)
    budget = portfolio.cash + portfolio.position_value(prices)   # 保有株を売った場合の利用可能資金
    jdi = jdi_analysis(table, portfolio)

    held = None
    if portfolio.position:
        prow = table[table["code"] == portfolio.position["code"]]
        if not prow.empty:
            s = prow.iloc[0].to_dict()
            held = analyze_position(s, portfolio.position)
            held["momentum_score"] = _f(s.get("momentum_score"), 1)

    held_code = portfolio.position["code"] if portfolio.position else None
    ranking = build_ranking(table, budget, research, held_code)
    snaps = {r["code"]: r for r in table.to_dict("records")}
    top3 = [candidate_detail(snaps[r["code"]], research, budget, held_code) for r in ranking[:3]]

    buyable_rows = table[(table["affordable"]) & (table["code"] != held_code)].dropna(subset=["momentum_score"])
    buyable = [candidate_detail(s, research, budget) for s in buyable_rows.head(5).to_dict("records")]
    bucket_stats = load_score_bucket_stats()
    switch = switch_comparison(held, buyable, bucket_stats)
    fd = final_decision(jdi, held, ranking, buyable, switch, budget)

    return {
        "date": scan_res.latest_date,
        "source": scan_res.source,
        "fetched_at": scan_res.fetched_at,
        "is_realtime": False,
        "delay_notice": config.DELAY_NOTICE,
        "mode": "RESEARCH" if research else "REALISTIC",
        "lot_size": config.lot_size(research),
        "budget": round(budget, 1),
        "max_affordable_price": round(risk_manager.max_affordable_price(budget, research), 2),
        "universe_size": scan_res.universe_size,
        "scanned": int(len(table)),
        "excluded": int(len(scan_res.excluded)),
        "failed": len(scan_res.failed),
        "jdi": jdi,
        "held": held,
        "ranking": ranking,
        "top3": top3,
        "buyable": buyable,
        "switch": switch,
        "bucket_stats_available": bucket_stats is not None,
        "final": fd,
        "portfolio": portfolio.status(prices),
        "prices": {k: float(v) for k, v in prices.items() if k in {held_code, config.JDI_CODE}
                   | {c["code"] for c in buyable} | {r["code"] for r in ranking}},
    }
