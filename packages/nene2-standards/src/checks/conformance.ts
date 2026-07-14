/**
 * conformance skeleton — 適合ベクトル（規約 05 §7 CF-1〜4・会議R3⑩M-3・R4 AM-11・R5(5)決定）。
 *
 * 状態機械の分界（CF-2）:
 * - リポ側 nene2-check の出力語彙は **5状態**（green/red/unknown/frozen/waived）まで。
 * - `n/a(reason-ref)` は中央 rollup が pinned registries を参照して写像・表示する —
 *   リポ出力 JSON に "n/a" が現れたら schema 違反（validateConformance が拒否）。
 * - unknown の腕は reason 判別 `not-installed | crashed | unsupported-schema`。
 *
 * fail-closed（G-6）: 検査が実行できない・対象が見つからない = unknown（≠green）。
 * green は「検査が走り正の証拠を得た」場合のみ。空虚合格 MUST NOT。
 */

export type UnknownReason = 'not-installed' | 'crashed' | 'unsupported-schema';

export type KeyState =
  | { state: 'green' }
  | { state: 'red'; details: string[] }
  | { state: 'unknown'; reason: UnknownReason; details?: string[] }
  | { state: 'frozen'; remaining: number }
  | { state: 'waived'; until: string; reasonRef: string };

export const CONFORMANCE_SCHEMA_ID = 'nene2-conformance/1';

/**
 * 適合ベクトルのキー名列挙（05 §7.1 の起草ドラフトを W0a skeleton で確定 — 起草判断 D-f）。
 * DoD ベクトルは styling / i18n / a11y / api の全ゲートを含む（CF-3）。
 */
export const CONFORMANCE_KEYS = [
  'fsd.boundaries',
  'styling.utilities',
  'styling.scan-coverage',
  'styling.no-legacy-token-names',
  'tokens.contract',
  'tokens.contrast',
  'i18n.parity',
  'i18n.hardcoded',
  'a11y.jsx-strict',
  'api.transport',
  'api.fleet-baseline',
  'testing.required-set',
  'gate-integrity',
  'e2e.axe-smoke',
] as const;

export type ConformanceKey = (typeof CONFORMANCE_KEYS)[number];

export interface ConformanceMeta {
  standardsVersion: string | null;
  tokensVersion: string | null;
  i18nVersion: string | null;
  clientVersion: string | null;
  /** 全テーマファイルのプラグマの最小値（CF-4・AM-11(v)） */
  contractVersion: string | null;
  manifestSha: string | null;
  commitSha: string | null;
}

export interface ConformanceVector {
  schema: typeof CONFORMANCE_SCHEMA_ID;
  repo: string;
  meta: ConformanceMeta;
  keys: Record<ConformanceKey, KeyState>;
}

const UNKNOWN_REASONS: readonly string[] = ['not-installed', 'crashed', 'unsupported-schema'];

/**
 * リポ出力スキーマの検査（fail-closed）。中央 rollup は違反ベクトルを unknown 扱いにする
 * （CF-2(iv) と同処理）— ここでは違反の列挙を返す。
 */
export function validateConformance(doc: unknown): string[] {
  const errors: string[] = [];
  if (typeof doc !== 'object' || doc === null) return ['ベクトルはオブジェクト MUST'];
  const d = doc as Record<string, unknown>;
  if (d['schema'] !== CONFORMANCE_SCHEMA_ID) {
    errors.push(`schema は "${CONFORMANCE_SCHEMA_ID}" MUST`);
  }
  if (typeof d['repo'] !== 'string' || d['repo'] === '') errors.push('repo は非空文字列 MUST');
  const keys = d['keys'];
  if (typeof keys !== 'object' || keys === null) {
    errors.push('keys はオブジェクト MUST');
    return errors;
  }
  for (const [key, raw] of Object.entries(keys)) {
    if (!(CONFORMANCE_KEYS as readonly string[]).includes(key)) {
      errors.push(`キー "${key}" は列挙外`);
      continue;
    }
    if (typeof raw !== 'object' || raw === null) {
      errors.push(`${key}: 状態はオブジェクト MUST（boolean MUST NOT — AM-11(vi)）`);
      continue;
    }
    const s = (raw as Record<string, unknown>)['state'];
    switch (s) {
      case 'green':
        break;
      case 'red':
        if (!Array.isArray((raw as Record<string, unknown>)['details'])) {
          errors.push(`${key}: red は details（証拠列挙）MUST`);
        }
        break;
      case 'unknown': {
        const reason = (raw as Record<string, unknown>)['reason'];
        if (typeof reason !== 'string' || !UNKNOWN_REASONS.includes(reason)) {
          errors.push(`${key}: unknown は reason ∈ {${UNKNOWN_REASONS.join(', ')}} MUST（R5(5)）`);
        }
        break;
      }
      case 'frozen':
        if (typeof (raw as Record<string, unknown>)['remaining'] !== 'number') {
          errors.push(`${key}: frozen は remaining（残 n 件）MUST`);
        }
        break;
      case 'waived': {
        const w = raw as Record<string, unknown>;
        if (typeof w['until'] !== 'string' || typeof w['reasonRef'] !== 'string') {
          errors.push(`${key}: waived は until / reasonRef MUST`);
        }
        break;
      }
      case 'n/a':
        errors.push(
          `${key}: "n/a" のリポ出力は schema 違反（中央レジストリでのみ宣言可 — CF-2・G-7）`,
        );
        break;
      default:
        errors.push(`${key}: 未知の state "${String(s)}"（5状態列挙外）`);
    }
  }
  return errors;
}
