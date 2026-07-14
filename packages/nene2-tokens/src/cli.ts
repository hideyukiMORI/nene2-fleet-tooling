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
 *
 * 終了コード: 0 = green / 1 = 違反あり / 2 = 検査不能（fail-closed — unknown は green ではない）
 */

import { readFileSync, writeFileSync } from 'node:fs';
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

interface Parsed {
  command: string;
  flags: Map<string, string | true>;
  files: string[];
}

function parseArgs(argv: string[]): Parsed {
  const [command = 'help', ...rest] = argv;
  const flags = new Map<string, string | true>();
  const files: string[] = [];
  const valued = new Set(['--parent', '--map', '--container-selector']);
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
    default: {
      console.error(
        'usage: nene2-tokens <validate|fill|plain|unplain|extract|generate|contract|map> …',
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
  if (e instanceof ThemegenError) {
    console.error(`ERROR ${e.message}`);
    process.exit(1);
  }
  console.error(`internal error (fail-closed): ${(e as Error).stack ?? e}`);
  process.exit(2);
}
