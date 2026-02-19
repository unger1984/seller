import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname);
  const env = loadEnv(mode, envDir, '');
  const apiOrigin = env.VITE_API_URL ?? '';

  const certDir = path.resolve(process.cwd(), 'tooling/certs');
  const certPath = path.join(certDir, 'localhost.pem');
  const keyPath = path.join(certDir, 'localhost-key.pem');
  const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);
  const https = hasCerts
    ? {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }
    : undefined;

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
    server: {
      port: 8443,
      ...(https && { https }),
    },
    build: {
      outDir: '../../dist/apps/web',
    },
  };
});
