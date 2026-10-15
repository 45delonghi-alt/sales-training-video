"""WEB本編のシナリオを「導入資料との接続」仕様（2026-10-15）に合わせて書き換える。

導入（intro-slides.pptx・導入動画）で学んだことを再講義せず、本編で使わせる。
変更点の理由は docs/web-experience/11-change-log.md に記録している。
一度だけ実行する想定（同じ結果になるので、再実行しても壊れない）。
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'src' / 'experience' / 'data'
phases = json.loads((DATA / 'phases.json').read_text())
assets = json.loads((DATA / 'assets.json').read_text())
chars = json.loads((DATA / 'characters.json').read_text())

P = {p['phaseId']: p for p in phases}
S = {s['sceneId']: s for p in phases for s in p['scenes']}


def L(speaker, text):
    return {'speaker': speaker, 'text': text}


def choice(q, cid, **kw):
    c = next(c for c in S[q]['choices'] if c['choiceId'] == cid)
    for k, v in kw.items():
        if v is None:
            c.pop(k, None)
        else:
            c[k] = v


# ───────── 人物：設備担当を女性に（録音済みの声 Misa と一致）─────────
for c in chars:
    if c['id'] == 'sato':
        c.update(title='飲料工場 設備課（30代・女性）', gender='female',
                 voice='落ち着いた30代の女性。現場をよく知る設備担当。丁寧だが率直',
                 appearance='白い衛生作業服・白い衛生帽（髪はすべて帽子の中）。タブレットを持つ。落ち着いた表情（参考画像2・12コマの女性に寄せる）')
    if c['id'] == 'takahashi':
        c.update(title='飲料工場 品質管理課（40代・女性）', voice='はきはきした40代の女性。数字と品質に厳しい',
                 appearance='白い衛生作業服・白い衛生帽・眼鏡。記録の束やタブレットを持つ')
    if c['id'] == 'nakata':
        c['appearance'] = '淡いブルーグレーの作業ジャンパー・白い衛生帽。落ち着いた50代前後の男性（参考画像2・12コマの男性に寄せる）。製造エリアではスーツ・ネクタイを着ない'
    if c['id'] == 'mori':
        c['appearance'] = '淡いブルーグレーの作業ジャンパー・白い衛生帽（髪は帽子の中）。親しみやすく知的な30代の女性'

# ───────── 導入 → 本編のつなぎ ─────────
intro = S['intro-video']
intro['description'] = '導入動画（約3分58秒）＝ intro-slides.pptx の24ページ。最後の「YOUR MISSION／FIRST STEP：まずはお客様に現状を確認」から本編が始まる。'
intro['facilitatorNote'] = '導入動画を再生する（3か所で止まる・各15秒）。止める問いの答えは言わない（本編で答え合わせをする）。導入P6のセンサは概念図。正しい設置は本編P2で見せる。'
b = S['bridge']
b['title'] = 'YOUR MISSION　ここからは、あなたが営業担当です。'
b['lines'] = [
    L('narration', 'ここまで、コンサルティング営業の考え方と、光電センサの基本を学びました。'),
    L('narration', 'ここからは皆さんが、OPTEX-FAの営業担当になります。'),
    L('narration', 'お客様から相談を受けています。'),
    L('narration', 'まずは、どんなことに困っているのか、確認してみましょう。'),
]
b['facilitatorNote'] = '導入P23「FIRST STEP：まずはお客様に現状を確認」を受けて始める。センサの方式やOPTEX-FA製品の説明はしない。'

# ───────── PHASE 1 聞く ─────────
S['p1-open']['lines'] = [
    L('sato', '設備課の佐藤です。今日はありがとうございます。'),
    L('sato', 'PETボトルの本数が合わないんです。'),
    L('sato', '最近、実際より多くカウントされることがあるんです。'),
]
q = 'p1-q1'
S[q]['situation'] = L('sato', '最近、実際より多くカウントされることがあるんです。')
choice(q, 'A', choiceText='センサのメーカーや種類を確認する', salesLine='今は、どんなメーカーの、どんなセンサを使っていますか？',
       customerResponse='他社製の、回帰反射型の光電センサです。透明なボトル専用のタイプではないと思います。',
       gained='既設は他社製の一般的な回帰反射型（透明体専用ではないようだ）',
       missing='困りごとの大きさ（どれくらい多いのか）・いつ起きるのか',
       learningPoint='機器のことは分かったが、お客様の困りごとの大きさは、まだ分からない。',
       technicalInsight='回帰反射型：導入で見た方式。片側にセンサ、反対側に反射板。')
choice(q, 'B', extraLines=None,
       gained='実際の10,000本に対し、通常は＋0.5〜0.8%（10,050〜10,080本）、多い週は＋3.0%（10,300本）',
       missing='どんなときに多くなるのか（起きる条件）')
choice(q, 'C', choiceText='新しいセンサの導入予定を聞く', salesLine='新しいセンサを導入するご予定はありますか？',
       customerResponse='原因が分からないうちは、交換するかどうか決められません。',
       gained='お客様自身も原因が分からず、交換を判断できない', missing='困りごとの大きさ・起きる条件',
       learningPoint='商品の提案を急がない。まず現状を理解する。')
S[q]['recommendReason'] = '導入のFIRST STEP「まずはお客様に現状を確認」のとおり。困りごとを数字で具体化すると、次に聞くことが見えてきます。'
S[q]['learningPoint'] = '商品提案を急がず、困りごとを具体化する。'
S['p1-data']['facilitatorNote'] = ('数値は研修用の架空データ。通常＋0.5〜0.8%、最大＋3.0%。毎週3%ではないことを強調する。'
                                   '導入P6の「1,260本／1,262本」はある時点のカウント。こちらは1週間ごとの記録（1万本あたり）で、別の集計。数字を置き換えて説明しない。')
q = 'p1-q2'
S[q]['title'] = 'どんなときに起きる？'
S[q]['backdropAsset'] = 'p1-data'
S[q]['questionText'] = 'どんなときに発生するか、もう少し確認しますか？'
S[q]['hint'] = L('mori', '数字は分かりました。どんな場面で起きるかが分かると、原因の手がかりになりそうです。')
choice(q, 'A', choiceText='どんなときに多くなるかを聞く', salesLine='多くなるのは、どんなときですか？',
       responder='sato', mood='thinking',
       customerResponse='ボトルの流れが乱れるときに、多く数える気がします。',
       gained='ボトルの流れが乱れるときに、多く数えるようだ（お客様の印象）',
       missing='なぜ流れが乱れると数が増えるのか（原因）',
       learningPoint='起きる条件が分かると、調べる場所が見えてくる。', technicalInsight=None)
choice(q, 'B', learningPoint='原因が分かる前のお金の話は、お客様を構えさせる。')
choice(q, 'C', learningPoint='役立つ情報。ただ、どんなときに起きるかは、まだ分からない。')
S[q]['recommendedChoice'] = 'A'
S[q]['recommendReason'] = '「いつ・どれくらい」が分かったら、次は「どんなときに」。起きる条件が、原因を考える手がかりになります。'
S[q]['learningPoint'] = '起きる条件を具体的に聞く。'
S[q]['nextSceneId'] = 'clear-p1'

CLEAR = {
    'p1': ('clear-p1', 'PHASE 1 CLEAR', '現状が具体的になった。', '考える', 'いつ、どのくらい起こるか分かりました。次は原因を考えてみましょう。', 'p2-open'),
    'p2': ('clear-p2', 'PHASE 2 CLEAR', '原因の可能性が見えてきた。', '課題を見つける', '原因の可能性が見えてきました。では、お客様は本当に何に困っているのでしょうか？', 'p3-open'),
    'p3': ('clear-p3', 'PHASE 3 CLEAR', 'お客様の本当の課題が見えた。', '提案する', 'お客様の課題が見えてきました。では、どんな解決策が考えられるでしょうか？', 'p4-open'),
    'p4': ('clear-p4', 'PHASE 4 CLEAR', '提案を、実機で確かめた。', '振り返り', '提案を実機で確かめました。今日の営業体験を振り返りましょう。', 'r-q1'),
}


def add_clear(ph):
    sid, head, msg, nxt, line, to = CLEAR[ph]
    sc = {'sceneId': sid, 'type': 'clip', 'title': f'{head}　{msg}', 'videoAsset': sid, 'lines': [L('narration', line)],
          'clear': {'head': head, 'message': msg, 'next': nxt},
          'facilitatorNote': f'フェーズの区切り。次は「{nxt}」。', 'nextSceneId': to}
    P[ph]['scenes'] = [s for s in P[ph]['scenes'] if s['sceneId'] != sid] + [sc]
    S[sid] = sc


add_clear('p1')

# ───────── PHASE 2 考える ─────────
S['p2-open']['title'] = '現場のセンサを見る'
S['p2-open']['lines'] = [
    L('sato', 'ボトルの流れが乱れると、カウントが増える気がするんです。'),
    L('sato', 'これが今のセンサです。他社製の、回帰反射型の光電センサです。'),
    L('nakata', '導入で見た回帰反射型ですね。片側にセンサ、反対側に反射板。ボトルの下部を、横から見ています。'),
]
S['p2-open']['facilitatorNote'] = '方式の説明はしない（導入P16で学習済み）。導入P6の図は概念図で、実際は「横から・ボトル下部・反対側に反射板」であることを、この画面で確認する。'
q = 'p2-q2'
S[q]['questionText'] = '次に、どう確認しますか？'
choice(q, 'B', choiceText='条件を変えて、信号を比べる',
       salesLine='条件を変えながら、センサの信号とPLCのカウントを同時に記録して、比べませんか？')
S[q]['recommendReason'] = '条件を変えて信号とカウントを比べれば、どこで、どんなときに数が増えるかを切り分けられます。'
S[q]['learningPoint'] = '原因を決めつけず、仮説を検証する。'
iso = S['p2-isolation']
iso['title'] = '原因の仮説'
iso['lines'] = [
    L('narration', '条件を変えて比べると、ボトルの流れが乱れたときに、1本の間に信号が2回変化する場面がありました。'),
    L('nakata', 'ボトル下部の凹凸や揺れで、戻ってくる光が変化し、信号が不安定になっているのかもしれません。'),
    L('narration', 'ただし、これは仮説です。決めつけずに、確かめていきます。'),
]
iso['facilitatorNote'] = '研修用の仮想検証（実測ではない）。「原因の候補」と「確定した原因」を区別する。'
iso['nextSceneId'] = 'clear-p2'
add_clear('p2')

# ───────── PHASE 3 課題を見つける ─────────
S['p3-open']['lines'] = [L('sato', '数字が合わないんですが、何とか対応できています。'), L('takahashi', '数量の照合は、私たち品質管理が担当しています。')]
S['p3-open']['facilitatorNote'] = '導入P10〜12（お客様が実現したいこと・放っておくと何が起きる）を、会話から引き出す場面。概念図は出さない。'
q = 'p3-q1'
S[q]['questionText'] = '何を詳しく聞きますか？'
S[q]['situation'] = L('sato', '数字が合わないんですが、何とか対応できています。')
choice(q, 'A', choiceText='再確認にかかる手間を聞く',
       customerResponse='数が合わないと、現場で数え直さなければなりません。場合によっては、ラインを一時停止することもあります。')
choice(q, 'B', choiceText='センサの購入価格を聞く')
choice(q, 'C', choiceText='センサのメーカーを聞く', salesLine='今のセンサは、どこのメーカーのものですか？',
       responder='takahashi', mood='cool', customerResponse='メーカーよりも、うちの現場で何が起きているかを知りたいです。',
       gained='お客様の関心は、メーカーより現場で起きていること', missing='誤カウントが仕事に与えている影響',
       learningPoint='メーカーの話より、お客様の仕事への影響を聞く。')
q = 'p3-q2'
S[q]['questionText'] = 'お客様が本当に解決したいことは何でしょうか？'
choice(q, 'A', choiceText='新しいセンサを購入すること', responder='sato', mood='cool',
       customerResponse='センサを買うこと自体が、目的ではないんです。',
       gained='新しいセンサは手段であって、目的ではない', missing='お客様が本当に解決したいこと',
       learningPoint='商品は手段。お客様の目的を考える。')
choice(q, 'B', choiceText='正確な数量管理と、確認作業の削減', responder='sato', mood='positive',
       customerResponse='そうなんです。数が正しく合って、確認の手間が減れば、安心して生産できます。',
       gained='本当の課題：正確な数量管理と、数え直し・ライン停止の削減', missing='解決策（このあと提案する）',
       learningPoint='見えている問題（誤カウント）の先に、本当の課題（確認作業・ライン停止）がある。')
choice(q, 'C', choiceText='設備のメーカーを変えること', responder='takahashi', mood='cool',
       customerResponse='メーカーを変えれば解決する、とは限りませんよね。',
       gained='メーカーを変えることが目的ではない', missing='お客様が本当に解決したいこと',
       learningPoint='「他社製だから」と決めつけない。')
S[q]['recommendReason'] = '導入で考えた「お客様が本当は何を実現したいか」。誤カウントの先にある、数え直しやライン停止の負担をなくすことが目的です。'
summ = S['p3-summary']
summ['title'] = 'お客様の本当の課題'
summ['lines'] = [
    L('sato', '数が合っていれば、数え直しも、ラインを止めることもなくなります。'),
    L('narration', 'お客様が解決したいのは、正確な数量管理と、確認作業を減らすこと。その先にあるのは、安定した生産です。'),
]
summ['facilitatorNote'] = '導入P12の図は再掲しない。工場の実写と、お客様の言葉で確認する（10秒程度）。'
summ['nextSceneId'] = 'clear-p3'
add_clear('p3')

# ───────── PHASE 4 提案する・実機デモ ─────────
S['p4-open']['title'] = 'どの方式が合いそう？'
S['p4-open']['lines'] = [L('mori', 'ここまでの調査結果を踏まえると、どの方式が合いそうでしょうか？')]
S['p4-open']['facilitatorNote'] = '導入P22の止める問い「透明。どの方式が合いそう？」の答え合わせになる。'
q = 'p4-q1'
S[q]['title'] = 'どの方式を提案する？'
S[q]['questionText'] = '今回のお客様には、どの方式が合いそうですか？'
S[q]['hint'] = L('mori', '導入で見た方式の中に、透明なボトルに向いたものがありましたね。')
choice(q, 'A', choiceText='一般的な回帰反射型を、もう一度提案する', salesLine='今と同じ、回帰反射型のセンサをもう一度おすすめします。',
       responder='sato', mood='uneasy', customerResponse='今と同じタイプだと、また同じことが起きないか心配です。',
       gained='同じ方式のままでは、お客様は安心できない', missing='透明なボトルに合った方式',
       learningPoint='今の方式で起きている問題を、同じ方式で解決できるとは限らない。')
choice(q, 'B', choiceText='透明体専用の回帰反射型を提案する', salesLine='透明なボトル向けの、透明体専用の回帰反射型センサを提案します。',
       responder='sato', mood='request', customerResponse='透明なボトル専用のタイプがあるんですね。くわしく聞かせてください。',
       gained='透明体専用の回帰反射型が候補になる', missing='実際のボトルと現場で、安定して検出できるか',
       learningPoint='今回のお客様に最適な方式を選ぶ。', extraLines=None)
choice(q, 'C', choiceText='人による確認を増やす', salesLine='当面は、人の確認を増やしてはいかがでしょう。',
       learningPoint='お客様の課題は、確認作業を減らすこと。逆の提案になっている。')
S[q]['recommendReason'] = '導入P21「どれが高性能か、ではなく、今回のお客様にどれが最適か」。透明なPETボトルには、透明体専用の回帰反射型が合いそうです（導入P18）。'
S[q]['learningPoint'] = '今回のお客様に最適な方式を選ぶ。'
S[q]['nextSceneId'] = 'p4-why'
why = {'sceneId': 'p4-why', 'type': 'clip', 'title': 'なぜ、透明体専用なのか', 'videoAsset': 'p4-why',
       'lines': [L('mori', '導入動画で学んだ、透明体専用センサを覚えていますか？'),
                 L('mori', '透明なPETボトルでも、わずかな光の変化をとらえる仕組みが使われています。'),
                 L('mori', 'ただし、実際の現場で安定して検出できるかは、試して確かめる必要があります。')],
       'facilitatorNote': '方式の説明は導入P18で済んでいる。ここでは「なぜ今回のお客様に合うか」と「試して確かめる」だけを話す。',
       'nextSceneId': 'p4-product'}
S['p4-product']['lines'] = [
    L('mori', 'OPTEX-FAのKR-Qシリーズは、透明体の検出に向けた、回帰反射型のセンサです。'),
    L('nakata', '今と同じように、片側にセンサ、反対側に反射板。ボトルの下部を、横から検出します。'),
    L('nakata', '性能の数値は公式の資料で確認し、効果は実際のボトルで確かめましょう。'),
]
S['p4-product']['nextSceneId'] = 'p4-pitch'
pitch = {'sceneId': 'p4-pitch', 'type': 'pitch', 'title': '30秒で提案しよう',
         'prompt': '次の4つを組み合わせて、お客様に30秒で提案してください。',
         'parts': [
             {'key': 'issue', 'label': 'お客様の課題', 'placeholder': '例：数え直しやライン停止の手間をなくしたい',
              'options': ['数が合わず、数え直しやライン停止が起きている', '正確な数量管理をしたい']},
             {'key': 'sensor', 'label': '提案するセンサ', 'placeholder': '例：透明体専用の回帰反射型（KR-Qシリーズ）',
              'options': ['透明体専用の回帰反射型（OPTEX-FA KR-Qシリーズ）']},
             {'key': 'benefit', 'label': '期待できる改善', 'placeholder': '例：誤カウントが減り、確認作業が減る（実機で確かめる）',
              'options': ['誤カウントが減り、数え直しが減る可能性がある', '確認作業が減り、安定して生産できる可能性がある']},
             {'key': 'verify', 'label': '実機での検証', 'placeholder': '例：実際のボトルで、今のセンサと同じ条件で比べる',
              'options': ['実際のボトルで、今のセンサと同じ条件で比べる', '揺れや間隔が詰まる条件でも確かめる']},
         ],
         'seconds': 30, 'minutes': 3,
         'facilitatorNote': '1〜2名に読み上げてもらう（1人30秒）。「必ず直る」と言い切った提案には「実機で確かめる」を足すよう返す。正解・不正解はつけない。',
         'nextSceneId': 'p4-setup'}
S['p4-setup']['nextSceneId'] = 'p4-demo-normal'
S['p4-setup']['lines'] = [
    L('nakata', '既設のセンサとKR-Qシリーズを、同じ条件で比べます。'),
    L('nakata', '同じボトル、生産時と同じ搬送速度、ボトル下部の同じ高さです。反射板と設定は、それぞれのセンサに合ったものを使います。'),
    L('nakata', '測るのは、通過した本数、センサの出力の回数、そしてPLCのカウント値です。'),
]
S['p4-demo-normal']['nextSceneId'] = 'p4-demo-wobble'
S['p4-demo-wobble']['title'] = '比較デモ2：悪条件（ボトルの揺れ）'
S['p4-demo-wobble']['nextSceneId'] = 'p4-demo-gap'
S['p4-demo-gap']['title'] = '比較デモ3：悪条件（間隔が詰まる）'
S['p4-demo-gap']['checks'] = ['詰まったボトルを、1本ずつ区別して出力が出るか（多く数えないか・少なく数えないか）', 'カウント値が通過本数と一致するか']
S['p4-demo-gap']['nextSceneId'] = 'p4-result'
S['p4-result']['lines'] = [
    L('narration', '記録した結果を、センサごと・条件ごとに比べます。'),
    L('narration', '実測の値がない場合、画面の改善結果は仮想データです。実測、シミュレーション、期待する効果は、分けて考えます。'),
]
q = 'p4-q3'
S[q]['questionText'] = '実機で良い結果が出れば、すぐ採用を決めてもよいでしょうか？'
choice(q, 'C', choiceText='価格だけで判断する', salesLine='あとは、価格で判断していただけますか？',
       responder='takahashi', mood='uneasy', customerResponse='価格だけでは、うちのラインで使えるか判断できませんね。',
       gained='価格だけでは、お客様は判断できない', missing='実際のラインでの確認',
       learningPoint='お客様が安心して判断できる材料をそろえる。')
S['p4-message']['lines'] = [
    L('sato', '実際のボトルで確かめられて、安心しました。ぜひ、実際のラインでも一緒に確認させてください。'),
    L('narration', '提案を実機で確かめ、お客様と次の一歩を決めました。'),
]
S['p4-message']['nextSceneId'] = 'clear-p4'
S['p4-followup']['nextSceneId'] = 'p4-message'
add_clear('p4')

# 不要になった場面（指示書のPHASE 4にない問い・時間短縮）
DROP = {'p4-q2', 'p4-demo-height'}
for p in phases:
    sc = [s for s in p['scenes'] if s['sceneId'] not in DROP]
    if p['phaseId'] == 'p4':
        order = ['p4-open', 'p4-q1', 'p4-why', 'p4-product', 'p4-pitch', 'p4-setup', 'p4-demo-normal', 'p4-demo-wobble', 'p4-demo-gap', 'p4-result', 'p4-q3', 'p4-followup', 'p4-message', 'clear-p4']
        byid = {s['sceneId']: s for s in sc + [why, pitch]}
        sc = [byid[i] for i in order]
    p['scenes'] = sc

# 時間（指示書05）
for pid, m in {'intro': 5, 'p1': 10, 'p2': 10, 'p3': 10, 'p4': 15, 'reflection': 10}.items():
    P[pid]['minutes'] = m

S['closing']['lines'] = [
    L('narration', '営業は、商品を売るだけの仕事ではありません。'),
    L('narration', 'お客様の課題を見つけ、技術を活かして、一緒に解決を目指す仕事です。'),
    L('narration', '現場の課題を見つけ、解決策を提案する。それが、OPTEX-FAのコンサルティング営業です。'),
]

# ───────── 映像（assets.json）─────────
A = {a['assetId']: a for a in assets}
assets = [a for a in assets if a['assetId'] not in {'p4-q2-a', 'p4-q2-b', 'p4-q2-c', 'p4-demo-height'}]
A = {a['assetId']: a for a in assets}


def asset(aid, shots, seconds, desc, anim=''):
    a = A.get(aid) or {'assetId': aid, 'status': ['implemented'],
                       'production': {'method': 'composite', 'prompt': '', 'negativePrompt': '', 'note': '実写風の背景画像＋CG（光路・信号・数値）を Remotion で合成'}}
    a.update(shots=shots, seconds=seconds, dialogAt=a.get('dialogAt', 0.8), visualDescription=desc,
             cameraDirection=a.get('cameraDirection', 'ゆっくり寄る（Ken Burns）'), animationDirection=anim or a.get('animationDirection', ''))
    if aid not in A:
        assets.append(a)
        A[aid] = a
    return a


for ph, (sid, head, msg, nxt, line, to) in CLEAR.items():
    asset(sid, [{'overlay': 'clear'}], 5, f'{head}。「{msg}」→ NEXT：{nxt}', '赤いCLEAR表示 → メッセージ → NEXT')
asset('p4-why', [{'overlay': 'talk', 'header': {'no': '9', 'title': 'なぜ、透明体専用なのか'}}, {'overlay': 'why-clear', 'atLine': 1, 'header': {'no': '9', 'title': 'なぜ、透明体専用なのか'}}], 9,
      '森さんが導入P18（透明体専用）を想起させ、なぜ今回のお客様に合うかを話す。最後に「試して確かめる」')
asset('p1-q2-a', [{'overlay': 'talk', 'header': {'no': '2', 'title': 'お客様からの相談'}, 'card': '流れが乱れるときに多い？'}], 6,
      '佐藤さんが「ボトルの流れが乱れるときに多く数える気がします」と答える。背景にラインの乱れ')
A['p2-open']['shots'] = [{'overlay': 'talk', 'header': {'no': '4', 'title': 'センサの設置位置（現状）'}},
                         {'overlay': 'sensor-existing', 'atLine': 1, 'header': {'no': '4', 'title': 'センサの設置位置（現状）'}},
                         {'overlay': 'beam', 'atLine': 2, 'header': {'no': '4', 'title': 'センサの設置位置（現状）'}}]
A['p3-summary']['shots'] = [{'overlay': 'talk', 'header': {'no': '6', 'title': 'お客様の本当の課題'}}, {'overlay': 'issue-photo', 'atLine': 1, 'header': {'no': '6', 'title': 'お客様の本当の課題'}}]
A['p3-q2-b']['shots'] = [{'overlay': 'talk', 'header': {'no': '6', 'title': '本当の困りごとは？'}}]
A['p4-open']['shots'] = [{'overlay': 'talk', 'header': {'no': '9', 'title': 'どの方式が合いそう？'}}]
A['p4-q1-b']['shots'] = [{'overlay': 'talk', 'header': {'no': '9', 'title': 'どの方式を提案する？'}}]
for k in ('p4-q1-a', 'p4-q1-c'):
    A[k]['shots'] = [{'overlay': 'talk-card' if k.endswith('c') else 'talk', 'header': {'no': '9', 'title': 'どの方式を提案する？'}}]
A['p4-q3-c']['shots'] = [{'overlay': 'talk-card', 'header': {'no': '12', 'title': 'お客様の評価・次のアクション'}}]
A['bridge']['shots'] = [{'overlay': 'bridge'}]
A['bridge']['seconds'] = 12
A['bridge']['visualDescription'] = '黒背景・赤のアクセント。YOUR MISSION「ここからは、あなたが営業担当です。」導入P23と同じ4ステップを表示し、1つめ「聞く」を点灯'

(DATA / 'phases.json').write_text(json.dumps(phases, ensure_ascii=False, indent=2) + '\n')
(DATA / 'assets.json').write_text(json.dumps(assets, ensure_ascii=False, indent=2) + '\n')
(DATA / 'characters.json').write_text(json.dumps(chars, ensure_ascii=False, indent=2) + '\n')
print('scenes:', sum(len(p['scenes']) for p in phases), 'assets:', len(assets))
