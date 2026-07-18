/**
 * registries スキーマ — kind 判別ユニオン（規約 05 §8.1 REG-1〜4・会議R5(5)決定）。
 *
 * - 単一スキーマ・1検査器・エントリ種ごとの宣言的政策表（REG-1）
 * - 2クラス政策（REG-3）: 負債台帳（legacy-manifest / lint-baseline）= 縮小単調／
 *   構造レジストリ（それ以外）= 中央 PR＋reason-ref 付きで追加可
 * - waiver は第4のエントリ種: until ≤90日・reason-ref 実在アンカー必須（REG-4(b)）
 * - kind 全列挙（会議R5(5)の9種＋scoped-theme）＋ transition（kind ラベル未決の経過措置 —
 *   規約 README §8 未解消リスト・批准レビュー送り。02 §11 の運用分類を保持するための仮 kind）
 *
 * 縮小単調検査（ratchet）自体は fleet-tooling CI の管轄（#17）— 本モジュールは
 * 形式検査（スキーマ・政策の静的条件）のみを提供する。
 */

export const REGISTRIES_SCHEMA_ID = 'nene2-registries/1';

/** 負債台帳 kind（縮小単調 — 追加・変更 FAIL・削除のみ可。green にはエントリ 0 が必要） */
export const DEBT_KINDS = ['legacy-manifest', 'lint-baseline', 'components-allowlist'] as const;

/** 構造レジストリ kind（恒久・中央 PR＋reason-ref で追加可・蒸し返し禁止） */
export const STRUCTURAL_KINDS = [
  'authorized-divergence',
  'injector',
  'widget-entry',
  'fonts',
  'testid-allowlist',
  'identical-allowlist',
  'scoped-theme',
] as const;

/** 経過措置（kind ラベル未決 — 批准レビュー送り。恒久登録ではない・due は board.txt 管理） */
export const TRANSITION_KIND = 'transition' as const;
export const WAIVER_KIND = 'waiver' as const;

export const ALL_KINDS = [
  ...DEBT_KINDS,
  ...STRUCTURAL_KINDS,
  TRANSITION_KIND,
  WAIVER_KIND,
] as const;

export type RegistryKind = (typeof ALL_KINDS)[number];

interface EntryBase {
  kind: RegistryKind;
  id: string;
  repo: string;
}

export interface AuthorizedDivergenceEntry extends EntryBase {
  kind: 'authorized-divergence';
  /** 実行可能登録の override 名（nene2.overrides.* — 散文登録 MUST NOT） */
  overrides?: string;
  /** 外部制約の出典（REG-4(a): 理由は外部制約由来のみ） */
  reasonRef: string;
  /** 再審トリガー（外部制約が消えた時点で削除する） */
  review: string;
}

export interface WaiverEntry extends EntryBase {
  kind: 'waiver';
  key: string;
  /** ≤90日（REG-4(b)）。失効判定は中央 rollup・リポ CI はスキーマ検査＋T-7 警告のみ */
  until: string;
  issuedOn: string;
  reasonRef: string;
}

export interface LegacyManifestEntry extends EntryBase {
  kind: 'legacy-manifest';
  path: string;
  /** pinned prettier 整形後の行数（AM-25': 初期値は init --scan 実測値・0 プレースホルダ MUST NOT） */
  maxLines: number;
  maxBytes: number;
}

export interface ComponentsAllowlistEntry extends EntryBase {
  kind: 'components-allowlist';
  /**
   * `@layer components` の grandfather 済みクラス（完全一致列挙 — 会議R4 AM-10決定）。
   * 初期値は `init --scan` 実測（手書き列挙 MUST NOT — G-7/AM-13(ii)）。縮小単調（REG-3 DEBT）＝
   * 新規クラスの追加 FAIL・削除のみ可（green は 0＝legacy 債務の完済）。repo 単位で1エントリ。
   * リポごとに統べる機構が違う: components-allowlist（vault/invoice）と legacy-manifest（deal）は
   * 兄弟 registry（deal は @layer legacy 包込のため本 kind のエントリを持たない・hub 裁定 2026-07-17）。
   */
  classes: string[];
}

export interface LintBaselineEntry extends EntryBase {
  kind: 'lint-baseline';
  rule: string;
  /**
   * (rule,file) 粒度の grandfather 対象ファイル（P2 §2・#99）。
   * - **在り** = CSS 構造ルールの per-file grandfather（stylelint 消費側=config 合成が file 単位で
   *   当該 rule を null 化する override を焼く。invoice 169 / deal 12 の緑化器）。
   * - **無し** = リポ全体の rule baseline（eslint noHardcodedJapanese 等・単一 file を持たない負債）。
   * ※ optional の理由: リポ全体 baseline（JP-lint）は単一 file を持たず、file 必須化は虚偽 file の強要になる。
   */
  file?: string;
  /** 凍結違反の件数（init --scan / ゲート導入 PR で実測生成。green には 0 が必要 — AM-14） */
  frozenCount: number | null;
  /** null = ゲート導入時に init --scan で生成（T-3）。生成前の座席登録を明示する */
  initializedBy: string;
}

