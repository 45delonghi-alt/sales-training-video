// 台本。ここを書き換えれば動画が変わる。
// 尺は「leadIn ＋ ナレーション（続けて読まれた文はそのまま。hold の文の後だけ間を足す）＋ tail」。
// ナレーションの配置は narrationTiming.json（npm run consulting:import が作成）。無い文は文字数から仮算出。
// minSeconds に満たない場合は末尾を延ばす（0 なら延ばさない）。

import type {ConsultingScript} from './types';

export const script: ConsultingScript = {
  meta: {
    title: 'コンサルティング営業体験',
    fps: 30,
    width: 1920,
    height: 1080,
    secondsPerChar: 0.15,
    minLineSeconds: 1.0,
    speed: 1.2,
    fadeSeconds: 0.25,
    narrator: '音読さん',
    narrationDir: 'consulting/audio/narration',
    audioExt: 'mp3',
    bgmFile: 'consulting/audio/bgm.mp3',
    bgmVolume: 0.3,
    bgmDuck: 0.5,
    emphasis: ['本当の課題', '課題', '聞く', '聞き', '考える', '考え', '提案'],
  },
  scenes: [
    {
      id: 'Scene01Opening',
      name: 'オープニング',
      minSeconds: 0,
      leadIn: 1.5,
      tail: 0.3,
      narration: [
        {id: 'S01_01', text: '「営業」と聞いて、', subtitles: ['「営業」と聞いて、']},
        {
          id: 'S01_02',
          text: '皆さんはどんな仕事を想像するでしょうか。',
          subtitles: ['皆さんはどんな仕事を', '想像するでしょうか。'], hold: 0.4},
        {id: 'S01_03', text: '商品を紹介する。', subtitles: ['商品を紹介する。']},
        {id: 'S01_04', text: '価格を伝える。', subtitles: ['価格を伝える。']},
        {
          id: 'S01_05',
          text: 'もちろん、それも営業の仕事です。',
          subtitles: ['もちろん、それも', '営業の仕事です。'],
        },
        {
          id: 'S01_06',
          text: 'でも、オプテックス・エフエーの営業は、',
          subtitles: ['でも、', 'オプテックス・エフエーの営業は、'],
        },
        {id: 'S01_07', text: 'それだけではありません。', subtitles: ['それだけではありません。']},
      ],
      visual: {
        coverImage: 'consulting/images/cover.webp',
        oldImage: [
          {label: '商品を紹介する', icon: 'box'},
          {label: '価格を伝える', icon: 'price'},
        ],
        statement: 'それだけではない。',
      },
      animation: {
        showOldImage: [{at: 'S01_03', offset: -0.3}, {at: 'S01_04', offset: -0.2}],
        showCheck: {at: 'S01_05'},
        showStatement: {at: 'S01_07', offset: -0.1},
      },
    },
    {
      id: 'Scene02WhatIsSales',
      name: '営業とは',
      minSeconds: 0,
      leadIn: 1.0,
      tail: 0.8,
      narration: [
        {id: 'S02_01', text: 'お客様の話を聞き、', subtitles: ['お客様の話を聞き、']},
        {
          id: 'S02_02',
          text: '現場で何が起きているのかを整理し、',
          subtitles: ['現場で何が起きているのか', 'を整理し、'],
        },
        {id: 'S02_03', text: '本当の課題を考え、', subtitles: ['本当の課題を考え、']},
        {id: 'S02_04', text: '最適な解決策を提案する。', subtitles: ['最適な解決策を提案する。'], hold: 0.3},
        {id: 'S02_05', text: 'これが今回体験してもらう、', subtitles: ['これが今回体験してもらう、']},
        {id: 'S02_06', text: 'コンサルティング営業です。', subtitles: ['コンサルティング営業です。']},
      ],
      visual: {
        from: '売る',
        steps: [
          {label: '聞く'},
          {label: '考える', note: '何が起きているか'},
          {label: '課題を見つける'},
          {label: '提案する'},
        ],
        conclusion: 'コンサルティング営業',
      },
      animation: {
        strike: {at: 'sceneStart', offset: 0.4},
        steps: [{at: 'S02_01'}, {at: 'S02_02'}, {at: 'S02_03'}, {at: 'S02_04'}],
        conclusion: {at: 'S02_05'},
      },
    },
    {
      id: 'Scene03Mission',
      name: 'MISSION',
      minSeconds: 0,
      leadIn: 1.2,
      tail: 0.8,
      narration: [
        {id: 'S03_01', text: '今回のお客様は、飲料工場です。', subtitles: ['今回のお客様は、', '飲料工場です。']},
        {
          id: 'S03_02',
          text: 'コンベア上を、中身の入ったペットボトルが次々と流れています。',
          subtitles: ['コンベア上を、', '中身の入ったペットボトルが', '次々と流れています。'],
        },
        {
          id: 'S03_03',
          text: '工場では光電センサを使って、ペットボトルの本数をカウントしています。',
          subtitles: ['工場では光電センサを使って、', 'ペットボトルの本数を', 'カウントしています。'], hold: 0.3},
        {id: 'S03_04', text: 'ところが最近、', subtitles: ['ところが最近、']},
        {id: 'S03_05', text: 'センサが時々誤動作し、', subtitles: ['センサが時々誤動作し、']},
        {
          id: 'S03_06',
          text: '実際よりも多くカウントしてしまう',
          subtitles: ['実際よりも多く', 'カウントしてしまう'],
        },
        {id: 'S03_07', text: 'という問題が起きています。', subtitles: ['という問題が起きています。']},
      ],
      visual: {
        label: 'MISSION',
        title: '飲料工場の生産トラブルを解決せよ。',
        hud: {
          line: 'LINE 03 ｜ PET BOTTLE COUNT',
          actualLabel: '実際の本数',
          countLabel: 'センサのカウント',
          alert: '誤カウント発生',
        },
      },
      animation: {
        toFactory: {at: 'S03_02', offset: -0.4},
        showSensor: {at: 'S03_03'},
        showError: {at: 'S03_05'},
      },
    },
    {
      id: 'Scene04Question',
      name: '何を確認する？',
      minSeconds: 0,
      leadIn: 0.5,
      tail: 1.0,
      narration: [
        {id: 'S04_01', text: 'では、皆さんなら、', subtitles: ['では、皆さんなら、']},
        {id: 'S04_02', text: '最初に何を確認しますか？', subtitles: ['最初に何を確認しますか？'], hold: 1.5},
        {id: 'S04_03', text: 'センサの種類でしょうか。', subtitles: ['センサの種類でしょうか。']},
        {id: 'S04_04', text: 'ペットボトルの形でしょうか。', subtitles: ['ペットボトルの形でしょうか。']},
        {id: 'S04_05', text: '設置位置でしょうか。', subtitles: ['設置位置でしょうか。'], hold: 0.4},
        {id: 'S04_06', text: '実は、', subtitles: ['実は、']},
        {id: 'S04_07', text: 'ここからが営業の仕事です。', subtitles: ['ここからが営業の仕事です。']},
      ],
      visual: {
        question: 'あなたなら、\n何を確認しますか？',
        options: ['センサが悪い？', '透明だから？', '設置位置？', 'スピード？', 'ボトルの形状？'],
        message: 'ここからが、営業の仕事。',
      },
      animation: {
        options: {at: 'S04_02', edge: 'end', offset: 0.1},
        spoken: [
          {option: 0, cue: {at: 'S04_03'}},
          {option: 4, cue: {at: 'S04_04'}},
          {option: 2, cue: {at: 'S04_05'}},
        ],
        message: {at: 'S04_07', offset: -0.1},
      },
    },
    {
      id: 'Scene05CustomerGoal',
      name: 'お客様が実現したいこと',
      minSeconds: 0,
      leadIn: 0.5,
      tail: 3.5,
      narration: [
        {id: 'S05_01', text: '大切なのは、', subtitles: ['大切なのは、']},
        {
          id: 'S05_02',
          text: 'いきなり「このセンサを使いましょう」',
          subtitles: ['いきなり', '「このセンサを使いましょう」'],
        },
        {id: 'S05_03', text: 'と提案することではありません。', subtitles: ['と提案することではありません。'], hold: 0.3},
        {id: 'S05_04', text: 'まず確認するのは、', subtitles: ['まず確認するのは、']},
        {
          id: 'S05_05',
          text: '「お客様は本当は、何を実現したいのか」',
          subtitles: ['「お客様は本当は、', '何を実現したいのか」'],
        },
        {id: 'S05_06', text: 'ということです。', subtitles: ['ということです。']},
      ],
      visual: {
        left: 'センサを売る',
        right: 'お客様が\n実現したいことを考える',
        quote: 'ドリルを買いに来た人が欲しいのは、\nドリルではなく「穴」である。',
        quoteSource: 'マーケティングの格言',
      },
      animation: {
        left: {at: 'S05_02'},
        leftDown: {at: 'S05_03', edge: 'end'},
        right: {at: 'S05_05'},
        quote: {at: 'S05_06', edge: 'end', offset: 0.6},
      },
    },
    {
      id: 'Scene06Impact',
      name: '放っておくと何が起きる？',
      minSeconds: 0,
      leadIn: 0.5,
      tail: 1.0,
      narration: [
        {id: 'S06_01', text: 'さらに重要なのは、', subtitles: ['さらに重要なのは、']},
        {
          id: 'S06_02',
          text: 'その問題を放っておくと、何が起きるのか。',
          subtitles: ['その問題を放っておくと、', '何が起きるのか。'], hold: 0.4},
        {id: 'S06_03', text: 'カウントがずれる。', subtitles: ['カウントがずれる。']},
        {id: 'S06_04', text: '数量確認が必要になる。', subtitles: ['数量確認が必要になる。']},
        {id: 'S06_05', text: '人が確認する。', subtitles: ['人が確認する。']},
        {id: 'S06_06', text: '作業時間が増える。', subtitles: ['作業時間が増える。'], hold: 0.4},
        {
          id: 'S06_07',
          text: 'センサの問題に見えていたものが、',
          subtitles: ['センサの問題に', '見えていたものが、'],
        },
        {
          id: 'S06_08',
          text: '実は、生産性や作業負担の問題につながっているかもしれません。',
          subtitles: ['実は、', '生産性や作業負担の問題に', 'つながっているかもしれません。'],
        },
      ],
      visual: {
        chain: ['誤カウント', '数量が合わない', '確認作業が増える', '生産効率が下がる'],
        surfaceTag: {label: '見えている問題', text: 'センサの誤カウント'},
        rootTag: {label: '本当の課題', text: '生産性・作業負担'},
      },
      animation: {
        chain: [{at: 'S06_03'}, {at: 'S06_04'}, {at: 'S06_05'}, {at: 'S06_06'}],
        surface: {at: 'S06_07'},
        root: {at: 'S06_08', offset: 0.6},
      },
    },
    {
      id: 'Scene07YourMission',
      name: 'YOUR MISSION',
      minSeconds: 0,
      leadIn: 0.8,
      tail: 1.0,
      narration: [
        {id: 'S07_01', text: '皆さんにお願いするのは、', subtitles: ['皆さんにお願いするのは、']},
        {
          id: 'S07_02',
          text: 'センサを当てることではありません。',
          subtitles: ['センサを当てることではありません。'], hold: 0.4},
        {id: 'S07_03', text: 'お客様に質問し、', subtitles: ['お客様に質問し、']},
        {id: 'S07_04', text: '情報を集め、', subtitles: ['情報を集め、']},
        {id: 'S07_05', text: '本当の課題を考え、', subtitles: ['本当の課題を考え、']},
        {id: 'S07_06', text: '解決策を提案してください。', subtitles: ['解決策を提案してください。'], hold: 0.5},
        {
          id: 'S07_07',
          text: '最初の10分は、お客様へのヒアリングです。',
          speech: '最初のじゅっぷんは、お客様へのヒアリングです。',
          subtitles: ['最初の10分は、', 'お客様へのヒアリングです。'],
        },
      ],
      visual: {
        label: 'YOUR MISSION',
        negation: 'センサを当てるゲームではない',
        steps: [
          {label: '聞く', note: 'お客様に質問する'},
          {label: '考える', note: '情報を集め、何が起きているかを整理する'},
          {label: '課題を見つける', note: '本当の課題は何かを考える'},
          {label: '提案する', note: '解決策を提案する'},
        ],
        firstStep: {badge: 'FIRST 10 MIN', text: '最初の10分は、お客様へのヒアリング'},
      },
      animation: {
        negation: {at: 'S07_02'},
        steps: [{at: 'S07_03'}, {at: 'S07_04'}, {at: 'S07_05'}, {at: 'S07_06'}],
        firstStep: {at: 'S07_07'},
      },
    },
    {
      id: 'Scene08SensorOptions',
      name: 'センサの選択肢',
      minSeconds: 0,
      leadIn: 0.5,
      tail: 1.0,
      narration: [
        {id: 'S08_01', text: 'オプテックス・エフエーには、', subtitles: ['オプテックス・エフエーには、']},
        {
          id: 'S08_02',
          text: 'さまざまな検出方式のセンサがあります。',
          subtitles: ['さまざまな検出方式の', 'センサがあります。'],
        },
        {id: 'S08_03', text: 'しかし、', subtitles: ['しかし、']},
        {id: 'S08_04', text: 'どれが高性能か、ではありません。', subtitles: ['どれが高性能か、', 'ではありません。'], hold: 0.3},
        {id: 'S08_05', text: '今回のお客様には、', subtitles: ['今回のお客様には、']},
        {id: 'S08_06', text: 'どれが最適なのか。', subtitles: ['どれが最適なのか。']},
        {id: 'S08_07', text: 'それを考えるのが営業です。', subtitles: ['それを考えるのが営業です。']},
      ],
      visual: {
        heading: 'さまざまな検出方式',
        sensors: [
          {kind: 'through', name: '透過型', desc: '投光器と受光器の間で\n光がさえぎられると検出'},
          {kind: 'retro', name: '回帰反射型', desc: '反射板から戻る光が\nさえぎられると検出'},
          {kind: 'retroClear', name: '回帰反射型', sub: '透明体検出用', desc: 'わずかな光量の変化で\n透明な対象物を検出'},
          {kind: 'diffuse', name: '拡散反射型', desc: '対象物に当たって\n戻る光で検出'},
          {kind: 'bgs', name: '距離設定型', sub: 'BGS', desc: '設定距離より手前の\n対象物だけを検出'},
        ],
        wrong: 'どれが高性能か',
        right: '今回のお客様に、どれが最適か',
      },
      animation: {
        cards: {at: 'S08_02', offset: -0.2},
        wrong: {at: 'S08_04'},
        right: {at: 'S08_06', offset: -0.2},
      },
    },
    {
      id: 'Scene09Ending',
      name: 'エンディング',
      minSeconds: 0,
      leadIn: 0.6,
      tail: 3.0,
      narration: [
        {id: 'S09_01', text: 'それでは、', subtitles: ['それでは、']},
        {
          id: 'S09_02',
          text: 'オプテックス・エフエーの営業になったつもりで、',
          subtitles: ['オプテックス・エフエーの', '営業になったつもりで、'],
        },
        {
          id: 'S09_03',
          text: 'お客様の課題を解決してみましょう。',
          subtitles: ['お客様の課題を', '解決してみましょう。'],
        },
      ],
      visual: {
        catchCopy: ['現場の課題を見つけ、', '解決策を提案する。'],
        english: 'CONSULTING SALES EXPERIENCE',
        brand: 'OPTEX FA',
      },
      animation: {
        english: {at: 'S09_02'},
        brand: {at: 'S09_03', edge: 'end', offset: 0.3},
      },
    },
  ],
};
