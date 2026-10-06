"""
Streamlit ダッシュボード（閲覧・分析専用）

起動: streamlit run dashboard.py

※ この画面に注文ボタンはありません。証券会社には一切接続しません。
   仮想売買（ペーパートレード）はコマンド（python main.py paper-auto 等）で行います。
"""
from __future__ import annotations

import json

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

import config
from portfolio import Portfolio

st.set_page_config(page_title="4100→100000 5 DAYS CHALLENGE", page_icon="📈", layout="wide")

LINE_COLOR = "#2a6fdb"
REF_COLOR = "#8a8f98"
SIGNAL_TEXT = {"BUY": "🟢 BUY", "SELL": "🔴 SELL", "HOLD": "🔵 HOLD", "WAIT": "⚪ WAIT", "WATCH": "🟡 WATCH",
               "対象外": "— 対象外", "保有中": "■ 保有中"}


def sig(x: str) -> str:
    """色だけに頼らず、必ず文字（BUY/SELL/HOLD/WAIT/WATCH）を併記"""
    return SIGNAL_TEXT.get(x, x)


def load_json(path):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            return None
    return None


def yen(x):
    return "-" if x is None else f"{x:,.0f}円"


def pct(x, signed=True):
    if x is None:
        return "-"
    return f"{x:+.2%}" if signed else f"{x:.2%}"


# ============================================================
# ヘッダー・常時表示のリスク警告
# ============================================================
st.markdown(
    "<div style='text-align:center;padding:8px 0'>"
    "<div style='font-size:2.6rem;font-weight:800;line-height:1.2'>4,100円 → 100,000円</div>"
    "<div style='font-size:1.6rem;font-weight:700;letter-spacing:.2em'>5 DAYS CHALLENGE</div>"
    "<div style='font-size:.9rem;opacity:.75'>PAPER TRADE ONLY ／ 実際の注文は一切行いません</div></div>",
    unsafe_allow_html=True,
)
st.error("⚠ リスク警告：" + config.RISK_WARNING)
st.caption(config.NOT_ADVICE)

with st.sidebar:
    st.header("操作")
    research = st.toggle("RESEARCH_MODE（1株単位）", value=config.RESEARCH_MODE,
                         help="松井証券でそのまま実行できる取引とは限りません")
    quick = st.toggle("監視リストのみで素早く分析", value=False,
                      help="OFFだと東証全銘柄を取得します（数分かかります）")
    if st.button("🔄 データ更新・分析を実行", width="stretch"):
        from main import run_analysis
        with st.spinner("データ取得・分析中…（全銘柄の場合は数分かかります）"):
            try:
                run_analysis(research, quick=quick, use_cache=False)
                st.success("分析が完了しました")
            except Exception as e:  # noqa: BLE001
                st.error(f"分析に失敗しました: {e}")
    st.divider()
    st.markdown("**仮想売買・日次記録はコマンドで実行**")
    st.code("python main.py paper-auto\npython main.py close-day\npython main.py backtest", language="bash")
    log_scale = st.toggle("資産推移を対数目盛で表示", value=True)

if research:
    st.warning(config.RESEARCH_MODE_WARNING)

a = load_json(config.LATEST_ANALYSIS_FILE)
bt = load_json(config.LATEST_BACKTEST_FILE)
pf = Portfolio.load(research)
prices = (a or {}).get("prices", {})
status = pf.status(prices)

if a:
    st.info(f"📡 {a['delay_notice']}　｜　取得元: {a['source']}　｜　取得: {a['fetched_at']}　｜　"
            f"最新日: {a['date']}　｜　モード: {a['mode']}（{a['lot_size']}株単位）")
else:
    st.warning("まだ分析結果がありません。左の「データ更新・分析を実行」を押すか、`python main.py` を実行してください。")

