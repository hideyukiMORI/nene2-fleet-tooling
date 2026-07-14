#!/usr/bin/env node
/**
 * AM-2 release gate wrapper — publish workflow から実行される（.github/workflows/publish.yml）。
 * 実装本体は packages/nene2-tokens/src/release-gate.ts（純関数・テスト同居）。
 * 前提: `npm run check`（type-check = tsc --build）で dist が生成済みであること。
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = (p) => pathToFileURL(path.join(root, 'packages/nene2-tokens/dist', p)).href;

const freezePath = path.join(root, 'packages/nene2-tokens/contract-freeze.json');
if (!existsSync(freezePath)) {
  console.error('AM-2 gate: contract-freeze.json が無い — fail-closed で publish 拒否');
  process.exit(1);
}
const freeze = JSON.parse(readFileSync(freezePath, 'utf8'));

let contract, codemod, gate;
try {
  contract = await import(dist('contract.js'));
  codemod = await import(dist('codemod-map.js'));
  gate = await import(dist('release-gate.js'));
} catch (e) {
  console.error('AM-2 gate: dist の読み込みに失敗（先に npm run check を実行） — fail-closed で publish 拒否');
  console.error(String(e));
  process.exit(1);
}

const result = gate.checkContractFreeze(
  freeze,
  {
    contractVersion: contract.CONTRACT_VERSION,
    colorKeys: contract.COLOR_KEYS,
    shadowKeys: contract.SHADOW_KEYS,
    codemodVersion: codemod.CODEMOD_MAP_VERSION,
  },
  { adrExists: (p) => existsSync(path.join(root, p)) },
);

if (!result.ok) {
  console.error('AM-2 release gate: FAIL');
  for (const f of result.failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `AM-2 release gate: PASS — contract ${contract.CONTRACT_VERSION} ` +
    `(color ${contract.COLOR_KEYS.length} + shadow ${contract.SHADOW_KEYS.length}) は凍結記録と一致 ` +
    `(frozen ${freeze.frozenAt} by ${freeze.approvedBy})`,
);
