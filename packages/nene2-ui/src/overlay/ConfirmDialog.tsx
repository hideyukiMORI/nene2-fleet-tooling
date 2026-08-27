import { Button } from '../primitives/Button.js';
import { Stack } from '../layout/Stack.js';
import { Text } from '../primitives/Text.js';
import { Modal } from './Modal.js';

export interface ConfirmDialogProps {
  open: boolean;
  /** Localized title. */
  title: string;
  /** Localized body. */
  message: string;
  /** Localized label for the affirmative control. */
  confirmLabel: string;
  /** Localized label for the dismissive control. */
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** `danger` for destructive confirmations. Chooses a variant, never a colour. */
  tone?: 'default' | 'danger';
}

/**
 * "Are you sure?" — the same dialog five ships wrote separately.
 *
 * 🔴 Cancel comes first in the DOM. It is the safe choice, so it is the one that should be
 * reached first by keyboard and the one focus lands on when the dialog opens. A destructive
 * confirmation whose dangerous button is the default is a footgun, and it is exactly the
 * kind of detail that differs between five independent implementations.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = 'default',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <Stack gap="xs">
        <Text>{message}</Text>
        <Stack direction="horizontal" gap="2xs" justify="end">
          <Button variant="outline" tone="neutral" onClick={onCancel}>
            {cancelLabel}
          </Button>
          {/* 🔴 `tone` の値をそのまま渡す。0.20.0 以前は `variant` に載せ替えていたが、
              それは「形」の軸に「色」を書いていたということだった（#487）。
              ConfirmDialog の `tone` と Button の `tone` は同じ語で同じ意味になった。 */}
          <Button tone={tone === 'danger' ? 'danger' : 'accent'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}
