#!/usr/bin/env node

/**
 * Modificar getModulesFromDB() para filtrar solo panel-empresa con frontend
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'synapse', 'SynapseOrchestrator.js');

console.log('🔧 Leyendo Orchestrator...');
let content = fs.readFileSync(filePath, 'utf8');

// Buscar y reemplazar getModulesFromDB()
const oldFunction = `  async getModulesFromDB() {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'attendance_system',
      user: 'postgres',
      password: 'Aedr15150302'
    });

    const result = await pool.query(\`
      SELECT module_key
      FROM system_modules
      WHERE is_active = true
      ORDER BY is_core DESC, module_key
    \`);

    await pool.end();
    return result.rows.map(r => r.module_key);
  }`;

const newFunction = `  async getModulesFromDB() {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'attendance_system',
      user: 'postgres',
      password: 'Aedr15150302'
    });

    const result = await pool.query(\`
      SELECT module_key
      FROM system_modules
      WHERE is_active = true
        AND (available_in = 'empresa' OR available_in = 'both' OR available_in IS NULL)
      ORDER BY is_core DESC, module_key
    \`);

    await pool.end();

    // 🔧 FILTRO ADICIONAL: Solo módulos con archivo frontend
    const modulesWithFrontend = result.rows
      .map(r => r.module_key)
      .filter(moduleKey => {
        const frontendPath = path.join(__dirname, '..', '..', 'public', 'js', 'modules', \`\${moduleKey}.js\`);
        return fs.existsSync(frontendPath);
      });

    console.log(\`📊 Módulos totales en BD: \${result.rows.length}\`);
    console.log(\`✅ Módulos con frontend (panel empresa): \${modulesWithFrontend.length}\\n\`);

    return modulesWithFrontend;
  }`;

if (content.includes('return result.rows.map(r => r.module_key);')) {
  console.log('✅ Patrón encontrado - aplicando patch...');

  content = content.replace(oldFunction, newFunction);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Orchestrator modificado exitosamente\n');
  console.log('📋 Cambios:');
  console.log('   1. ✅ Filtro por available_in (empresa/both)');
  console.log('   2. ✅ Filtro por existencia de archivo frontend');
  console.log('   3. ✅ Log de módulos filtrados');
} else {
  console.log('⚠️  Patrón no encontrado o ya modificado');
}
