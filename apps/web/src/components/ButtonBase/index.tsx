import React, { useCallback, useRef } from 'react';

import { _ButtonBaseRoot } from './styles';
import type { Props } from './types';

/**
 * Low-level, unstyled button primitive.
 *
 * Adds two behaviors on top of a native `<button>`:
 *   - optional blur-on-click with configurable delay (nice for click-then-animate
 *     UIs where lingering focus rings feel wrong);
 *   - opt-in `stopPropagation` for nested interactive layouts.
 *
 * `disabled` is honored both natively and via `aria-disabled`.
 */
export const ButtonBase = React.forwardRef<HTMLButtonElement, Props>(
  (props, ref) => {
    const {
      blurDelay = 0,
      blurOnClick,
      disabled,
      stopPropagation,
      onClick,
      isFullWidth,
      type,
      ...rest
    } = props;

    const localRef = useRef<HTMLButtonElement | null>(null);

    const setRef = useCallback(
      (node: HTMLButtonElement | null) => {
        localRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLButtonElement | null>).current =
            node;
        }
      },
      [ref],
    );

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (stopPropagation) event.stopPropagation();

        if (blurOnClick) {
          setTimeout(() => {
            localRef.current?.blur();
          }, blurDelay);
        }

        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        onClick?.(event);
      },
      [stopPropagation, blurOnClick, blurDelay, disabled, onClick],
    );

    return (
      <_ButtonBaseRoot
        ref={setRef}
        {...rest}
        type={type ?? 'button'}
        onClick={handleClick}
        disabled={!!disabled}
        aria-disabled={disabled || undefined}
        $isDisabled={!!disabled}
        $isFullWidth={isFullWidth}
      />
    );
  },
);

ButtonBase.displayName = 'ButtonBase';
