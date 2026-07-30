// #193 の陽性対照フィクスチャ: **武装した未定義プラグインのルール**を持つ製品 config。
// ESLint は severity>0 のルールのプラグインを解決できないと config 読み込み自体を拒否するので
// （severity off なら通る＝#189 で実測）、これは crashed 分岐の決定的なトリガーになる。
export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { '@stylistic/lines-around-comment': 'error' },
  },
];
