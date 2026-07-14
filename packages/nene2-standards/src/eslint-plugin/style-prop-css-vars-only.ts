/**
 * nene2/style-prop-css-vars-only — inline style 禁止・唯一の例外は CSS 変数注入
 * （意味論の正本: 規約 05 §2.2.4 補足＋03 §3 — 会議R1⑤・R5 AM-8(f)決定）。
 *
 * 許可形: DOM 要素の style={{ '--x': v }} で
 *   (a) 全キーが '--' 始まりの文字列リテラル
 *   (b) 値がリテラルの場合、リテラル色（hex / rgb() / oklch() / 名前色 等）でない
 *   (c) 値が非リテラルの場合、当該ファイルが registries 登録済み注入器（injectorFiles）である
 * それ以外の style prop は全て error。
 */
import type { Rule } from 'eslint';

const COLOR_FUNCTION_PATTERN =
  /^(#[0-9a-f]{3,8}\b|(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\()/i;

// CSS named colors（CSS Color Module Level 4 の全148語＋transparent/currentcolor）
const NAMED_COLORS = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue ' +
    'blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk ' +
    'crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki ' +
    'darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
    'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue ' +
    'dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite ' +
    'gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
    'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
    'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen ' +
    'lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen ' +
    'magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen ' +
    'mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream ' +
    'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
    'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
    'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown ' +
    'seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen ' +
    'steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow ' +
    'yellowgreen transparent currentcolor'
  ).split(' '),
);

function isColorLiteral(value: string): boolean {
  const v = value.trim().toLowerCase();
  return COLOR_FUNCTION_PATTERN.test(v) || NAMED_COLORS.has(v);
}

export const stylePropCssVarsOnly: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "style={{}} MUST NOT。唯一の例外は CSS 変数注入 style={{ '--x': v }}（会議R1⑤・R5 AM-8(f)決定）",
    },
    schema: [
      {
        type: 'object',
        properties: {
          injectorFiles: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      styleProp:
        "style={{}} MUST NOT。唯一の例外は CSS 変数注入 style={{ '--x': v }}（会議R1⑤決定）。",
      nonCssVarKey:
        "style オブジェクトのキーは '--' 始まりの文字列リテラルのみ（CSS 変数注入 — 会議R1⑤・R5 AM-8(f)決定）。",
      literalColor:
        'CSS 変数注入の値にリテラル色 MUST NOT。色はトークン（var(--color-*)）由来のみ（会議R4 AM-5決定）。',
      needsInjectorRegistration:
        '非リテラル値の CSS 変数注入は registries 登録済み注入器ファイルのみ（会議R4 AM-5決定 — fleet-tooling の registries/ へ登録 PR を出す）。',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as { injectorFiles?: string[] };
    const injectorFiles = options.injectorFiles ?? [];
    const filename = context.filename.replaceAll('\\', '/');
    const isRegisteredInjector = injectorFiles.some((f) => filename.endsWith(f));

    return {
      JSXAttribute(node: Rule.Node) {
        interface JsxNode {
          type: string;
          name?: { type: string; name?: string };
          value?: {
            type: string;
            expression?: { type: string; properties?: unknown[] };
          };
          parent?: { name?: { type: string; name?: string } };
        }
        const attr = node as unknown as JsxNode;
        if (attr.name?.type !== 'JSXIdentifier' || attr.name.name !== 'style') return;
        // DOM 要素のみ（react/forbid-dom-props と同じ射程 — コンポーネント prop は対象外）
        const elementName = attr.parent?.name;
        if (elementName?.type !== 'JSXIdentifier' || !/^[a-z]/.test(elementName.name ?? '')) {
          return;
        }

        const value = attr.value;
        if (
          value?.type !== 'JSXExpressionContainer' ||
          value.expression?.type !== 'ObjectExpression'
        ) {
          context.report({ node, messageId: 'styleProp' });
          return;
        }

        interface Prop {
          type: string;
          computed?: boolean;
          key?: { type: string; value?: unknown };
          value?: { type: string; value?: unknown };
        }
        for (const raw of value.expression.properties ?? []) {
          const prop = raw as Prop;
          const reportTarget = raw as unknown as Rule.Node;
          if (prop.type !== 'Property') {
            // SpreadElement 等 — 静的検査不能な形は fail-closed で拒否
            context.report({ node: reportTarget, messageId: 'nonCssVarKey' });
            continue;
          }
          const key = prop.key;
          const isCssVarKey =
            !prop.computed &&
            key?.type === 'Literal' &&
            typeof key.value === 'string' &&
            key.value.startsWith('--');
          if (!isCssVarKey) {
            context.report({ node: reportTarget, messageId: 'nonCssVarKey' });
            continue;
          }
          const propValue = prop.value;
          if (propValue?.type === 'Literal') {
            if (typeof propValue.value === 'string' && isColorLiteral(propValue.value)) {
              context.report({ node: reportTarget, messageId: 'literalColor' });
            }
          } else if (!isRegisteredInjector) {
            context.report({ node: reportTarget, messageId: 'needsInjectorRegistration' });
          }
        }
      },
    };
  },
};
