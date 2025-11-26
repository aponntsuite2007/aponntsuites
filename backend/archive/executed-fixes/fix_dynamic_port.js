const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

console.log(`🔧 Configurando puerto dinámico: ${PORT}`);

// Archivos a modificar
const files = [
  'public/panel-empresa.html',
  'public/panel-administrativo.html',
  'public/js/modules/users.js'
];

// Patrones de puertos hardcodeados a reemplazar
const portPatterns = [
  /localhost:9999/g,
  /localhost:9998/g,
  /localhost:9997/g,
  /localhost:8001/g,
  /localhost:8002/g
];

for (const filePath of files) {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Archivo no existe: ${filePath}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  // Reemplazar todos los puertos hardcodeados
  for (const pattern of portPatterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, `localhost:${PORT}`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ ${filePath} - Puerto actualizado a ${PORT}`);
  } else {
    console.log(`📄 ${filePath} - No requiere cambios`);
  }
}

console.log(`🎯 Configuración completada para puerto: ${PORT}`);