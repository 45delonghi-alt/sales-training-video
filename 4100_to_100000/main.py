"""
4100_TO_100000_CHALLENGE メインプログラム（ペーパートレード専用）

使い方（Windows の場合は python、Mac/Linux は python3）:
  python main.py                   … 本日の分析（JDI判定 → ランキング → TOP3 → 最終判断）
  python main.py analyze --quick   … 監視リストだけで素早く分析
  python main.py paper-auto        … 分析し、ルール通りに「仮想」売買を実行
  python main.py paper-sell        … 保有銘柄を仮想売却
  python main.py paper-buy 1234    … 指定銘柄を仮想買付（資金内・100株単位のみ）
  python main.py close-day         … 大引け後に当日の資産を DAY1〜DAY5 として記録
  python main.py status            … 仮想資産と5営業日チャレンジの進捗
  python main.py backtest          … バックテスト + Monte Carlo
  python main.py reset             … 仮想ポートフォリオを初期状態（JDI 100株）に戻す
  共通オプション: --research（1株単位の研究モード） --no-cache（データ再取得）

※ 実際の証券口座への発注・自動ログイン・ID/パスワード保存は一切行いません。
"""
from __future__ import annotations

import argparse
import json
import sys

import config

if hasattr(sys.stdout, "reconfigure"):  # Windowsのコンソールで日本語を崩さない
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass

import backtest  # noqa: E402
import data_provider  # noqa: E402
import ranking  # noqa: E402
import report  # noqa: E402
import risk_manager  # noqa: E402
from paper_broker import PaperBroker  # noqa: E402
from portfolio import Portfolio  # noqa: E402
from scanner import scan  # noqa: E402


def is_research(args) -> bool:
    return bool(getattr(args, "research", False) or config.RESEARCH_MODE)


def run_analysis(research: bool, quick: bool = False, use_cache: bool = True, save: bool = True,
                 provider=None, universe=None) -> tuple[dict, Portfolio]:
    """分析の本体（dashboard からも呼ばれる）。売買はしない。"""
    config.verify_safety()
    config.ensure_dirs()
    pf = Portfolio.load(research)
    label = "指定ユニバース"
    if universe is None:
        universe = data_provider.load_universe("watchlist" if quick else None)
        label = "監視リスト" if quick else config.UNIVERSE
    print(f"分析対象: {len(universe)}銘柄（{label}）")
    prev_prices = {}
    if config.LATEST_ANALYSIS_FILE.exists():
        prev_prices = json.loads(config.LATEST_ANALYSIS_FILE.read_text(encoding="utf-8")).get("prices", {})
    budget_guess = pf.cash + pf.position_value(prev_prices)
    res = scan(universe, budget_guess, research, use_cache=use_cache, provider=provider)
    # 正確な資金（最新価格）で購入可否を再計算
    prices = dict(zip(res.table["code"], res.table["price"]))
    budget = pf.cash + pf.position_value(prices)
    res.table["affordable"] = res.table["price"].apply(lambda p: risk_manager.is_affordable(p, budget, research))
    a = ranking.build_analysis(res, pf, research)
    pf.save()
    if save:
        config.LATEST_ANALYSIS_FILE.write_text(json.dumps(a, ensure_ascii=False, indent=1, default=str),
                                               encoding="utf-8")
        report.save_logs(a)
        a["report_path"] = report.write_daily_report(a, pf.days)
    return a, pf


def cmd_analyze(args) -> dict:
    research = is_research(args)
    report.print_header(research)
    a, pf = run_analysis(research, quick=args.quick, use_cache=not args.no_cache)
    report.print_analysis(a)
    report.print_portfolio(a["portfolio"])
    print()
    report.print_final(a)
    print(f"\nレポート: {a.get('report_path')}")
    print(f"ログ    : {config.LOG_DIR}")
    return a


