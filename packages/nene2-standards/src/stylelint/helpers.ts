import type {
  AtRule,
  ChildNode,
  Container,
  Document,
  Node,
  Root,
  Rule as PostcssRule,
} from 'postcss';

/** node の祖先の @layer 名を内→外の順で返す。 */
export function layerAncestorNames(node: Node): string[] {
  const names: string[] = [];
  let parent: Container | Document | undefined = node.parent;
  while (parent) {
    if (parent.type === 'atrule' && (parent as AtRule).name === 'layer') {
      const params = (parent as AtRule).params.trim();
      if (params) names.push(params);
    }
    parent = parent.parent;
  }
  return names;
}

/** @layer の params（`components` / `legacy, other` / `components.sub`）が name を含むか。 */
export function layerParamsInclude(params: string, name: string): boolean {
  return params
    .split(',')
    .map((s) => s.trim().split('.')[0])
    .includes(name);
}

/** node が名前 name の @layer 配下にあるか。 */
export function isInLayer(node: Node, name: string): boolean {
  return layerAncestorNames(node).some((params) => layerParamsInclude(params, name));
}

/** node が何らかの @layer 配下にあるか。 */
export function isInAnyLayer(node: Node): boolean {
  return layerAncestorNames(node).length > 0;
}

/** selector 中の class トークン（`.foo`）を列挙（AM-10: ルール内全 class トークン照合）。 */
export function classTokens(selector: string): string[] {
  return [...selector.matchAll(/\.-?[A-Za-z_][\w-]*/g)].map((m) => m[0]);
}

/** root 直下の子ノードを列挙。 */
export function topLevelNodes(root: Root): ChildNode[] {
  return root.nodes ?? [];
}

export type { AtRule, PostcssRule };
