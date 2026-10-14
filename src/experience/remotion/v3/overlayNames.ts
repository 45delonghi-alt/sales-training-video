// 重ねる情報（overlay）の一覧。検証スクリプトと描画（Overlays.tsx）の両方が参照する
export const OVERLAYS = [
  'talk', 'talk-card', 'title', 'miscount', 'figures', 'chart', 'sensor-existing', 'beam', 'sensor-check', 'line-walk',
  'cause-wobble', 'cause-gap', 'control', 'compare-plc', 'signal-double', 'isolation', 'burden', 'chain', 'issues3',
  'product', 'setup', 'criteria', 'demo-normal', 'demo-wobble', 'demo-gap', 'demo-height', 'result', 'next-actions',
  'followup', 'message', 'closing', 'ending',
] as const;
