import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const rawPort = env.VITE_DEV_PORT ?? process.env.VITE_DEV_PORT ?? '5420';
  const devPort = Number.parseInt(String(rawPort), 10);
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: Number.isFinite(devPort) && devPort > 0 ? devPort : 5420,
      strictPort: false,
      host: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
