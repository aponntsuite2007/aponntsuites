const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/auditor/registry/SystemRegistry.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 [FIX] Reparando validateIntegrity en SystemRegistry.js...');

// Patrón a buscar (las 4 líneas que causan el error)
const oldPattern = `  async validateIntegrity() {
    const issues = [];

    // Validar que todas las dependencias existan
    for (const [moduleId, module] of this.modules) {
      const allDeps = [
        ...module.dependencies.required,
        ...module.dependencies.optional,
        ...module.dependencies.integrates_with
      ];`;

// Nuevo código con validación defensiva
const newPattern = `  async validateIntegrity() {
    const issues = [];

    // Validar que todas las dependencias existan
    for (const [moduleId, module] of this.modules) {
      // Asegurar que dependencies sea un objeto válido con arrays
      const deps = module.dependencies || {};
      const required = Array.isArray(deps.required) ? deps.required : [];
      const optional = Array.isArray(deps.optional) ? deps.optional : [];
      const integrates = Array.isArray(deps.integrates_with) ? deps.integrates_with : [];

      const allDeps = [
        ...required,
        ...optional,
        ...integrates
      ];`;

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ [FIX] Archivo reparado exitosamente');
    console.log('   Agregada validación defensiva para arrays de dependencies');
} else if (content.includes('const required = Array.isArray(deps.required)')) {
    console.log('⏭️  [FIX] Ya está reparado (validación defensiva presente)');
} else {
    console.log('❌ [FIX] No se encontró el patrón esperado');
    console.log('   El archivo puede haber cambiado. Revisar manualmente.');
}
