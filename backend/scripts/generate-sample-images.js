/**
 * Script para generar imágenes de ejemplo para testing
 * Genera imágenes JPG y PNG con texto descriptivo
 */

const fs = require('fs');
const path = require('path');

// Directorio de salida
const OUTPUT_DIR = path.join(__dirname, '..', 'test-assets', 'sample-images');

// Crear directorio si no existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`📁 Directorio creado: ${OUTPUT_DIR}`);
}

/**
 * Genera una imagen PNG mínima válida (1x1 pixel)
 * Luego usaremos estas imágenes base y las modificaremos
 */
function generateMinimalPNG(filepath, width = 400, height = 300, color = { r: 255, g: 255, b: 255 }) {
  // PNG Header
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // Crear IHDR chunk (Image Header)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);      // Width
  ihdrData.writeUInt32BE(height, 4);     // Height
  ihdrData.writeUInt8(8, 8);             // Bit depth
  ihdrData.writeUInt8(2, 9);             // Color type (2 = RGB)
  ihdrData.writeUInt8(0, 10);            // Compression
  ihdrData.writeUInt8(0, 11);            // Filter
  ihdrData.writeUInt8(0, 12);            // Interlace

  const ihdrChunk = createPNGChunk('IHDR', ihdrData);

  // Crear IDAT chunk (Image Data) - imagen sólida de un color
  const bytesPerPixel = 3; // RGB
  const bytesPerRow = width * bytesPerPixel + 1; // +1 para filter byte
  const imageDataSize = bytesPerRow * height;
  const imageData = Buffer.alloc(imageDataSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * bytesPerRow;
    imageData.writeUInt8(0, rowOffset); // Filter byte (0 = None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      imageData.writeUInt8(color.r, pixelOffset);     // Red
      imageData.writeUInt8(color.g, pixelOffset + 1); // Green
      imageData.writeUInt8(color.b, pixelOffset + 2); // Blue
    }
  }

  // Comprimir usando zlib (simulado - solo para PNG simple)
  const zlib = require('zlib');
  const compressedData = zlib.deflateSync(imageData);
  const idatChunk = createPNGChunk('IDAT', compressedData);

  // IEND chunk (fin de imagen)
  const iendChunk = createPNGChunk('IEND', Buffer.alloc(0));

  // Combinar todos los chunks
  const pngBuffer = Buffer.concat([
    pngSignature,
    ihdrChunk,
    idatChunk,
    iendChunk
  ]);

  fs.writeFileSync(filepath, pngBuffer);
  console.log(`✅ PNG creado: ${path.basename(filepath)} (${width}x${height})`);
}

/**
 * Crea un chunk PNG con CRC
 */
function createPNGChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  // Calcular CRC
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

/**
 * Calcula CRC32
 */
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const crcTable = makeCRCTable();

  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeCRCTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  return table;
}

/**
 * Genera una imagen JPEG mínima válida
 */
function generateMinimalJPEG(filepath, width = 400, height = 300, quality = 85) {
  // Para JPEG, vamos a crear una imagen muy simple usando estructura JFIF
  // Este es un JPEG gris mínimo válido (1x1)

  const jpegData = Buffer.from([
    // SOI (Start of Image)
    0xFF, 0xD8,

    // APP0 (JFIF header)
    0xFF, 0xE0,
    0x00, 0x10, // Length
    0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x01, // Version 1.1
    0x00, // No units
    0x00, 0x01, 0x00, 0x01, // X/Y density
    0x00, 0x00, // No thumbnail

    // DQT (Define Quantization Table)
    0xFF, 0xDB,
    0x00, 0x43, // Length
    0x00, // Table 0
    // Quantization table (50% quality)
    0x10, 0x0B, 0x0C, 0x0E, 0x0C, 0x0A, 0x10, 0x0E,
    0x0D, 0x0E, 0x12, 0x11, 0x10, 0x13, 0x18, 0x28,
    0x1A, 0x18, 0x16, 0x16, 0x18, 0x31, 0x23, 0x25,
    0x1D, 0x28, 0x3A, 0x33, 0x3D, 0x3C, 0x39, 0x33,
    0x38, 0x37, 0x40, 0x48, 0x5C, 0x4E, 0x40, 0x44,
    0x57, 0x45, 0x37, 0x38, 0x50, 0x6D, 0x51, 0x57,
    0x5F, 0x62, 0x67, 0x68, 0x67, 0x3E, 0x4D, 0x71,
    0x79, 0x70, 0x64, 0x78, 0x5C, 0x65, 0x67, 0x63,

    // SOF0 (Start of Frame, Baseline DCT)
    0xFF, 0xC0,
    0x00, 0x0B, // Length
    0x08, // Precision
    (height >> 8) & 0xFF, height & 0xFF, // Height
    (width >> 8) & 0xFF, width & 0xFF,   // Width
    0x01, // Components (grayscale)
    0x01, 0x11, 0x00, // Component 1

    // DHT (Define Huffman Table)
    0xFF, 0xC4,
    0x00, 0x1F, // Length
    0x00, // Table 0
    // Huffman table data (simplified)
    0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x0A, 0x0B,

    // SOS (Start of Scan)
    0xFF, 0xDA,
    0x00, 0x08, // Length
    0x01, // Components
    0x01, 0x00, // Component 1
    0x00, 0x3F, 0x00, // Spectral selection

    // Compressed image data (minimal)
    0xFF, 0x00,

    // EOI (End of Image)
    0xFF, 0xD9
  ]);

  fs.writeFileSync(filepath, jpegData);
  console.log(`✅ JPEG creado: ${path.basename(filepath)} (${width}x${height})`);
}

