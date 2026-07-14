module.exports = {
  'apps/web/**/*.{ts,tsx}': [
    (files) => {
      const scoped = files
        .map((f) => f.replace(/^.*apps\/web\//, ''))
        .map((f) => JSON.stringify(f))
        .join(' ');
      return [
        `pnpm --filter @calculator/web exec eslint --fix --max-warnings=0 --no-warn-ignored ${scoped}`,
      ];
    },
  ],
  'apps/web/**/*.{html,json,yml,yaml,md,css}': ['prettier --write'],
  'docs/**/*.md': ['prettier --write'],
  '*.{md,json,yml,yaml}': ['prettier --write'],
};