# ============================================================
# ①〜⑤ 資産状況
# ============================================================
c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("① 現在資産", yen(status["total_asset"]), pct(status["cumulative_pct"]))
c2.metric("② 目標", yen(config.TARGET_ASSET), f"残り {yen(status['remaining_to_target'])}", delta_color="off")
c3.metric("③ 達成率", f"{status['progress_pct']:.2%}", f"必要倍率 {status['required_multiple']}倍", delta_color="off")
c4.metric("④ 残り営業日", f"{status['days_left']}日", f"{status['days_done']}/{config.CHALLENGE_DAYS}日 記録済", delta_color="off")
pos = status["position"]
c5.metric("⑤ 現在ポジション", f"{pos['code']} {pos['shares']}株" if pos else "現金のみ",
          f"{pos['name']}" if pos else f"現金 {yen(status['cash'])}", delta_color="off")
st.progress(min(max(status["progress_pct"], 0.0), 1.0), text=f"目標まで {status['progress_pct']:.2%}")

# ============================================================
# 本日の判断（最終判断画面）
# ============================================================
if a:
    f = a["final"]
    t = f["top1"]
    st.subheader("本日の判断")
    box = [f"**JDI：{sig(f['jdi_decision'])}**", "", "理由：" + " / ".join(f["jdi_reasons"]), ""]
    if t:
        box += [f"市場ランキング1位：**{t['code']} {t['name']}**　現在値 {t['price']:,.1f}円　"
                f"Momentum Score {t['momentum_score']}/100",
                f"現在の資金（{yen(f['budget'])}）で購入：**{'可能' if f['top1_affordable'] else '不可能'}**"
                f"（{a['lot_size']}株の必要金額 {yen(t['required_cash'])}）", ""]
    box += [f"推奨行動（研究モデル上のシグナル・投資助言ではありません）：**{f['action']}**"]
    if f["no_trade"]:
        box += ["", "⚪ **WAIT**：条件を満たす銘柄がないため、無理に売買しません（本日は取引候補なし）"]
    st.success("\n".join(box))

tabs = st.tabs(["⑥ JDI分析", "⑦ TOP10", "⑧ TOP3詳細", "⑨ 資産推移", "⑩ 売買履歴",
                "⑪ バックテスト", "⑫ Monte Carlo", "⑬ リスク警告"])

# ⑥ JDI
with tabs[0]:
    j = (a or {}).get("jdi")
    if not j:
        st.write("分析結果がありません")
    elif not j.get("available"):
        st.warning(j["message"])
    else:
        st.markdown(f"### 6740 ジャパンディスプレイ　判定：{sig(j['decision'])}")
        st.write("理由：" + " / ".join(j["reasons"]))
        if j.get("decision_note"):
            st.caption(j["decision_note"])
        m = st.columns(4)
        m[0].metric("現在値", f"{j['price']:,.1f}円", pct(j["change_pct"]))
        m[1].metric("保有100株評価額", yen(j["market_value"]))
        m[2].metric("含み損益", f"{j['unrealized_yen']:+,.0f}円", pct(j["unrealized_pct"]))
        m[3].metric("Momentum Score", f"{j['momentum_score']}/100")
        st.table(pd.DataFrame({
            "項目": ["前日比", "出来高増加率", "MA5", "MA20", "RSI14", "20日高値", "ATR14", "損切りライン", "利確ライン",
                   "トレーリングライン", "取得単価(設定値)"],
            "値": [pct(j["change_pct"]), f"{j['volume_ratio']}倍", j["ma5"], j["ma20"], j["rsi14"], f"{j['high20']}円",
                  f"{j['atr14']}円（{pct(j['atr_pct'], False)}）", f"{j['stop_used']}円（{j['stop_basis']}）",
                  f"{j['take_profit']}円", f"{j['trailing_line']}円", f"{j['cost_price']}円"],
        }).astype(str))
        st.markdown("**スコア内訳**")
        st.table(pd.DataFrame(list(j["score_breakdown"].items()), columns=["項目", "点数"]).astype(str))

        st.markdown("**乗換比較（JDI/保有銘柄 vs 購入可能候補）** ※スコアが高い＝値上がりを保証するものではありません")
        if a["switch"]:
            sw = pd.DataFrame(a["switch"])
            sw["判定"] = sw["judgement"].map(sig)
            sw["期待値差(参考)"] = sw["ev_diff_reference"].map(lambda x: "データ不足" if x is None or pd.isna(x) else pct(x))
            sw["乗換コスト"] = sw["switch_cost_pct"].map(lambda x: pct(x, False))
            st.dataframe(sw[["code", "name", "score", "score_diff", "乗換コスト", "期待値差(参考)", "判定", "label"]]
                         .rename(columns={"code": "コード", "name": "銘柄名", "score": "Score", "score_diff": "スコア差",
                                          "label": "結論"}), hide_index=True, width="stretch")
            if not a.get("bucket_stats_available"):
                st.caption("期待値差は `python main.py backtest` 実行後に、過去データ上の参考値として表示されます。")
        else:
            st.write("比較できる購入可能候補がありません")

        with st.expander("JDI 分足チャート（5分足/15分足/60分足・遅延データ）"):
            iv = st.radio("足種", ["5m", "15m", "60m"], horizontal=True)
            if st.button("分足を取得"):
                from data_provider import get_provider
                df = get_provider().get_intraday(config.JDI_CODE, iv)
                if df is None or df.empty:
                    st.warning("分足データを取得できませんでした（架空データは表示しません）")
                else:
                    fig = go.Figure(go.Candlestick(x=df.index, open=df["Open"], high=df["High"], low=df["Low"],
                                                   close=df["Close"], name="6740"))
                    fig.update_layout(height=380, xaxis_rangeslider_visible=False, margin=dict(t=10, b=10))
                    st.plotly_chart(fig, width="stretch")

