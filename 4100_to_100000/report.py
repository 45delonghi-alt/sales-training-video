"""
ログ保存（CSV）・日次レポート（Markdown）・コンソール表示
CSVは Excel で文字化けしないよう UTF-8(BOM付き) で保存する。
"""
from __future__ import annotations

import pandas as pd

import config


def append_csv(filename: str, rows: list[dict]) -> None:
    if not rows:
        return
    config.ensure_dirs()
    path = config.LOG_DIR / filename
    df = pd.DataFrame(rows)
    if path.exists():
        old_cols = list(pd.read_csv(path, nrows=0, encoding="utf-8-sig").columns)
        if old_cols != list(df.columns):   # 列構成が変わったら結合し直す
            old = pd.read_csv(path, encoding="utf-8-sig")
            pd.concat([old, df], ignore_index=True).to_csv(path, index=False, encoding="utf-8-sig")
            return
        df.to_csv(path, mode="a", header=False, index=False, encoding="utf-8-sig")
    else:
        df.to_csv(path, index=False, encoding="utf-8-sig")


def yen(x) -> str:
    return "-" if x is None else f"{x:,.0f}円"


def pct(x, signed=True) -> str:
    if x is None:
        return "-"
    return f"{x:+.2%}" if signed else f"{x:.2%}"


def num(x, nd=1) -> str:
    return "-" if x is None else f"{x:,.{nd}f}"


# ============================================================
# CSVログ
# ============================================================
def save_logs(a: dict) -> None:
    ts = a["fetched_at"]
    rank_rows = [{"date": a["date"], "fetched_at": ts, "mode": a["mode"], **r} for r in a["ranking"]]
    append_csv("daily_ranking.csv", rank_rows)

    j = a["jdi"]
    if j.get("available"):
        append_csv("JDI_analysis.csv", [{
            "date": a["date"], "fetched_at": ts, "price": j["price"], "market_value": j["market_value"],
            "unrealized_yen": j["unrealized_yen"], "unrealized_pct": j["unrealized_pct"],
            "change_pct": j["change_pct"], "volume_ratio": j["volume_ratio"], "ma5": j["ma5"], "ma20": j["ma20"],
            "rsi14": j["rsi14"], "high20": j["high20"], "atr14": j["atr14"],
            "momentum_score": j["momentum_score"], "decision": j["decision"], "reasons": " / ".join(j["reasons"]),
        }])

    sig = [{"date": a["date"], "fetched_at": ts, "type": "TOP3", "code": c["code"], "name": c["name"],
            "price": c["price"], "score": c["momentum_score"], "signal": c["judgement"],
            "affordable": c["affordable"], "stop": c["stop_used"], "take_profit": c["take_profit"]}
           for c in a["top3"]]
    sig += [{"date": a["date"], "fetched_at": ts, "type": "BUYABLE", "code": c["code"], "name": c["name"],
             "price": c["price"], "score": c["momentum_score"], "signal": c["judgement"],
             "affordable": c["affordable"], "stop": c["stop_used"], "take_profit": c["take_profit"]}
            for c in a["buyable"]]
    sig.append({"date": a["date"], "fetched_at": ts, "type": "FINAL", "code": "", "name": "",
                "price": None, "score": None, "signal": a["final"]["jdi_decision"], "affordable": None,
                "stop": None, "take_profit": None, "action": a["final"]["action"]})
    append_csv("signal_log.csv", sig)

    p = a["portfolio"]
    append_csv("portfolio_log.csv", [{
        "date": a["date"], "fetched_at": ts, "cash": p["cash"],
        "position": p["position"]["code"] if p["position"] else "",
        "shares": p["position"]["shares"] if p["position"] else 0,
        "position_value": p["position_value"], "total_asset": p["total_asset"],
        "progress_pct": p["progress_pct"], "required_multiple": p["required_multiple"],
        "days_done": p["days_done"], "days_left": p["days_left"],
    }])


# ============================================================
# コンソール表示
# ============================================================
LINE = "=" * 64


def print_header(research: bool) -> None:
    print(LINE)
    print("  4,100円 → 100,000円  5 DAYS CHALLENGE  (PAPER TRADE ONLY)")
    print(LINE)
    print("【リスク警告】" + config.RISK_WARNING)
    if research:
        print(config.RESEARCH_MODE_WARNING)
    print(config.NOT_ADVICE)
    print()


