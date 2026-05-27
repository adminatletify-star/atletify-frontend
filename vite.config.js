import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // ============================================================
    //  PWA — Configuración SEGURA y MÍNIMA
    //  - Solo cachea assets estáticos del build (JS/CSS/imágenes locales/fuentes).
    //  - NO cachea /api/ ni nada del backend → cero riesgo de leaks entre usuarios.
    //  - registerType: 'autoUpdate' + skipWaiting → cuando despliegues una versión nueva,
    //    el SW se actualiza solo en la siguiente carga (no deja a usuarios pegados a versiones viejas).
    //  - devOptions.enabled: false → el SW NO se activa en `npm run dev`,
    //    así no interfiere con el flujo normal de desarrollo.
    // ============================================================
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'LogosDeAtletify/LogoBlanco.png',
        'icons/apple-touch-icon.png',
        'offline.html',
      ],
      manifest: {
        name: 'Atletify',
        short_name: 'Atletify',
        description: 'Plataforma SaaS para gestión de boxes de CrossFit',
        lang: 'es',
        theme_color: '#0a0a0c',
        background_color: '#0B0B0F',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['fitness', 'health', 'sports', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/apple-touch-icon.png',  sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        // Cachear únicamente assets estáticos del propio build.
        // NUNCA respuestas del backend ni endpoints /api → evita problemas de privacidad/sesión.
        globPatterns: ['**/*.{js,css,html,svg,ico,woff,woff2,ttf}'],
        // EXCLUIR del precache las carpetas pesadas de imágenes públicas (~175 MB total).
        // Estas imágenes se siguen cargando con normalidad por el navegador cuando se piden;
        // simplemente no las metemos al precache del SW para no inflar la primera descarga.
        globIgnores: [
          '**/Coaches/**',
          '**/Box interno/**',
          '**/Grupal/**',
          '**/Lo que ofrece/**',
        ],
        // Si un usuario navega offline a una ruta SPA, servir index.html.
        navigateFallback: '/index.html',
        // Evita interceptar rutas de API por accidente.
        navigateFallbackDenylist: [/^\/api\//],
        // Limita el tamaño máximo de archivo a precachear (el bundle JS principal pesa ~6 MB).
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        // CRÍTICO: en modo `npm run dev` el SW está APAGADO.
        // Solo se activa con `npm run build` + `npm run preview` o en producción.
        enabled: false,
      },
    }),
  ],
  esbuild: {
    drop: ['console', 'debugger'], // 👈 Elimina console.log, info, warn, error y debugger en Producción
  },
})