# ⑦ TOP10
with tabs[1]:
    if a and a["ranking"]:
        df = pd.DataFrame(a["ranking"])
        df["judgement"] = df["judgement"].map(sig)
        df["change_pct"] = df["change_pct"].map(pct)
        df["required_cash"] = df["required_cash"].map(yen)
        st.dataframe(df.rename(columns={
            "rank": "順位", "code": "証券コード", "name": "銘柄名", "price": "株価", "change_pct": "前日比",
            "volume_ratio": "出来高倍率", "rsi14": "RSI", "ma5": "MA5", "ma20": "MA20", "breakout": "高値ブレイク",
            "momentum_score": "Momentum Score", "required_cash": "100株必要金額" if a["lot_size"] == 100 else "1株必要金額",
            "affordable_label": "購入可能/不可", "judgement": "判定"}), hide_index=True, width="stretch")
        st.caption(f"分析 {a['scanned']}銘柄 / 除外 {a['excluded']} / 取得失敗 {a['failed']}。"
                   f"利用可能資金 {yen(a['budget'])} → 購入可能な株価上限 {a['max_affordable_price']:,.1f}円")
        st.markdown(f"**{yen(a['budget'])}で購入可能な候補**")
        if a["buyable"]:
            b = pd.DataFrame(a["buyable"])[["code", "name", "price", "momentum_score", "judgement", "stop_used", "take_profit"]]
            b["judgement"] = b["judgement"].map(sig)
            st.dataframe(b.rename(columns={"code": "コード", "name": "銘柄名", "price": "株価", "momentum_score": "Score",
                                           "judgement": "判定", "stop_used": "損切候補", "take_profit": "利確候補"}),
                         hide_index=True, width="stretch")
        else:
            st.write("購入可能な銘柄なし")
    else:
        st.write("ランキングがありません")

# ⑧ TOP3
with tabs[2]:
    if a and a["top3"]:
        cols = st.columns(len(a["top3"]))
        for col, c in zip(cols, a["top3"]):
            with col:
                st.markdown(f"#### {c['code']} {c['name']}")
                st.markdown(f"判定：**{sig(c['judgement'])}**")
                st.table(pd.DataFrame({
                    "項目": ["現在値", "100株必要資金" if a["lot_size"] == 100 else "1株必要資金", "購入可能性",
                           "エントリー候補", "損切候補", "（固定 / ATR）", "利確候補", "（ATR利確）", "ATR", "リスクリワード",
                           "出来高倍率", "Momentum Score"],
                    "値": [f"{c['price']:,.1f}円", yen(c["required_cash"]), c["affordability"], f"{c['entry_price']}円",
                          f"{c['stop_used']}円（{c['stop_basis']}）", f"{c['stop_fixed']} / {c['stop_atr']}",
                          f"{c['take_profit']}円", f"{c['tp_atr']}", f"{c['atr14']}円（{pct(c['atr_pct'], False)}）",
                          c["risk_reward"], f"{c['volume_ratio']}倍", f"{c['momentum_score']}/100"],
                }).astype(str))
                st.markdown("**選定理由**\n" + "\n".join(f"- {x}" for x in c["selection_reasons"]))
                st.markdown("**危険要因**\n" + "\n".join(f"- {x}" for x in c["risk_factors"]))
    else:
        st.write("TOP3がありません")

