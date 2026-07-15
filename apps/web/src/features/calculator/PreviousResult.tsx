/**
 * `PreviousResult` — renders the prior result (only present while a
 * submission is pending against a preceding success), through T-007's
 * shared number formatter and localization function.
 *
 * Owns:
 *   - presentation of the prior numeric value while pending;
 *   - localized identification via `calculator.display.previous`;
 *   - truncation-friendly `title` attribute exposing the full value;
 *   - graceful null case rendering an empty layout-stable slot.
 *
 * Does not:
 *   - reconstruct or store prior calculator state;
 *   - infer prior values from event history;
 *   - duplicate the formatting policy (delegates to `formatNumber`).
 */
import React from 'react';

import { useI18n } from 'i18n/provider';
import type { Locale } from 'i18n';

import { PreviousResultText } from './styles';
import { formatNumber } from './presentation/formatNumber';

interface PreviousResultProps {
  /** T-006-derived previous result number, or `null` when nothing to show. */
  readonly value: number | null;
  readonly locale: Locale;
}

export const PreviousResult: React.FC<PreviousResultProps> = ({
  value,
  locale,
}) => {
  const { t } = useI18n();

  if (value === null) {
    // Preserve vertical rhythm without producing an announcement.
    return <PreviousResultText aria-hidden="true" />;
  }

  const formatted = formatNumber(value, locale);

  return (
    <PreviousResultText title={formatted}>
      {t('calculator.display.previous', { value: formatted })}
    </PreviousResultText>
  );
};
