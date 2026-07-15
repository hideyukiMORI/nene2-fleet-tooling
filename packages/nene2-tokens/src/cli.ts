#!/usr/bin/env node
/**
 * nene2-tokens CLI
 *
 *   nene2-tokens validate [--container [--container-selector <sel>]] [--parent <file>] <file...>
 *   nene2-tokens fill [--parent <file>] [--check] <file...>
 *   nene2-tokens plain <file>          # @theme → :root（stdout）
 *   nene2-tokens unplain <file>        # :root → @theme（stdout）
 *   nene2-tokens extract [--map common|origin|vault] <file>   # 写像適用済み JSON（stdout）
 *   nene2-tokens generate [--plain] <doc.json>                # JSON → テーマ CSS（stdout）
 *   nene2-tokens contract                                     # CONTRACT_TOKENS を JSON で出力
 *   nene2-tokens map                                          # CODEMOD_MAP_V1 を JSON で出力
 *   nene2-tokens codemod-plan --theme <theme.css> [--map <table>]
 *                                                             # 写像表から導出した rename 計画（stdout）
 *   nene2-tokens codemod --theme <theme.css> [--map <table>] [--check] <path...>
 *                                                             # TSX/TS の class・var(--) 位置を書き換え
 *
 * 終了コード: 0 = green / 1 = 違反あり / 2 = 検査不能（fail-closed — unknown は green ではない）
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import jscodeshift from 'jscodeshift';
import { CONTRACT_TOKENS } from './contract.js';
import { validateThemeSource, type ValidateOptions } from './validate.js';
import {
  extractTheme,
  fillSource,
  generateTheme,
  toPlain,
  toTheme,
  ThemegenError,
} from './themegen.js';
import { CODEMOD_MAP_V1, type MappingTableId } from './codemod-map.js';
import {
  CodemodError,
  buildPlan,
  buildRenameIndex,
  reentrantRenames,
  type CodemodPlan,
} from './codemod.js';
import { applyToSourceDetailed } from './codemod-transform.js';

interface Parsed {
  command: string;
  flags: Map<string, string | true>;
  files: string[];
}

function parseArgs(argv: string[]): Parsed {
  const [command = 'help', ...rest] = argv;
  const flags = new Map<string, string | true>();
  const files: string[] = [];
  const valued = new Set(['--parent', '--map', '--container-selector', '--theme', '--ext']);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a.startsWith('--')) {
      if (valued.has(a)) {
        const v = rest[++i];
        if (v === undefined) {
          console.error(`flag ${a} requires a value`);
          process.exit(2);
        }
        flags.set(a, v);
      } else {
        flags.set(a, true);
      }
    } else {
      files.push(a);
    }
  }
  return { command, flags, files };
}

function read(file: string): string {
  try {
    return readFileSync(file, 'utf8');
  } catch (e) {
    console.error(`cannot read ${file}: ${(e as Error).message} (fail-closed)`);
    process.exit(2);
  }
}

/** codemod: `--theme` から rename 計画を導出する（写像判断は写像表が正本）。 */
function planFrom(flags: Map<string, string | true>): CodemodPlan {
  const theme = flags.get('--theme');
  if (typeof theme !== 'string') {
    console.error(
      'codemod: --theme <theme css> is required — the rename plan is derived from the theme via the versioned mapping table (no mappings are invented here)',
    );
    process.exit(2);
  }
  const map = flags.get('--map');
  return buildPlan(read(theme), typeof map === 'string' ? (map as MappingTableId) : 'common');
}

/** 対象ソースを列挙する（node_modules / dist は除外）。 */
function* walkSources(root: string, exts: readonly string[]): Generator<string> {
  let st;
  try {
    st = statSync(root);
  } catch (e) {
    console.error(`cannot stat ${root}: ${(e as Error).message} (fail-closed)`);
    process.exit(2);
  }
  if (st.isFile()) {
    if (exts.some((x) => root.endsWith(x))) yield root;
    return;
  }
  for (const name of readdirSync(root).sort()) {
    if (name === 'node_modules' || name === 'dist') continue;
    const p = join(root, name);
    if (statSync(p).isDirectory()) yield* walkSources(p, exts);
    else if (exts.some((x) => name.endsWith(x))) yield p;
  }
}

