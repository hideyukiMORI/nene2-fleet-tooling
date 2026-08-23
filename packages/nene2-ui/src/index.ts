// Primitives
export { Button, type ButtonProps } from './primitives/Button.js';
export { Input, type InputProps } from './primitives/Input.js';
export { Select, type SelectProps } from './primitives/Select.js';
export { Spinner, type SpinnerProps } from './primitives/Spinner.js';
export { Text, type TextProps } from './primitives/Text.js';
export { Textarea, type TextareaProps } from './primitives/Textarea.js';
export { Checkbox, type CheckboxProps } from './primitives/Checkbox.js';
export { Radio, type RadioProps } from './primitives/Radio.js';
export { Switch, type SwitchProps } from './primitives/Switch.js';

// Layout
export { PageHeader, type PageHeaderProps } from './layout/PageHeader.js';
export { Stack, type StackProps } from './layout/Stack.js';
export { Grid, type GridProps } from './layout/Grid.js';
export { Box, type BoxProps } from './layout/Box.js';
export { Section, type SectionProps } from './layout/Section.js';
export { Card, type CardProps } from './layout/Card.js';

// Spacing scale — the names a caller may choose from (design principle 3).
export type { Space, Responsive } from './lib/spacing.js';

// Forms
export { FormField, type FormFieldProps } from './forms/FormField.js';

// States — the three ship together (design principle 5). Adding a fourth screen state
// means adding it here, or the set stops being a set.
export { LoadingState, type LoadingStateProps } from './states/LoadingState.js';
export { EmptyState, type EmptyStateProps } from './states/EmptyState.js';
export { ErrorState, type ErrorStateProps } from './states/ErrorState.js';

// Overlay
export { Modal, type ModalProps } from './overlay/Modal.js';
export { ConfirmDialog, type ConfirmDialogProps } from './overlay/ConfirmDialog.js';

// Feedback
export { Badge, type BadgeProps } from './feedback/Badge.js';
export { InlineAlert, type InlineAlertProps } from './feedback/InlineAlert.js';
export { ToastProvider, type ToastProviderProps } from './feedback/ToastProvider.js';
export {
  useToast,
  type ToastApi,
  type ToastOptions,
  type ToastTone,
} from './feedback/toast-context.js';

// Data
export { DetailList, type DetailListProps, type DetailRow } from './data/DetailList.js';
export { DataTable, type DataTableProps, type DataColumn } from './data/DataTable.js';
export { Pagination, type PaginationProps } from './data/Pagination.js';

// Theme
export { tokens } from './theme/tokens.js';

// Internal helpers, exported so downstream components can compose consistently.
export { cx } from './lib/cx.js';
// Controls the kit does not ship yet (Textarea has 7 independent implementations in the
// fleet) can at least carry the same focus and disabled behaviour instead of inventing it.
export { CONTROL_CLASS, DISABLED_CLASS, FOCUS_CLASS } from './lib/states.js';
