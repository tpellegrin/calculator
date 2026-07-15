/**
 * Declarative keypad and operation metadata for the physical calculator.
 *
 * The keypad is expressed as an ordered array of `KeypadEntry` records so
 * the component can render buttons via a single `map()` rather than dozens
 * of near-identical JSX blocks. Metadata combines the *canonical* API
 * identifier (which never travels through localization) with the
 * translation key used for the accessible name (which never appears in
 * request payloads).
 */

import type { I18nKey } from 'i18n';
import type { Operation } from 'api/types';

/**
 * A "command" is the semantic effect a keypad button performs. Split from
 * the reducer `Action` type so the component never constructs internal
 * actions directly — it invokes named commands on the feature hook.
 */
export type KeypadCommand =
  | { kind: 'digit'; digit: number }
  | { kind: 'decimal' }
  | { kind: 'signToggle' }
  | { kind: 'backspace' }
  | { kind: 'clear' }
  | { kind: 'operator'; op: Operation }
  | { kind: 'unarySqrt' }
  | { kind: 'equals' };

/**
 * Visual style variant, mirroring the shared `Button` component's `variant`
 * prop. `undefined` renders the default (digit) variant.
 */
export type KeypadVariant = 'primary' | 'secondary' | 'accent' | undefined;

export interface KeypadEntry {
  /** Stable id for React keys and test hooks; not user-visible. */
  readonly id: string;
  /**
   * Non-localized visible glyph on the button. Mathematical symbols such as
   * `÷`, `×`, `√` are universal typography and are not translated. The
   * decimal separator entry uses `null` — the component substitutes the
   * locale-appropriate glyph at render time.
   */
  readonly symbol: string | null;
  /**
   * Translation key for the accessible name (`aria-label`) when the visible
   * glyph is not itself an accessible label. Digit buttons intentionally
   * carry `null`: the visible digit is a valid accessible name.
   */
  readonly labelKey: I18nKey | null;
  readonly variant: KeypadVariant;
  readonly command: KeypadCommand;
}

/**
 * Declarative keypad layout — 4 columns, top-to-bottom, left-to-right.
 * The order corresponds to visual position in the grid.
 */
export const KEYPAD: readonly KeypadEntry[] = [
  // Row 1
  {
    id: 'clear',
    symbol: 'C',
    labelKey: 'calculator.controls.clear',
    variant: 'secondary',
    command: { kind: 'clear' },
  },
  {
    id: 'signToggle',
    symbol: '±',
    labelKey: 'calculator.controls.signToggle',
    variant: 'secondary',
    command: { kind: 'signToggle' },
  },
  {
    id: 'percentage',
    symbol: '%',
    labelKey: 'calculator.operations.percentage',
    variant: 'secondary',
    command: { kind: 'operator', op: 'percentage' },
  },
  {
    id: 'divide',
    symbol: '÷',
    labelKey: 'calculator.operations.divide',
    variant: 'primary',
    command: { kind: 'operator', op: 'divide' },
  },
  // Row 2
  {
    id: 'd7',
    symbol: '7',
    labelKey: null,
    variant: undefined,
    command: { kind: 'digit', digit: 7 },
  },
  {
    id: 'd8',
    symbol: '8',
    labelKey: null,
    variant: undefined,
    command: { kind: 'digit', digit: 8 },
  },
  {
    id: 'd9',
    symbol: '9',
    labelKey: null,
    variant: undefined,
    command: { kind: 'digit', digit: 9 },
  },
  {
    id: 'multiply',
    symbol: '×',
    labelKey: 'calculator.operations.multiply',
    variant: 'primary',
    command: { kind: 'operator', op: 'multiply' },
  },
  // Row 3
  {
    id: 'd4',
    symbol: '4',
    labelKey: null,
    variant: undefined,
    command: { kind: 'digit', digit: 4 },
  },
  {
    id: 'd5',
    symbol: '5',
    labelKey: null,
    variant: undefined,
    command: { kind: 'digit', digit: 5 },
  },
  {
    id: 'd6',
    symbol: '6',
    labelKey: null,
    variant: undefined,
    command: { kind: 'digit', digit: 6 },
  },
  {
    id: 'subtract',
    symbol: '−',
    labelKey: 'calculator.operations.subtract',
    variant: 'primary',
    command: { kind: 'operator', op: 'subtract' },
  },
  // Row 4
  {
    id: 'd1',
    symbol: '1',
    labelKey: null,
    variant: undefined,
    command: { kind: 'digit', digit: 1 },
  },
  {
    id: 'd2',
    symbol: '2',
    labelKey: null,
    variant: undefined,
    command: { kind: 'digit', digit: 2 },
  },
  {
    id: 'd3',
    symbol: '3',
    labelKey: null,
    variant: undefined,
    command: { kind: 'digit', digit: 3 },
  },
  {
    id: 'add',
    symbol: '+',
    labelKey: 'calculator.operations.add',
    variant: 'primary',
    command: { kind: 'operator', op: 'add' },
  },
  // Row 5
  {
    id: 'd0',
    symbol: '0',
    labelKey: null,
    variant: undefined,
    command: { kind: 'digit', digit: 0 },
  },
  {
    id: 'decimal',
    symbol: null, // Component substitutes locale decimal separator glyph.
    labelKey: 'calculator.controls.decimal',
    variant: undefined,
    command: { kind: 'decimal' },
  },
  {
    id: 'sqrt',
    symbol: '√',
    labelKey: 'calculator.operations.sqrt',
    variant: 'secondary',
    command: { kind: 'unarySqrt' },
  },
  {
    id: 'equals',
    symbol: '=',
    labelKey: 'calculator.controls.equals',
    variant: 'accent',
    command: { kind: 'equals' },
  },
  // Row 6 (extras: power + backspace)
  {
    id: 'power',
    symbol: 'xʸ',
    labelKey: 'calculator.operations.power',
    variant: 'secondary',
    command: { kind: 'operator', op: 'power' },
  },
  {
    id: 'backspace',
    symbol: '⌫',
    labelKey: 'calculator.controls.backspace',
    variant: 'secondary',
    command: { kind: 'backspace' },
  },
];
