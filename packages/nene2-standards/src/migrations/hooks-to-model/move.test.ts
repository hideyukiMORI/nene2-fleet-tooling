/**
 * A1 codemod の e2e 実証（fleet#66・pilot=vault 構造）。
 * 一時ディレクトリに vault 相当の hooks/ 構造を作り、applyA1 で実 move + import rewrite させて検証する。
 * 施主裁定①（07-17・DOM hook も (A) move）と 3リナ特異ケースを実ファイルで固定。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { applyA1, planMoves } from './move.js';

let tmp: string;
let src: string;

function write(rel: string, content: string): void {
  const abs = path.join(src, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
function read(rel: string): string {
  return readFileSync(path.join(src, rel), 'utf8');
}

beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), 'a1-pilot-'));
  src = path.join(tmp, 'frontend', 'src');
  // vault 相当: login(単純)・document-detail(型 re-export + 複数 hooks + ui 直 import)・kanban(DOM hook)
  write('features/login/hooks/use-login.ts', `export function useLogin() { return null; }\n`);
  write(
    'features/login/hooks/use-login.test.tsx',
    `import { useLogin } from './use-login';\ntest('x', () => useLogin());\n`,
  );
  write('features/login/index.ts', `export { useLogin } from './hooks/use-login';\n`);

  write(
    'features/document-detail/hooks/use-metadata-edit.ts',
    `export type OcrPrefill = { v: string };\nexport function useMetadataEdit() { return null; }\n`,
  );
  write(
    'features/document-detail/hooks/use-void-document.ts',
    `export function useVoidDocument() { return null; }\n`,
  );
  write(
    'features/document-detail/index.ts',
    `export type { OcrPrefill } from './hooks/use-metadata-edit';\nexport { useVoidDocument } from './hooks/use-void-document';\n`,
  );
  write(
    'features/document-detail/ui/DocumentDetailView.tsx',
    `import type { OcrPrefill } from '../hooks/use-metadata-edit';\nexport const V = (_: OcrPrefill) => null;\n`,
  );

  // DOM hook（施主裁定①で move 対象・barrel 非 re-export・ui 直 import）
  write(
    'features/kanban/hooks/use-kanban-dnd.ts',
    `export function useKanbanDnd() { return null; }\n`,
  );
  write(
    'features/kanban/ui/KanbanView.tsx',
    `import { useKanbanDnd } from '../hooks/use-kanban-dnd';\nexport const K = () => useKanbanDnd();\n`,
  );

  // スライス跨ぎ @/ 絶対 import（対象外）
  write('shared/auth/use-auth-token.ts', `export function useAuthToken() { return null; }\n`);
  write(
    'features/login/ui/LoginView.tsx',
    `import { useAuthToken } from '@/shared/auth/use-auth-token';\nexport const L = () => useAuthToken();\n`,
  );
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('A1 applyA1 — e2e（vault 構造 pilot）', () => {
  it('planMoves は全 hooks/use-*（実装＋test・DOM hook 含む）を拾う', () => {
    const moves = planMoves(path.join(src, 'features'));
    const files = moves.map((m) => `${m.slice}/${m.file}`).sort();
    expect(files).toEqual([
      'document-detail/use-metadata-edit.ts',
      'document-detail/use-void-document.ts',
      'kanban/use-kanban-dnd.ts', // DOM hook も対象（施主裁定①）
      'login/use-login.test.tsx',
      'login/use-login.ts',
    ]);
  });

  it('fs move: hooks/ → model/・空 hooks/ は削除', () => {
    applyA1(src);
    expect(existsSync(path.join(src, 'features/login/model/use-login.ts'))).toBe(true);
    expect(existsSync(path.join(src, 'features/login/model/use-login.test.tsx'))).toBe(true);
    expect(existsSync(path.join(src, 'features/login/hooks'))).toBe(false);
    expect(existsSync(path.join(src, 'features/kanban/model/use-kanban-dnd.ts'))).toBe(true);
  });

  it('barrel index.ts: export（型・値とも）が model/ へ追随', () => {
    applyA1(src);
    expect(read('features/login/index.ts')).toContain(`from './model/use-login'`);
    const dd = read('features/document-detail/index.ts');
    expect(dd).toContain(`export type { OcrPrefill } from './model/use-metadata-edit'`);
    expect(dd).toContain(`export { useVoidDocument } from './model/use-void-document'`);
  });

  it('🔴 ui の相対 import（型のみ・barrel 非経由）も model/ へ（deal 特異ケース）', () => {
    applyA1(src);
    const view = read('features/document-detail/ui/DocumentDetailView.tsx');
    expect(view).toContain('import type');
    expect(view).toContain(`from '../model/use-metadata-edit'`);
    expect(view).not.toContain('hooks/');
  });

  it('🔴 DOM hook の ui 直 import も追随（施主裁定①で move 対象）', () => {
    applyA1(src);
    expect(read('features/kanban/ui/KanbanView.tsx')).toContain(`from '../model/use-kanban-dnd'`);
  });

  it('test 内の相対 import（同一ディレクトリ ./use-*）は move でパス保存（書換不要）', () => {
    applyA1(src);
    // 実装と test が一緒に model/ へ動くので `./use-login` は相対のまま有効
    expect(read('features/login/model/use-login.test.tsx')).toContain(`from './use-login'`);
  });

  it('🔴 負例: @/ 絶対 import は書き換えない（shared は対象外）', () => {
    applyA1(src);
    expect(read('features/login/ui/LoginView.tsx')).toContain(
      `from '@/shared/auth/use-auth-token'`,
    );
    expect(existsSync(path.join(src, 'shared/auth/use-auth-token.ts'))).toBe(true);
  });

  it('dryRun: fs を触らず plan だけ返す', () => {
    const r = applyA1(src, { dryRun: true });
    expect(r.dryRun).toBe(true);
    expect(r.moves.length).toBe(5);
    expect(existsSync(path.join(src, 'features/login/hooks/use-login.ts'))).toBe(true); // 動いていない
  });

  it('🔴 変異で赤: movedHooks を落とす経路（planMoves が空）だと ui import が hooks/ のまま残る', () => {
    // features ディレクトリを誤って空にした想定（＝move 対象 0）で import が追随しないことを実証
    const emptyRoot = path.join(tmp, 'empty', 'src');
    mkdirSync(path.join(emptyRoot, 'features'), { recursive: true });
    writeFileSync(
      path.join(emptyRoot, 'stray.tsx'),
      `import { useLogin } from '../features/login/hooks/use-login';\n`,
    );
    const r = applyA1(emptyRoot);
    expect(r.moves).toHaveLength(0);
    // move 対象が無いので import は書き換わらない＝「codemod が走ったのに壊れたまま」を検出できる形
    expect(readFileSync(path.join(emptyRoot, 'stray.tsx'), 'utf8')).toContain('hooks/use-login');
  });
});
