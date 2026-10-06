"""
動作確認用スモークテスト（プログラムの配線確認専用）

!!! ここで使う価格は「テスト用に乱数で作った合成データ」です !!!
- 一時フォルダで実行し、本番の data/ logs/ reports/ には一切書き込みません
- 分析結果としての意味はありません（本番の分析は必ず実データを取得し、失敗時は架空データを使いません）

実行: python tests/smoke_test.py
"""
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import config  # noqa: E402


def patch_paths(tmp: Path) -> None:
    config.DATA_DIR = tmp / "data"
    config.LOG_DIR = tmp / "logs"
    config.REPORT_DIR = tmp / "reports"
    config.CACHE_DIR = config.DATA_DIR / "cache"
    config.MANUAL_DATA_DIR = config.DATA_DIR / "manual"
    config.STATE_FILE = config.DATA_DIR / "portfolio_state.json"
    config.LATEST_ANALYSIS_FILE = config.DATA_DIR / "latest_analysis.json"
    config.LATEST_BACKTEST_FILE = config.DATA_DIR / "latest_backtest.json"
    config.BACKTEST_TRADES_FILE = config.REPORT_DIR / "backtest_trades.csv"


def synthetic_frame(rng, start_price: float, n: int = 250) -> pd.DataFrame:
    idx = pd.bdate_range(end=pd.Timestamp("2026-10-05"), periods=n)
    rets = rng.normal(0.001, 0.035, n)
    rets[rng.random(n) < 0.03] += 0.12  # ときどき急騰
    close = np.maximum(start_price * np.cumprod(1 + rets), 2).round()
    open_ = np.maximum((close / (1 + rng.normal(0, 0.01, n))).round(), 1)
    high = np.maximum(open_, close) * (1 + rng.random(n) * 0.03)
    low = np.minimum(open_, close) * (1 - rng.random(n) * 0.03)
    vol = (rng.lognormal(13, 0.6, n) * (1 + 4 * (rets > 0.08))).round()
    return pd.DataFrame({"Open": open_, "High": high.round(), "Low": low.round(), "Close": close, "Volume": vol},
                        index=idx)


class SyntheticProvider:
    """テスト専用（合成データ）"""
    name = "SYNTHETIC TEST DATA（テスト専用・実データではない）"

    def __init__(self, seed=0):
        self.rng = np.random.default_rng(seed)

    def get_daily(self, codes, period):
        import data_provider
        res = data_provider.FetchResult(source=self.name, fetched_at="TEST")
        for i, c in enumerate(codes):
            if c == "9999":
                res.failed.append(c)  # 取得失敗のシミュレーション
                continue
            price = 41 if c == config.JDI_CODE else [25, 35, 39, 120, 800, 2500][i % 6]
            res.frames[c] = synthetic_frame(self.rng, price)
        return res


def main():
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        patch_paths(tmp)
        import backtest
        import main as app
        from paper_broker import PaperBroker
        from portfolio import Portfolio

        codes = [config.JDI_CODE] + [f"{1000 + i}" for i in range(29)] + ["9999"]
        uni = pd.DataFrame({"code": codes, "name": [f"TEST{c}" for c in codes], "market": ""})
        prov = SyntheticProvider()

        # 1) 分析（REALISTIC）
        a, pf = app.run_analysis(False, provider=prov, universe=uni, use_cache=False)
        assert a["jdi"]["decision"] in ("HOLD", "SELL", "WATCH"), a["jdi"]
        assert len(a["ranking"]) <= 10 and len(a["top3"]) <= 3
        assert a["failed"] == 1
        for r in a["ranking"]:
            assert r["affordable_label"] in ("購入可能", "購入不可", "保有中")
        import report
        report.print_analysis(a)
        report.print_final(a)

        # 2) 仮想売買：ナンピン禁止・資金超過禁止・空売り禁止
        broker = PaperBroker(pf, research=False)
        try:
            broker.buy(config.JDI_CODE, "JDI", 41, "test")
            raise AssertionError("ナンピンが通ってしまった")
        except ValueError as e:
            print("OK ナンピン拒否:", e)
        rec = broker.sell(a["prices"][config.JDI_CODE], "test sell")
        print("OK 仮想売却:", rec["price"], rec["realized_pnl"])
        try:
            broker.buy("1003", "TEST", 5000, "test")
            raise AssertionError("資金超過の買付が通ってしまった")
        except ValueError as e:
            print("OK 資金超過拒否:", e)
        try:
            broker.sell(10, "test")
            raise AssertionError("空売りが通ってしまった")
        except ValueError as e:
            print("OK 空売り拒否:", e)

        # 3) 5営業日記録
        pf2 = Portfolio.load()
        for i, d in enumerate(["2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06", "2026-10-07"]):
            rec = pf2.record_day(d, {})
        assert rec["day"] == "DAY5" and rec["days_left"] == 0
        try:
            pf2.record_day("2026-10-08", {})
            raise AssertionError("6日目が記録できてしまった")
        except ValueError:
            print("OK 6日目は拒否")

        # 4) バックテスト + Monte Carlo（REALISTIC / RESEARCH）
        from indicators import add_indicators
        from strategy import score_frame
        for research in (False, True):
            fr = prov.get_daily(codes, "1y").frames
            frames = {c: score_frame(add_indicators(df)) for c, df in fr.items()}
            bt = backtest.run_backtest(frames, {}, research)
            mc = backtest.monte_carlo(bt)
            backtest.save_results(bt, mc)
            backtest.print_results(bt, mc)
            assert bt["initial"] == 4100

        # 5) RESEARCH モード分析（バックテストの期待値参考値込み）
        Portfolio.initial(True).save()
        a2, _ = app.run_analysis(True, provider=prov, universe=uni, use_cache=False)
        assert a2["mode"] == "RESEARCH" and a2["lot_size"] == 1
        print("switch:", a2["switch"][:2])
        for f in ("trade_log.csv", "signal_log.csv", "portfolio_log.csv", "daily_ranking.csv", "JDI_analysis.csv"):
            assert (config.LOG_DIR / f).exists(), f
        assert list(config.REPORT_DIR.glob("*_report.md"))
        print("\nALL SMOKE TESTS PASSED（合成データによる配線確認のみ）")


if __name__ == "__main__":
    main()
