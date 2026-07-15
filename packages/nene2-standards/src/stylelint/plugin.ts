/**
 * @hideyukimori/nene2-standards/stylelint-plugin — custom rule 同梱 plugin（規約 05 §3.2）。
 *
 * 全ルール fail-closed（G-6）: 台帳由来の secondary option（allowlist / manifest）が
 * 未指定・空のときは「何も許可されていない」として全対象を FAIL にする
 * （検査不能を green にしない — 空虚合格禁止）。台帳の正本は fleet-tooling の registries/（G-7）。
 */
import stylelint, { type Rule } from 'stylelint';

import {
  classTokens,
  isInAnyLayer,
  isInLayer,
  layerParamsInclude,
  topLevelNodes,
} from './helpers.js';

const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

const NAMESPACE = 'nene2';

function ruleName(name: string): string {
  return `${NAMESPACE}/${name}`;
}

// ---------------------------------------------------------------------------
// nene2/no-unlayered-css — 無レイヤ CSS MUST NOT（会議R1⑨・R2⑥決定）
// ---------------------------------------------------------------------------
const noUnlayeredCssName = ruleName('no-unlayered-css');
const noUnlayeredCssMessages = ruleMessages(noUnlayeredCssName, {
  rejected: (selector: string) =>
    `無レイヤ CSS MUST NOT: "${selector}" は @layer の外にある（会議R1⑨決定。themes/*.css のみ override で除外）`,
});
const noUnlayeredCss: Rule = (primary) => (root, result) => {
  if (!validateOptions(result, noUnlayeredCssName, { actual: primary, possible: [true] })) return;
  root.walkRules((rule) => {
    // @keyframes のフレーム行はコンテナ側で判定される
    if (
      rule.parent?.type === 'atrule' &&
      /keyframes$/i.test((rule.parent as { name?: string }).name ?? '')
    ) {
      return;
    }
    if (!isInAnyLayer(rule)) {
      report({
        result,
        ruleName: noUnlayeredCssName,
        node: rule,
        message: noUnlayeredCssMessages.rejected(rule.selector),
      });
    }
  });
};
noUnlayeredCss.ruleName = noUnlayeredCssName;
noUnlayeredCss.messages = noUnlayeredCssMessages;

// ---------------------------------------------------------------------------
// nene2/no-theme-inline — @theme inline MUST NOT（会議R2⑥決定 — silent freeze 再現 Case C/E）
// ---------------------------------------------------------------------------
const noThemeInlineName = ruleName('no-theme-inline');
const noThemeInlineMessages = ruleMessages(noThemeInlineName, {
  rejected: () => '@theme inline MUST NOT（会議R2⑥決定 — silent freeze）。@theme を使う。',
});
const noThemeInline: Rule = (primary) => (root, result) => {
  if (!validateOptions(result, noThemeInlineName, { actual: primary, possible: [true] })) return;
  root.walkAtRules('theme', (atRule) => {
    if (/(^|\s)inline(\s|$)/.test(atRule.params)) {
      report({
        result,
        ruleName: noThemeInlineName,
        node: atRule,
        message: noThemeInlineMessages.rejected(),
      });
    }
  });
};
noThemeInline.ruleName = noThemeInlineName;
noThemeInline.messages = noThemeInlineMessages;

// ---------------------------------------------------------------------------
// nene2/data-theme-selector-location — [data-theme] セレクタは themes/*.css 内のみ（会議R2⑥決定）
// ---------------------------------------------------------------------------
const dataThemeLocationName = ruleName('data-theme-selector-location');
const dataThemeLocationMessages = ruleMessages(dataThemeLocationName, {
  rejected: (selector: string) =>
    `[data-theme] セレクタは themes/*.css 内のみ（会議R2⑥決定）: "${selector}"`,
});
const dataThemeSelectorLocation: Rule = (primary) => (root, result) => {
  if (!validateOptions(result, dataThemeLocationName, { actual: primary, possible: [true] })) {
    return;
  }
  root.walkRules((rule) => {
    if (rule.selector.includes('[data-theme')) {
      report({
        result,
        ruleName: dataThemeLocationName,
        node: rule,
        message: dataThemeLocationMessages.rejected(rule.selector),
      });
    }
  });
};
dataThemeSelectorLocation.ruleName = dataThemeLocationName;
dataThemeSelectorLocation.messages = dataThemeLocationMessages;

