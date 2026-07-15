/**
 * `Keypad` — renders the exact physical keys defined by `KEYPAD` metadata
 * as native `<button>` elements, in visual order.
 *
 * Owns:
 *   - translation of declarative key entries into native buttons;
 *   - localized accessible names at render time;
 *   - locale-appropriate glyph for the decimal-separator button;
 *   - forwarding a semantic `KeypadCommand` to its parent.
 *
 * Does not:
 *   - own calculator state;
 *   - interpret physical keyboard events;
 *   - format numbers;
 *   - construct API requests.
 */
import React from 'react';

import { useI18n } from 'i18n/provider';
import { Button } from 'components/Button';
import type { Locale } from 'i18n';

import { KEYPAD, type KeypadCommand } from './state/constants';
import { KeypadGrid } from './styles';

interface KeypadProps {
  readonly locale: Locale;
  readonly onCommand: (command: KeypadCommand) => void;
}

/** Locale-appropriate glyph for the visible decimal-separator button. */
function decimalGlyphFor(locale: Locale): ',' | '.' {
  return locale === 'pt-BR' ? ',' : '.';
}

export const Keypad: React.FC<KeypadProps> = ({ locale, onCommand }) => {
  const { t } = useI18n();
  const decimalGlyph = decimalGlyphFor(locale);

  return (
    <KeypadGrid>
      {KEYPAD.map((entry) => {
        const symbol =
          entry.id === 'decimal' ? decimalGlyph : (entry.symbol ?? '');
        const ariaLabel = entry.labelKey ? t(entry.labelKey) : undefined;
        return (
          <Button
            key={entry.id}
            variant={entry.variant}
            label={symbol}
            aria-label={ariaLabel}
            onClick={() => onCommand(entry.command)}
          />
        );
      })}
    </KeypadGrid>
  );
};