export interface InjectorEntry extends EntryBase {
  kind: 'injector';
  files: string[];
  reasonRef: string;
}

export interface ScopedThemeEntry extends EntryBase {
  kind: 'scoped-theme';
  variant: 'widget' | 'local';
  /** widget: マウントルート要素／local: 局所スコープセレクタ */
  selector: string;
  reasonRef: string;
}

export interface WidgetEntryEntry extends EntryBase {
  kind: 'widget-entry';
  files: string[];
  reasonRef: string;
}

export interface FontsEntry extends EntryBase {
  kind: 'fonts';
  families: string[];
  reasonRef: string;
}

export interface TestidAllowlistEntry extends EntryBase {
  kind: 'testid-allowlist';
  testids: string[];
  reasonRef: string;
}

export interface IdenticalAllowlistEntry extends EntryBase {
  kind: 'identical-allowlist';
  keys: string[];
  reasonRef: string;
}

export interface TransitionEntry extends EntryBase {
  kind: 'transition';
  /** 経過措置の内容（02 §11 の分類が正本） */
  summary: string;
  /** 解消 Wave（due の正本は board.txt — M-4） */
  wave: string;
  reasonRef: string;
}

export type RegistryEntry =
  | AuthorizedDivergenceEntry
  | WaiverEntry
  | LegacyManifestEntry
  | ComponentsAllowlistEntry
  | LintBaselineEntry
  | InjectorEntry
  | ScopedThemeEntry
  | WidgetEntryEntry
  | FontsEntry
  | TestidAllowlistEntry
  | IdenticalAllowlistEntry
  | TransitionEntry;

export interface RegistriesDocument {
  schema: typeof REGISTRIES_SCHEMA_ID;
  entries: RegistryEntry[];
}

