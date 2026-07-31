# standards patch — nene-invoice 由来の規約還流（5節＋未達だった追記1件）

- **Issue**: #162 ／ **出典**: `_work/handoff-invoice-fleet-conventions-draft-2026-07-29.md`（invoice リナ 起草）。実測は invoice #734（①）／#736（②）／#732（③④）／#735（⑤）／#740（①の追記）。
- **経緯**: 還流バッチの最終レーン。**すべて invoice 側で再現・回避まで実施済み**で PR 番号つきで裏取りできる（**fleet では再実測していない** — §7）。
- 🔴 **①の追記（合成形採用艦がもう一段踏む `stylingWith()` の throw）は fleet に届いていなかった。** 起草時に fleet セッションが落ちており（`Connection refused`）、規約どおり指示書方式へ切り替えられていた。**#162 の issue 本文にも入っていない**（初版 relay 分のみ）。2026-07-31 の条文化で正本を読んで初めて拾い、**#211** を起票した。→ **指示書という出口があったから残った**＝ EX-2（記録は出口ではない）の実例。
- **対となる patch**: `-mori-site-`（#154）・`-contact-`（#155）・`-records-`（#170）・`-nene2-`（#160 / PR #207）・`-serve-`（#161 / PR #209）。**本ファイルで還流バッチ6レーンが完結する。**
- **この文書の地位**: 規約文書への収載は **W0b の作業**。本ファイルは収載先の確定と条文の文面凍結までを担い、**条文の正本**となる。

---

## 0. 収載先マトリクス（結論）

| | 条文 | 収載先（主） | 族 | 機械強制 |
|---|---|---|---|---|
| ① | E2E 移設で lint / format の対象から静かに外れる | **`05 §5`（CI ゲート一覧）＋ `05 §1.2`（正準配置）** | **EX-6**（射程）の実例 | 🟢 可（受入時の負テスト） |
| ①' | 合成形採用艦は `stylingWith()` の評価時 throw をもう一段踏む | ① と同じ ／ **恒久形は配布物側**（#211） | EX-6 | 🔴 **要裁定（#211）** |
| ② | 「@smoke がある / CI で走る / 落ちたら止まる」は別物 | **`05 §5`（CI ゲート一覧）** | **EX-7**（族の核心形・🟢 hub 承認済み） | 🟢 可（3層とも機械判定可） |
| ③ | 依存の「ピン」は時限措置であって修正ではない | **`05 §5.6`**（#155 ③ が据えた節） | **EX-3**（DA-x）と同一趣旨 | 🟡 一部 |
| ④ | 参照実装をそのまま写すと lint が壊れる艦がある | **`05 §5.6`**（③ の隣） | **EX-4**（依存 override の API 互換） | 🟢 可（受入手順として） |
| ⑤ | stacked PR の起こし方 | **`_work/issues.md #54` の追補**（規約文書ではない） | — | ❌ 運用 |

**凡例** — 🟢 検査器で強制しうる／🟡 一部のみ／❌ 人間の運用規律。

🔴 **③④は #155（contact 由来）と重複領域**。裁ち方は §4.3 に条文として書いた（hub 指示）。

---

## 1. ① E2E 移設で ESLint / prettier から静かに外れる

### 条文（`05 §5` ＋ `05 §1.2`）

> spec をリポ直下 `tests/e2e/` へ移す PR は、**移設後に lint / format の対象から外れていないこと**を受入条件に含める（MUST）。
>
> - ESLint は**自分の config ファイルより上のディレクトリを lint できない**。リポ直下に「**E2E ブロックのみ**」を再エクスポートする config を置く。
> - **全体の再エクスポートは MUST NOT** — typed な `tests/**` ブロックが `tests/e2e/**` に当たり parse error になる。
> - prettier は `--config` で正本を明示する（リポ直下に `.prettierrc` を新設すると**正本が二重化する** MUST NOT）。
> - **受入は負テストで確認する**: 移設後に spec へわざと未使用変数を入れ、`npm run lint` が**落ちること**を見る。

### 根拠（invoice 実測・fleet では再実測していない）

判例4に従って `frontend/e2e/` から移すと、**24 spec が一斉に gate から落ちる**状態になった。根の制約:

- config オブジェクトの `basePath: '..'` → `All of the files matching ... are ignored` のまま
- `eslint ../tests/e2e --config ../eslint.config.js` も不可（`--config` を渡しても base path は cwd のまま）
- **エラーメッセージ自身が正解を言っている**: *"change the location of your config file to be in a parent directory"*

🔴 **本命の地雷**: リポ直下で `export { default } from './frontend/eslint.config.js'`（＝**全体**の再エクスポート）をやると一見動くが、**24 spec すべて**が

