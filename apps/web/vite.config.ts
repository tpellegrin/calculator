import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

// The earlier GitHub Pages base-path logic was intentionally removed: the
// final application will be deployed alongside a Go backend, not as a static
// site under a repository subpath.
export default defineConfig({
  plugins: [viteReact(), tsconfigPaths(), svgr()],
  build: {
    outDir: './dist',
    sourcemap: false,
  },
  server: {
    hmr: {
      protocol: 'ws',
    },
  },
});
