const fs = require('fs');
const path = require('path');

console.log('\n📅 AGREGANDO FECHAS A WORKFLOWS Y TAREAS\n');

// Fecha actual
const today = new Date().toISOString().split('T')[0];

// Leer metadata
const metaPath = path.join(__dirname, '../engineering-metadata.js');
let content = fs.readFileSync(metaPath, 'utf8');

// Verificar que existen los workflows
if (!content.includes('altaEmpresa')) {
  console.log('❌ No se encontraron workflows en engineering-metadata.js');
  process.exit(1);
}

console.log('✅ Workflows encontrados en engineering-metadata.js');

// ============================================================================
// PASO 1: Agregar createdDate a cada workflow
// ============================================================================
console.log('\n📋 Agregando createdDate a workflows...\n');

let modificaciones = 0;

// Agregar a altaEmpresa
if (!content.includes('"createdDate":') || !content.match(/"altaEmpresa":\s*{[^}]*"createdDate":/)) {
  content = content.replace(
    /"altaEmpresa":\s*{\s*"name":/,
    `"altaEmpresa": {\n      "createdDate": "${today}",\n      "name":`
  );
  console.log(`   ✓ altaEmpresa: createdDate = ${today}`);
  modificaciones++;
}

// Agregar a modulosPrueba
if (!content.match(/"modulosPrueba":\s*{[^}]*"createdDate":/)) {
  content = content.replace(
    /"modulosPrueba":\s*{\s*"name":/,
    `"modulosPrueba": {\n      "createdDate": "${today}",\n      "name":`
  );
  console.log(`   ✓ modulosPrueba: createdDate = ${today}`);
  modificaciones++;
}

// ============================================================================
// PASO 2: Agregar lastModified a CADA step/tarea
// ============================================================================
console.log('\n📝 Agregando lastModified a todas las tareas (steps)...\n');

// Regex para encontrar todos los steps que NO tienen lastModified
const stepPattern = /"step":\s*(\d+|"[^"]+"),\s*"name":\s*"([^"]+)"(?![\s\S]*?"lastModified":)/g;

let match;
let stepsModificados = 0;

// Primera pasada: contar cuántos steps hay
const allSteps = content.match(/"step":\s*(\d+|"[^"]+"),/g);
const totalSteps = allSteps ? allSteps.length : 0;
console.log(`   Total de steps encontrados: ${totalSteps}`);

// Reemplazar step por step agregando lastModified
// Hacemos múltiples pasadas para asegurar que agarramos todos
for (let i = 0; i < 5; i++) {
  const beforeCount = stepsModificados;

  content = content.replace(
    /"step":\s*(\d+|"[^"]+"),\s*\n\s*"name":\s*"([^"]+)"/g,
    (match, stepNum, stepName) => {
      // Verificar si ya tiene lastModified en las próximas 3 líneas
      const afterMatch = content.substring(content.indexOf(match), content.indexOf(match) + 300);
      if (afterMatch.includes('"lastModified":')) {
        return match; // Ya tiene, no tocar
      }
      stepsModificados++;
      return `"step": ${stepNum},\n              "lastModified": "${today}",\n              "name": "${stepName}"`;
    }
  );

  if (stepsModificados === beforeCount) break; // No hay más para modificar
}

console.log(`   ✓ Steps modificados: ${stepsModificados}/${totalSteps}`);

// ============================================================================
// PASO 3: Verificar duplicados
// ============================================================================
console.log('\n🔍 Verificando duplicados de workflows...\n');

const altaEmpresaMatches = (content.match(/"altaEmpresa":/g) || []).length;
const modulosPruebaMatches = (content.match(/"modulosPrueba":/g) || []).length;

if (altaEmpresaMatches > 1) {
  console.log(`   ⚠️  ADVERTENCIA: Se encontraron ${altaEmpresaMatches} instancias de "altaEmpresa"`);
  console.log('   Por favor revisar manualmente y eliminar duplicados.');
} else {
  console.log(`   ✓ altaEmpresa: No hay duplicados (${altaEmpresaMatches} instancia)`);
}

if (modulosPruebaMatches > 1) {
  console.log(`   ⚠️  ADVERTENCIA: Se encontraron ${modulosPruebaMatches} instancias de "modulosPrueba"`);
  console.log('   Por favor revisar manualmente y eliminar duplicados.');
} else {
  console.log(`   ✓ modulosPrueba: No hay duplicados (${modulosPruebaMatches} instancia)`);
}

// ============================================================================
// GUARDAR
// ============================================================================
if (modificaciones > 0 || stepsModificados > 0) {
  fs.writeFileSync(metaPath, content, 'utf8');
  console.log('\n✅ ARCHIVO ACTUALIZADO EXITOSAMENTE');
  console.log(`   - Workflows con createdDate: ${modificaciones}`);
  console.log(`   - Steps con lastModified: ${stepsModificados}`);
  console.log(`   - Fecha: ${today}`);
} else {
  console.log('\n✅ Todas las fechas ya estaban presentes, no se hicieron cambios.');
}

console.log('\n📊 Resumen:');
console.log(`   - altaEmpresa: ${altaEmpresaMatches} instancia(s)`);
console.log(`   - modulosPrueba: ${modulosPruebaMatches} instancia(s)`);
console.log(`   - Total steps: ${totalSteps}`);
console.log('\n');
