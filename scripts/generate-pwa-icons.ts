import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const outputDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// SVG Base: Fondo oscuro de lujo, halo dorado y llama FAMA
function createSvgIcon(size: number, isMaskable = false): string {
  // Para maskable, el contenido debe estar en el 60-70% central (safe zone)
  const scale = isMaskable ? 0.65 : 0.8;
  const padding = (size * (1 - scale)) / 2;
  const contentSize = size * scale;

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Gradiente de fondo -->
      <radialGradient id="bgGrad" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#1A2234" />
        <stop offset="60%" stop-color="#0E1422" />
        <stop offset="100%" stop-color="#070B14" />
      </radialGradient>

      <!-- Gradiente Dorado FAMA -->
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFF2CE" />
        <stop offset="25%" stop-color="#E5C378" />
        <stop offset="65%" stop-color="#C69A4B" />
        <stop offset="100%" stop-color="#9E7429" />
      </linearGradient>

      <!-- Resplandor Dorado -->
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="${size * 0.02}" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Fondo Rectangular / Cuadrado -->
    <rect width="${size}" height="${size}" fill="url(#bgGrad)" ${isMaskable ? '' : `rx="${size * 0.22}"`} />

    <!-- Aro decorativo sutil -->
    <circle cx="${size / 2}" cy="${size / 2}" r="${(size / 2) * (isMaskable ? 0.82 : 0.88)}" 
      fill="none" stroke="url(#goldGrad)" stroke-width="${size * 0.012}" opacity="0.4" />

    <!-- Contenedor del símbolo centrado -->
    <g transform="translate(${padding}, ${padding}) scale(${contentSize / 24})">
      <!-- Sombra / Resplandor de la Llama -->
      <path
        d="M12 2C8.5 6 5 9.5 5 14a7 7 0 0 0 14 0c0-4.5-3.5-8-7-12zm0 18a5 5 0 0 1-5-5c0-2.8 2-5.4 4.5-8.5C10.5 9 10 11 10 12a2 2 0 0 0 4 0c0-1.5-.5-2.5-1.5-3.5 2.5 3.1 4.5 5.7 4.5 8.5a5 5 0 0 1-5 5z"
        fill="#C69A4B" opacity="0.3" filter="url(#glow)"
      />
      <!-- Llama Principal Dorada -->
      <path
        d="M12 2C8.5 6 5 9.5 5 14a7 7 0 0 0 14 0c0-4.5-3.5-8-7-12zm0 18a5 5 0 0 1-5-5c0-2.8 2-5.4 4.5-8.5C10.5 9 10 11 10 12a2 2 0 0 0 4 0c0-1.5-.5-2.5-1.5-3.5 2.5 3.1 4.5 5.7 4.5 8.5a5 5 0 0 1-5 5z"
        fill="url(#goldGrad)"
      />
    </g>
  </svg>
  `.trim();
}

// Badge de notificación: silueta dorada sobre fondo transparente
function createBadgeSvg(size: number): string {
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2C8.5 6 5 9.5 5 14a7 7 0 0 0 14 0c0-4.5-3.5-8-7-12zm0 18a5 5 0 0 1-5-5c0-2.8 2-5.4 4.5-8.5C10.5 9 10 11 10 12a2 2 0 0 0 4 0c0-1.5-.5-2.5-1.5-3.5 2.5 3.1 4.5 5.7 4.5 8.5a5 5 0 0 1-5 5z"
      fill="#C69A4B"
    />
  </svg>
  `.trim();
}

async function generateIcons() {
  console.log('Generando iconos PWA de alta definición para FAMA...');

  // 1. Guardar SVG vectorial maestro
  const masterSvg = createSvgIcon(512, false);
  fs.writeFileSync(path.join(outputDir, 'icon.svg'), masterSvg);
  fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.svg'), masterSvg);
  console.log('✓ icon.svg y favicon.svg guardados');

  // 2. Icono 192x192
  const svg192 = Buffer.from(createSvgIcon(192, false));
  await sharp(svg192).png().toFile(path.join(outputDir, 'icon-192x192.png'));
  console.log('✓ icon-192x192.png generado');

  // 3. Icono 512x512
  const svg512 = Buffer.from(createSvgIcon(512, false));
  await sharp(svg512).png().toFile(path.join(outputDir, 'icon-512x512.png'));
  console.log('✓ icon-512x512.png generado');

  // 4. Icono Maskable 512x512 (con safe zone de 20% para lanzadores circulares de Android)
  const svgMaskable = Buffer.from(createSvgIcon(512, true));
  await sharp(svgMaskable).png().toFile(path.join(outputDir, 'icon-maskable-512x512.png'));
  console.log('✓ icon-maskable-512x512.png generado');

  // 5. Apple Touch Icon (180x180)
  const svg180 = Buffer.from(createSvgIcon(180, false));
  await sharp(svg180).png().toFile(path.join(outputDir, 'apple-touch-icon.png'));
  fs.copyFileSync(
    path.join(outputDir, 'apple-touch-icon.png'),
    path.join(process.cwd(), 'public', 'apple-touch-icon.png')
  );
  console.log('✓ apple-touch-icon.png generado');

  // 6. Favicon 32x32 y 16x16
  const svg32 = Buffer.from(createSvgIcon(32, false));
  await sharp(svg32).png().toFile(path.join(outputDir, 'favicon-32x32.png'));
  await sharp(svg32).png().toFile(path.join(process.cwd(), 'public', 'favicon.ico'));
  console.log('✓ favicon-32x32.png y favicon.ico generados');

  // 7. Badge de notificación (72x72)
  const badgeSvg = Buffer.from(createBadgeSvg(72));
  await sharp(badgeSvg).png().toFile(path.join(outputDir, 'badge-72x72.png'));
  console.log('✓ badge-72x72.png generado');

  console.log('\nTodos los iconos PWA se han generado satisfactoriamente en public/icons/');
}

generateIcons().catch((err) => {
  console.error('Error generando iconos:', err);
  process.exit(1);
});