def cmd_paper_auto(args) -> None:
    """ルール通りに仮想売買（保有銘柄がSELL判定なら売却、ノーポジでBUY候補があれば買付）"""
    research = is_research(args)
    a = cmd_analyze(args)
    pf = Portfolio.load(research)
    broker = PaperBroker(pf, research)
    print("\n■ 仮想売買（PAPER TRADE）")
    held = a["held"]
    if held and held["decision"] == "SELL":
        rec = broker.sell(held["price"], "ルール判定SELL: " + " / ".join(held["reasons"]))
        print(f"  仮想売却: {rec['code']} {rec['shares']}株 @ {rec['price']}円 損益 {rec['realized_pnl']:+,.0f}円")
    elif held:
        print(f"  保有継続: {held['code']}（{held['decision']}）")
    if pf.position is None:
        cands = [c for c in a["buyable"] if c["judgement"] == "BUY"
                 and risk_manager.is_affordable(c["price"], pf.cash, research)]
        if cands:
            c = cands[0]
            try:
                rec = broker.buy(c["code"], c["name"], c["price"], f"ルール判定BUY Score {c['momentum_score']}")
                print(f"  仮想買付: {rec['code']} {rec['name']} {rec['shares']}株 @ {rec['price']}円"
                      f"（損切 {c['stop_used']}円 / 利確 {c['take_profit']}円）")
            except ValueError as e:
                print(f"  {e}")
        else:
            print("  WAIT: 条件を満たす購入可能な銘柄なし（現金で待機）")
    print("  ※ 価格は遅延データ。実際の約定価格とは異なります。")


def _latest_prices() -> dict:
    if not config.LATEST_ANALYSIS_FILE.exists():
        sys.exit("先に python main.py で分析を実行してください")
    return json.loads(config.LATEST_ANALYSIS_FILE.read_text(encoding="utf-8")).get("prices", {})


def cmd_paper_sell(args) -> None:
    research = is_research(args)
    pf = Portfolio.load(research)
    if pf.position is None:
        sys.exit("保有銘柄がありません")
    prices = _latest_prices()
    code = pf.position["code"]
    if code not in prices:
        sys.exit(f"{code} の最新価格がありません。先に python main.py を実行してください")
    rec = PaperBroker(pf, research).sell(prices[code], "手動・仮想売却")
    print(f"仮想売却: {rec['code']} {rec['shares']}株 @ {rec['price']}円 損益 {rec['realized_pnl']:+,.0f}円 / 現金 {pf.cash:,.0f}円")


def cmd_paper_buy(args) -> None:
    research = is_research(args)
    pf = Portfolio.load(research)
    a = json.loads(config.LATEST_ANALYSIS_FILE.read_text(encoding="utf-8")) if config.LATEST_ANALYSIS_FILE.exists() else {}
    prices = a.get("prices", {})
    if args.code not in prices:
        sys.exit(f"{args.code} の最新価格がありません（ランキング上位・購入可能候補のみ対応）。先に python main.py を実行してください")
    names = {r["code"]: r["name"] for r in a.get("ranking", []) + a.get("buyable", [])}
    try:
        rec = PaperBroker(pf, research).buy(args.code, names.get(args.code, args.code), prices[args.code], "手動・仮想買付")
        print(f"仮想買付: {rec['code']} {rec['shares']}株 @ {rec['price']}円 / 現金 {pf.cash:,.0f}円")
    except ValueError as e:
        sys.exit(str(e))


def cmd_close_day(args) -> None:
    """大引け後に実行。保有銘柄の最新終値で当日の資産を DAY1〜DAY5 として記録する。"""
    research = is_research(args)
    config.verify_safety()
    pf = Portfolio.load(research)
    codes = [config.JDI_CODE] + ([pf.position["code"]] if pf.position else [])
    fetch = data_provider.fetch_daily(list(dict.fromkeys(codes)), period="1mo", use_cache=False)
    if pf.position and pf.position["code"] not in fetch.frames:
        sys.exit(f"{pf.position['code']} の価格を取得できないため記録できません（架空の価格では記録しません）")
    prices = {c: float(df["Close"].iloc[-1]) for c, df in fetch.frames.items()}
    date = max(df.index[-1] for df in fetch.frames.values()).strftime("%Y-%m-%d")
    session = data_provider.market_session_label()
    if "場中" in session or "寄付前" in session:
        print(f"⚠ 現在は「{session}」です。終値確定後（15:30以降）の実行を推奨します。")
    pf.update_peak(prices)
    try:
        rec = pf.record_day(date, prices)
    except ValueError as e:
        sys.exit(str(e))
    report.append_csv("portfolio_log.csv", [{"date": date, "fetched_at": fetch.fetched_at, "cash": pf.cash,
                                             "position": pf.position["code"] if pf.position else "",
                                             "shares": pf.position["shares"] if pf.position else 0,
                                             "position_value": pf.position_value(prices),
                                             "total_asset": rec["end_asset"], "progress_pct": rec["end_asset"] / config.TARGET_ASSET,
                                             "required_multiple": rec["required_multiple"],
                                             "days_done": pf.days_done, "days_left": pf.days_left, "event": rec["day"]}])
    print(f"{rec['day']}（{rec['date']}）を記録しました")
    print(f"  開始資産 {rec['start_asset']:,.0f}円 → 終了資産 {rec['end_asset']:,.0f}円（前日比 {rec['day_change_pct']:+.2%}）")
    print(f"  累積 {rec['cumulative_pct']:+.2%} / 10万円まで残り {rec['remaining_to_target']:,.0f}円 / "
          f"必要倍率 {rec['required_multiple']}倍 / 残り営業日 {rec['days_left']}日")