# ⑨ 資産推移
with tabs[3]:
    pts = [{"label": "初期", "asset": config.INITIAL_ASSET}] + [
        {"label": f"{d['day']}\n{d['date']}", "asset": d["end_asset"]} for d in pf.days]
    df = pd.DataFrame(pts)
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=df["label"], y=df["asset"], mode="lines+markers+text", name="仮想資産",
                             line=dict(color=LINE_COLOR, width=2), marker=dict(size=9),
                             text=[f"{v:,.0f}円" for v in df["asset"]], textposition="top center",
                             hovertemplate="%{x}<br>%{y:,.0f}円<extra></extra>"))
    fig.add_hline(y=config.TARGET_ASSET, line=dict(color=REF_COLOR, dash="dash", width=1.5),
                  annotation_text="目標 100,000円", annotation_position="top left")
    fig.add_hline(y=config.INITIAL_ASSET, line=dict(color=REF_COLOR, dash="dot", width=1),
                  annotation_text="初期 4,100円", annotation_position="bottom left")
    fig.update_layout(height=420, margin=dict(t=30, b=10), showlegend=False, hovermode="x",
                      yaxis=dict(title="円", type="log" if log_scale else "linear", tickformat=",.0f",
                                 range=[3, 5.1] if log_scale else [0, 105_000]),
                      xaxis=dict(categoryorder="array", categoryarray=list(df["label"])))
    st.plotly_chart(fig, width="stretch")
    if pf.days:
        dd = pd.DataFrame(pf.days)
        dd["day_change_pct"] = dd["day_change_pct"].map(pct)
        dd["cumulative_pct"] = dd["cumulative_pct"].map(pct)
        st.dataframe(dd.rename(columns={
            "day": "DAY", "date": "日付", "start_asset": "開始資産", "end_asset": "終了資産", "day_change_pct": "前日比",
            "cumulative_pct": "累積利益率", "remaining_to_target": "10万円までの残額", "required_multiple": "必要残存倍率",
            "days_left": "残り営業日", "position": "ポジション"}), hide_index=True, width="stretch")
    else:
        st.caption("大引け後に `python main.py close-day` を実行すると DAY1〜DAY5 が記録されます。")

# ⑩ 売買履歴
with tabs[4]:
    path = config.LOG_DIR / "trade_log.csv"
    if path.exists():
        tl = pd.read_csv(path, encoding="utf-8-sig")
        tl["side"] = tl["side"].map(sig)
        st.dataframe(tl.iloc[::-1], hide_index=True, width="stretch")
    else:
        st.write("仮想売買の履歴はまだありません")
    st.caption("すべてペーパートレード（仮想）の記録です。価格は遅延データ±スリッページで、実際の約定とは異なります。")