def print_analysis(a: dict) -> None:
    print(f"データ: {a['source']} / 取得 {a['fetched_at']} / 最新日 {a['date']}")
    print(f"⚠ {a['delay_notice']}")
    print(f"モード: {a['mode']}（売買単位 {a['lot_size']}株） / 分析 {a['scanned']}銘柄 "
          f"（除外 {a['excluded']} / 取得失敗 {a['failed']} / 対象 {a['universe_size']}）")
    print(f"利用可能資金（保有株を売った場合）: {yen(a['budget'])} → 購入可能な株価上限: {a['max_affordable_price']:,.1f}円")
    print()

    j = a["jdi"]
    print(LINE)
    print("■ JDI（6740 ジャパンディスプレイ）分析")
    print(LINE)
    if not j.get("available"):
        print(j["message"])
    else:
        print(f"現在値        : {num(j['price'])}円（{j['date']}）")
        print(f"保有100株評価 : {yen(j['market_value'])}")
        print(f"含み損益      : {j['unrealized_yen']:+,.0f}円（{pct(j['unrealized_pct'])}）※取得単価 {j['cost_price']}円で計算")
        print(f"前日比        : {pct(j['change_pct'])}")
        print(f"出来高増加率  : {num(j['volume_ratio'], 2)}倍")
        print(f"MA5 / MA20    : {num(j['ma5'], 2)} / {num(j['ma20'], 2)}")
        print(f"RSI14         : {num(j['rsi14'])}")
        print(f"20日高値      : {num(j['high20'])}円")
        print(f"ATR14         : {num(j['atr14'], 2)}円（{pct(j['atr_pct'], False)}）")
        print(f"Momentum Score: {num(j['momentum_score'])}/100")
        print(f"損切りライン  : {j['stop_used']}円（{j['stop_basis']}） / 利確ライン {j['take_profit']}円")
        print(f"判定          : 【{j['decision']}】 " + " / ".join(j["reasons"]))
        if j.get("decision_note"):
            print(j["decision_note"])
    print()

    print(LINE)
    print("■ 本日のランキング TOP10（スコア順・研究モデル）")
    print(LINE)
    if a["ranking"]:
        df = pd.DataFrame(a["ranking"])
        df["change_pct"] = df["change_pct"].map(lambda x: pct(x))
        df["price"] = df["price"].map(lambda x: num(x))
        df["required_cash"] = df["required_cash"].map(yen)
        print(df.rename(columns={
            "rank": "順位", "code": "コード", "name": "銘柄名", "price": "株価", "change_pct": "前日比",
            "volume_ratio": "出来高倍率", "rsi14": "RSI", "ma5": "MA5", "ma20": "MA20", "breakout": "高値ブレイク",
            "momentum_score": "Score", "required_cash": "100株必要金額", "affordable_label": "購入可否",
            "judgement": "判定"}).to_string(index=False))
    else:
        print("ランキング対象なし")
    print()

    print(LINE)
    print("■ TOP3 詳細")
    print(LINE)
    for i, c in enumerate(a["top3"], 1):
        print(f"[{i}] {c['code']} {c['name']}  判定:【{c['judgement']}】")
        print(f"    現在値 {num(c['price'])}円 / 必要資金 {yen(c['required_cash'])} / {c['affordability']}")
        print(f"    エントリー候補 {num(c['entry_price'])}円 / 損切 {c['stop_used']}円（{c['stop_basis']}、固定 {c['stop_fixed']} / ATR {c['stop_atr']}）"
              f" / 利確 {c['take_profit']}円（ATR {c['tp_atr']}）")
        print(f"    ATR {num(c['atr14'], 2)}円 / RR {c['risk_reward']} / 出来高倍率 {num(c['volume_ratio'], 2)} / Score {num(c['momentum_score'])}")
        print("    選定理由: " + " / ".join(c["selection_reasons"]))
        print("    危険要因: " + " / ".join(c["risk_factors"]))
    print()

    print(LINE)
    print(f"■ {yen(a['budget'])}で購入可能な候補（{a['mode']}）")
    print(LINE)
    if a["buyable"]:
        for c in a["buyable"]:
            print(f"  {c['code']} {c['name']} {num(c['price'])}円 Score {num(c['momentum_score'])} 【{c['judgement']}】")
    else:
        print("  購入可能な銘柄なし（REALISTIC_MODE では 株価×100株 ≤ 資金 が必要）")
    if a["switch"]:
        print("\n  乗換比較（保有銘柄 vs 候補）※スコア差は値上がりを保証しません")
        for s in a["switch"]:
            ev = "期待値参考値: データ不足" if s["ev_diff_reference"] is None else f"期待値差(参考): {pct(s['ev_diff_reference'])}"
            print(f"   - {s['code']} {s['name']} スコア差 {s['score_diff']:+.0f} / 乗換コスト {pct(s['switch_cost_pct'], False)} / {ev} → {s['label']}")
    print()


