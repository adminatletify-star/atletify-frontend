/**
 * Genera los iconos requeridos para la PWA a partir de LogoBlanco.png.
 *
 * Uso (una sola vez, o cada vez que cambie el logo base):
 *   node scripts/generate-pwa-icons.js
 *
 * Salida en /public/icons/:
 *   - icon-192.png            (Android estándar)
 *   - icon-512.png            (Android estándar grande / splash)
 *   - icon-512-maskable.png   (Android adaptive — con safe-zone)
 *   - apple-touch-icon.png    (iOS — 180x180)
 *
 * No se ejecuta en build, no toca node_modules en runtime.
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SOURCE = resolve(ROOT, 'public', 'LogosDeAtletify', 'LogoBlanco.png');
const OUT_DIR = resolve(ROOT, 'public', 'icons');

// Fondo base coherente con --bg-base del Design System de Atletify
const BG = { r: 11, g: 11, b: 15, alpha: 1 };

if (!existsSync(SOURCE)) {
  console.error(`No se encontró el logo base: ${SOURCE}`);
  process.exit(1);
}
if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

/**
 * Genera un PNG cuadrado con fondo solido y el logo centrado.
 * @param {number} size   Tamano final del icono (px)
 * @param {number} ratio  Proporcion del logo respecto al canvas (0..1).
 *                        Usar ~0.72 para iconos normales, ~0.55 para maskable.
 * @param {string} outName Nombre del archivo de salida.
 */
async function generate(size, ratio, outName) {
  const logoSize = Math.round(size * ratio);

  const logoBuffer = await sharp(SOURCE)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const offset = Math.round((size - logoSize) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logoBuffer, top: offset, left: offset }])
    .png()
    .toFile(resolve(OUT_DIR, outName));

  console.log(`  ${outName}  (${size}x${size}, logo ${logoSize}px)`);
}

async function run() {
  console.log('Generando iconos PWA en /public/icons/ ...');
  await generate(192, 0.72, 'icon-192.png');
  await generate(512, 0.72, 'icon-512.png');
  // Maskable: logo mas pequeno para respetar la safe-zone circular de Android
  await generate(512, 0.55, 'icon-512-maskable.png');
  await generate(180, 0.78, 'apple-touch-icon.png');
  console.log('Listo.');
}

run().catch((err) => {
  console.error('Error generando iconos:', err);
  process.exit(1);
});
