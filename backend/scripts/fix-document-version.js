/**
 * Fix DocumentVersion field names in DocumentService.js
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'services', 'dms', 'DocumentService.js');

let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// Fix 1: Reemplazar file_name: fileData.fileName
if (content.includes('file_name: fileData.fileName')) {
  content = content.replace(
    /file_name: fileData\.fileName,/g,
    `// Nombres correctos segun modelo DocumentVersion
          original_filename: fileData.fileName || file?.originalname || 'unknown',
          stored_filename: fileData.storedFileName || fileData.fileName || documentNumber + '_v1',
          storage_path: fileData.filePath || fileData.storagePath || '/uploads/' + companyId + '/' + documentNumber,`
  );
  console.log('FIX 1 aplicado: file_name reemplazado');
  changes++;
}

// Fix 2: Eliminar file_path y file_size duplicados (ya estan en Fix 1)
content = content.replace(/\s+file_path: fileData\.filePath,\n/g, '\n');
content = content.replace(/\s+file_size: fileData\.fileSize,\n/g, '');

// Fix 3: Reemplazar checksum
if (content.includes('checksum: fileData.checksum')) {
  content = content.replace(
    /checksum: fileData\.checksum,/g,
    'file_size_bytes: fileData.fileSize || file?.size || 0,\n          checksum_sha256: fileData.checksum || this._calculateChecksum(file?.buffer) || \'pending\','
  );
  console.log('FIX 2 aplicado: checksum reemplazado');
  changes++;
}

// Fix 4: Reemplazar change_notes
if (content.includes("change_notes: 'Versión inicial'")) {
  content = content.replace(
    /change_notes: 'Versión inicial'/g,
    "change_summary: 'Version inicial'"
  );
  console.log('FIX 3 aplicado: change_notes reemplazado');
  changes++;
}

// Guardar
fs.writeFileSync(filePath, content);
console.log('Archivo guardado. Cambios realizados:', changes);
