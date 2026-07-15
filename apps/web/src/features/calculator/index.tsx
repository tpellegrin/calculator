/**
 * `Calculator` — thin presentation and composition layer.
 *
 * Responsibilities intentionally limited to:
 *   - describing the calculator landmark, display, keypad, and status regions;
 *   - obtaining translated labels via `useI18n`;
 *   - delegating all state and orchestration to `useCalculator`;
 *   - mapping declarative `KEYPAD` metadata to native buttons;
 *   - forwarding physical-keyboard events through the pure
 *     `keyboardEventToCommand` mapper.
 *
 * No state-machine transitions, request construction, formatting, or
 * error classification live in this file — those responsibilities are
 * exclusively owned by `state/logic.ts` and `state/useCalculator.ts`.
 */
import React, { useCallback, useEffect } from 'react';

import { Button } from 'components/Button';
import type { I18nKey } from 'i18n';
import { useI18n } from 'i18n/provider';

import { KEYPAD, type KeypadEntry } from './state/constants';
import {
  decimalSeparatorFor,
  keyboardEventToCommand,
  mapErrorToI18nKey,
} from './state/logic';
import { useCalculator, type CalculatorApi } from './state/useCalculator';
import {
  CalculatorRoot,
  DisplayArea,
  ErrorText,
  KeypadGrid,
  LoadingText,
  MainDisplay,
  PreviousResultText,
  RetryRow,
  StatusArea,
} from './styles';

export const Calculator: React.FC = () => {
  const { t, lang } = useI18n();
  const calculator = useCalculator({ locale: lang });
  const { displayValue, previousResult, status, errorKey, canRetry, retry } =
    calculator;

  const decimalSeparator = decimalSeparatorFor(lang);

  const dispatchCommand = useCallback(
    (
      command: KeypadEntry['command'],
      api: CalculatorApi = calculator,
    ): void => {
      switch (command.kind) {
        case 'digit':
          api.pressDigit(command.digit);
          return;
        case 'decimal':
          api.pressDecimal();
          return;
        case 'signToggle':
          api.toggleSign();
          return;
        case 'backspace':
          api.pressBackspace();
          return;
        case 'clear':
          api.clear();
          return;
        case 'operator':
          api.selectOperation(command.op);
          return;
        case 'unarySqrt':
          api.pressUnarySqrt();
          return;
        case 'equals':
          api.submit();
          return;
      }
    },
    [calculator],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const command = keyboardEventToCommand(event, {
        locale: lang,
        canRetry,
      });
      if (command === null) return;
      if (command.kind === 'retry') {
        retry();
        return;
      }
      // Every non-retry keyboard command aligns with a `KeypadEntry.command`.
      dispatchCommand(command);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lang, canRetry, retry, dispatchCommand]);

  const errorI18nKey = mapErrorToI18nKey(errorKey);

  return (
    <CalculatorRoot aria-label={t('calculator.title')}>
      <DisplayArea>
        <PreviousResultText aria-hidden={previousResult === null}>
          {previousResult !== null &&
            t('calculator.display.previous', { value: previousResult })}
        </PreviousResultText>
        <MainDisplay
          role="status"
          aria-live="polite"
          aria-label={t('calculator.display.label')}
        >
          {displayValue}
        </MainDisplay>
      </DisplayArea>

      <StatusArea>
        {status === 'pending' && (
          <LoadingText role="status" aria-live="polite">
            {t('calculator.status.loading')}
          </LoadingText>
        )}
        {status === 'domain-error' && errorI18nKey && (
          <ErrorText role="alert" aria-live="assertive">
            {t(errorI18nKey as I18nKey)}
          </ErrorText>
        )}
        {status === 'retryable' && errorI18nKey && (
          <RetryRow>
            <ErrorText role="alert" aria-live="assertive">
              {t(errorI18nKey as I18nKey)}
            </ErrorText>
            <Button
              size="small"
              variant="accent"
              label={t('common.actions.tryAgain')}
              onClick={retry}
            />
          </RetryRow>
        )}
      </StatusArea>

      <KeypadGrid>
        {KEYPAD.map((entry) => {
          const symbol =
            entry.id === 'decimal' ? decimalSeparator : (entry.symbol ?? '');
          const ariaLabel = entry.labelKey ? t(entry.labelKey) : undefined;
          return (
            <Button
              key={entry.id}
              variant={entry.variant}
              label={symbol}
              aria-label={ariaLabel}
              onClick={() => dispatchCommand(entry.command)}
            />
          );
        })}
      </KeypadGrid>
    </CalculatorRoot>
  );
};
