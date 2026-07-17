# C part-2 設計ノート — hint 付き reject 表（B1）

- Issue: #94（切り出し元: `_work/issues.md` #56-A・hub 裁定 2026-07-17「設計ノート先行・hub 推し=B1」）
- 状態: **提案**（実装は本ノート合意後・別 PR）。未確定事項は §4 に live で列挙。
- 前提: C part-1（#92 / PR #93・fallback 除去＝未知 namespace は loud reject）がマージ済みであること。

## 1. 問題の正確な形

part-1 が塞いだのは **fallback 経由の namespace 発明**（`--line-height-*`・`--z-*`・`--border-width-*` → loud reject 化）。残っているのは **fallback 非経由の silent 受理**:

- `--font-size-body` は `font`（v4 実在・**font-family** の namespace）が prefix 一致するため、classifyTokenName step 6 が `--font-x-size-body` へ x-送りして**受理**する。
- その意味論〔実測 tailwindcss 4.3.2・2026-07-18〕:

  ```css
  /* @theme { --font-x-size-body: 0.875rem; } の emit */
  .font-x-size-body { font-family: var(--font-x-size-body); }  /* ← font-family が 0.875rem */
  ```

  ＝ #17 のバグが font-size で生存している形（`_work/issues.md` #56-A の #50 HEAD 実測と一致・本ノートで追試）。payout origin/main が現に出荷中（参照 0 で実害無しは #163 が `.text-body`×34 を消していたから＝偶然）。

**一般形**: legacy 綴り `--<A>-<B>-<key>` で、A が v4 実在 namespace・`A-B` は非実在・意味論の正しい家が別 namespace C のとき、x-送りは黙って A に帰属させる。fallback 除去では直らない（fallback を通らない）。

## 2. B1 の設計 — hint 付き reject 表

### 形（実装イメージ・合意後に確定）

```ts
/** 意味論が既知で「別の家がある/家が無い」legacy prefix。x-送りに落とす前に reject し、hint を運ぶ。 */
export const LEGACY_PREFIX_HINTS: Readonly<
  Record<string, { hint: string | null; activeFrom?: 'now' | 'W3'; note: string }>
> = {
  'font-size':      { hint: 'text',     activeFrom: 'W3',  note: 'v4 の家は --text-*。再ホームは語彙裁定（第二波）' },
  'line-height':    { hint: 'leading',  activeFrom: 'now', note: 'part-1 で既に reject — hint を足すだけ' },
  'letter-spacing': { hint: 'tracking', activeFrom: 'now', note: '候補（フリート実測では未出現・予防的収載）' },
  'border-width':   { hint: null,       activeFrom: 'now', note: 'v4 に namespace 無し（border 幅は静的 utility）' },
  'z':              { hint: null,       activeFrom: 'now', note: '同上（z-index は静的 utility）' },
};
```

### 評価位置と reason 書式

- **B1 照合は namespace 照合（step 6）より前**（step 5.5）。`font-size` の先頭 `font` は v4 実在 prefix なので、後に置くと step 6 が先に食う — この順序自体をテストで pin する（§5）。
- 個別表（step 1）・契約/拡張（step 2）・除外 namespace（step 3）・color 規則（step 4）・shadow（step 5）の**後**。写像表に明示エントリがあれば常にそちらが勝つ（B1 は「表に裁定が無いときの止め方」）。
- reason 書式（hint あり）:

  `legacy token --font-size-body — '--font-size-*' は v4 では font-family の namespace に食われる（silent 受理は #56-A で禁止）。正しい家は '--text-*'。自動改名は W1 外観保存（07-14 裁定）に反するため行わない — 写像表に語彙裁定を追加せよ`

- **reject であって auto-rename ではない**理由: 送り先変更は「今黙っているものの起動」＝W1 受入条件「現行外観の保存」に反し、かつ機械導出不能で M-1 純度も満たせない（board 台帳 (C) 2026-07-15 施主裁定の線を維持）。

## 3. B2（typography 丸ごと第二波送り）不採用の記録

