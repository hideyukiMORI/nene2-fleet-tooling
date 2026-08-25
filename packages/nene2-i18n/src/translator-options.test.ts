/**
 * translator options（0.3.0 W0b・スペック §2）— vault C4b 実測の runtime 昇格ブロッカー3点を
 * 再現するテスト＋後方互換（既定引数で 0.2.0 と byte 同一）の固定。
 *
 * 3 乖離: nested catalog（dot-path）/ 二重括弧補間 {{name}} / 欠落キーの可視 fallback（key-echo）。
 */
import { describe, expect, it, vi } from 'vitest';

import { createTranslator } from './catalog.js';

describe('後方互換: 既定引数（options 省略）は 0.2.0 と同一挙動', () => {
  it('flat / 単括弧補間 / 未知キー throw が現行どおり', () => {
    const { t } = createTranslator({ 'common.total': '合計 {count} 件' } as const);
    expect(t('common.total', { count: 3 })).toBe('合計 3 件');
    expect(t('common.total')).toBe('合計 {count} 件'); // params 無しは素通し
    // @ts-expect-error 未知キーは型で落ちる（実行時到達は throw）
    expect(() => t('common.unknown')).toThrow(/unknown MessageKey/);
  });

  it('空 options {} でも既定と同一（明示 flat/single/throw）', () => {
    const { t } = createTranslator({ 'a.b': '{x}' } as const, {});
    expect(t('a.b', { x: 'v' })).toBe('v');
    // 二重括弧は single 既定では補間されない（byte 同一の裏取り）
    const { t: t2 } = createTranslator({ 'a.b': '{{x}}' } as const);
    expect(t2('a.b', { x: 'v' })).toBe('{v}'); // 外側 {x} だけ置換され {{x}}→{v}
  });
});

describe('乖離① nested catalog（catalogShape: "nested"・dot-path lookup）', () => {
  const nested = {
    common: {
      buttons: { close: '閉じる', save: '保存' },
      greeting: 'こんにちは {name}',
    },
  };

  it('dot-path で入れ子の葉を引く', () => {
    const { t } = createTranslator(nested, { catalogShape: 'nested' });
    expect(t('common.buttons.close')).toBe('閉じる');
    expect(t('common.greeting', { name: 'ねね' })).toBe('こんにちは ねね');
  });

  it('中間ノード止まり・存在しない path は onMissing（既定 throw）', () => {
    const { t } = createTranslator(nested, { catalogShape: 'nested' });
    expect(() => t('common.buttons')).toThrow(/unknown MessageKey/); // 葉でない
    expect(() => t('common.nope.deep')).toThrow(/unknown MessageKey/);
  });

  it('flat 既定では同じドットキーを完全一致で引く（探索しない＝現行不変）', () => {
    const { t } = createTranslator({ 'common.buttons.close': '閉じる' } as const);
    expect(t('common.buttons.close')).toBe('閉じる');
  });
});

describe('乖離② 二重括弧補間（interpolation: "double"）', () => {
  it('{{name}} を補間・単括弧 {name} は素通し', () => {
    const { t } = createTranslator({ hi: 'Hi {{name}} / {literal}' } as const, {
      interpolation: 'double',
    });
    expect(t('hi', { name: 'ねね', literal: 'X' })).toBe('Hi ねね / {literal}');
  });

  it('欠落 param は placeholder を残す（現行と同じ非破壊挙動）', () => {
    const { t } = createTranslator({ hi: '{{a}}{{b}}' } as const, { interpolation: 'double' });
    expect(t('hi', { a: '1' })).toBe('1{{b}}');
  });
});