export interface RegistryDiagnostic {
  entryId: string;
  message: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const WAIVER_MAX_DAYS = 90;

/** jsonc（行コメント・ブロックコメント・末尾カンマ）を JSON.parse 可能な文字列へ落とす。 */
export function stripJsonc(source: string): string {
  let out = '';
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    const next = source[i + 1];
    if (inLine) {
      if (c === '\n') {
        inLine = false;
        out += c;
      }
      continue;
    }
    if (inBlock) {
      if (c === '*' && next === '/') {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inString) {
      out += c;
      if (c === '\\') {
        out += next ?? '';
        i++;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === '/' && next === '/') {
      inLine = true;
      i++;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlock = true;
      i++;
      continue;
    }
    out += c;
  }
  // 末尾カンマの除去（] } の直前）
  return out.replace(/,(\s*[}\]])/g, '$1');
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function requireString(
  entry: Record<string, unknown>,
  field: string,
  id: string,
  diags: RegistryDiagnostic[],
): void {
  const v = entry[field];
  if (typeof v !== 'string' || v.trim() === '') {
    diags.push({ entryId: id, message: `${field} は非空文字列 MUST` });
  }
}

function requireStringArray(
  entry: Record<string, unknown>,
  field: string,
  id: string,
  diags: RegistryDiagnostic[],
): void {
  const v = entry[field];
  if (!Array.isArray(v) || v.length === 0 || !v.every((x) => typeof x === 'string')) {
    diags.push({ entryId: id, message: `${field} は非空の文字列配列 MUST` });
  }
}

/**
 * 形式検査（fail-closed: パース不能・スキーマ外は全て diagnostics）。
 * 参照日 now は waiver の ≤90日検査に使う（未指定は現在時刻）。
 */
export function validateRegistries(source: string, now = new Date()): RegistryDiagnostic[] {
  const diags: RegistryDiagnostic[] = [];
  let doc: unknown;
  try {
    doc = JSON.parse(stripJsonc(source));
  } catch (e) {
    return [{ entryId: '(document)', message: `jsonc パース不能: ${(e as Error).message}` }];
  }
  if (!isRecord(doc))
    return [{ entryId: '(document)', message: 'ドキュメントはオブジェクト MUST' }];
  if (doc['schema'] !== REGISTRIES_SCHEMA_ID) {
    diags.push({ entryId: '(document)', message: `schema は "${REGISTRIES_SCHEMA_ID}" MUST` });
  }
  const entries = doc['entries'];
  if (!Array.isArray(entries)) {
    diags.push({ entryId: '(document)', message: 'entries は配列 MUST' });
    return diags;
  }
  const seen = new Set<string>();
  for (const raw of entries) {
    if (!isRecord(raw)) {
      diags.push({ entryId: '(unknown)', message: 'エントリはオブジェクト MUST' });
      continue;
    }
    const id = typeof raw['id'] === 'string' ? raw['id'] : '(no id)';
    requireString(raw, 'id', id, diags);
    requireString(raw, 'repo', id, diags);
    if (seen.has(id)) diags.push({ entryId: id, message: 'id 重複 MUST NOT' });
    seen.add(id);
    const kind = raw['kind'];
    if (typeof kind !== 'string' || !(ALL_KINDS as readonly string[]).includes(kind)) {
      diags.push({
        entryId: id,
        message: `kind "${String(kind)}" はスキーマ外（列挙: ${ALL_KINDS.join(', ')}）`,
      });
      continue;
    }
    switch (kind as RegistryKind) {
      case 'authorized-divergence':
        requireString(raw, 'reasonRef', id, diags);
        requireString(raw, 'review', id, diags);
        break;
      case 'waiver': {
        requireString(raw, 'key', id, diags);
        requireString(raw, 'reasonRef', id, diags);
        requireString(raw, 'until', id, diags);
        requireString(raw, 'issuedOn', id, diags);
        const until = Date.parse(String(raw['until']));
        const issuedOn = Date.parse(String(raw['issuedOn']));
        if (Number.isNaN(until) || Number.isNaN(issuedOn)) {
          diags.push({ entryId: id, message: 'until / issuedOn は ISO 日付 MUST' });
        } else {
          if ((until - issuedOn) / DAY_MS > WAIVER_MAX_DAYS) {
            diags.push({
              entryId: id,
              message: `waiver は until ≤ 発行から${WAIVER_MAX_DAYS}日 MUST（REG-4(b)）`,
            });
          }
          if (until < now.getTime()) {
            // 失効の blocking 判定は中央 rollup（R5(5)分業）— ここでは形式違反として報告のみ
            diags.push({
              entryId: id,
              message: 'waiver は失効済み（中央 rollup が red＋是正 issue 起票）',
            });
          }
        }
        break;
      }
      case 'legacy-manifest': {
        requireString(raw, 'path', id, diags);
        for (const f of ['maxLines', 'maxBytes'] as const) {
          const v = raw[f];
          if (typeof v !== 'number' || !Number.isInteger(v) || v <= 0) {
            diags.push({
              entryId: id,
              message: `${f} は正の整数 MUST（AM-25': 0/プレースホルダ運用 MUST NOT・初期値は init --scan 実測）`,
            });
          }
        }
        break;
      }
      case 'components-allowlist':
        // grandfather 済みクラスの完全一致列挙（init --scan 実測）。空エントリは無意味＝FAIL
        // （0 クラスなら entry を持たない＝payout/deal 型。green は entry 0）。
        requireStringArray(raw, 'classes', id, diags);
        break;
      case 'lint-baseline': {
        requireString(raw, 'rule', id, diags);
        requireString(raw, 'initializedBy', id, diags);
        // file は optional（(rule,file) 粒度・#99）。在るなら非空文字列 MUST・無しはリポ全体 baseline。
        if ('file' in raw && (typeof raw['file'] !== 'string' || raw['file'].trim() === '')) {
          diags.push({
            entryId: id,
            message: 'file は在れば非空文字列 MUST（(rule,file) 粒度・#99）',
          });
        }
        const fc = raw['frozenCount'];
        if (fc !== null && (typeof fc !== 'number' || !Number.isInteger(fc) || fc < 0)) {
          diags.push({ entryId: id, message: 'frozenCount は null（未走査）か非負整数 MUST' });
        }
        break;
      }
      case 'injector':
        requireStringArray(raw, 'files', id, diags);
        requireString(raw, 'reasonRef', id, diags);
        break;
      case 'scoped-theme': {
        requireString(raw, 'selector', id, diags);
        requireString(raw, 'reasonRef', id, diags);
        if (raw['variant'] !== 'widget' && raw['variant'] !== 'local') {
          diags.push({ entryId: id, message: "variant は 'widget' | 'local' MUST" });
        }
        break;
      }
      case 'widget-entry':
        requireStringArray(raw, 'files', id, diags);
        requireString(raw, 'reasonRef', id, diags);
        break;
      case 'fonts':
        requireStringArray(raw, 'families', id, diags);
        requireString(raw, 'reasonRef', id, diags);
        break;
      case 'testid-allowlist':
        requireStringArray(raw, 'testids', id, diags);
        requireString(raw, 'reasonRef', id, diags);
        break;
      case 'identical-allowlist':
        requireStringArray(raw, 'keys', id, diags);
        requireString(raw, 'reasonRef', id, diags);
        break;
      case 'transition':
        requireString(raw, 'summary', id, diags);
        requireString(raw, 'wave', id, diags);
        requireString(raw, 'reasonRef', id, diags);
        break;
    }
  }
  return diags;
}

/** パース＋検査（診断ゼロのときのみ返す — fail-closed）。 */
export function parseRegistries(source: string, now = new Date()): RegistriesDocument {
  const diags = validateRegistries(source, now);
  if (diags.length > 0) {
    throw new Error(
      `registries が形式検査 FAIL:\n${diags.map((d) => `- [${d.entryId}] ${d.message}`).join('\n')}`,
    );
  }
  return JSON.parse(stripJsonc(source)) as RegistriesDocument;
}
