import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const previewAllowedHosts = (env.VITE_PREVIEW_ALLOWED_HOSTS || '')
    .split(',')
    .map(host => host.trim())
    .filter(Boolean);
  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_DEV_SERVER_PORT || 5173),
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:5050',
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    },
    preview: {
      host: env.VITE_PREVIEW_HOST || '0.0.0.0',
      port: Number(env.VITE_PREVIEW_PORT || 4173),
      allowedHosts: previewAllowedHosts.length ? previewAllowedHosts : undefined
    }
  };
});
