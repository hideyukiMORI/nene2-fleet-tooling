/**
 * A1 codemod import rewrite の検出プローブ（AM-16 MUST — 正例・負例）。
 * 3リナ pre-stage（invoice/vault/deal）の特異ケースを負例として固定する。
 */
import { describe, expect, it } from 'vitest';
import jscodeshift from 'jscodeshift';

import transform, { moveKeyOf, rewriteHooksSegment } from './transform.js';

const tsx = jscodeshift.withParser('tsx');
function apply(source: string, movedHooks: string[]): string {
  const api = { jscodeshift: tsx, j: tsx, stats: () => {}, report: () => {} };
  return transform({ source, path: 'x.tsx' }, api as never, { movedHooks });
}

describe('A1 transform — 正例（move 対象への参照を書き換える）', () => {
  it('ui からの相対 import（別スライス）: ../<slice>/hooks/ → ../<slice>/model/', () => {
    const out = apply(
      `import { useDealDetailPage } from '../deal-detail/hooks/use-deal-detail-page';\n`,
      ['deal-detail/use-deal-detail-page'],
    );
    expect(out).toContain(`from '../deal-detail/model/use-deal-detail-page'`);
    expect(out).not.toContain('hooks/');
  });

  it('同一スライス内の相対 import: ./hooks/ → ./model/', () => {
    const out = apply(`import { useLogin } from './hooks/use-login';\n`, ['login/use-login']);
    expect(out).toContain(`from './model/use-login'`);
  });

  it('barrel re-export（export { … } from ./hooks/…）も書き換わる', () => {
    const out = apply(`export { useDocumentSearch } from './hooks/use-document-search';\n`, [
      'document-search/use-document-search',
    ]);
    expect(out).toContain(`from './model/use-document-search'`);
  });

  it('named export/import 識別子は不変（(a) move-only・リネームしない）', () => {
    const out = apply(`import { useLogin, type LoginPage } from './hooks/use-login';\n`, [
      'login/use-login',
    ]);
    expect(out).toContain('useLogin');
    expect(out).toContain('LoginPage');
  });
});

describe('A1 transform — 🔴 負例（保存すべきものを書き換えない）', () => {
  it('move 対象でない hook（deal use-kanban-dnd = DOM/interaction・fail-closed 保留）は保存', () => {
    const src = `import { useKanbanDnd } from '../hooks/use-kanban-dnd';\n`;
    // movedHooks に use-kanban-dnd を含めない（move 対象は use-kanban-board-page のみ）
    const out = apply(src, ['kanban-board/use-kanban-board-page']);
    expect(out).toBe(src); // 一切書き換えない
  });

  it('型のみ相対 import（deal DealDetailView）: import type を型のまま hooks→model', () => {
    const out = apply(
      `import type { DealDetailStatus } from '../deal-detail/hooks/use-deal-detail-page';\n`,
      ['deal-detail/use-deal-detail-page'],
    );
    expect(out).toContain('import type');
    expect(out).toContain(`from '../deal-detail/model/use-deal-detail-page'`);
  });

  it('export type（barrel の型 re-export・invoice template-bar）も型のまま書き換わる', () => {
    const out = apply(`export type { TemplateSnapshot } from './hooks/use-template-bar';\n`, [
      'template-bar/use-template-bar',
    ]);
    expect(out).toContain('export type');
    expect(out).toContain(`from './model/use-template-bar'`);
  });

  it('スライス跨ぎ @/ 絶対 import は対象外（相対のみ書き換える）', () => {
    const src = `import { useAuthToken } from '@/shared/auth/use-auth-token';\n`;
    const out = apply(src, ['auth/use-auth-token']);
    expect(out).toBe(src);
  });

  it('hooks/ でない相対 import（./model/ 既済・./lib/ 等）は触らない', () => {
    const src = `import { formatDate } from './lib/format-date';\n`;
    const out = apply(src, ['x/use-x']);
    expect(out).toBe(src);
  });

  it('movedHooks が空なら何も書き換えない（fail-safe）', () => {
    const src = `import { useLogin } from './hooks/use-login';\n`;
    expect(apply(src, [])).toBe(src);
  });
});

describe('A1 transform — ヘルパ単体', () => {
  it('moveKeyOf: 別スライス相対', () => {
    expect(moveKeyOf('../deal-detail/hooks/use-deal-detail-page')).toBe(
      'deal-detail/use-deal-detail-page',
    );
  });
  it('moveKeyOf: 同一スライス相対はワイルドカード', () => {
    expect(moveKeyOf('./hooks/use-login')).toBe('*/use-login');
  });
  it('moveKeyOf: @/ 絶対・hooks 以外は null', () => {
    expect(moveKeyOf('@/shared/auth/use-auth-token')).toBeNull();
    expect(moveKeyOf('./lib/format')).toBeNull();
  });
  it('rewriteHooksSegment: hooks/use- → model/use-（basename 不変）', () => {
    expect(rewriteHooksSegment('../deal-detail/hooks/use-deal-detail-page')).toBe(
      '../deal-detail/model/use-deal-detail-page',
    );
    expect(rewriteHooksSegment('./hooks/use-login')).toBe('./model/use-login');
  });
});
