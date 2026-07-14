/** @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';

import { setLocale as setI18nLocale } from 'i18n';
import { I18nProvider, useI18n } from './provider';

const Probe: React.FC = () => {
  const { lang, setLang, t } = useI18n();

  return (
    <>
      <div data-testid="lang">{lang}</div>
      <div data-testid="title">{t('app.title')}</div>
      <button
        type="button"
        data-testid="set-pt"
        onClick={() => setLang('pt-BR')}
      >
        set-pt
      </button>
      <button
        type="button"
        data-testid="set-pseudo"
        onClick={() => setLang('pseudo')}
      >
        set-pseudo
      </button>
    </>
  );
};

describe('I18nProvider', () => {
  beforeEach(() => {
    setI18nLocale('en-US');
  });

  it('renders with the default language (en-US)', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('lang')).toHaveTextContent('en-US');
    expect(screen.getByTestId('title')).toHaveTextContent('Calculator');
  });

  it('switches language when setLang is called', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    await user.click(screen.getByTestId('set-pt'));

    expect(screen.getByTestId('lang')).toHaveTextContent('pt-BR');
    expect(screen.getByTestId('title')).toHaveTextContent('Calculadora');
    expect(localStorage.getItem('app.lang')).toBe('pt-BR');
  });

  it('restores the persisted language from localStorage', () => {
    localStorage.setItem('app.lang', 'pt-BR');

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('lang')).toHaveTextContent('pt-BR');
    expect(screen.getByTestId('title')).toHaveTextContent('Calculadora');
  });

  it('falls back to the default when localStorage has an unsupported language', () => {
    localStorage.setItem('app.lang', 'fr-FR');

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('lang')).toHaveTextContent('en-US');
  });

  it('updates the document lang attribute when the language changes', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(document.documentElement.lang).toBe('en-US');

    await user.click(screen.getByTestId('set-pseudo'));

    expect(document.documentElement.lang).toBe('pseudo');
  });
});
