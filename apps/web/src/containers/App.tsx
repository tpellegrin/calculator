import { styled, ThemeProvider } from 'styled-components';

import { I18nProvider, useI18n } from 'i18n/provider';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { Flex } from 'components/Flex';
import { Text } from 'components/Text';
import { base } from 'styles/themes/base';
import { GlobalStyle } from 'styles/global';
import { FontStyles } from 'styles/fonts';
import { from } from 'styles/media';

/**
 * Root application composition.
 *
 * The provider stack was reduced from six providers to three:
 *   - `ThemeProvider` + global/font styles (design tokens, typography),
 *   - `I18nProvider` (locale-aware messages),
 *   - `ErrorBoundary` (last-resort UI recovery).
 *
 * Routing, TanStack Query, authentication, navigation, and progress-bar
 * providers were intentionally removed from the earlier foundation. See
 * `docs/frontend-foundation.md` for the rationale.
 */
export const App = () => (
  <ThemeProvider theme={base}>
    <GlobalStyle />
    <FontStyles />
    <I18nProvider>
      <ErrorBoundary>
        <PlaceholderView />
      </ErrorBoundary>
    </I18nProvider>
  </ThemeProvider>
);

const PlaceholderView = () => {
  const { t } = useI18n();

  return (
    <_Main>
      <_Content direction="column" gap="md" alignItems="flex-start">
        <Text as="h1" variant="headingLg">
          {t('app.title')}
        </Text>
        <Text as="p" variant="bodyMd">
          {t('app.status')}
        </Text>
      </_Content>
    </_Main>
  );
};

const _Main = styled.main`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: ${({ theme }) => theme.spacers.lg};
  background: ${({ theme }) => theme.colors.surface.base};
`;

const _Content = styled(Flex)`
  width: 100%;
  max-width: 32rem;

  ${from.tablet} {
    max-width: 40rem;
  }
`;