def cmd_status(args) -> None:
    pf = Portfolio.load(is_research(args))
    prices = _latest_prices() if config.LATEST_ANALYSIS_FILE.exists() else {}
    report.print_header(is_research(args))
    report.print_portfolio(pf.status(prices))
    print()
    for d in pf.days:
        print(f"{d['day']} {d['date']}: {d['start_asset']:,.0f}円 → {d['end_asset']:,.0f}円 "
              f"（前日比 {d['day_change_pct']:+.2%} / 累積 {d['cumulative_pct']:+.2%} / 残り {d['remaining_to_target']:,.0f}円 / "
              f"必要倍率 {d['required_multiple']}倍 / 残り {d['days_left']}日）")
    for w in risk_manager.challenge_warnings(pf.total_value(prices), pf.days_left):
        print("⚠ " + w)


def cmd_backtest(args) -> None:
    research = is_research(args)
    config.verify_safety()
    report.print_header(research)
    uni = data_provider.load_universe("watchlist" if args.quick else None)
    if config.BACKTEST_MAX_SYMBOLS:
        uni = uni.head(config.BACKTEST_MAX_SYMBOLS)
    print(f"バックテスト対象: {len(uni)}銘柄 / 期間 {config.BACKTEST_PERIOD}")
    fetch = data_provider.fetch_daily(list(uni["code"]), period=config.BACKTEST_PERIOD, use_cache=not args.no_cache)
    if not fetch.frames:
        sys.exit("価格データを取得できませんでした（架空データでのバックテストは行いません）")
    from indicators import add_indicators
    from strategy import score_frame
    frames = {c: score_frame(add_indicators(df)) for c, df in fetch.frames.items()
              if len(df) >= config.MIN_HISTORY_DAYS}
    names = dict(zip(uni["code"], uni["name"]))
    bt = backtest.run_backtest(frames, names, research)
    mc = backtest.monte_carlo(bt)
    backtest.save_results(bt, mc)
    backtest.print_results(bt, mc)
    print(f"\n取引明細: {config.BACKTEST_TRADES_FILE}")


def cmd_reset(args) -> None:
    ans = "y" if args.yes else input("仮想ポートフォリオを初期状態（JDI 100株）に戻します。よろしいですか？ [y/N]: ")
    if ans.strip().lower() != "y":
        print("中止しました")
        return
    Portfolio.initial(is_research(args)).save()
    print("リセットしました（ログCSVは残っています）")


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(description="4100→100000 5 DAYS CHALLENGE（ペーパートレード専用）")
    parser.add_argument("--research", action="store_true", help="RESEARCH_MODE（1株単位の仮想売買）")
    parser.add_argument("--no-cache", action="store_true", help="キャッシュを使わず再取得")
    parser.add_argument("--quick", action="store_true", help="監視リストのみで分析")
    sub = parser.add_subparsers(dest="cmd")
    for name in ("analyze", "paper-auto", "paper-sell", "close-day", "status", "backtest"):
        sub.add_parser(name)
    pb = sub.add_parser("paper-buy")
    pb.add_argument("code")
    rs = sub.add_parser("reset")
    rs.add_argument("-y", "--yes", action="store_true")
    # サブコマンドの後ろにオプションを書いても効くようにする
    for sp in sub.choices.values():
        sp.add_argument("--research", action="store_true", default=argparse.SUPPRESS)
        sp.add_argument("--no-cache", action="store_true", default=argparse.SUPPRESS)
        sp.add_argument("--quick", action="store_true", default=argparse.SUPPRESS)
    args = parser.parse_args(argv)
    {
        None: cmd_analyze, "analyze": cmd_analyze, "paper-auto": cmd_paper_auto, "paper-sell": cmd_paper_sell,
        "paper-buy": cmd_paper_buy, "close-day": cmd_close_day, "status": cmd_status,
        "backtest": cmd_backtest, "reset": cmd_reset,
    }[args.cmd](args)


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as e:
        sys.exit(f"[ERROR] {e}")
