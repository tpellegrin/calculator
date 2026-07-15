import { defineConfig, loadEnv } from 'vite';
import viteReact from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

// The earlier GitHub Pages base-path logic was intentionally removed: the
// final application will be deployed alongside a Go backend, not as a static
// site under a repository subpath.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_BASE_URL || '';

  // Requirement: override without a URL scheme must fail loudly.
  if (apiBaseUrl && !/^https?:\/\//.test(apiBaseUrl)) {
    throw new Error(
      `VITE_API_BASE_URL must have a scheme (http:// or https://). Got: ${apiBaseUrl}`,
    );
  }

  const port = process.env.PORT || '8080';

  return {
    plugins: [viteReact(), tsconfigPaths(), svgr()],
    build: {
      outDir: './dist',
      sourcemap: false,
    },
    server: {
      hmr: {
        protocol: 'ws',
      },
      proxy: {
        '/api': {
          target: apiBaseUrl || `http://localhost:${port}`,
          changeOrigin: false,
        },
      },
    },
  };
});
