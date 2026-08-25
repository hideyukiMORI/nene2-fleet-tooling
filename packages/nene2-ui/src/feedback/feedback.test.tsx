// @vitest-environment jsdom
/**
 * W0.6（#304）— LoadingState / Modal / ConfirmDialog / Badge / InlineAlert。
 *
 * 見ているのは意匠ではなく**意味の割り当て**（role / aria / 焦点の順序）。
 * 艦が別々に書いたとき最初にズレるのがここで、しかも**ズレても画面は正しく見える**。
 */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Badge } from './Badge.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { InlineAlert } from './InlineAlert.js';
import { ConfirmDialog } from '../overlay/ConfirmDialog.js';
import { Modal } from '../overlay/Modal.js';
import { LoadingState } from '../states/LoadingState.js';
import { EmptyState } from '../states/EmptyState.js';
import { ErrorState } from '../states/ErrorState.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the three states', () => {
  it('all exist — the README promises them as a set', async () => {
    // v0.1 は LoadingState を欠いたまま「set として出荷する」と書いていた。
    const kit = await import('../index.js');
    for (const name of ['LoadingState', 'EmptyState', 'ErrorState'] as const) {
      expect(kit[name], `${name} must be exported`).toBeTypeOf('function');
    }
  });

  it('each announces itself, and none of them announces twice', () => {
    const loading = render(<LoadingState label="loading" />).container;
    // Spinner が <output aria-live> なので、包む側は live region を重ねない。
    expect(loading.firstElementChild?.getAttribute('aria-busy')).toBe('true');
    expect(loading.firstElementChild?.getAttribute('role')).toBeNull();
    expect(loading.querySelector('output')?.getAttribute('aria-live')).toBe('polite');

    expect(
      render(<EmptyState message="none" />).container.firstElementChild?.getAttribute('role'),
    ).toBe('status');
    expect(
      render(
        <ErrorState message="bad" retryLabel="retry" onRetry={() => {}} />,
      ).container.firstElementChild?.getAttribute('role'),
    ).toBe('alert');
  });
});

describe('Modal', () => {
  it('is a real dialog, named by its title', () => {
    const { container } = render(
      <Modal open title="Settings" onClose={() => {}}>
        body
      </Modal>,
    );
    const el = container.querySelector('dialog');
    expect(el).toBeTruthy();
    expect(el?.getAttribute('aria-label')).toBe('Settings');
  });

  it('opens through showModal when the browser has it — only that puts it in the top layer', () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    // jsdom 25.0.1 does not implement showModal at all, so the test supplies it.
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      value: showModal,
      configurable: true,
      writable: true,
    });

    render(
      <Modal open title="t" onClose={() => {}}>
        b
      </Modal>,
    );
    expect(showModal).toHaveBeenCalledTimes(1);

    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  });

  it('still shows itself where showModal does not exist, rather than vanishing', () => {
    // 🔴 これが無いと、jsdom と古いブラウザでは「開かない modal」になる。
    expect(HTMLDialogElement.prototype.showModal).toBeUndefined();
    const { container } = render(
      <Modal open title="t" onClose={() => {}}>
        b
      </Modal>,
    );
    expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true);
  });

  it('is closed when it is not open', () => {
    const { container } = render(
      <Modal open={false} title="t" onClose={() => {}}>
        b
      </Modal>,
    );
    expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  });
});

describe('ConfirmDialog', () => {
  const props = {
    open: true,
    title: 'Delete',
    message: 'Sure?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
  };

  it('puts the safe choice first, so keyboard order reaches it first', () => {
    const { container } = render(
      <ConfirmDialog {...props} onConfirm={() => {}} onCancel={() => {}} />,
    );
    const labels = [...container.querySelectorAll('button')].map((b) => b.textContent);
    expect(labels).toEqual(['Cancel', 'Delete']);
  });

  it('marks a destructive confirmation as destructive', () => {
    const { container } = render(
      <ConfirmDialog {...props} tone="danger" onConfirm={() => {}} onCancel={() => {}} />,
    );
    const confirm = [...container.querySelectorAll('button')].at(-1);
    expect(confirm?.getAttribute('class')).toContain('bg-x-slot-button-danger-bg');
  });

  it('is not destructive-looking by default', () => {
    const { container } = render(
      <ConfirmDialog {...props} onConfirm={() => {}} onCancel={() => {}} />,
    );
    const confirm = [...container.querySelectorAll('button')].at(-1);
    expect(confirm?.getAttribute('class')).toContain('bg-x-slot-button-primary-bg');
  });

  it('routes a dismissal to onCancel, never to onConfirm', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmDialog {...props} onConfirm={onConfirm} onCancel={onCancel} />,
    );
    container.querySelector('dialog')?.dispatchEvent(new Event('close'));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('Badge', () => {
  it('takes a meaning, and reads its colour from the theme', () => {
    const { container } = render(<Badge tone="danger">x</Badge>);
    const cls = container.firstElementChild?.getAttribute('class') ?? '';
    expect(cls).toContain('bg-x-slot-badge-danger-bg');
    expect(cls).not.toMatch(/#|rgb|\[/);
  });

  it('is neutral unless told otherwise', () => {
    const { container } = render(<Badge>x</Badge>);
    expect(container.firstElementChild?.getAttribute('class')).toContain(
      'text-x-slot-badge-neutral-fg',
    );
  });
});

describe('InlineAlert', () => {
  it('interrupts for danger and waits its turn for info', () => {
    // 🔴 tone が決めるのは色だけではない。role が変わる。
    expect(
      render(<InlineAlert tone="danger">x</InlineAlert>).container.firstElementChild?.getAttribute(
        'role',
      ),
    ).toBe('alert');
    expect(
      render(<InlineAlert>x</InlineAlert>).container.firstElementChild?.getAttribute('role'),
    ).toBe('status');
  });
});

describe('Badge — success / warn / info（#422・0.17.0）', () => {
  it.each(['success', 'warn', 'info'] as const)(
    '%s reads its own slots, not another tone’s',
    (tone) => {
      const { container } = render(<Badge tone={tone}>x</Badge>);
      const cls = container.firstElementChild?.getAttribute('class') ?? '';
      expect(cls).toContain(`bg-x-slot-badge-${tone}-bg`);
      expect(cls).toContain(`text-x-slot-badge-${tone}-fg`);
      expect(cls).toContain(`border-x-slot-badge-${tone}-border`);
      // 他のトーンのスロットを借りていない（warn が danger を指していた 0.11 以前の alert の型）
      for (const other of ['neutral', 'accent', 'danger', 'success', 'warn', 'info'].filter(
        (t) => t !== tone,
      )) {
        expect(cls).not.toContain(`x-slot-badge-${other}-`);
      }
    },
  );

  it('each new tone resolves to a palette colour of its own meaning in the theme', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const theme = readFileSync(path.join(here, '../../themes/default.css'), 'utf8');
    for (const tone of ['success', 'warn', 'info']) {
      const m = new RegExp(`--color-x-slot-badge-${tone}-bg:\\s*var\\(--color-([a-z-]+)\\);`).exec(
        theme,
      );
      expect(m?.[1], `badge ${tone} bg`).toBe(tone);
    }
  });
});
