// 各シーン部品が描ける種類（assets.json の kind / variant）。検証スクリプトと描画の両方が参照する
export const VARIANTS: Record<string, string[]> = {
  title: ['bridge'],
  factory: ['miscount', 'disturbed', 'wobble', 'overview-speed', 'overview', 'stopped-recount', 'manual-check', 'split-compare', 'side-detect'],
  sensor: ['existing', 'reflector-check', 'maker-question'],
  bottle: ['closeup-lightpath'],
  // 人物は「人物-表情」（sato / takahashi × uneasy・frown・cool・worried など）と、2人の場面
  customer: [
    'sato-uneasy',
    'sato-frown',
    'sato-worried',
    'sato-cool',
    'sato-thinking',
    'takahashi-cool',
    'takahashi-uneasy',
    'takahashi-thinking',
    'pair-thinking',
    'together',
  ],
  document: ['maintenance-log', 'weekly-counts', 'budget', 'catalog-generic', 'price', 'price-compare', 'test-plan', 'catalog-spec', 'catalog-pages', 'quote', 'new-sensor-flyer', 'catalog-send'],
  tech: ['transparent-light', 'isolation', 'chain', 'followup', 'message', 'signal-vs-plc', 'signal-log'],
  product: ['proposal', 'intro', 'intro-senior', 'exterior'],
  demo: ['bench', 'setup', 'normal', 'offset', 'gap', 'wobble', 'shape', 'setup-conditions'],
  applications: ['montage'],
  ending: ['main'],
};
