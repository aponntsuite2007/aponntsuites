const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'modulesRoutes.js');

console.log('📝 Aplicando fix para panel mismatch...\n');

let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `const { company_id, panel = 'both', role = 'employee' } = req.query;
      console.log('🧩 [DYNAMIC-MODULES] Params:', { company_id, panel, role });`;

const newCode = `let { company_id, panel = 'both', role = 'employee' } = req.query;

      // ⚠️ FIX: Normalizar "empresa" → "company" para match con metadata
      if (panel === 'empresa') {
        panel = 'company';
      } else if (panel === 'administrativo') {
        panel = 'admin';
      }

      console.log('🧩 [DYNAMIC-MODULES] Params (normalized):', { company_id, panel, role });`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fix aplicado correctamente');
  console.log('   - Cambió "const" → "let"');
  console.log('   - Agregó normalización: "empresa" → "company"');
  console.log('   - Agregó normalización: "administrativo" → "admin"');
} else if (content.includes('panel === \'empresa\'')) {
  console.log('✅ Fix ya estaba aplicado');
} else {
  console.log('❌ No se encontró el código a reemplazar');
  console.log('   El archivo podría haber cambiado');
}