// ---------------------------------------------------------------------------
// nene2/layer-components-allowlist — @layer components は許可リスト完全一致列挙のみ
// （会議R4 AM-10決定・R5 修正: ルール内全 class トークン照合）
// ---------------------------------------------------------------------------
const componentsAllowlistName = ruleName('layer-components-allowlist');
const componentsAllowlistMessages = ruleMessages(componentsAllowlistName, {
  rejected: (token: string) =>
    `@layer components の class "${token}" は許可リスト（registries）に未登録（会議R4 AM-10決定 — 完全一致列挙・前方一致 MUST NOT）`,
});
const layerComponentsAllowlist: Rule<true, { allowedClasses?: string[] }> =
  (primary, secondary) => (root, result) => {
    if (
      !validateOptions(
        result,
        componentsAllowlistName,
        { actual: primary, possible: [true] },
        {
          actual: secondary,
          possible: { allowedClasses: [(v: unknown) => typeof v === 'string'] },
          optional: true,
        },
      )
    ) {
      return;
    }
    // fail-closed: 台帳未指定 = 空集合（G-6）
    const allowed = new Set(secondary?.allowedClasses ?? []);
    root.walkAtRules('layer', (atRule) => {
      if (!layerParamsInclude(atRule.params, 'components')) return;
      atRule.walkRules((rule) => {
        const tokens = classTokens(rule.selector);
        if (tokens.length === 0) {
          report({
            result,
            ruleName: componentsAllowlistName,
            node: rule,
            message: componentsAllowlistMessages.rejected(rule.selector),
          });
          return;
        }
        for (const token of tokens) {
          if (!allowed.has(token)) {
            report({
              result,
              ruleName: componentsAllowlistName,
              node: rule,
              message: componentsAllowlistMessages.rejected(token),
            });
          }
        }
      });
    });
  };
layerComponentsAllowlist.ruleName = componentsAllowlistName;
layerComponentsAllowlist.messages = componentsAllowlistMessages;

// ---------------------------------------------------------------------------
// nene2/layer-legacy-manifest-only — @layer legacy は manifest 列挙ファイルのみ（会議R3⑩M-2決定）
// ---------------------------------------------------------------------------
const legacyManifestName = ruleName('layer-legacy-manifest-only');
const legacyManifestMessages = ruleMessages(legacyManifestName, {
  rejected: (file: string) =>
    `@layer legacy は legacy manifest（registries）列挙ファイルのみ（会議R3⑩M-2決定 — 縮小単調）: ${file}`,
});
const layerLegacyManifestOnly: Rule<true, { files?: string[] }> =
  (primary, secondary) => (root, result) => {
    if (
      !validateOptions(
        result,
        legacyManifestName,
        { actual: primary, possible: [true] },
        {
          actual: secondary,
          possible: { files: [(v: unknown) => typeof v === 'string'] },
          optional: true,
        },
      )
    ) {
      return;
    }
    const manifestFiles = secondary?.files ?? [];
    const sourceFile = root.source?.input.file?.replaceAll('\\', '/');
    root.walkAtRules('layer', (atRule) => {
      // ブロックを持たない @layer 文は順序宣言（canonical cascade header の必須行 — AM-8(a)）
      // であり legacy レイヤへのルール投入ではない（#19）。@layer legacy { … } のみ manifest 制。
      if (atRule.nodes === undefined) return;
      if (!layerParamsInclude(atRule.params, 'legacy')) return;
      // fail-closed: ファイル名が特定できない（コード断片 lint）場合も未登録扱い
      const listed = sourceFile !== undefined && manifestFiles.some((f) => sourceFile.endsWith(f));
      if (!listed) {
        report({
          result,
          ruleName: legacyManifestName,
          node: atRule,
          message: legacyManifestMessages.rejected(sourceFile ?? '(unknown file)'),
        });
      }
    });
  };
layerLegacyManifestOnly.ruleName = legacyManifestName;
layerLegacyManifestOnly.messages = legacyManifestMessages;

