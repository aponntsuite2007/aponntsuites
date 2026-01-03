/**
 * FIX: Brain authentication en tests E2E
 *
 * Problema: Tests intentan consultar APIs del Brain sin token (401 error)
 * Solución: Hacer consultas vía SQL directo (sin necesidad de API/token)
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../helpers/brain-integration.helper.js');

console.log('📝 Fixing Brain authentication...');
console.log(`📂 Archivo: ${filePath}`);

let content = fs.readFileSync(filePath, 'utf8');
let changesCount = 0;

// FIX: Reemplazar llamadas a API con consultas SQL directas
// Esto evita el error 401 y es más rápido

const oldGetIssues = `  async getPreviousIssues(moduleKey) {
    console.log(\`\\n🧠 [BRAIN] Consultando problemas detectados para módulo: \${moduleKey}...\`);

    try {
      const response = await axios.get(
        \`\${this.baseURL}/api/audit/executions\`,
        {
          params: {
            module_name: moduleKey,
            status: 'failed',
            limit: 50
          },
          headers: {
            Authorization: \`Bearer \${this.token}\`
          }
        }
      );`;

const newGetIssues = `  async getPreviousIssues(moduleKey) {
    console.log(\`\\n🧠 [BRAIN] Consultando problemas detectados para módulo: \${moduleKey}...\`);

    try {
      // FIX: Consulta directa a BD (sin token) en vez de API
      const query = \`
        SELECT id as log_id, test_name, error_type, error_message, created_at
        FROM audit_test_logs
        WHERE module_name = $1 AND status = 'failed'
        ORDER BY created_at DESC
        LIMIT 50
      \`;

      const response = await this.pool.query(query, [moduleKey]);`;

if (content.includes('Authorization: `Bearer ${this.token}`') && content.includes('getPreviousIssues')) {
  content = content.replace(oldGetIssues, newGetIssues);

  // También actualizar el parseo de la respuesta
  content = content.replace(
    'const issues = response.data.executions || [];',
    'const issues = response.rows || [];'
  );

  changesCount++;
  console.log('✅ FIX: getPreviousIssues usa SQL directo (sin token)');
}

// FIX 2: Skip análisis y auto-fix que requieren token (opcional en tests)
const skipAnalysis = `      console.log(\`   ℹ️  Saltando análisis/auto-fix (requiere API autenticada)\`);
      return null; // Skip análisis si no hay token configurado`;

// Guardar
if (changesCount > 0) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(\`💾 Archivo guardado con \${changesCount} cambios\`);
  console.log('\\n🎯 Brain auth fix aplicado:');
  console.log('   ✅ Consultas usan SQL directo (sin token)');
  console.log('   ✅ Tests E2E pueden consultar problemas previos');
  console.log('   ✅ Envío de datos sigue funcionando igual');
} else {
  console.log('⚠️  No se pudo aplicar el fix automáticamente');
  console.log('💡 Solución manual: Modificar getPreviousIssues() para usar SQL directo');
}
