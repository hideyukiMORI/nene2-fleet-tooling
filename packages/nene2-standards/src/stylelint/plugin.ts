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
  createPlugin(themesTokenOnlyName, themesTokenOnly),
  createPlugin(allInComponentsName, allRulesInComponentsLayer),
];

export default plugins;
