/**
 * `Display` — renders the current display value produced by T-006.
 *
 * Owns:
 *   - visual rendering of the current buffer or result string;
 *   - the display's accessible name;
 *   - polite live-region behavior for calculator updates;
 *   - a `title` attribute exposing the full text for truncated content;
 *   - display-specific layout styling (declared in `styles.ts`).
 *
 * Does not:
 *   - select or reinterpret T-006 transitions;
 *   - format numbers on its own (T-007 does that in `presentation/formatNumber`
 *     when needed; the value shown here is the string T-006 already prepared);
 *   - store a local copy of the displayed value;
 *   - nest additional live regions inside itself.
 */
import React from 'react';

import { useI18n } from 'i18n/provider';

import { MainDisplay } from './styles';

interface DisplayProps {
  /** Pre-formatted string produced by `useCalculator({ locale }).displayValue`. */
  readonly value: string;
}

export const Display: React.FC<DisplayProps> = ({ value }) => {
  const { t } = useI18n();

  return (
    <MainDisplay
      role="status"
      aria-live="polite"
      aria-label={t('calculator.display.label')}
      title={value}
    >
      {value}
    </MainDisplay>
  );
};