```
Parsing error: "parserOptions.project" has been provided for @typescript-eslint/parser.
The file was not found in any of the provided project(s): ../tests/e2e/xxx.spec.ts
```

で落ちる（spec は `tsconfig.app.json` に入っていないため）。**部分再エクスポートでなければならない。** 両ファイルに**理由をコメントで残す**こと（次に触る人が「なぜ default を再エクスポートしないのか」を必ず疑うため）。

**付随2点**:
- 呼び出しは `node <path>/eslint/bin/eslint.js` 形にする（`node_modules/.bin/eslint` 形だと **knip が `Unlisted binaries` を出す**。無視エントリを足すより呼び方を変えるほうが台帳が汚れない＝C1「台帳0」を守る）
- **prettier も同時に外れる**。設定ファイルが上に無いと既定値（`semi: true` 等）で判定し、invoice では **25ファイルが一斉に warn** になった

### 🔴 現状の穴（前例ではない・hub 裁定 2026-07-29）

> payout は repo-root の spec を eslint / tsc の対象外にしているため、この地雷を踏んでいない＝**前例ではなく穴**。

移設済み・移設予定の艦は**自艦の lint 対象を実測して確認する**こと。「踏んでいない」は「守られている」ではない — **EX-6（射程を測れ）そのもの**。

### 1.1 ①' 合成形採用艦がもう一段踏む（**未達だった追記**・invoice #740）

`tests/e2e/` 移設と合成形（nene2 standards）の**両方**を入れた艦では、部分再エクスポートでも:

```
Error: [nene2/styling] Tailwind entry point not found: <repo>/src/shared/ui/theme/index.css
  configured entryPoint: "src/shared/ui/theme/index.css" (cwd: <repo>)
```

**「移設だけ」または「合成形だけ」なら気づかない。両方入れた瞬間に `lint:e2e` だけが落ちる。**

**機序（fleet が実コードで確認・2026-07-31）**: `stylingWith()` の entry throw は**意図的な fail-loud**（`configs/styling.ts:56-72`・G-6 の適用。silent fallback すると payout#161 の 218件偽陽性になる）。問題は throw ではなく**それがモジュール評価時に起きる**こと — ESM は名前付き export を1つ取るだけでも**モジュール本体を評価する**ので、**部分再エクスポートでは回避できない**。

🔴 **これは #192（root entry が optional peer の stylelint を静的に巻き込む・配布側で根治済み）と同型**なので、**艦側の回避で終わらせず配布側の是正を検討する**のが筋。→ **#211 に分離**（選択肢 A〜D と fleet の推し＝暫定 A・恒久 C を整理済み・**要裁定**）。

**暫定の条文**（#211 の裁定が出るまで）:

> 合成形を採用している艦は、**e2e ブロックを独立モジュール**（`frontend/eslint.e2e.config.js`）へ切り出し、リポ直下 config は**それだけ**を読む（root から評価してよいのは e2e ブロックだけ）。

⚠️ ただしこれは**全艦が同じ回避を手で書く形**で、**G-7（合成を被検査者の手から取り上げる）の趣旨に逆行する**。恒久形は #211 で決める。

---

## 2. ② 「@smoke がある / CI で走る / 落ちたら merge が止まる」は別物

**族の核心形＝ EX-7（hub 承認済み 2026-07-31）。** invoice 自身が「**「導入≠実行」の亜種**」と書いている。

### 条文（`05 §5`）

> C6 の「@smoke 緑」は、次の**3点をすべて実測**して初めて満たされたとする（MUST）。
>
> 1. `@smoke` タグの spec が**存在する** — `grep -rl '@smoke'`
> 2. その spec が **CI のジョブで実走する** — ワークフローに該当ステップがある
> 3. そのジョブが **required contexts に入っている** — `gh api repos/:owner/:repo/branches/main/protection`
>
> **1 だけで C6 を ✅ にしない**（MUST NOT）。

### 根拠（invoice 実測・fleet では再実測していない）

- **invoice**: e2e ジョブは CI に**あった**が required contexts は `["check","frontend-check","integration"]` ＝ **e2e は required ではない**。@smoke が落ちても merge は止まらなかった。→ hub が追加し `["check","frontend-check","integration","e2e"]` を実測確認。
- **payout**: `check` に e2e が含まれず、ワークフローに playwright ステップも**無い**。`tests/e2e/smoke.spec.ts` は存在するが **CI では一度も実走していない**。

**配線の型（invoice #736）**: full suite の**前**に `npm run e2e:smoke`（`--grep @smoke`）を置く **fail-fast**。バンドルやログイン配線が壊れていれば数秒で落ち、全 spec の完走を待たない。実測 smoke 単体 **5.0s** / full 76 spec **46s**。

**required 化の選択肢**（invoice は hub 裁定で 1 を採用）: (1) `e2e` ジョブを required に足す（追加コストゼロ・merge の前提が +3分）／(2) required ジョブに @smoke ステップを足す（required が 40〜60秒伸びる）。