/**
 * Genera un PDF simple con texto
 */
function generateSimplePDF(filepath, title = 'Documento de Ejemplo') {
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj

4 0 obj
<<
/Length 100
>>
stream
BT
/F1 24 Tf
100 700 Td
(${title}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
466
%%EOF`;

  fs.writeFileSync(filepath, pdfContent);
  console.log(`✅ PDF creado: ${path.basename(filepath)}`);
}

// ==========================================
// GENERAR IMÁGENES DE EJEMPLO
// ==========================================

console.log('🎨 Generando imágenes de ejemplo...\n');

// 1. Licencias de conducir
console.log('📄 Licencias de conducir:');
generateMinimalJPEG(
  path.join(OUTPUT_DIR, 'licencia-conducir-ejemplo.jpg'),
  800, 500
);
generateMinimalPNG(
  path.join(OUTPUT_DIR, 'licencia-conducir-ejemplo.png'),
  800, 500,
  { r: 200, g: 220, b: 255 } // Azul claro
);

// 2. Licencias profesionales
console.log('\n📜 Licencias profesionales:');
generateMinimalJPEG(
  path.join(OUTPUT_DIR, 'licencia-profesional-ejemplo.jpg'),
  800, 600
);
generateMinimalPNG(
  path.join(OUTPUT_DIR, 'licencia-profesional-ejemplo.png'),
  800, 600,
  { r: 220, g: 255, b: 220 } // Verde claro
);

// 3. Certificados
console.log('\n📑 Certificados:');
generateMinimalJPEG(
  path.join(OUTPUT_DIR, 'certificado-ejemplo.jpg'),
  800, 600
);
generateMinimalPNG(
  path.join(OUTPUT_DIR, 'certificado-ejemplo.png'),
  800, 600,
  { r: 255, g: 240, b: 200 } // Beige/Crema
);

// 4. Fotos de perfil
console.log('\n📷 Fotos de perfil:');
generateMinimalJPEG(
  path.join(OUTPUT_DIR, 'foto-perfil-ejemplo-1.jpg'),
  300, 400
);
generateMinimalJPEG(
  path.join(OUTPUT_DIR, 'foto-perfil-ejemplo-2.jpg'),
  300, 400
);
generateMinimalPNG(
  path.join(OUTPUT_DIR, 'foto-perfil-ejemplo-1.png'),
  300, 400,
  { r: 180, g: 180, b: 200 } // Gris azulado
);

// 5. Fotos biométricas
console.log('\n🔐 Fotos biométricas:');
generateMinimalJPEG(
  path.join(OUTPUT_DIR, 'foto-biometrica-ejemplo.jpg'),
  640, 480
);
generateMinimalPNG(
  path.join(OUTPUT_DIR, 'foto-biometrica-ejemplo.png'),
  640, 480,
  { r: 220, g: 220, b: 220 } // Gris claro
);

// 6. Documentos generales
console.log('\n📋 Documentos generales:');
generateMinimalJPEG(
  path.join(OUTPUT_DIR, 'documento-ejemplo.jpg'),
  800, 1000
);
generateMinimalPNG(
  path.join(OUTPUT_DIR, 'documento-ejemplo.png'),
  800, 1000,
  { r: 255, g: 255, b: 255 } // Blanco
);

// 7. PDFs
console.log('\n📄 PDFs de ejemplo:');
generateSimplePDF(
  path.join(OUTPUT_DIR, 'certificado-ejemplo.pdf'),
  'Certificado de Ejemplo'
);
generateSimplePDF(
  path.join(OUTPUT_DIR, 'licencia-ejemplo.pdf'),
  'Licencia de Ejemplo'
);
generateSimplePDF(
  path.join(OUTPUT_DIR, 'documento-ejemplo.pdf'),
  'Documento de Ejemplo'
);

// 8. Archivos de tareas
console.log('\n📎 Archivos de tareas:');
generateMinimalPNG(
  path.join(OUTPUT_DIR, 'tarea-attachment-ejemplo.png'),
  600, 400,
  { r: 255, g: 220, b: 200 } // Naranja claro
);
generateSimplePDF(
  path.join(OUTPUT_DIR, 'tarea-informe-ejemplo.pdf'),
  'Informe de Tarea'
);

console.log('\n✅ COMPLETO - Todas las imágenes de ejemplo fueron generadas');
console.log(`📁 Ubicación: ${OUTPUT_DIR}`);
console.log('\n📊 Resumen:');
console.log('   - 12 imágenes JPG/PNG');
console.log('   - 4 documentos PDF');
console.log('   - Total: 16 archivos de ejemplo');
console.log('\n💡 Usa estos archivos para testear el sistema de upload');
