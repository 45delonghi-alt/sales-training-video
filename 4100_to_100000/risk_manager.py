"""
リスク管理

- 100株単位・資金内・現物のみ・最大1銘柄・ナンピン禁止 をここで一元チェック
- 「目標達成のためにリスク管理を外す」設定は存在しない
"""
from __future__ import annotations

import config
from indicators import tick_size


def lot(research: bool) -> int:
    return config.lot_size(research)


def required_cash(price: float, research: bool, shares: int | None = None) -> float:
    """購入に必要な金額（1単元、手数料込み）"""
    shares = shares or lot(research)
    return price * shares + config.COMMISSION_YEN


def max_affordable_price(available_cash: float, research: bool) -> float:
    """REALISTIC_MODE では available_cash / 100 以下の株価でなければ買えない"""
    return (available_cash - config.COMMISSION_YEN) / lot(research)


def is_affordable(price: float, available_cash: float, research: bool) -> bool:
    buy_price = price + tick_size(price) * config.SLIPPAGE_TICKS
    return required_cash(buy_price, research) <= available_cash


def max_shares(price: float, available_cash: float, research: bool) -> int:
    """資金内で買える最大株数（単元の倍数）。レバレッジ1倍。"""
    unit = lot(research)
    units = int((available_cash - config.COMMISSION_YEN) // (price * unit)) if price > 0 else 0
    return max(units, 0) * unit


def check_buy(portfolio, code: str, price: float, shares: int, research: bool) -> tuple[bool, str]:
    """買付前チェック。OKなら (True, "")、NGなら (False, 理由)"""
    config.verify_safety()
    if portfolio.position is not None:
        if portfolio.position["code"] == code:
            return False, "追加買付（ナンピン・買い増し）は禁止です"
        return False, f"最大同時保有は{config.MAX_POSITIONS}銘柄です。先に保有銘柄を売却してください"
    if shares <= 0:
        need = required_cash(price, research)
        return False, (f"資金不足（1単元 {lot(research)}株 = {need:,.0f}円 > 現金 {portfolio.cash:,.0f}円）。"
                       "信用取引・レバレッジは使えません")
    if shares % lot(research) != 0:
        return False, f"売買単位は{lot(research)}株です"
    cost = price * shares + config.COMMISSION_YEN
    if cost > portfolio.cash + 1e-9:
        return False, f"資金不足（必要 {cost:,.0f}円 / 現金 {portfolio.cash:,.0f}円）。信用取引・レバレッジは使えません"
    return True, ""


def check_sell(portfolio, code: str, shares: int) -> tuple[bool, str]:
    """売却前チェック（空売り禁止）"""
    config.verify_safety()
    pos = portfolio.position
    if pos is None or pos["code"] != code:
        return False, "保有していない銘柄は売れません（空売り禁止）"
    if shares > pos["shares"]:
        return False, "保有株数を超える売却はできません（空売り禁止）"
    return True, ""


def challenge_warnings(total_asset: float, days_left: int) -> list[str]:
    """チャレンジ進行上の注意（リスク管理を緩めるのではなく、現実との差を見せる）"""
    w = [config.RISK_WARNING]
    remaining_multiple = config.TARGET_ASSET / total_asset if total_asset > 0 else float("inf")
    if days_left > 0:
        daily = remaining_multiple ** (1 / days_left) - 1
        w.append(f"残り{days_left}営業日で{remaining_multiple:.2f}倍 → 毎日 約{daily:+.0%} の複利が必要です。"
                 "日本株の値幅制限（ストップ高）を考えても通常は届きません。")
    w.append("目標未達でも損切りルール・資金管理は緩めません（ナンピン・信用・レバレッジは常に禁止）。")
    return w
