#!/usr/bin/env node
/**
 * nene2-check CLI（規約 05 §5.1 C-1 — 製品側 package.json は "check": "nene2-check"）。
 *
 * W0a skeleton のサブコマンド:
 *   nene2-check conformance [--repo <name>] [--registries <path>] [--out <file>]
 *   nene2-check gate-integrity
 *   nene2-check init --scan [--out <file>] / init --check
 *   nene2-check standards-doc --docs <dir> [--out <json>] [--md <file>]
 *   nene2-check exemplars --docs <dir> [--root <dir>] [--out <json>] [--md <file>]
 *
 * 正準シーケンス（type-check → eslint → … → build — 05 §5.1）の駆動は W0b/W1 配線
 * （検査器の空虚合格を出荷しないため、未配線工程は conformance で unknown を出力する）。
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { validateConformance } from './conformance.js';
import { detectRepo } from './detect-repo.js';
import { checkExemplars, renderExemplarsMarkdown, type DocFile } from './exemplars.js';
import { checkGateIntegrity } from './gate-integrity.js';
import { initCheck, initScan, ledgersAlreadyInitialized } from './init-scan.js';
import { loadRegistries, runConformance } from './run.js';
import {
  auditStandardsDoc,
  enforcedEslintRuleIds,
  enforcedStylelintRuleIds,
  renderStandardsDocMarkdown,
} from './standards-doc.js';

interface Args {
  command: string;
  flags: Map<string, string | true>;
}

function parseArgs(argv: string[]): Args {
  const [command = 'conformance', ...rest] = argv;
  const flags = new Map<string, string | true>();
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a?.startsWith('--')) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags.set(key, next);
        i++;
      } else {
        flags.set(key, true);
      }
    }
  }
  return { command, flags };
}

/**
 * 規約文書の走査対象を固定列挙で読む: README.md ＋ 01〜05（00 は一次資料・規範ではない）。
 * 6 ファイル揃わない場合は null（fail-closed — 部分入力での空虚合格 MUST NOT）。
 */
function loadStandardsDocs(docsDir: string): { files: DocFile[]; provenance: string[] } | null {
  if (!existsSync(docsDir)) {
    console.error(`--docs のディレクトリが存在しない: ${docsDir}`);
    return null;
  }
  const entries = readdirSync(docsDir);
  const chapters = entries.filter((n) => /^0[1-5]-.*\.md$/.test(n)).sort();
  const names = ['README.md', ...chapters];
  if (!entries.includes('README.md') || chapters.length !== 5) {
    console.error(
      `規約文書が揃っていない（期待: README.md ＋ 01〜05 の 6 ファイル / 実測: ${names.join(', ') || 'なし'}）`,
    );
    return null;
  }
  const files: DocFile[] = [];
  const provenance: string[] = [];
  for (const name of names) {
    const content = readFileSync(path.join(docsDir, name), 'utf8');
    files.push({ path: name, content });
    provenance.push(
      `${name} sha256=${createHash('sha256').update(content).digest('hex').slice(0, 16)}`,
    );
  }
  return { files, provenance };
}

function stateToExit(state: 'green' | 'red' | 'unknown'): number {
  return state === 'green' ? 0 : state === 'red' ? 1 : 2;
}

