import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname);
  const env = loadEnv(mode, envDir, '');
  const apiOrigin = env.VITE_API_URL ?? '';

  return {
    root: __dirname,
    envDir,
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiOrigin),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    plugins: [react(), nxViteTsPaths()],
    build: {
      outDir: '../../dist/apps/web',
    },
  };
});
