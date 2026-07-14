// eslint-plugin-jsx-a11y は型定義を同梱しない（v6.10 実確認）— 最小 shim
declare module 'eslint-plugin-jsx-a11y' {
  import type { Linter } from 'eslint';
  const plugin: {
    flatConfigs: {
      recommended: Linter.Config;
      strict: Linter.Config;
    };
  };
  export default plugin;
}