def print_final(a: dict) -> None:
    f = a["final"]
    t = f["top1"]
    print(LINE)
    print("本日の判断")
    print(LINE)
    print(f"JDI：\n  【{f['jdi_decision']}】")
    print("理由：\n  " + " / ".join(f["jdi_reasons"]))
    if t:
        print(f"市場ランキング1位：\n  {t['code']}")
        print(f"銘柄名：\n  {t['name']}")
        print(f"現在値：\n  {num(t['price'])}円")
        print(f"Momentum Score：\n  {num(t['momentum_score'])}/100")
        print(f"現在の資金（{yen(f['budget'])}）で購入：\n  {'可能' if f['top1_affordable'] else '不可能'}"
              f"（{a['lot_size']}株の必要金額 {yen(t['required_cash'])}）")
    else:
        print("市場ランキング1位：該当なし")
    print(f"推奨行動（研究モデル上のシグナル）：\n  {f['action']}")
    if f["no_trade"]:
        print("  ※ 条件を満たす銘柄がないため、無理に売買しません（WAIT）")
    print(LINE)
    print(config.NOT_ADVICE)
    print(LINE)


def print_portfolio(p: dict) -> None:
    pos = p["position"]
    print(f"現在資産 {yen(p['total_asset'])} / 目標 {yen(p['target'])} / 達成率 {p['progress_pct']:.2%} / "
          f"残り {yen(p['remaining_to_target'])} / 必要倍率 {p['required_multiple']}倍 / 残り営業日 {p['days_left']}日")
    print(f"現金 {yen(p['cash'])} / ポジション: "
          + (f"{pos['code']} {pos['name']} {pos['shares']}株（取得 {pos['cost_price']}円）" if pos else "なし（現金）"))


