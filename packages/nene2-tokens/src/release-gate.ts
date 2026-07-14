/**
 * AM-2 release gate — 契約凍結の publish ゲート（最小実装）。
 *
 * 目的: 「契約キー集合が変わる変更に codemod（と stop-the-line ADR）が同梱されていなければ
 * publish を拒否する」（AM-2 契約進化規約・凍結承認記録 = docs/contract-freeze-review-2026-07-18.md §7）。
 *
 * 実装している検査（fail-closed — 判定不能は FAIL）:
 *  1. 凍結記録（contract-freeze.json）の contract 版と CONTRACT_VERSION の一致。
 *  2. 凍結記録のキー列（color / shadow・正準順込み）と実装の完全一致 —
 *     凍結記録を更新せずにキー集合を変えた publish は不可能。
 *  3. 契約が凍結版（1.0）から動いている場合、凍結記録に stop-the-line ADR への実在パスと
 *     同梱 codemod 写像表の版（実装の CODEMOD_MAP_VERSION と一致）が必須。
 *
 * TODO（正直な限界 — 未実装）: 「この changeset がキー集合を変えたか」の diff 粒度の検査と、
 * codemod 写像の意味的完全性（旧キー全てに写像先があるか）の検証は未実装。現段階のゲートは
 * 「凍結記録との不一致 = publish 拒否」「記録の更新には ADR＋codemod 版の申告が必須」まで。
 * diff 粒度化は W1 の fg→text 予行演習（contract-release.md）と同時に実装する（§5-4）。
 */

/** hide が 2026-07-14 に凍結を承認した契約版。ここから動く変更はすべて ADR 経路。 */
export const FROZEN_CONTRACT_VERSION = '1.0';

export interface FreezeRecord {
  /** 凍結された契約版（CONTRACT_VERSION と一致していなければ FAIL） */
  contract: string;
  frozenAt: string;
  approvedBy: string;
  /** 承認記録ドキュメント（リポルート相対） */
  record: string;
  /** 契約が凍結版から動くとき必須: stop-the-line ADR のパス（リポルート相対・実在検査） */
  adr: string | null;
  /** 契約が凍結版から動くとき必須: 同梱 codemod 写像表の版（CODEMOD_MAP_VERSION と一致検査） */
  codemod: string | null;
  color: readonly string[];
  shadow: readonly string[];
}

export interface CurrentContract {
  contractVersion: string;
  colorKeys: readonly string[];
  shadowKeys: readonly string[];
  codemodVersion: string;
}

export interface GateOptions {
  /** ADR パスの実在検査（wrapper が fs.existsSync を渡す）。未指定は fail-closed で不在扱い。 */
  adrExists?: (path: string) => boolean;
}

export interface GateResult {
  ok: boolean;
  failures: string[];
}

function diffKeys(label: string, frozen: readonly string[], current: readonly string[]): string[] {
  const failures: string[] = [];
  const frozenSet = new Set(frozen);
  const currentSet = new Set(current);
  const removed = frozen.filter((k) => !currentSet.has(k));
  const added = current.filter((k) => !frozenSet.has(k));
  if (removed.length > 0) failures.push(`${label}: 凍結済みキーの削除 — ${removed.join(', ')}`);
  if (added.length > 0) failures.push(`${label}: 未凍結キーの追加 — ${added.join(', ')}`);
  if (
    removed.length === 0 &&
    added.length === 0 &&
    (frozen.length !== current.length || frozen.some((k, i) => k !== current[i]))
  ) {
    failures.push(`${label}: 正準順の変更（順序も契約の一部 — themegen 決定性の入力）`);
  }
  return failures;
}

/**
 * 契約凍結ゲート本体（純関数 — I/O は wrapper 側）。
 * FAIL 時の failures には是正経路（stop-the-line ADR）を必ず含める。
 */
export function checkContractFreeze(
  freeze: FreezeRecord,
  current: CurrentContract,
  options: GateOptions = {},
): GateResult {
  const failures: string[] = [];

  if (freeze.contract !== current.contractVersion) {
    failures.push(
      `凍結記録の contract '${freeze.contract}' と実装の CONTRACT_VERSION '${current.contractVersion}' が不一致 — ` +
        `契約版の変更は stop-the-line ADR で contract-freeze.json ごと更新する（AM-2）`,
    );
  }

  failures.push(...diffKeys('color', freeze.color, current.colorKeys));
  failures.push(...diffKeys('shadow', freeze.shadow, current.shadowKeys));

  // 契約が凍結版（1.0）から進化している場合の必須同梱物
  if (current.contractVersion !== FROZEN_CONTRACT_VERSION) {
    if (freeze.adr === null) {
      failures.push(
        `契約が凍結版 ${FROZEN_CONTRACT_VERSION} から変更されているが、凍結記録に stop-the-line ADR が無い（AM-2: adr 必須）`,
      );
    } else if (!(options.adrExists?.(freeze.adr) ?? false)) {
      failures.push(`凍結記録の adr '${freeze.adr}' が実在しない（fail-closed）`);
    }
    if (freeze.codemod === null) {
      failures.push(
        `契約が凍結版 ${FROZEN_CONTRACT_VERSION} から変更されているが、同梱 codemod の版が申告されていない（AM-2: major=codemod 3点セット）`,
      );
    } else if (freeze.codemod !== current.codemodVersion) {
      failures.push(
        `凍結記録の codemod '${freeze.codemod}' と実装の CODEMOD_MAP_VERSION '${current.codemodVersion}' が不一致`,
      );
    }
  }

  if (failures.length > 0) {
    failures.push(
      '契約キー集合の変更は stop-the-line ADR のみ（凍結承認 2026-07-14 hide・AM-2）。publish を拒否した。',
    );
  }
  return { ok: failures.length === 0, failures };
}
