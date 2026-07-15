/**
 * `Calculator` — physical-calculator feature composition.
 *
 * This file is intentionally small. It reads as a description of what the
 * feature is made of, not as a description of what the calculator does.
 *
 * Responsibilities:
 *
 *   - consume the accepted T-006 public state API (`useCalculator`);
 *   - obtain the localization function and active locale;
 *   - connect the T-007 keyboard adapter to the feature root;
 *   - compose `Display`, `Keypad`, `StatusRegion`, `PreviousResult`;
 *   - expose the calculator's named region for T-008 mounting.
 *
 * It does not:
 *
 *   - own calculator state, transitions, or async orchestration (T-006);
 *   - interpret keyboard events itself (see `hooks/useCalculatorKeyboard`);
 *   - format numbers (see `presentation/formatNumber`);
 *   - map error codes (see `presentation/errorPresentation`);
 *   - declare substantial styled components (see `styles`).
 */
import React from 'react';

import { useI18n } from 'i18n/provider';

import { useCalculator } from './state/useCalculator';
import { useCalculatorKeyboard } from './hooks/useCalculatorKeyboard';
import { errorToI18nKey } from './presentation/errorPresentation';
import { selectDisplayString } from './presentation/displayModel';
import { Display } from './Display';
import { Keypad } from './Keypad';
import { PreviousResult } from './PreviousResult';
import { StatusRegion } from './StatusRegion';
import { CalculatorRoot, DisplayArea } from './styles';
import type { KeypadCommand } from './state/constants';

export const Calculator: React.FC = () => {
  const { t, lang } = useI18n();
  const calculator = useCalculator({ locale: lang });
  const {
    state,
    previousResult,
    status,
    errorKey,
    canRetry,
    pressDigit,
    pressDecimal,
    toggleSign,
    pressBackspace,
    selectOperation,
    pressUnarySqrt,
    submit,
    retry,
    clear,
  } = calculator;

  const handleKeyDown = useCalculatorKeyboard({
    locale: lang,
    canRetry,
    dispatch: {
      pressDigit,
      pressDecimal,
      pressBackspace,
      selectOperation,
      pressUnarySqrt,
      submit,
      retry,
      clear,
    },
  });

  const errorI18nKey = errorToI18nKey(errorKey);

  // Adapter converting a keypad's declarative `KeypadCommand` into a T-006
  // hook method call. Kept inline because it is the minimum bridge between
  // the metadata-driven keypad and the accepted T-006 command surface.
  const handleKeypadCommand = (command: KeypadCommand): void => {
    switch (command.kind) {
      case 'digit':
        pressDigit(command.digit);
        return;
      case 'decimal':
        pressDecimal();
        return;
      case 'signToggle':
        toggleSign();
        return;
      case 'backspace':
        pressBackspace();
        return;
      case 'clear':
        clear();
        return;
      case 'operator':
        selectOperation(command.op);
        return;
      case 'unarySqrt':
        pressUnarySqrt();
        return;
      case 'equals':
        submit();
        return;
    }
  };

  return (
    <CalculatorRoot
      role="region"
      aria-label={t('calculator.title')}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <DisplayArea>
        <PreviousResult value={previousResult} locale={lang} />
        <Display value={selectDisplayString(state, lang)} />
      </DisplayArea>

      <StatusRegion
        status={status}
        errorI18nKey={errorI18nKey}
        canRetry={canRetry}
        onRetry={retry}
      />

      <Keypad locale={lang} onCommand={handleKeypadCommand} />
    </CalculatorRoot>
  );
};
