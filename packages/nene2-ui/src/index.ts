// Primitives
export { Button, type ButtonProps } from './primitives/Button.js';
export { Input, type InputProps } from './primitives/Input.js';
export { Select, type SelectProps } from './primitives/Select.js';
export { Spinner, type SpinnerProps } from './primitives/Spinner.js';
export { Text, type TextProps } from './primitives/Text.js';
export { Textarea, type TextareaProps } from './primitives/Textarea.js';

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

// States
export { EmptyState, type EmptyStateProps } from './states/EmptyState.js';
export { ErrorState, type ErrorStateProps } from './states/ErrorState.js';

// Data
export { DetailList, type DetailListProps, type DetailRow } from './data/DetailList.js';

// Theme
export { tokens } from './theme/tokens.js';

// Internal helpers, exported so downstream components can compose consistently.
export { cx } from './lib/cx.js';
// Controls the kit does not ship yet (Textarea has 7 independent implementations in the
// fleet) can at least carry the same focus and disabled behaviour instead of inventing it.
export { CONTROL_CLASS, DISABLED_CLASS, FOCUS_CLASS } from './lib/states.js';
