import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Local-only build artifact that exists when `sst dev` / `next build`
    // have run; not committed, but lint shouldn't crawl into it either.
    '.open-next/**',
  ]),
  {
    rules: {
      // React 19 added this experimental rule that flags any setState() call
      // inside useEffect. For straightforward on-mount hydration patterns
      // (reading localStorage, doing a redirect-or-fetch, etc.) the
      // useEffect + setState pattern is intentional and recommended — see
      // /dashboard, /, /sign-up etc. The "preferred" alternatives
      // (useSyncExternalStore, lazy useState w/ SSR null check) are more
      // ceremony than the cases here warrant.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);

export default eslintConfig;
