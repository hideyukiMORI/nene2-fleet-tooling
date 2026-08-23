import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 🔴 .tsx を書き落とすと、テストは「無い」のではなく「**在るのに走らない**」状態になる。
    // 2026-08-23 に実際に踏んだ（#298 のレイアウト部品のレンダテスト12本が黙って0件扱いだった）。
    // 同じ日、prettier の format:check glob にも同じ .tsx 欠落があった（#294）。
    // .tsx を持つパッケージが1つも無い間は、どちらの穴も見えない。
    include: [
      'packages/*/src/**/*.test.ts',
      'packages/*/src/**/*.test.tsx',
      'packages/*/tests/**/*.test.ts',
      'packages/*/tests/**/*.test.tsx',
      'docs/**/*.test.ts',
    ],
    environment: 'node',
  },
});
