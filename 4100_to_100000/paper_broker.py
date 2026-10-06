"""
仮想ブローカー（ペーパートレード専用）

!!! このモジュールは証券会社に一切接続しません !!!
- 実注文・自動ログイン・ブラウザ操作・認証情報の保存は実装していません
- 約定は「取得した遅延データの価格 ± スリッページ」で仮想的に計算するだけです
"""
from __future__ import annotations

import config
import report
import risk_manager
from data_provider import now_jst
from indicators import tick_size


class PaperBroker:
    def __init__(self, portfolio, research: bool = False):
        config.verify_safety()
        if not config.PAPER_TRADE:  # 二重チェック
            raise RuntimeError("PAPER_TRADE=False では動作しません")
        self.pf = portfolio
        self.research = research

    def _log(self, side: str, code: str, name: str, shares: int, price: float, reason: str,
             pnl: float | None = None) -> dict:
        rec = {
            "timestamp": now_jst().isoformat(timespec="seconds"),
            "mode": "RESEARCH" if self.research else "REALISTIC",
            "paper_trade": True,
            "side": side,
            "code": code,
            "name": name,
            "shares": shares,
            "price": round(price, 2),
            "amount": round(price * shares, 1),
            "commission": config.COMMISSION_YEN,
            "realized_pnl": None if pnl is None else round(pnl, 1),
            "cash_after": round(self.pf.cash, 1),
            "reason": reason,
        }
        self.pf.trades.append(rec)
        report.append_csv("trade_log.csv", [rec])
        return rec

    def buy(self, code: str, name: str, ref_price: float, reason: str, shares: int | None = None) -> dict:
        """仮想買付。ref_price に不利側スリッページを加えて約定とみなす。"""
        fill = ref_price + tick_size(ref_price) * config.SLIPPAGE_TICKS
        if shares is None:
            shares = risk_manager.max_shares(fill, self.pf.cash, self.research)
        ok, why = risk_manager.check_buy(self.pf, code, fill, shares, self.research)
        if not ok:
            raise ValueError(f"[仮想買付不可] {why}")
        self.pf.cash -= fill * shares + config.COMMISSION_YEN
        self.pf.position = {"code": code, "name": name, "shares": shares, "cost_price": fill,
                            "entry_date": now_jst().strftime("%Y-%m-%d"), "peak_price": fill}
        rec = self._log("BUY", code, name, shares, fill, reason)
        self.pf.save()
        return rec

    def sell(self, ref_price: float, reason: str) -> dict:
        """仮想売却（保有全株）。ref_price に不利側スリッページを加えて約定とみなす。"""
        pos = self.pf.position
        if pos is None:
            raise ValueError("[仮想売却不可] 保有銘柄がありません")
        ok, why = risk_manager.check_sell(self.pf, pos["code"], pos["shares"])
        if not ok:
            raise ValueError(f"[仮想売却不可] {why}")
        fill = max(ref_price - tick_size(ref_price) * config.SLIPPAGE_TICKS, 1)
        proceeds = fill * pos["shares"] - config.COMMISSION_YEN
        pnl = (fill - pos["cost_price"]) * pos["shares"] - config.COMMISSION_YEN
        self.pf.cash += proceeds
        self.pf.position = None
        rec = self._log("SELL", pos["code"], pos["name"], pos["shares"], fill, reason, pnl)
        self.pf.save()
        return rec
