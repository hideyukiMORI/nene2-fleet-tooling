// #193 の陽性対照フィクスチャ その2: 配布パッケージを import するが**依存が入っていない**艦。
// 実測（field・2026-07-30）: 導入 PR マージ済み・CI 緑でも、測定した checkout で
// npm install が未実行だとこの形になり、crashed（艦の欠陥）と区別がつかなかった。
import nene2 from '@hideyukimori/nene2-standards-does-not-exist';

export default [...nene2.base];