// ---------------------------------------------------------------------------
// nene2/themes-token-only — テーマファイル（非 .components）token-only 文法（会議R4 AM-9決定）
// ---------------------------------------------------------------------------
const themesTokenOnlyName = ruleName('themes-token-only');
const themesTokenOnlyMessages = ruleMessages(themesTokenOnlyName, {
  badScope: (selector: string) =>
    `テーマファイルのトップレベルは登録スコープセレクタのみ（会議R4 AM-9決定）: "${selector}"`,
  badAtRule: (name: string) =>
    `テーマファイルに @${name} MUST NOT（会議R4 AM-9決定 — @layer base 混入等はここで落ちる）`,
  nonCustomProperty: (prop: string) =>
    `テーマブロック内は custom property 宣言のみ・通常プロパティ MUST NOT（会議R4 AM-9決定）: "${prop}"`,
  nested: () => 'テーマブロック内の入れ子ルール MUST NOT（会議R4 AM-9決定）',
});
const DEFAULT_SCOPE_PATTERN = /^\[data-theme=(['"])[^'"]+\1\]$/;
const themesTokenOnly: Rule<true, { additionalScopeSelectors?: string[] }> =
  (primary, secondary) => (root, result) => {
    if (
      !validateOptions(
        result,
        themesTokenOnlyName,
        { actual: primary, possible: [true] },
        {
          actual: secondary,
          possible: { additionalScopeSelectors: [(v: unknown) => typeof v === 'string'] },
          optional: true,
        },
      )
    ) {
      return;
    }
    // scoped-theme（registries 登録・例 records `.nene-public[data-theme]`）は additional で受ける
    const additional = new Set(secondary?.additionalScopeSelectors ?? []);
    for (const node of topLevelNodes(root)) {
      if (node.type === 'comment') continue;
      if (node.type === 'atrule') {
        // TH-02: 対になる .components.css の @import 行は正
        if (node.name === 'import') continue;
        // TH-03: ブランドテーマの @theme 直値ブロックは 0〜1 個の正（active.css から
        // import されるテーマでは 1 個必須）。nene2-tokens 配布の参照テーマが現物（#19）。
        // @theme inline は nene2/no-theme-inline の管轄（ここでは inline のみ badAtRule）。
        if (node.name === 'theme' && !/^inline\b/.test(node.params.trim())) {
          for (const child of node.nodes ?? []) {
            if (child.type === 'comment') continue;
            if (child.type === 'decl') {
              if (!child.prop.startsWith('--')) {
                report({
                  result,
                  ruleName: themesTokenOnlyName,
                  node: child,
                  message: themesTokenOnlyMessages.nonCustomProperty(child.prop),
                });
              }
              continue;
            }
            report({
              result,
              ruleName: themesTokenOnlyName,
              node: child,
              message: themesTokenOnlyMessages.nested(),
            });
          }
          continue;
        }
        report({
          result,
          ruleName: themesTokenOnlyName,
          node,
          message: themesTokenOnlyMessages.badAtRule(node.name),
        });
        continue;
      }
      if (node.type === 'decl') continue; // トップレベル宣言は CSS として不正 — parser 側の管轄
      if (node.type !== 'rule') continue;
      const selector = node.selector.trim();
      if (!DEFAULT_SCOPE_PATTERN.test(selector) && !additional.has(selector)) {
        report({
          result,
          ruleName: themesTokenOnlyName,
          node,
          message: themesTokenOnlyMessages.badScope(selector),
        });
        continue;
      }
      for (const child of node.nodes ?? []) {
        if (child.type === 'comment') continue;
        if (child.type === 'decl') {
          if (!child.prop.startsWith('--')) {
            report({
              result,
              ruleName: themesTokenOnlyName,
              node: child,
              message: themesTokenOnlyMessages.nonCustomProperty(child.prop),
            });
          }
          continue;
        }
        report({
          result,
          ruleName: themesTokenOnlyName,
          node: child,
          message: themesTokenOnlyMessages.nested(),
        });
      }
    }
  };
themesTokenOnly.ruleName = themesTokenOnlyName;
themesTokenOnly.messages = themesTokenOnlyMessages;

// ---------------------------------------------------------------------------
// nene2/layer-base-location — @layer base ブロックは base.css 内のみ（ST-08）
//
// AM-9 が themes を token-only に閉じたのと同型の**場所の閉鎖**。これが無いと ST-08 の
// element-only 閉文法は任意の css で `@layer base { .anything {} }` と書くだけで迂回でき、
// K-7（規約が用意したカスケード位置に任意スタイルを差し込める）が base 経由で再来する。
// ---------------------------------------------------------------------------
export const CANONICAL_BASE_ENTRY = 'src/shared/ui/theme/base.css';

/** ルート6レイヤ（ST-06 canonical header の順序宣言）。sub-layer 名への再利用は MUST NOT。 */
export const ROOT_LAYERS = [
  'theme',
  'base',
  'vendor',
  'legacy',
  'components',
  'utilities',
] as const;

const layerBaseLocationName = ruleName('layer-base-location');
const layerBaseLocationMessages = ruleMessages(layerBaseLocationName, {
  rejected: (file: string) =>
    `@layer base ブロックは ${CANONICAL_BASE_ENTRY} 内のみ（ST-08 — base の家は1つ。` +
    `index.css は canonical header＋@import のみ〔ST-06〕・themes/*.css は token-only〔AM-9〕）: ${file}`,
});
const layerBaseLocation: Rule<true, { file?: string }> = (primary, secondary) => (root, result) => {
  if (
    !validateOptions(
      result,
      layerBaseLocationName,
      { actual: primary, possible: [true] },
      {
        actual: secondary,
        possible: { file: [(v: unknown) => typeof v === 'string'] },
        optional: true,
      },
    )
  ) {
    return;
  }
  const baseEntry = secondary?.file ?? CANONICAL_BASE_ENTRY;
  const sourceFile = root.source?.input.file?.replaceAll('\\', '/');
  root.walkAtRules('layer', (atRule) => {
    // ブロックを持たない @layer 文は順序宣言（canonical cascade header の必須行 — AM-8(a)）
    // であり base レイヤへのルール投入ではない（#19 と同じ分界）。
    if (atRule.nodes === undefined) return;
    // 入れ子の `@layer base` は sub-layer（例 `components.base`）であって**ルート base
    // レイヤではない** — 場所違反ではなく「ルート名の sub-layer への再利用」であり、
    // 診断は no-reserved-sublayer-name の管轄（#33 で本ルールが誤検知し、nene-vault#212 が
    // sub-layer を base → main へ改名させられた実害の是正）。
    if (isInAnyLayer(atRule)) return;
    if (!layerParamsInclude(atRule.params, 'base')) return;
    // fail-closed: ファイル名が特定できない（コード断片 lint）場合も場所違反扱い
    const inBaseEntry = sourceFile !== undefined && sourceFile.endsWith(baseEntry);
    if (!inBaseEntry) {
      report({
        result,
        ruleName: layerBaseLocationName,
        node: atRule,
        message: layerBaseLocationMessages.rejected(sourceFile ?? '(unknown file)'),
      });
    }
  });
};
layerBaseLocation.ruleName = layerBaseLocationName;
layerBaseLocation.messages = layerBaseLocationMessages;

// ---------------------------------------------------------------------------
// nene2/no-reserved-sublayer-name — sub-layer 名にルート6レイヤ名を再利用 MUST NOT（ST-06）
//
// 根拠は実測（2026-07-15）: 配布ルールのうち layer-components-allowlist /
// layer-legacy-manifest-only / layer-base-location の3本は helpers の layerParamsInclude で
// **レイヤ名を額面どおり**に解釈する。sub-layer がルート名を再利用すると、この3本が
// 「別レイヤ」を対象レイヤと誤認する:
//   - `@layer components { @layer base { … } }`   → layer-base-location が誤検知（実測）
//   - `@layer components { @layer legacy { … } }` → layer-legacy-manifest-only が誤検知（実測）
// 名前を予約すれば「@layer の param に現れる base は常にルート base」が不変条件として保て、
// 3本とも祖先を辿らずに健全でいられる。nene-vault#212 は実際に main / responsive を採用済み。
// ---------------------------------------------------------------------------
const reservedSublayerName = ruleName('no-reserved-sublayer-name');
const reservedSublayerMessages = ruleMessages(reservedSublayerName, {
  rejected: (name: string) =>
    `sub-layer 名にルートレイヤ名 "${name}" を再利用 MUST NOT（ST-06 — ルート6レイヤ ` +
    `[${ROOT_LAYERS.join(', ')}] は予約語。"${name}" を sub-layer 名にすると ` +
    `"<親>.${name}" はルート "${name}" レイヤではないのに、レイヤ名を額面どおり照合する ` +
    `配布ルール〔layer-components-allowlist / layer-legacy-manifest-only / layer-base-location〕が` +
    `誤検知する。意匠上の別名〔main / responsive 等〕を使う）`,
});
const noReservedSublayerName: Rule = (primary) => (root, result) => {
  if (!validateOptions(result, reservedSublayerName, { actual: primary, possible: [true] })) return;
  root.walkAtRules('layer', (atRule) => {
    // ルート直下の @layer（順序宣言文・ルートレイヤブロック）は sub-layer ではない
    if (!isInAnyLayer(atRule)) return;
    // 入れ子の `@layer a, b;`（sub-layer 順序宣言）と `@layer a { … }` の両方を見る
    for (const raw of atRule.params.split(',')) {
      const name = raw.trim().split('.')[0]?.trim();
      if (name !== undefined && (ROOT_LAYERS as readonly string[]).includes(name)) {
        report({
          result,
          ruleName: reservedSublayerName,
          node: atRule,
          message: reservedSublayerMessages.rejected(name),
        });
      }
    }
  });
};
noReservedSublayerName.ruleName = reservedSublayerName;
noReservedSublayerName.messages = reservedSublayerMessages;

// ---------------------------------------------------------------------------
// nene2/base-element-only — base.css の閉文法（ST-08・AM-9 の双対）
//
// themes = custom property のみ・element 規則 MUST NOT（AM-9）
// base   = element 規則のみ・custom property MUST NOT（本ルール）
// の二領域で、両者は排他かつ網羅。class は @layer components の許可リスト制（AM-10）が
// 唯一の家であり、base に class を書けると許可リスト完全一致列挙が迂回できる（＝K-7 再来）。
// ---------------------------------------------------------------------------
const baseElementOnlyName = ruleName('base-element-only');
const baseElementOnlyMessages = ruleMessages(baseElementOnlyName, {
  badTopLevel: (desc: string) =>
    `base.css のトップレベルは @layer base ブロック1個とコメントのみ（ST-08 — ` +
    `@import による任意 CSS の呼び込み・無レイヤ規則を塞ぐ）: ${desc}`,
  badAtRule: (name: string) =>
    `base.css の @layer base 内に @${name} MUST NOT（ST-08 — 許可は @media / @supports のみ）`,
  badSelector: (selector: string, token: string) =>
    `base.css は element / universal セレクタのみ・class / id / 属性セレクタ MUST NOT（ST-08 — ` +
    `class の家は @layer components の許可リスト制〔AM-10 完全一致列挙〕。base に書けると迂回できる）: ` +
    `"${selector}" の "${token}"`,
  customProperty: (prop: string) =>
    `base.css に custom property 宣言 MUST NOT（ST-08 — トークンの家は themes/*.css の @theme。` +
    `AM-9 token-only の双対）: "${prop}"`,
});

/** element/universal 以外のセレクタ成分（class / id / 属性）を検出する。 */
function nonElementTokens(selector: string): string[] {
  const found: string[] = [];
  found.push(...classTokens(selector));
  found.push(...[...selector.matchAll(/#-?[A-Za-z_][\w-]*/g)].map((m) => m[0]));
  found.push(...[...selector.matchAll(/\[[^\]]*\]/g)].map((m) => m[0]));
  return found;
}

const baseElementOnly: Rule = (primary) => (root, result) => {
  if (!validateOptions(result, baseElementOnlyName, { actual: primary, possible: [true] })) return;

  // (1) トップレベルは @layer base ブロック（＋コメント）のみ
  let layerBlocks = 0;
  for (const node of topLevelNodes(root)) {
    if (node.type === 'comment') continue;
    if (node.type === 'atrule' && node.name === 'layer' && node.nodes !== undefined) {
      if (node.params.trim() !== 'base') {
        report({
          result,
          ruleName: baseElementOnlyName,
          node,
          message: baseElementOnlyMessages.badTopLevel(`@layer ${node.params}`),
        });
        continue;
      }
      layerBlocks++;
      if (layerBlocks > 1) {
        report({
          result,
          ruleName: baseElementOnlyName,
          node,
          message: baseElementOnlyMessages.badTopLevel('@layer base ブロックが2個以上'),
        });
      }
      continue;
    }
    report({
      result,
      ruleName: baseElementOnlyName,
      node,
      message: baseElementOnlyMessages.badTopLevel(
        node.type === 'atrule' ? `@${node.name}` : node.type === 'rule' ? node.selector : node.type,
      ),
    });
  }

  // (2) @layer base 内の at-rule は @media / @supports のみ（@keyframes / 入れ子 @layer / @import を塞ぐ）
  root.walkAtRules((atRule) => {
    if (atRule.parent?.type === 'root') return; // (1) の管轄
    if (atRule.name === 'media' || atRule.name === 'supports') return;
    report({
      result,
      ruleName: baseElementOnlyName,
      node: atRule,
      message: baseElementOnlyMessages.badAtRule(atRule.name),
    });
  });

  // (3) セレクタは element / universal のみ
  root.walkRules((rule) => {
    for (const token of nonElementTokens(rule.selector)) {
      report({
        result,
        ruleName: baseElementOnlyName,
        node: rule,
        message: baseElementOnlyMessages.badSelector(rule.selector, token),
      });
    }
  });

  // (4) custom property 宣言 MUST NOT（AM-9 の双対）
  root.walkDecls((decl) => {
    if (decl.prop.startsWith('--')) {
      report({
        result,
        ruleName: baseElementOnlyName,
        node: decl,
        message: baseElementOnlyMessages.customProperty(decl.prop),
      });
    }
  });
};
baseElementOnly.ruleName = baseElementOnlyName;
baseElementOnly.messages = baseElementOnlyMessages;

// ---------------------------------------------------------------------------
// nene2/all-rules-in-components-layer — .components 対は全ルール @layer components 内（AM-9）
// ---------------------------------------------------------------------------
const allInComponentsName = ruleName('all-rules-in-components-layer');
const allInComponentsMessages = ruleMessages(allInComponentsName, {
  rejected: (selector: string) =>
    `themes/*.components.css の全ルールは @layer components 内 MUST（会議R4 AM-9決定）: "${selector}"`,
});
const allRulesInComponentsLayer: Rule = (primary) => (root, result) => {
  if (!validateOptions(result, allInComponentsName, { actual: primary, possible: [true] })) return;
  root.walkRules((rule) => {
    if (
      rule.parent?.type === 'atrule' &&
      /keyframes$/i.test((rule.parent as { name?: string }).name ?? '')
    ) {
      return;
    }
    if (!isInLayer(rule, 'components')) {
      report({
        result,
        ruleName: allInComponentsName,
        node: rule,
        message: allInComponentsMessages.rejected(rule.selector),
      });
    }
  });
};
allRulesInComponentsLayer.ruleName = allInComponentsName;
allRulesInComponentsLayer.messages = allInComponentsMessages;

// ---------------------------------------------------------------------------

const plugins = [
  createPlugin(noUnlayeredCssName, noUnlayeredCss),
  createPlugin(noThemeInlineName, noThemeInline),
  createPlugin(dataThemeLocationName, dataThemeSelectorLocation),
  createPlugin(componentsAllowlistName, layerComponentsAllowlist),
  createPlugin(legacyManifestName, layerLegacyManifestOnly),
  createPlugin(layerBaseLocationName, layerBaseLocation),
  createPlugin(reservedSublayerName, noReservedSublayerName),
  createPlugin(baseElementOnlyName, baseElementOnly),
  createPlugin(themesTokenOnlyName, themesTokenOnly),
  createPlugin(allInComponentsName, allRulesInComponentsLayer),
];

export default plugins;
