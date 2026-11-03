import react from '@vitejs/plugin-react';
import { cpSync, createReadStream, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'static-event-data',
      configureServer(server) {
        server.middlewares.use('/data', (request, response, next) => {
          const file = path.resolve('data', (request.url ?? '/').replace(/^\//, ''));
          if (!existsSync(file)) return next();
          response.setHeader('content-type', file.endsWith('.json') ? 'application/json' : 'application/octet-stream');
          createReadStream(file).pipe(response);
        });
      },
      closeBundle() {
        mkdirSync('dist/data', { recursive: true });
        for (const file of ['events.json', 'days.json', 'venues.json', 'review.json', 'meta.json', 'events.xlsx']) {
          if (existsSync(path.resolve('data', file))) cpSync(path.resolve('data', file), path.resolve('dist/data', file));
        }
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['driver-mark.svg'],
      manifest: {
        name: 'Auckland Driver Events',
        short_name: 'Driver Events',
        description: 'Expected busy times around Auckland events.',
        theme_color: '#101416',
        background_color: '#101416',
        display: 'standalone',
        start_url: './',
        icons: [{ src: 'driver-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        runtimeCaching: [{
          urlPattern: /\/data\/(events|days|venues|meta)\.json$/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'driver-events-data', expiration: { maxEntries: 12, maxAgeSeconds: 172800 } }
        }]
      }
    })
  ]
});
