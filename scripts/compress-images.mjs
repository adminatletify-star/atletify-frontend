/**
 * Comprime todas las imágenes JPG/PNG de la carpeta public/ en su lugar.
 * Antes de correr: npm install sharp --save-dev
 * Uso: node scripts/compress-images.mjs
 */

import sharp from 'sharp';
import { readdir, stat, writeFile, rename } from 'fs/promises';
import { join, extname, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

const JPG_QUALITY = 82;
const PNG_QUALITY = 85;

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else {
      yield fullPath;
    }
  }
}

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

async function compressImages() {
  let totalOriginal = 0;
  let totalCompressed = 0;
  let count = 0;

  console.log('Comprimiendo imágenes en public/...\n');

  for await (const filePath of walkDir(PUBLIC_DIR)) {
    const ext = extname(filePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

    const info = await stat(filePath);
    const originalSize = info.size;
    const relPath = relative(PUBLIC_DIR, filePath);

    try {
      // Leer el buffer en memoria (sharp suelta el lock del archivo)
      const inputBuffer = await sharp(filePath).toBuffer();

      let outputBuffer;
      if (ext === '.png') {
        outputBuffer = await sharp(inputBuffer)
          .png({ quality: PNG_QUALITY, compressionLevel: 9 })
          .toBuffer();
      } else {
        outputBuffer = await sharp(inputBuffer)
          .jpeg({ quality: JPG_QUALITY, progressive: true, mozjpeg: true })
          .toBuffer();
      }

      if (outputBuffer.length < originalSize) {
        // Escribir a temp y luego renombrar (evita conflicto de locks en Windows)
        const tmpPath = filePath + '.tmp';
        await writeFile(tmpPath, outputBuffer);
        await rename(tmpPath, filePath);

        const savings = ((1 - outputBuffer.length / originalSize) * 100).toFixed(0);
        console.log(`OK  ${relPath}`);
        console.log(`    ${formatBytes(originalSize)} -> ${formatBytes(outputBuffer.length)} (-${savings}%)\n`);
        totalOriginal += originalSize;
        totalCompressed += outputBuffer.length;
        count++;
      } else {
        console.log(`--  ${relPath} — ya estaba optimizada\n`);
        totalOriginal += originalSize;
        totalCompressed += originalSize;
      }
    } catch (err) {
      console.error(`ERROR en ${relPath}:`, err.message);
    }
  }

  const totalSavings = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);
  console.log('-'.repeat(50));
  console.log(`${count} imagenes comprimidas`);
  console.log(`Total: ${formatBytes(totalOriginal)} -> ${formatBytes(totalCompressed)} (-${totalSavings}%)`);
}

compressImages();