function main(): void {
  const { command, flags, files } = parseArgs(process.argv.slice(2));

  switch (command) {
    case 'contract': {
      console.log(JSON.stringify(CONTRACT_TOKENS, null, 2));
      return;
    }
    case 'map': {
      console.log(JSON.stringify(CODEMOD_MAP_V1, null, 2));
      return;
    }
    case 'validate': {
      if (files.length === 0) {
        console.error('validate: no files given — refusing to report green on nothing (G-6)');
        process.exit(2);
      }
      const opts: ValidateOptions = {};
      if (flags.get('--container') === true) opts.container = true;
      const cs = flags.get('--container-selector');
      if (typeof cs === 'string') opts.containerSelector = cs;
      const parent = flags.get('--parent');
      if (typeof parent === 'string') opts.parentSource = read(parent);
      let errors = 0;
      let warnings = 0;
      for (const file of files) {
        const result = validateThemeSource(file, read(file), opts);
        for (const d of result.diagnostics) {
          const loc = d.line !== undefined ? `:${d.line}` : '';
          console.log(
            `${d.severity === 'error' ? 'ERROR' : 'WARN '} ${d.file}${loc} [${d.rule}] ${d.message}`,
          );
          if (d.severity === 'error') errors++;
          else warnings++;
        }
      }
      console.log(
        `validate:themes — ${files.length} file(s), ${errors} error(s), ${warnings} warning(s)`,
      );
      process.exit(errors > 0 ? 1 : 0);
      return;
    }
    case 'fill': {
      if (files.length === 0) {
        console.error('fill: no files given');
        process.exit(2);
      }
      const parent = flags.get('--parent');
      const parentSource = typeof parent === 'string' ? read(parent) : undefined;
      const checkOnly = flags.get('--check') === true;
      let dirty = 0;
      for (const file of files) {
        const source = read(file);
        const next = fillSource(source, parentSource);
        if (next !== source) {
          dirty++;
          if (checkOnly) {
            console.log(
              `STALE ${file} — fill region is not a fixed point (repair: npx nene2-tokens fill ${file})`,
            );
          } else {
            writeFileSync(file, next);
            console.log(`filled ${file}`);
          }
        }
      }
      process.exit(checkOnly && dirty > 0 ? 1 : 0);
      return;
    }
    case 'plain': {
      process.stdout.write(toPlain(read(files[0] ?? missing('file'))));
      return;
    }
    case 'unplain': {
      process.stdout.write(toTheme(read(files[0] ?? missing('file'))));
      return;
    }
    case 'extract': {
      const map = flags.get('--map');
      const doc = extractTheme(read(files[0] ?? missing('file')), {
        ...(typeof map === 'string' ? { map: map as MappingTableId } : {}),
      });
      console.log(JSON.stringify(doc, null, 2));
      return;
    }
    case 'generate': {
      const doc = JSON.parse(read(files[0] ?? missing('doc.json')));
      process.stdout.write(generateTheme(doc, { plain: flags.get('--plain') === true }));
      return;
    }
    case 'codemod-plan': {
      console.log(JSON.stringify(planFrom(flags), null, 2));
      return;
    }
    case 'codemod': {
      if (files.length === 0) {
        console.error('codemod: no paths given — refusing to report success on nothing (G-6)');
        process.exit(2);
      }
      const plan = planFrom(flags);
      const index = buildRenameIndex(plan);
      const extFlag = flags.get('--ext');
      const exts =
        typeof extFlag === 'string'
          ? extFlag.split(',').map((x) => (x.startsWith('.') ? x : `.${x}`))
          : ['.ts', '.tsx'];
      const checkOnly = flags.get('--check') === true;

      // M-1: 出力の出所を機械可読に開示する（PR 本文へ貼るための版表示）
      console.log(
        `${plan.codemod}@${plan.codemodVersion} (mapping table v${plan.mapVersion}, table='${plan.table}')`,
      );
      console.log(
        `plan: ${plan.tokenRenames.length} token rename(s) → ${plan.classRenames.length} class rename(s)`,
      );
      // 誤用（テーマ未移行のまま 2 回撃つ）で壊れる対を開示する — 正順なら 2 回目の計画は空になる
      const reentrant = reentrantRenames(index);
      if (reentrant.length > 0) {
        console.log(
          `NOTE  ${reentrant.length} rename(s) are re-entrant (e.g. ${reentrant[0]!.from} → ${reentrant[0]!.to} → …).`,
        );
        console.log(
          '      Run this codemod EXACTLY ONCE, then migrate the theme with `extract --map … | generate`.',
        );
        console.log(
          '      Re-running against an un-migrated theme double-applies them (see fleet-tooling#17).',
        );
      }
      for (const u of plan.unmapped) {
        console.log(`WARN  no class rename derived for ${u.from} → ${u.to}: ${u.reason}`);
      }
      if (index.size === 0) {
        console.log('codemod — nothing to rename (theme is already on contract vocabulary)');
        return;
      }

      const j = jscodeshift.withParser('tsx');
      let changed = 0;
      let total = 0;
      for (const path of files) {
        for (const file of walkSources(path, exts)) {
          const source = read(file);
          const out = applyToSourceDetailed(source, j, index);
          if (out === undefined || out.text === source) continue;
          changed++;
          total += out.count;
          if (checkOnly) console.log(`STALE ${file} (${out.count} replacement(s))`);
          else {
            writeFileSync(file, out.text);
            console.log(`${out.count}\t${file}`);
          }
        }
      }
      console.log(`codemod — ${changed} file(s), ${total} replacement(s)`);
      process.exit(checkOnly && changed > 0 ? 1 : 0);
      return;
    }
    default: {
      console.error(
        'usage: nene2-tokens <validate|fill|plain|unplain|extract|generate|contract|map|codemod|codemod-plan> …',
      );
      process.exit(command === 'help' ? 0 : 2);
    }
  }
}

function missing(what: string): never {
  console.error(`missing ${what}`);
  process.exit(2);
}

try {
  main();
} catch (e) {
  if (e instanceof ThemegenError || e instanceof CodemodError) {
    console.error(`ERROR ${e.message}`);
    process.exit(1);
  }
  console.error(`internal error (fail-closed): ${(e as Error).stack ?? e}`);
  process.exit(2);
}