async function main(): Promise<number> {
  const { command, flags } = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const registriesPath =
    typeof flags.get('registries') === 'string' ? String(flags.get('registries')) : undefined;
  const repo = typeof flags.get('repo') === 'string' ? String(flags.get('repo')) : detectRepo(cwd);

  switch (command) {
    case 'conformance': {
      const vector = await runConformance({ cwd, repo, registriesPath });
      const schemaErrors = validateConformance(vector);
      if (schemaErrors.length > 0) {
        // 自分の出力が schema 違反 = 実装バグ。fail-closed で異常終了
        console.error('conformance 出力が schema 違反:');
        for (const e of schemaErrors) console.error(`- ${e}`);
        return 2;
      }
      const json = JSON.stringify(vector, null, 2);
      const out = flags.get('out');
      if (typeof out === 'string') writeFileSync(out, json + '\n');
      console.log(json);
      const reds = Object.entries(vector.keys).filter(([, v]) => v.state === 'red');
      const unknowns = Object.entries(vector.keys).filter(([, v]) => v.state === 'unknown');
      console.error(
        `\nconformance: red ${reds.length} / unknown ${unknowns.length} / ` +
          `green ${Object.values(vector.keys).filter((v) => v.state === 'green').length}` +
          '（出力自体は非 blocker — 該当キー green が Wave 検収の完了条件・M-3）',
      );
      return reds.length > 0 ? 1 : 0;
    }

    case 'gate-integrity': {
      const result = await checkGateIntegrity({ cwd });
      console.log(JSON.stringify(result, null, 2));
      return result.state === 'green' ? 0 : 1;
    }

    case 'init': {
      const { registries, error } = loadRegistries(registriesPath);
      if (registries === null) {
        console.error(`registries が読めない（fail-closed で中止）: ${error ?? 'unknown'}`);
        return 2;
      }
      if (flags.has('check')) {
        const report = await initCheck(cwd, repo, registries);
        console.log(JSON.stringify(report, null, 2));
        const count = report.unregisteredClasses.length + report.unregisteredLegacyFiles.length;
        console.error(`init --check: 未分類 ${count} 件（styling green 条件は 0 件 — AM-10）`);
        return count > 0 ? 1 : 0;
      }
      if (!flags.has('scan')) {
        console.error('init は --scan（生成）か --check（読み取り専用再走査）を指定する');
        return 2;
      }
      // T-3: 対象台帳が既存なら実行拒否（生成はゲート導入 PR の一度きり）
      const already = ledgersAlreadyInitialized(registries, repo);
      if (already.legacyManifest) {
        console.error(
          `実行拒否: repo "${repo}" の legacy-manifest は台帳に既存（T-3 — 再走査は --check 読み取り専用のみ。` +
            'ラチェット一周リセット MUST NOT）',
        );
        return 2;
      }
      const out = flags.get('out');
      if (typeof out === 'string' && existsSync(out)) {
        console.error(`実行拒否: 出力先 ${out} が既存（上書きによる再凍結 MUST NOT）`);
        return 2;
      }
      const result = await initScan(cwd);
      const payload = JSON.stringify(
        {
          repo,
          generatedBy: 'nene2-check init --scan',
          allowedClasses: result.allowedClasses,
          legacyManifest: result.legacyManifest.map((e) => ({
            kind: 'legacy-manifest',
            repo,
            ...e,
          })),
        },
        null,
        2,
      );
      if (typeof out === 'string') writeFileSync(out, payload + '\n');
      console.log(payload);
      for (const a of result.advisories) console.error(`advisory: ${a}`);
      return 0;
    }

    case 'standards-doc': {
      const docsDir = flags.get('docs');
      if (typeof docsDir !== 'string') {
        console.error('--docs <dir>（規約文書 README＋01〜05 のディレクトリ）は必須');
        return 2;
      }
      const loaded = loadStandardsDocs(docsDir);
      if (loaded === null) return 2; // fail-closed（unknown 相当）
      // 照合対象の rule 集合は配布 config の実効定義（RAT-2 — 綴りの正本は配布 config）
      const { composedConfig } = await import('../index.js');
      const stylelintConfig = (await import('../stylelint/index.js')).default;
      const report = auditStandardsDoc(loaded.files, {
        eslintRuleIds: enforcedEslintRuleIds(composedConfig()),
        stylelintRuleIds: enforcedStylelintRuleIds(stylelintConfig),
      });
      const json = JSON.stringify(report, null, 2);
      const out = flags.get('out');
      if (typeof out === 'string') writeFileSync(out, json + '\n');
      const md = flags.get('md');
      if (typeof md === 'string') writeFileSync(md, renderStandardsDocMarkdown(report));
      console.log(json);
      for (const p of loaded.provenance) console.error(`input: ${p}`);
      for (const d of report.details) console.error(d);
      return stateToExit(report.state);
    }

    case 'exemplars': {
      const docsDir = flags.get('docs');
      if (typeof docsDir !== 'string') {
        console.error('--docs <dir>（規約文書 README＋01〜05 のディレクトリ）は必須');
        return 2;
      }
      const loaded = loadStandardsDocs(docsDir);
      if (loaded === null) return 2; // fail-closed（unknown 相当）
      const root = flags.get('root');
      const fleetRoot = path.resolve(typeof root === 'string' ? root : path.join(cwd, '..'));
      const report = checkExemplars({ files: loaded.files, fleetRoot });
      const json = JSON.stringify(report, null, 2);
      const out = flags.get('out');
      if (typeof out === 'string') writeFileSync(out, json + '\n');
      const md = flags.get('md');
      if (typeof md === 'string') writeFileSync(md, renderExemplarsMarkdown(report));
      console.log(json);
      for (const p of loaded.provenance) console.error(`input: ${p}`);
      for (const d of report.details) console.error(d);
      return stateToExit(report.state);
    }

    default:
      console.error(
        `未知のコマンド: ${command}（conformance / gate-integrity / init / standards-doc / exemplars）`,
      );
      return 2;
  }
}

main().then(
  (code) => process.exit(code),
  (e: unknown) => {
    console.error((e as Error).stack ?? String(e));
    process.exit(2);
  },
);