# ⑪ バックテスト
with tabs[5]:
    if not bt:
        st.write("`python main.py backtest` を実行すると表示されます")
    else:
        st.markdown(f"**{bt['mode']} / {bt['initial']:,.0f}円スタート / {bt.get('n_symbols', 0)}銘柄 / {bt.get('period', '-')}**")
        m = st.columns(5)
        m[0].metric("総取引回数", bt["n_trades"])
        m[1].metric("勝率", "-" if bt.get("win_rate") is None else f"{bt['win_rate']:.1%}")
        m[2].metric("Profit Factor", bt.get("profit_factor") or "-")
        m[3].metric("期待値/回", "-" if bt.get("expectancy_yen") is None else f"{bt['expectancy_yen']:+,.0f}円")
        m[4].metric("最終資産", yen(bt["final"]), pct(bt["total_return"]))
        m = st.columns(4)
        m[0].metric("平均利益", "-" if bt.get("avg_win") is None else f"{bt['avg_win']:+,.0f}円")
        m[1].metric("平均損失", "-" if bt.get("avg_loss") is None else f"{bt['avg_loss']:+,.0f}円")
        m[2].metric("最大ドローダウン", pct(bt.get("max_drawdown")))
        m[3].metric("最大連敗", bt.get("max_consec_losses"))
        eq = pd.DataFrame(bt.get("equity", []))
        if not eq.empty:
            fig = go.Figure(go.Scatter(x=eq["date"], y=eq["equity"], mode="lines", line=dict(color=LINE_COLOR, width=2),
                                       hovertemplate="%{x}<br>%{y:,.0f}円<extra></extra>", name="資産"))
            fig.add_hline(y=bt["initial"], line=dict(color=REF_COLOR, dash="dot", width=1),
                          annotation_text="初期資金", annotation_position="bottom left")
            fig.update_layout(height=320, margin=dict(t=10, b=10), yaxis_title="円", hovermode="x")
            st.plotly_chart(fig, width="stretch")
        if config.BACKTEST_TRADES_FILE.exists():
            with st.expander("取引明細"):
                st.dataframe(pd.read_csv(config.BACKTEST_TRADES_FILE, encoding="utf-8-sig"), hide_index=True,
                             width="stretch")
        if bt.get("score_bucket_stats"):
            with st.expander("スコア帯別：翌日寄付き→5営業日後のリターン（参考値）"):
                sb = pd.DataFrame(bt["score_bucket_stats"]).T.reset_index().rename(columns={"index": "スコア帯"})
                st.dataframe(sb, hide_index=True, width="stretch")
        st.caption("過去データによる検証結果であり、将来の結果を保証しません。")

# ⑫ Monte Carlo
with tabs[6]:
    mc = (bt or {}).get("monte_carlo")
    if not mc:
        st.write("`python main.py backtest` を実行すると表示されます")
    elif "message" in mc:
        st.warning(mc["message"])
    else:
        if mc.get("warning"):
            st.warning("⚠ " + mc["warning"])
        m = st.columns(6)
        m[0].metric("中央値", yen(mc["median"]))
        m[1].metric("上位10%", yen(mc["p90"]))
        m[2].metric("下位10%", yen(mc["p10"]))
        m[3].metric("最大資産", yen(mc["max"]))
        m[4].metric("破産率", f"{mc['ruin_rate']:.1%}", help=mc["ruin_definition"])
        m[5].metric("10万円到達率", f"{mc['target_reach_rate']:.2%}")
        fig = go.Figure(go.Histogram(x=mc.get("finals_sample", []), nbinsx=40, marker_color=LINE_COLOR,
                                     marker_line=dict(color="white", width=1),
                                     hovertemplate="%{x:,.0f}円付近: %{y}回<extra></extra>"))
        fig.update_layout(height=300, margin=dict(t=10, b=10), xaxis_title="5営業日後の資産（円）", yaxis_title="回数",
                          bargap=0.05)
        st.plotly_chart(fig, width="stretch")
        st.caption(f"{mc['runs']}回シミュレーション。{mc['note']} {mc.get('approximation', '')}")

# ⑬ リスク警告
with tabs[7]:
    import risk_manager
    for w in risk_manager.challenge_warnings(status["total_asset"], status["days_left"]):
        st.warning(w)
    st.markdown("""
- **ペーパートレード専用**：証券会社への発注・自動ログイン・ID/パスワード保存の機能はありません。
- **データは REALTIME ではありません**：無料データは遅延・欠損があり得ます。取得失敗時に架空データで補うことはしません。
- **低位株のリスク**：株価40円台では1ティック(1円)＝約2.4%。売買するだけで不利になりやすい構造です。
- **固定ルール**：ナンピン禁止・信用取引禁止・レバレッジ禁止・空売り禁止・最大1銘柄。目標未達でも緩めません。
- **スコアの意味**：過去の値動きパターンの点数化であり、値上がりを保証しません。
""")
    if research:
        st.error(config.RESEARCH_MODE_WARNING)
