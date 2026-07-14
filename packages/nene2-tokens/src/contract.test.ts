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
  });

  it('contrast pair table only references contract keys', () => {
    for (const p of CONTRAST_PAIRS) {
      expect(COLOR_KEYS).toContain(p.fg);
      expect(COLOR_KEYS).toContain(p.bg);
      expect([3, 4.5]).toContain(p.min);
    }
  });
});
