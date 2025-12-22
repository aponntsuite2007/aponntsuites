const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/routes/attendanceAnalyticsRoutes.js');
let content = fs.readFileSync(filePath, 'utf8');

// Verificar si ya tiene el fix
if (content.includes('FIX 2025-12-20: Validar company_id')) {
  console.log('Fix ya aplicado');
  process.exit(0);
}

// Usar regex flexible que ignora espacios en blanco exactos
const regex = /(\/\/ ✅ FIX: Validar UUID\s+if \(!isValidUUID\(userId\)\) \{\s+return res\.json\(\{ success: true, total: 0, history: \[\] \}\);\s+\})(\s+)(const history = await ScoringHistory\.findAll\(\{)/;

if (regex.test(content)) {
  content = content.replace(regex, (match, p1, p2, p3) => {
    return `${p1}

    // FIX 2025-12-20: Validar company_id para evitar WHERE con undefined
    if (!companyId) {
      console.warn('[ATTENDANCE-HISTORY] company_id no proporcionado para userId:', userId);
      return res.json({ success: true, total: 0, history: [], warning: 'company_id requerido' });
    }

    ${p3}`;
  });
  fs.writeFileSync(filePath, content);
  console.log('Fix aplicado correctamente');
} else {
  console.log('Patron no encontrado');

  // Intentar método alternativo - buscar línea por línea
  const lines = content.split('\n');
  let insertIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("return res.json({ success: true, total: 0, history: [] });") &&
        lines[i-1]?.includes("!isValidUUID(userId)")) {
      // Buscar la siguiente línea no vacía después del }
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].includes('}')) {
          insertIndex = j + 1;
          break;
        }
      }
      break;
    }
  }

  if (insertIndex > 0) {
    const fix = `
    // FIX 2025-12-20: Validar company_id para evitar WHERE con undefined
    if (!companyId) {
      console.warn('[ATTENDANCE-HISTORY] company_id no proporcionado para userId:', userId);
      return res.json({ success: true, total: 0, history: [], warning: 'company_id requerido' });
    }
`;
    lines.splice(insertIndex, 0, fix);
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Fix aplicado con metodo alternativo');
  } else {
    console.log('No se pudo encontrar ubicacion para el fix');
  }
}
