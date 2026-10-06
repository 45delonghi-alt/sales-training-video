"""
仮想ポートフォリオ（ペーパートレード専用）と 5営業日チャレンジの記録

状態は data/portfolio_state.json に保存。証券口座とは一切連携しない。
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field

import config


@dataclass
class Portfolio:
    cash: float = config.INITIAL_CASH
    position: dict | None = None          # {"code","name","shares","cost_price","entry_date","peak_price"}
    trades: list[dict] = field(default_factory=list)
    days: list[dict] = field(default_factory=list)   # DAY1〜DAY5 の記録
    challenge_start: str | None = None
    research_mode: bool = False

    # ---------------- 生成・保存 ----------------
    @classmethod
    def initial(cls, research: bool = False) -> "Portfolio":
        return cls(
            cash=config.INITIAL_CASH,
            position={
                "code": config.JDI_CODE,
                "name": config.JDI_NAME,
                "shares": config.JDI_SHARES,
                "cost_price": config.JDI_COST_PRICE,
                "entry_date": None,
                "peak_price": config.JDI_COST_PRICE,
            },
            research_mode=research,
        )

    @classmethod
    def load(cls, research: bool = False) -> "Portfolio":
        if config.STATE_FILE.exists():
            data = json.loads(config.STATE_FILE.read_text(encoding="utf-8"))
            return cls(**data)
        p = cls.initial(research)
        p.save()
        return p

    def save(self) -> None:
        config.ensure_dirs()
        config.STATE_FILE.write_text(json.dumps(asdict(self), ensure_ascii=False, indent=2), encoding="utf-8")

    # ---------------- 評価 ----------------
    def position_value(self, prices: dict[str, float]) -> float:
        if not self.position:
            return 0.0
        px = prices.get(self.position["code"], self.position["cost_price"])
        return px * self.position["shares"]

    def total_value(self, prices: dict[str, float]) -> float:
        return self.cash + self.position_value(prices)

    def unrealized(self, prices: dict[str, float]) -> tuple[float, float]:
        """含み損益（円, %）"""
        if not self.position:
            return 0.0, 0.0
        px = prices.get(self.position["code"], self.position["cost_price"])
        cost = self.position["cost_price"]
        return (px - cost) * self.position["shares"], px / cost - 1

    def update_peak(self, prices: dict[str, float]) -> None:
        if self.position and self.position["code"] in prices:
            self.position["peak_price"] = max(self.position.get("peak_price") or 0,
                                              prices[self.position["code"]])

    # ---------------- 5営業日チャレンジ ----------------
    @property
    def days_done(self) -> int:
        return len(self.days)

    @property
    def days_left(self) -> int:
        return max(config.CHALLENGE_DAYS - self.days_done, 0)

    def record_day(self, date: str, prices: dict[str, float]) -> dict:
        """
        営業日の終了資産を記録（大引け後に実行）。同じ日付で再実行すると上書き。
        """
        end_value = self.total_value(prices)
        existing = [d for d in self.days if d["date"] == date]
        if existing:
            self.days = [d for d in self.days if d["date"] != date]
        elif self.days_done >= config.CHALLENGE_DAYS:
            raise ValueError("5営業日のチャレンジは終了しています（python main.py reset で再スタート）")
        if self.challenge_start is None:
            self.challenge_start = date
        start_value = self.days[-1]["end_asset"] if self.days else float(config.INITIAL_ASSET)
        n = len(self.days) + 1
        days_left = config.CHALLENGE_DAYS - n
        rec = {
            "day": f"DAY{n}",
            "date": date,
            "start_asset": round(start_value, 1),
            "end_asset": round(end_value, 1),
            "day_change_pct": round(end_value / start_value - 1, 4) if start_value else None,
            "cumulative_pct": round(end_value / config.INITIAL_ASSET - 1, 4),
            "remaining_to_target": round(config.TARGET_ASSET - end_value, 1),
            "required_multiple": round(config.TARGET_ASSET / end_value, 2) if end_value > 0 else None,
            "days_left": days_left,
            "position": self.position["code"] if self.position else "現金",
        }
        self.days.append(rec)
        self.save()
        return rec

    def status(self, prices: dict[str, float]) -> dict:
        total = self.total_value(prices)
        return {
            "cash": round(self.cash, 1),
            "position": self.position,
            "position_value": round(self.position_value(prices), 1),
            "total_asset": round(total, 1),
            "target": config.TARGET_ASSET,
            "progress_pct": round(total / config.TARGET_ASSET, 4),
            "remaining_to_target": round(config.TARGET_ASSET - total, 1),
            "required_multiple": round(config.TARGET_ASSET / total, 2) if total > 0 else None,
            "days_done": self.days_done,
            "days_left": self.days_left,
            "cumulative_pct": round(total / config.INITIAL_ASSET - 1, 4),
        }