# ============================================================
# 日次レポート（Markdown）
# ============================================================
def write_daily_report(a: dict, days: list[dict]) -> str:
    config.ensure_dirs()
    path = config.REPORT_DIR / f"{a['date']}_report.md"
    j, f, p = a["jdi"], a["final"], a["portfolio"]
    L = [f"# {a['date']} 日次レポート（4,100円 → 100,000円 5 DAYS CHALLENGE）", "",
         f"> **リスク警告**: {config.RISK_WARNING}", ">",
         f"> {config.NOT_ADVICE}", ">", f"> {a['delay_notice']}", ""]
    if a["mode"] == "RESEARCH":
        L += [f"> {config.RESEARCH_MODE_WARNING}", ""]

    L += ["## 1. 本日の市場", "",
          f"- データ取得元: {a['source']}（取得 {a['fetched_at']}、REALTIMEではない）",
          f"- 分析銘柄数: {a['scanned']}（除外 {a['excluded']} / 取得失敗 {a['failed']} / 対象 {a['universe_size']}）",
          f"- モード: {a['mode']}（売買単位 {a['lot_size']}株）",
          f"- 利用可能資金: {yen(a['budget'])} → 購入可能な株価上限 {a['max_affordable_price']:,.1f}円", ""]
    if a["ranking"]:
        sc = [r["momentum_score"] for r in a["ranking"]]
        L += [f"- 上位10銘柄のスコア: 最高 {max(sc)} / 最低 {min(sc)}",
              f"- BUY判定（購入可能）: {sum(1 for c in a['buyable'] if c['judgement'] == 'BUY')}銘柄", ""]

    L += ["## 2. JDI分析", ""]
    if j.get("available"):
        L += ["| 項目 | 値 |", "|---|---|",
              f"| 現在値 | {num(j['price'])}円 |", f"| 保有100株評価額 | {yen(j['market_value'])} |",
              f"| 含み損益 | {j['unrealized_yen']:+,.0f}円（{pct(j['unrealized_pct'])}） |",
              f"| 前日比 | {pct(j['change_pct'])} |", f"| 出来高増加率 | {num(j['volume_ratio'], 2)}倍 |",
              f"| MA5 / MA20 | {num(j['ma5'], 2)} / {num(j['ma20'], 2)} |", f"| RSI14 | {num(j['rsi14'])} |",
              f"| 20日高値 | {num(j['high20'])}円 |", f"| ATR14 | {num(j['atr14'], 2)}円 |",
              f"| Momentum Score | {num(j['momentum_score'])}/100 |",
              f"| 損切り / 利確 | {j['stop_used']}円（{j['stop_basis']}） / {j['take_profit']}円 |",
              f"| **判定** | **{j['decision']}** |", "",
              "理由: " + " / ".join(j["reasons"]), ""]
    else:
        L += [j.get("message", "データなし"), ""]

    L += ["## 3. TOP10", ""]
    if a["ranking"]:
        hdr = ["順位", "コード", "銘柄名", "株価", "前日比", "出来高倍率", "RSI", "MA5", "MA20", "高値ブレイク",
               "Score", "100株必要金額", "購入可否", "判定"]
        L += ["| " + " | ".join(hdr) + " |", "|" + "---|" * len(hdr)]
        for r in a["ranking"]:
            L.append(f"| {r['rank']} | {r['code']} | {r['name']} | {num(r['price'])} | {pct(r['change_pct'])} | "
                     f"{num(r['volume_ratio'], 2)} | {num(r['rsi14'])} | {num(r['ma5'], 2)} | {num(r['ma20'], 2)} | "
                     f"{r['breakout']} | {num(r['momentum_score'])} | {yen(r['required_cash'])} | "
                     f"{r['affordable_label']} | {r['judgement']} |")
    L.append("")

    L += ["## 4. TOP3", ""]
    for i, c in enumerate(a["top3"], 1):
        L += [f"### {i}. {c['code']} {c['name']} 【{c['judgement']}】", "",
              f"- 現在値 {num(c['price'])}円 / 100株必要資金 {yen(c['required_cash'])} / {c['affordability']}",
              f"- エントリー候補 {num(c['entry_price'])}円 / 損切 {c['stop_used']}円（{c['stop_basis']}） / 利確 {c['take_profit']}円",
              f"- ATR {num(c['atr14'], 2)}円 / リスクリワード {c['risk_reward']} / 出来高倍率 {num(c['volume_ratio'], 2)} / Score {num(c['momentum_score'])}",
              f"- 選定理由: {' / '.join(c['selection_reasons'])}",
              f"- 危険要因: {' / '.join(c['risk_factors'])}", ""]

    L += ["## 5. 売買シグナル（研究モデル）", "",
          f"- JDI: **{f['jdi_decision']}**",
          f"- 推奨行動（研究モデル上のシグナル・投資助言ではない）: **{f['action']}**"]
    if f["no_trade"]:
        L.append("- 本日は取引候補なし（WAIT）")
    for s in a["switch"]:
        ev = "データ不足" if s["ev_diff_reference"] is None else pct(s["ev_diff_reference"])
        L.append(f"- 乗換比較: {s['code']} {s['name']} スコア差 {s['score_diff']:+.0f} / 期待値差(参考) {ev} → {s['label']}")
    L.append("")

    L += ["## 6. 資産状況", "",
          f"- 現在資産: {yen(p['total_asset'])}（現金 {yen(p['cash'])} + 株式 {yen(p['position_value'])}）",
          f"- 目標: {yen(p['target'])} / 達成率 {p['progress_pct']:.2%} / 残り {yen(p['remaining_to_target'])}",
          f"- 必要残存倍率: {p['required_multiple']}倍 / 残り営業日: {p['days_left']}日", ""]
    if days:
        L += ["| DAY | 日付 | 開始資産 | 終了資産 | 前日比 | 累積 | 10万円まで | 必要倍率 | 残り日数 |",
              "|---|---|---|---|---|---|---|---|---|"]
        for d in days:
            L.append(f"| {d['day']} | {d['date']} | {yen(d['start_asset'])} | {yen(d['end_asset'])} | "
                     f"{pct(d['day_change_pct'])} | {pct(d['cumulative_pct'])} | {yen(d['remaining_to_target'])} | "
                     f"{d['required_multiple']}倍 | {d['days_left']} |")
        L.append("")

    L += ["## 7. リスク", ""]
    import risk_manager
    L += [f"- {w}" for w in risk_manager.challenge_warnings(p["total_asset"], p["days_left"])]
    for c in a["top3"]:
        L.append(f"- {c['code']}: {' / '.join(c['risk_factors'])}")
    L.append("")

    L += ["## 8. 翌営業日の注目候補", ""]
    watch = [c for c in a["buyable"] if c["judgement"] in ("BUY", "WATCH")]
    if watch:
        for c in watch:
            L.append(f"- {c['code']} {c['name']}（{c['judgement']}）: 前日高値・出来高倍率の継続を確認。"
                     f"エントリー候補 {num(c['entry_price'])}円 / 損切 {c['stop_used']}円")
    else:
        L.append("- 購入可能かつ条件に近い銘柄なし。無理に売買せず WAIT。")
    L.append("")
    path.write_text("\n".join(L), encoding="utf-8")
    return str(path)
