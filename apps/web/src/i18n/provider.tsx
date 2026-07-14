import React from 'react';
import {
  setLocale as setI18nLocale,
  t as baseT,
  SUPPORTED_LOCALES,
  type Locale,
} from 'i18n';

/**
 * i18n provider.
 *
 * The application is currently single-locale in the UI (English), but the
 * message layer is preserved so that:
 *   - copy can be externalized from JSX,
 *   - a pseudo locale is available for text-expansion checks, and
 *   - additional locales can be enabled without touching the runtime.
 *
 * There is deliberately no user-facing locale selector: the target application
 * exposes a single primary screen.
 */
const LANG_KEY = 'app.lang';

const isSupported = (value: string | null): value is Locale =>
  value !== null && (SUPPORTED_LOCALES as readonly string[]).includes(value);

export type I18nContext = {
  lang: Locale;
  setLang: (l: Locale) => void;
  t: typeof baseT;
};

const Ctx = React.createContext<I18nContext | null>(null);

function detectInitial(): Locale {
  // 1) Persisted preference
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (isSupported(saved)) return saved;
  } catch {
    /* storage unavailable — fall through */
  }

  // 2) Navigator hint (pt-* → pt-BR, otherwise fall back to base locale)
  if (typeof navigator !== 'undefined') {
    const n =
      navigator.language || (navigator.languages && navigator.languages[0]);
    if (n && n.toLowerCase().startsWith('pt')) return 'pt-BR';
  }

  // 3) Base locale
  return 'en-US';
}

export const I18nProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [lang, setLangState] = React.useState<Locale>(() => {
    const initial = detectInitial();
    setI18nLocale(initial);
    return initial;
  });

  const setLang = React.useCallback((nextLang: Locale) => {
    setI18nLocale(nextLang);
    setLangState(nextLang);
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }

    try {
      document.documentElement.lang = lang;
      document.documentElement.setAttribute('data-lang', lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const value = React.useMemo(
    () => ({ lang, setLang, t: baseT }),
    [lang, setLang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useI18n = () => {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