describe('乖離③ 欠落キーの可視 fallback（onMissing）', () => {
  it("'key-echo' は key をそのまま返す（沈黙 fallback 禁止 I18N-22＝可視化）", () => {
    const { t } = createTranslator({ known: 'K' } as const, { onMissing: 'key-echo' });
    // @ts-expect-error 型では未知だが runtime は key を返す
    expect(t('audit_event.action.login')).toBe('audit_event.action.login');
    expect(t('known')).toBe('K');
  });

  it('関数 onMissing は製品固有整形を通す', () => {
    const spy = vi.fn((key: string) => `[[${key}]]`);
    const { t } = createTranslator({ known: 'K' } as const, { onMissing: spy });
    // @ts-expect-error 未知キー
    expect(t('x.y')).toBe('[[x.y]]');
    expect(spy).toHaveBeenCalledWith('x.y');
  });
});

describe('コア純度: 3 strategy の直交合成（nested × double × key-echo＝vault 実需の同時指定）', () => {
  it('vault が渡す 3 option 同時指定で全て効く', () => {
    const catalogs = {
      audit_event: { action: { login: '{{user}} がログイン' } },
    };
    const { t } = createTranslator(catalogs, {
      catalogShape: 'nested',
      interpolation: 'double',
      onMissing: 'key-echo',
    });
    expect(t('audit_event.action.login', { user: 'ねね' })).toBe('ねね がログイン');
    expect(t('audit_event.action.logout')).toBe('audit_event.action.logout'); // 可視 fallback
  });
});

describe('nested: キーにドットを含むノードへ到達する（#419・vault #453）', () => {
  // 監査ログの action キー（document.voided）はバックエンドのイベント名＝データ。
  // 改名させず、lookup 側が「残りを最長から1つのキーとして試す」ことで届ける。
  const audit = {
    common: { buttons: { close: '閉じる' } },
    audit: {
      actions: {
        'document.voided': '文書を無効化',
        'document.restored': { label: '文書を復元', description: '無効化を取り消した' },
        document: { created: '文書を作成' },
      },
    },
  };
  const { t } = createTranslator(audit, { catalogShape: 'nested', onMissing: 'key-echo' });

  it('① 従来の dot-path はそのまま引ける', () => {
    expect(t('common.buttons.close')).toBe('閉じる');
    expect(t('audit.actions.document.created')).toBe('文書を作成');
  });

  it('② 葉のキーにドットがあっても引ける', () => {
    expect(t('audit.actions.document.voided')).toBe('文書を無効化');
  });

  it('③ ドット付きキーと分割経路の両方が在るときはリテラル（最長一致）が勝つ', () => {
    const both = { a: { 'b.c': 'literal', b: { c: 'split' } } };
    const { t: tt } = createTranslator(both, { catalogShape: 'nested' });
    expect(tt('a.b.c')).toBe('literal');
  });

  it('④ 無ければ onMissing に委ねる（自分で沈黙 fallback しない）', () => {
    expect(t('audit.actions.document.deleted')).toBe('audit.actions.document.deleted');
    expect(() =>
      createTranslator(audit, { catalogShape: 'nested' }).t('audit.actions.nope'),
    ).toThrow('unknown MessageKey');
  });

  it('⑤ 中間ノードのキーにドットがあっても、その下を辿れる', () => {
    expect(t('audit.actions.document.restored.label')).toBe('文書を復元');
    expect(t('audit.actions.document.restored.description')).toBe('無効化を取り消した');
  });

  it('⑥ 最長一致が行き止まりでも、短い経路で解決できるなら後戻りして見つける', () => {
    const trap = { a: { 'b.c': { x: '行き止まり' }, b: { c: { d: '正解' } } } };
    const { t: tt } = createTranslator(trap, { catalogShape: 'nested' });
    expect(tt('a.b.c.d')).toBe('正解');
  });

  it('⑦ 中間ノードで止まる key はオブジェクトを返さず onMissing', () => {
    expect(t('audit.actions.document.restored')).toBe('audit.actions.document.restored');
  });

  it('⑧ prototype のキーは辿らない（hasOwn で引く）', () => {
    expect(t('audit.constructor')).toBe('audit.constructor');
  });
});
