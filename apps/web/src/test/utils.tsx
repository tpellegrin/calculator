/**
 * Shared test utilities.
 *
 * Kept intentionally small: after removing the earlier routing, TanStack
 * Query, and auth systems, tests only need `ThemeProvider` and `I18nProvider`.
 * If a future feature genuinely requires additional providers, extend this
 * helper explicitly rather than hiding provider composition behind flags.
 */
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

import { I18nProvider } from 'i18n/provider';
import { base } from 'styles/themes/base';

export const AllTheProviders: React.FC<React.PropsWithChildren> = ({
  children,
}) => (
  <ThemeProvider theme={base}>
    <I18nProvider>{children}</I18nProvider>
  </ThemeProvider>
);

export const renderWithProviders = (
  ui: React.ReactElement,
  options: Omit<RenderOptions, 'wrapper'> = {},
) => render(ui, { wrapper: AllTheProviders, ...options });