### 族の「核心形」＝ EX-7（🟢 hub 承認済み 2026-07-31）

族の他のメンバーが**特定の技術領域の実例**（トークン・依存・生成物・build 射程）であるのに対し、②は「**存在する / CI で走る / 落ちたら止まる**」という**3層そのもの**を名指ししている。族の定義（`-serve-` §1.1）を実務の受入条件へ翻訳した一般形なので、**族の入口**に置く。他メンバーから逆参照する。

🔴 **条文化の縛り（hub 裁定 2026-07-31）— EX-7 は「独立ジョブであること」を要求しない。**

要件は**3層の充足**であって**形**ではない。実例: payout PR #268（`test(e2e): @smoke を required ジョブへ配線し e2e spec を lint/format 射程へ入れる`・**MERGED**）は、②の選択肢 **(2)「required ジョブ（`frontend-check`）に @smoke ステップを足す」**で3層を満たしている。invoice が採った **(1)「`e2e` ジョブを required contexts に足す」**とは**形が違うが、どちらも条文を満たす**。

> 条文は「**この形にせよ**」ではなく「**3層を実測で示せ**」と書く（MUST）。
> ジョブ構成・ステップ配置は艦の裁量。判定は §2 の3コマンドの出力のみ。

invoice #263 の裁定の言い方を借りれば「**形の統一はコスプレ**」。これは EX-6 の運用則（「共有できるのは対策ではなく**測り方**」・`-serve-` §5）と**同じ主張の別の面**で、族全体に効く:

| 族の運用則 | 何を共有し、何を共有しないか |
|---|---|
| EX-6（射程） | **測り方**を共有する。穴の場所は艦ごとに違うので**対策**は共有しない |
| **EX-7（3層）** | **判定基準**を共有する。3層の満たし方は艦ごとに違うので**形**は共有しない |

---

## 3. ③ 依存の「ピン」は時限措置であって修正ではない

### 条文（`05 §5.6`）

> 勧告回避の**ピンにはレンジを優先**する（SHOULD）。ピンにする場合は**解除条件と再点検時期を書く**（MUST）— `audit-ci` の allowlist と同様、ピンも「期限つきの例外」として扱う。
>
> あわせて、**宣言レンジは lock の解決値任せにせず floor として上げる**（MUST）。`^7.9.6` のままでも lock がたまたま patched を指せば緑になるが、**fresh install で静かに戻る**。

### 根拠（invoice 実測・fleet では再実測していない）

invoice #719 で入れた `brace-expansion` のピン（`1.1.16` / `2.1.2` / `5.0.7`）が 2026-07-29 に **GHSA-mh99-v99m-4gvg（`<=5.0.7`）の範囲に入り**、required check が赤になった。**contact も同型で踏んでいる**（#155 ③）。invoice は `react-router-dom` を `^7.18.1` へ floor 上げ。

### 族との関係

**EX-3（DA-x・解除条件は「壊れているもの」で書く）と同一趣旨**の別の面。DA-x が「解除条件の**書き方**」、③が「**そもそもピンにするな・するなら期限付き**」。**同じ節に置き、相互参照する**。

---

## 4. ④ 参照実装をそのまま写すと lint が壊れる艦がある

### 条文（`05 §5.6`・③の隣）

> audit-ci の参照実装を写す艦は、`npm run audit` だけでなく **`npm run lint` まで回してから** PR にする（MUST）。
> blanket override が通るかは**各艦の `minimatch` 連鎖に依存する**。壊れたら「取れる major だけ override ＋ 残りは dev-only 実測つき allowlist」（invoice 型）へ切り替える。

### 根拠（invoice 実測・fleet では再実測していない）

contact の blanket override `"brace-expansion": "^5.0.8"` を写したら `npm run audit` は緑・**`npm run lint` が `TypeError: expand is not a function` で死亡**。

原因: brace-expansion 5 は `expand` を**名前付き export** するが、`minimatch@3` は `require('brace-expansion')` して**モジュール自体を関数として呼ぶ**。`minimatch@3` を上げる案も `eslint-plugin-import` / `jsx-a11y` が `_interopRequireDefault(require('minimatch'))` して呼ぶため同じ壊れ方（minimatch ≥ 9 に callable default export は無い）。

### 4.3 🔴 #155 ③'（contact 由来）との重複の裁ち方（**hub 指示・fleet が条文化**）

同じ事象を**別の艦から見たもの**で、**どちらか一方では足りない**。層で裁つ:

| | #155 ③'（contact 由来） | 本節 ④（invoice 由来） |
|---|---|---|
| 層 | **設計**（override をどう書くか） | **受入手順**（写した後に何を回すか） |
| 内容 | per-major scope ＋ **全経路プローブ**（`npm ls minimatch --all` → 各実体を直接 require） | **`npm run lint` まで回してから PR にする** |
| 単独では | 設計が正しくても、写した艦が回さなければ壊れたまま PR になる | 手順を踏んでも、直し方（scope の切り方）を知らないと直せない |

**条文としての裁ち方**（本 patch の提案）:

> **設計則（#155 ③'）と受入手順（本節 ④）は別条文として両方置く**（MUST）。
> 一方を他方の「補足」に格下げしない — **設計と受入は違う人が違う時点で読む**（設計は写す前・受入は PR を出す前）。相互参照だけ張る。

🔴 さらに serve が示した**判定基準の上書き**（#161 §4 の根拠）を両方に効かせる: **ゲート実行（lint / check / codegen）の緑は判定材料にしない**。serve は4経路中3経路が破壊されたまま全ゲート exit 0 を実測している。判定は**直接プローブ**か **deal の恒久ガードテスト（EX-4）**のみ。

＝ ④ の「`npm run lint` まで回せ」は**必要条件であって十分条件ではない**。この点は ④ 単独では読み取れないので、条文に明記する。

---

## 5. ⑤ stacked PR の起こし方（`_work/issues.md #54` の追補）

**規約文書ではなく `issues.md` の追補**（※ hub 側で反映済み）。条文としての強さは運用推奨。

### 実測（invoice #734 → #735）

`gh pr merge --squash --delete-branch` した結果:

- stacked PR は retarget されず **`CLOSED` になった**（#54 ①「自動 retarget は base 削除時のみ」の**実挙動が違った**）
- 一度そうなると `gh pr edit --base main` は `Cannot change the base branch of a closed pull request`、`gh pr reopen` は `Could not open the pull request` で**どちらも不可**＝ #54 ③ の close→reopen ルートに入れない
- 復旧: head から **main 宛に新 PR** → base が squash 済みなので `CONFLICTING` → `git rebase --onto main <squash 済みコミット>` ＋ `push --force-with-lease` → **synchronize で CI 起動**

### 条文案

> stacked PR を残したまま base を `--delete-branch` でマージしない（MUST NOT）。先に stacked 側の base を `main` へ付け替えてから base をマージする。
> **より安全な既定**: 1本目が短時間で merge できる規模なら**そもそも stack しない**（stack の利得より事故のコストが上回る）。

---

## 6. 別 issue へ送るもの（本 patch のスコープ外）

| 内容 | 送り先 |
|---|---|
| `stylingWith()` の評価時 throw の恒久形（配布側で直すか艦側の型で固めるか） | **#211**（fleet 本日起票・要裁定） |
| EX-7 を族台帳へ登録（🟢 採用承認済み） | #161 / PR #209 の族台帳へ合流（本日反映） |
| ① の受入負テストを検査器化できるか | 未起票（凍結明けの検査器レーン） |
| 新章 `06-testing-verification.md` の新設 | 施主・統合リナ裁定済み（#154 §7・#155 §5・#160・#161 と共同） |

---

## 7. 誠実性の注記

- **§1〜§5 の実測（24 spec の一斉脱落・25ファイルの prettier warn・required contexts の欠落・smoke 5.0s / full 46s・ピンが勧告対象化・`TypeError: expand is not a function`・stacked PR の CLOSED 化）は、すべて起草側（invoice リナ）の実測であり fleet では再実測していない。** 私が自分で確かめた数字ではない。
- **fleet が本日自ら確認したのは2点だけ**:
  - §1.1 の**機序**（`packages/nene2-standards/src/configs/styling.ts:56-72` の実コード＝ throw は意図的な fail-loud・`cwd` オプションは既存）。**現象そのもの（invoice #740 の throw）は fleet で再現していない** — #211 の最初のタスクを再現確認にした。
  - ①の追記が **#162 の issue 本文に入っていない**こと（初版 relay 分のみ・正本にのみ存在）。
- 起草側の原文から**規範の強さを変えた箇所**:
  - §1 の「**受入は負テストで確認する**」を条文本体へ引き上げた（原文では「現状の穴」節の確認コマンドとして書かれていた）。理由: これが無いと ① は「気をつける」に帰着する。
  - §4.3 の「**ゲート実行の緑は判定材料にしない**」を ④ に併記した（原文の ④ には無く、serve 由来 #161 の判定基準）。理由: ④ 単独だと「lint が緑なら OK」と読めてしまい、serve が実測で否定した形に戻る。
- **追加した節**: §1.1（未達だった追記の条文化）・§4.3（#155 との重複の裁ち方・hub 指示）・§2 末尾の EX-7 案。
- **起草側 invoice への確認は本 patch 送信時点で実施**（invoice は稼働中のため relay 直送）。同意は未取得。