B2 ＝ typography カテゴリを写像から外し丸ごと第二波へ送る案。**不採用方向**（hub 2026-07-17・#56-A）:
第二波政策（board (C) 施主裁定 07-15・due 2026-08-21）の再審理になるうえ、W1 で現に必要な `--font-family-*` 系の x-送り（payout 実測 11 renames のうち3行）まで失う。本ノートで確認・確定を提案。

## 4. 未確定事項（live・裁定が要る）

1. **font-size の発火タイミング**（施主裁定事項）: `--font-size-*` は現行 W1 の x-送り対象（payout plan 実測に `--font-x-size-body`・`--font-x-size-heading` が入っている）。即時発火（`activeFrom: 'now'`）にすると **font-size を持つ全リポの W1 codemod が stop** する。
   - 案1 即時: 正しさ優先。「W1 で typography が reject されるのは仕様どおり」（#56-A の 07-16 裁定文言）とも整合。ただし W1 実走が写像表の語彙裁定待ちになる。
   - 案2 wave ゲート（**fleet 推し**）: font-size（と letter-spacing 型の「実在 prefix に食われる」系）のみ `activeFrom: 'W3'`。line-height/z/border-width は part-1 で既に reject 済み＝hint を足すだけで挙動不変（ゲート不能・§4-2）。
   - 案3 全部第二波: part-1 が既に reject 化した分を戻せない（発明枝はもう無い）ため**成立しない**。記録のみ。
2. **ゲートの意味論の非対称**（設計上の注意）: 非実在 prefix 系（line-height/z/border-width）は part-1 後の既定が reject なので、B1 は「reject に hint を足す」改良にしかならない。ゲートできるのは実在 prefix 系（font-size 等・現行 x-送りが生きている）のみ。`activeFrom` は後者にだけ意味を持つ。
3. **--z-\* / --border-width-\* の家**: v4 に namespace が無い（静的 utility）。選択肢は (a) plain var として @theme 外へ（宣言位置の移動＝製品 PR） (b) 除外 namespace 化（EXCLUDED_NAMESPACES 追加＝passthrough・経過措置の器） (c) 廃止。**(b) は「除外＝テーマ差し替え契約から外す」の R2⑥(A) 意味論と合うか要確認** — 裁定は実装 PR で。

## 5. longest-match 網羅の機械保証（確認込み）

- 実測（2026-07-18・本ノート作成時に機械列挙）: `TAILWIND_V4_NAMESPACES` 19 名のうち prefix-shadow 対は **`text-shadow`↔`text`・`font-weight`↔`font` の2対のみ**で、現順序はいずれも long-first ✓。
- ただし現状この不変条件は**表の並び順のコメント頼み**。B1 実装時に以下の性質テストを同梱する（手動確認を機械化）:

  ```ts
  it('multi-segment namespaces precede their prefixes (longest-match 網羅)', () => {
    const t = TAILWIND_V4_NAMESPACES;
    for (let i = 0; i < t.length; i++)
      for (let j = 0; j < t.length; j++)
        if (i !== j && t[i].startsWith(t[j] + '-')) expect(i).toBeLessThan(j);
  });
  ```

- 同型の pin を B1 に2本: (a) B1 照合が step 6 より前であること（`--font-size-body` が発火時 reject になる実挙動で pin） (b) B1 の prefix と v4 表の重複禁止（`font-size` は非実在だから載せられる — 実在 namespace を B1 に書いたら定義エラー）。
- 表の 19 名と tailwindcss 実バージョン（workspace 固定 4.3.2）の theme namespace 全列挙との突き合わせは、実装 PR で emit 実測により再確認する（#17 の教訓:「v4 意味論の思い込みをどこでも実測しない」状態を作らない）。

## 6. 実装スコープ案（合意後・別 PR・Issue 駆動）

1. `LEGACY_PREFIX_HINTS` 新設＋ step 5.5 照合＋ reason 書式（codemod-map.ts）
2. 性質テスト3本（§5）＋ hint 文言の pin ＋ payout 現物 fixture での発火時挙動
3. `CODEMOD_MAP_VERSION` minor bump・publish.md への挙動変更記載
4. §4-1（発火タイミング）と §4-3（z/border-width の家）の裁定を PR 前に hub 経由で施主上程
