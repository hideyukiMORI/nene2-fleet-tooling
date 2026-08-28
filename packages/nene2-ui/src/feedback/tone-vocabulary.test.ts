import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * #486 — キットが自称する「1つの語彙」を、列挙ではなく導出で守る。
 *
 * 経緯: `success` は #422（Badge・0.17.0）と #457（Toast・0.18.0）で**部品を名指しして**
 * 足され、**2回とも `InlineAlert` が列挙から漏れた**。どちらの Issue もその部品としては
 * 完結しており、**どこも赤くならなかった**。型1「列挙で書いた検査は、列挙に無いものを
 * 緑にする」の現物。だから対策は「列挙を増やす」ではなく「導出する」。
 *
 * 🔴 **Issue #486 の受入条件は、字義どおりには成立しない。**
 * 「`tone` を持つ部品の集合」と「`success` を持つ部品の集合」の一致を求めていたが、
 * 全数で引くと `tone` は**2つの別々の軸**に使われている〔実測 2026-08-28 20:0x〕:
 *
 * | 部品 | `tone` の語彙 | 軸 |
 * | --- | --- | --- |
 * | `Badge` / `Button` | neutral, accent, danger, success, warn, info | 状態 |
 * | `ToastProvider` | info, success, danger | 状態 |
 * | `InlineAlert` | info, warn, danger（→ success） | 状態 |
 * | `Text` | **primary, muted** | **強調** |
 * | `ConfirmDialog` | **default, danger** | **意図** |
 *
 * `Text` に `success` は無意味で、`ConfirmDialog` の `danger` は「この操作は破壊的」であって
 * 結果の報告ではない。⇒ **一致を求める集合は「`tone` を持つ部品」ではない。**
 *
 * ここで使う導出はこう: **`info` と `danger` の両方を言える部品は、結果を報告している。
 * 結果には成功がある。** `Text`（どちらも無い）と `ConfirmDialog`（`info` が無い）は
 * 自動的に外れ、部品名を1つも書かずに済む。
 *
 * ⚠️ この規則は clear の提案であって fleet の裁定ではない。別の線引き（例: 語彙そのものを
 * 型として1本にする）を採るなら、この検査ごと差し替えてよい。**列挙に戻さないことだけが要点。**
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, '..');

/** コメントを先に落とす — docstring が語彙を例示しているので、拾うと偽の語が入る。 */
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) return [];
    return [full];
  });
}

/** `tone` の文字列リテラル合併を、宣言の形を問わず拾う（prop でも型エイリアスでも）。 */
function toneVocabularies(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of sourceFiles(SRC)) {
    const src = stripComments(readFileSync(file, 'utf8'));
    const patterns = [
      /\btone\??\s*:\s*((?:'[a-z-]+'\s*\|\s*)*'[a-z-]+')\s*;/g,
      /\btype\s+\w*Tone\w*\s*=\s*((?:'[a-z-]+'\s*\|\s*)*'[a-z-]+')\s*;/g,
    ];
    for (const re of patterns) {
      for (const m of src.matchAll(re)) {
        const words = [...m[1]!.matchAll(/'([a-z-]+)'/g)].map((w) => w[1]!);
        if (words.length > 1) found.set(path.basename(file), words);
      }
    }
  }
  return found;
}

describe('#486 the kit claims one vocabulary — derive it, do not list it', () => {
  const vocabularies = toneVocabularies();

  it('finds every tone vocabulary in the package (positive control on the extractor)', () => {
    // If the extractor silently stops matching, every assertion below passes on an empty
    // set. Anchor it on what is known to be there — including the two OTHER axes, so a
    // regression that drops half the files is visible here rather than as a quiet green.
    expect([...vocabularies.keys()].sort()).toEqual(
      [
        'Badge.tsx',
        'Button.tsx',
        'ConfirmDialog.tsx',
        'InlineAlert.tsx',
        'Text.tsx',
        'toast-context.ts',
      ].sort(),
    );
  });

  it('every component that reports an outcome can report a success', () => {
    const reportsOutcome = [...vocabularies.entries()].filter(
      ([, words]) => words.includes('info') && words.includes('danger'),
    );

    // Derived, not listed: the guard is that this set is non-empty and that all of it
    // carries `success`. Adding a fourth outcome surface without `success` fails here
    // without anyone remembering to add its name.
    expect(reportsOutcome.length).toBeGreaterThan(0);
    const missing = reportsOutcome.filter(([, words]) => !words.includes('success'));
    expect(missing.map(([file]) => file)).toEqual([]);
  });

  it('leaves the other two axes alone', () => {
    // Text is emphasis and ConfirmDialog is intent. Neither is an outcome, so neither is
    // required to carry `success` — and this states that on purpose, so a later reader
    // does not "fix" them into the outcome vocabulary.
    expect(vocabularies.get('Text.tsx')).toEqual(['primary', 'muted']);
    expect(vocabularies.get('ConfirmDialog.tsx')).toEqual(['default', 'danger']);
  });
});
