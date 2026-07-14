import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COLOR_KEYS, CONTRACT_VERSION, SHADOW_KEYS } from './contract.js';
import { CODEMOD_MAP_VERSION } from './codemod-map.js';
import {
  FROZEN_CONTRACT_VERSION,
  checkContractFreeze,
  type CurrentContract,
  type FreezeRecord,
} from './release-gate.js';

const freezeJson = new URL('../contract-freeze.json', import.meta.url);
const freeze = JSON.parse(readFileSync(freezeJson, 'utf8')) as FreezeRecord;

const current: CurrentContract = {
  contractVersion: CONTRACT_VERSION,
  colorKeys: COLOR_KEYS,
  shadowKeys: SHADOW_KEYS,
  codemodVersion: CODEMOD_MAP_VERSION,
};

describe('AM-2 release gate（契約凍結）', () => {
  it('凍結記録 contract-freeze.json は実装と完全一致（v1.0 凍結の生きた検査）', () => {
    const result = checkContractFreeze(freeze, current);
    expect(result.failures).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('凍結記録のメタは承認事実と一致', () => {
    expect(freeze.contract).toBe(FROZEN_CONTRACT_VERSION);
    expect(freeze.frozenAt).toBe('2026-07-14');
    expect(freeze.approvedBy).toBe('hide');
    expect(freeze.record).toBe('docs/contract-freeze-review-2026-07-18.md');
    // v1.0 凍結時点では ADR 経路は未使用
    expect(freeze.adr).toBeNull();
    expect(freeze.codemod).toBeNull();
  });

  it('故意 fail: キー削除は publish 拒否', () => {
    const result = checkContractFreeze(freeze, {
      ...current,
      colorKeys: COLOR_KEYS.filter((k) => k !== 'text-faint'),
    });
    expect(result.ok).toBe(false);
    expect(result.failures.join('\n')).toContain('text-faint');
    expect(result.failures.join('\n')).toContain('stop-the-line ADR');
  });

  it('故意 fail: キー追加（凍結記録未更新）は publish 拒否', () => {
    const result = checkContractFreeze(freeze, {
      ...current,
      colorKeys: [...COLOR_KEYS, 'brand-secondary'],
    });
    expect(result.ok).toBe(false);
    expect(result.failures.join('\n')).toContain('brand-secondary');
  });

  it('故意 fail: 正準順の入れ替えも拒否（順序は themegen 決定性の入力）', () => {
    const swapped = [...SHADOW_KEYS];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    const result = checkContractFreeze(freeze, { ...current, shadowKeys: swapped });
    expect(result.ok).toBe(false);
    expect(result.failures.join('\n')).toContain('正準順');
  });

  it('故意 fail: 契約版だけ上げて凍結記録を更新しない publish は拒否', () => {
    const result = checkContractFreeze(freeze, { ...current, contractVersion: '1.1' });
    expect(result.ok).toBe(false);
    expect(result.failures.join('\n')).toContain('CONTRACT_VERSION');
  });

  it('進化経路: 契約が 1.0 から動くとき ADR と codemod 版の同梱が必須（欠落は拒否）', () => {
    const evolved: FreezeRecord = {
      ...freeze,
      contract: '1.1',
      color: [...freeze.color, 'brand-secondary'],
      adr: null,
      codemod: null,
    };
    const evolvedCurrent: CurrentContract = {
      contractVersion: '1.1',
      colorKeys: [...COLOR_KEYS, 'brand-secondary'],
      shadowKeys: SHADOW_KEYS,
      codemodVersion: '1.1.0',
    };
    const result = checkContractFreeze(evolved, evolvedCurrent);
    expect(result.ok).toBe(false);
    expect(result.failures.join('\n')).toContain('adr 必須');
    expect(result.failures.join('\n')).toContain('codemod 3点セット');
  });

  it('進化経路: ADR パスが実在しなければ fail-closed（adrExists 未指定も不在扱い）', () => {
    const evolved: FreezeRecord = {
      ...freeze,
      contract: '1.1',
      adr: 'docs/adr/0001-contract-1.1.md',
      codemod: '1.1.0',
    };
    const evolvedCurrent: CurrentContract = {
      ...current,
      contractVersion: '1.1',
      codemodVersion: '1.1.0',
    };
    expect(checkContractFreeze(evolved, evolvedCurrent).ok).toBe(false);
    expect(
      checkContractFreeze(evolved, evolvedCurrent, { adrExists: () => false }).failures.join('\n'),
    ).toContain('実在しない');
  });

  it('進化経路: ADR 実在＋codemod 版一致＋記録更新済みなら通る（最小ゲートの通過形）', () => {
    const evolved: FreezeRecord = {
      ...freeze,
      contract: '1.1',
      adr: 'docs/adr/0001-contract-1.1.md',
      codemod: '1.1.0',
    };
    const evolvedCurrent: CurrentContract = {
      ...current,
      contractVersion: '1.1',
      codemodVersion: '1.1.0',
    };
    const result = checkContractFreeze(evolved, evolvedCurrent, { adrExists: () => true });
    expect(result.failures).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('進化経路: codemod 版の不一致は拒否', () => {
    const evolved: FreezeRecord = {
      ...freeze,
      contract: '1.1',
      adr: 'docs/adr/0001-contract-1.1.md',
      codemod: '1.1.0',
    };
    const result = checkContractFreeze(
      evolved,
      { ...current, contractVersion: '1.1', codemodVersion: '1.0.0' },
      { adrExists: () => true },
    );
    expect(result.ok).toBe(false);
    expect(result.failures.join('\n')).toContain('CODEMOD_MAP_VERSION');
  });
});
