import { describe, expect, it } from 'vitest';
import {
  COLOR_KEYS,
  CONTRACT_TOKENS,
  CONTRACT_VERSION,
  CONTRAST_PAIRS,
  SHADOW_KEYS,
  isContractTokenName,
  isExtensionTokenName,
} from './contract.js';

describe('Core Token Contract v1', () => {
  it('has exactly the 28 color keys decided in R2 ⑥(B) — spelling is byte-exact', () => {
    expect([...COLOR_KEYS]).toEqual([
      'surface',
      'surface-raised',
      'surface-overlay',
      'surface-sunken',
      'text-primary',
      'text-muted',
      'text-faint',
      'text-inverse',
      'border',
      'border-strong',
      'accent',
      'accent-hover',
      'accent-soft',
      'on-accent',
      'danger',
      'danger-soft',
      'on-danger',
      'success',
      'success-soft',
      'on-success',
      'warn',
      'warn-soft',
      'on-warn',
      'info',
      'info-soft',
      'on-info',
      'focus-ring',
      'scrim',
    ]);
    expect(COLOR_KEYS).toHaveLength(28);
  });

  it('has exactly the 4 shadow keys (AM-3)', () => {
    expect([...SHADOW_KEYS]).toEqual(['sm', 'md', 'lg', 'focus']);
  });

  it('CONTRACT_TOKENS exports names array (32) + version (AM-3)', () => {
    expect(CONTRACT_TOKENS.version).toBe('1.0');
    expect(CONTRACT_VERSION).toBe('1.0');
    expect(CONTRACT_TOKENS.names).toHaveLength(32);
    expect(CONTRACT_TOKENS.names[0]).toBe('--color-surface');
    expect(CONTRACT_TOKENS.names.at(-1)).toBe('--shadow-focus');
    expect(CONTRACT_TOKENS.categories).toEqual(['color', 'shadow']);
  });

  it('contract / extension name predicates', () => {
    expect(isContractTokenName('--color-text-primary')).toBe(true);
    expect(isContractTokenName('--color-primary')).toBe(false);
    expect(isContractTokenName('--shadow-focus')).toBe(true);
    expect(isExtensionTokenName('--color-x-approved')).toBe(true);
    expect(isExtensionTokenName('--shadow-x-glow')).toBe(true);
    expect(isExtensionTokenName('--color-approved')).toBe(false);

    // #49 回帰: multi-segment namespace。#35 が生成側を --font-weight-x-medium へ是正した後、
    // 検査側だけが独自 regex（cat 部 [a-z][a-z0-9]*）のままで**自分の生成物を拒否**していた
    expect(isExtensionTokenName('--font-weight-x-medium')).toBe(true);
    expect(isExtensionTokenName('--inset-shadow-x-glow')).toBe(true);
    expect(isExtensionTokenName('--text-shadow-x-sm')).toBe(true);

    // namespace は表の実在名のみ — color-text は v4 namespace ではない
    expect(isExtensionTokenName('--color-text-x-foo')).toBe(false);

    // font namespace の合法な拡張トークン名。codemod が今この形を生成しない（#17 で
    // --font-weight-x-medium へ是正）だけで、「旧実装が吐いた形だから拒否」ではない
    expect(isExtensionTokenName('--font-x-weight-medium')).toBe(true);
  });

  it('contrast pair table only references contract keys', () => {
    for (const p of CONTRAST_PAIRS) {
      expect(COLOR_KEYS).toContain(p.fg);
      expect(COLOR_KEYS).toContain(p.bg);
      expect([3, 4.5]).toContain(p.min);
    }
  });
});

describe('#49 — 生成側の出力を検査側が受理する（道具が自分の生成物を拒否しない）', () => {
  it('mapTokenName の x- 送り出力は isExtensionTokenName を通る', async () => {
    const { mapTokenName } = await import('./codemod-map.js');
    for (const src of [
      '--font-weight-medium',
      '--font-weight-bold',
      '--inset-shadow-glow',
      '--text-shadow-sm',
    ]) {
      const mapped = mapTokenName(src);
      const name = typeof mapped === 'string' ? mapped : (mapped?.name ?? null);
      expect(name, `${src} が写像されない`).not.toBeNull();
      expect(
        isExtensionTokenName(name as string),
        `生成側が ${src} → ${name} を出すのに検査側が拒否する`,
      ).toBe(true);
    }
  });

  it('EXTENSION_TOKEN_PATTERN は namespace 表から導出される（手書き regex へ戻さない）', async () => {
    const { TAILWIND_V4_NAMESPACES } = await import('./contract.js');
    for (const ns of TAILWIND_V4_NAMESPACES) {
      expect(isExtensionTokenName(`--${ns}-x-probe`), `${ns} が拡張形を作れない`).toBe(true);
    }
  });
});
