// 各シーン部品が描ける種類（assets.json の kind / variant）。検証スクリプトと描画の両方が参照する
export const VARIANTS: Record<string, string[]> = {
  factory: ['miscount', 'disturbed', 'wobble', 'overview-speed', 'overview', 'stopped-recount', 'manual-check'],
  sensor: ['existing'],
  bottle: ['closeup-lightpath'],
  customer: ['thinking', 'request', 'uneasy', 'bottles', 'worried', 'cool', 'together'],
  document: ['maintenance-log', 'production-log', 'budget', 'catalog-generic', 'price', 'test-plan', 'catalog-spec', 'quote'],
  tech: ['transparent-light', 'isolation', 'chain', 'followup', 'message'],
  product: ['proposal', 'intro'],
  demo: ['bench', 'normal', 'offset', 'gap', 'orientation', 'setup-conditions'],
  applications: ['montage'],
  ending: ['main'],
};
