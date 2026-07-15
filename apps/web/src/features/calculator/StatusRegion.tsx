/**
 * `StatusRegion` — pending indicator, localized error message, and Retry
 * affordance for the physical calculator.
 *
 * Owns:
 *   - `role="status"` announcement while a request is pending;
 *   - `role="alert"` announcement for surfaced errors;
 *   - conditional native Retry button;
 *   - dispatching the T-006 retry action.
 *
 * Does not:
 *   - determine retryability (T-006 exposes `canRetry`);
 *   - inspect raw server diagnostics;
 *   - store an error copy in local state;
 *   - suppress or transform calculator errors through effects.
 */
import React from 'react';

import { useI18n } from 'i18n/provider';
import { Button } from 'components/Button';
import type { I18nKey } from 'i18n';

import type { CalculatorStatus } from './state/logic';
import { StatusArea, LoadingText, ErrorText, RetryRow } from './styles';

interface StatusRegionProps {
  readonly status: CalculatorStatus;
  readonly errorI18nKey: I18nKey | null;
  readonly canRetry: boolean;
  readonly onRetry: () => void;
}

export const StatusRegion: React.FC<StatusRegionProps> = ({
  status,
  errorI18nKey,
  canRetry,
  onRetry,
}) => {
  const { t } = useI18n();

  if (status === 'pending') {
    return (
      <StatusArea>
        <LoadingText role="status" aria-live="polite">
          {t('calculator.status.loading')}
        </LoadingText>
      </StatusArea>
    );
  }

  if (errorI18nKey !== null) {
    return (
      <StatusArea>
        <RetryRow>
          <ErrorText role="alert" aria-live="assertive">
            {t(errorI18nKey)}
          </ErrorText>
          {canRetry && (
            <Button
              size="small"
              variant="accent"
              label={t('calculator.controls.retry')}
              onClick={onRetry}
            />
          )}
        </RetryRow>
      </StatusArea>
    );
  }

  return <StatusArea />;
};
