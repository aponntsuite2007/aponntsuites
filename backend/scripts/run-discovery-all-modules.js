#!/usr/bin/env node

/**
 * SCRIPT: Discovery Masivo de Todos los Módulos
 * 
 * Ejecuta discover-module-structure.js en TODOS los módulos con frontend
 * (excluyendo NO_FRONTEND/delegados)
 * 
 * Uso:
 *   node scripts/run-discovery-all-modules.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Módulos a descubrir (50 módulos con frontend real)
const MODULES_TO_DISCOVER = [
  // CRUD (6)
  'users',
  'attendance',
  'shifts',
  'departments',
  'kiosks',
  'roles-and-permissions',

  // DASHBOARD (44 módulos dashboard/config/admin)
  'admin-panel-controller',
  'ai-assistant-chat',
  'alerts-dashboard',
  'api-request-logger',
  'attendance-analytics',
  'attendance-requests',
  'audit-logs-viewer',
  'auto-healing-dashboard',
  'benefits-management',
  'biometric-capture',
  'branches',
  'collective-bargaining-agreements',
  'company-account',
  'company-calendar',
  'company-news',
  'compliance-dashboard',
  'contracts-management',
  'dms-dashboard',
  'dms',
  'e2e-testing-control',
  'employee-map',
  'engineering-dashboard',
  'enterprise-companies-grid',
  'gps-geofencing',
  'historical-sync',
  'integration-logs',
  'job-postings',
  'legal-cases',
  'medical-dashboard-professional',
  'mi-espacio',
  'module-activation',
  'notifications',
  'organizational-structure',
  'payroll-liquidation',
  'performance-management',
  'procedures',
  'recruitment',
  'risk-intelligence',
  'sanctions',
  'shift-calendar',
  'training-management',
  'user-calendar',
  'vacations',
  'voice-platform'
];

const RESULTS_DIR = path.join(__dirname, '..', 'tests', 'e2e', 'discovery-results');
const LOG_FILE = path.join(__dirname, '..', 'discovery-all-modules.log');

// Crear directorio de resultados si no existe
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Inicializar log
fs.writeFileSync(LOG_FILE, `🔍 DISCOVERY MASIVO - Iniciado: ${new Date().toISOString()}\n\n`);

console.log('🚀 DISCOVERY MASIVO DE MÓDULOS');
console.log('═'.repeat(60));
console.log(`📊 Total módulos a descubrir: ${MODULES_TO_DISCOVER.length}`);
console.log(`📁 Resultados en: ${RESULTS_DIR}`);
console.log(`📝 Log completo: ${LOG_FILE}`);
console.log('═'.repeat(60));
console.log('');

let completed = 0;
let failed = 0;
let skipped = 0;

const results = {
  startTime: new Date().toISOString(),
  totalModules: MODULES_TO_DISCOVER.length,
  modules: []
};

async function discoverModule(moduleName) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    console.log(`\n[${completed + failed + skipped + 1}/${MODULES_TO_DISCOVER.length}] 🔍 Descubriendo: ${moduleName}...`);

    const child = spawn('node', ['scripts/discover-module-structure.js', moduleName], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      const result = {
        module: moduleName,
        success: code === 0,
        duration: `${duration}s`,
        timestamp: new Date().toISOString()
      };

      if (code === 0) {
        completed++;
        console.log(`   ✅ ${moduleName} completado (${duration}s)`);
        
        // Verificar si se generó el JSON
        const jsonPath = path.join(RESULTS_DIR, `${moduleName}.discovery.json`);
        if (fs.existsSync(jsonPath)) {
          const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          result.modalsFound = json.modals?.length || 0;
          result.tabsFound = json.modals?.reduce((sum, m) => sum + (m.tabs?.length || 0), 0) || 0;
          result.fieldsFound = json.modals?.reduce((sum, m) => sum + (m.fields?.length || 0), 0) || 0;
          console.log(`      📊 ${result.modalsFound} modales, ${result.tabsFound} tabs, ${result.fieldsFound} campos`);
        }
      } else {
        failed++;
        console.log(`   ❌ ${moduleName} falló (código: ${code})`);
        result.error = stderr.substring(0, 200);
      }

      results.modules.push(result);

      // Append to log
      fs.appendFileSync(LOG_FILE, `\n${'='.repeat(60)}\n`);
      fs.appendFileSync(LOG_FILE, `Módulo: ${moduleName}\n`);
      fs.appendFileSync(LOG_FILE, `Estado: ${result.success ? 'SUCCESS' : 'FAILED'}\n`);
      fs.appendFileSync(LOG_FILE, `Duración: ${duration}s\n`);
      if (result.modalsFound) {
        fs.appendFileSync(LOG_FILE, `Modales: ${result.modalsFound}, Tabs: ${result.tabsFound}, Campos: ${result.fieldsFound}\n`);
      }
      if (result.error) {
        fs.appendFileSync(LOG_FILE, `Error: ${result.error}\n`);
      }

      resolve();
    });

    // Timeout de 5 minutos por módulo
    setTimeout(() => {
      child.kill();
      skipped++;
      console.log(`   ⏰ ${moduleName} timeout (>5min)`);
      results.modules.push({
        module: moduleName,
        success: false,
        duration: '>5min',
        error: 'Timeout',
        timestamp: new Date().toISOString()
      });
      resolve();
    }, 300000);
  });
}

async function runAll() {
  for (const moduleName of MODULES_TO_DISCOVER) {
    await discoverModule(moduleName);
    
    // Pausa de 2 segundos entre módulos para no saturar
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Resumen final
  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 RESUMEN FINAL');
  console.log('═'.repeat(60));
  console.log(`✅ Completados: ${completed}/${MODULES_TO_DISCOVER.length}`);
  console.log(`❌ Fallidos: ${failed}`);
  console.log(`⏰ Timeout: ${skipped}`);
  console.log(`📁 Resultados: ${RESULTS_DIR}`);
  console.log('═'.repeat(60));

  // Guardar resumen JSON
  results.endTime = new Date().toISOString();
  results.completed = completed;
  results.failed = failed;
  results.skipped = skipped;

  const summaryPath = path.join(RESULTS_DIR, 'discovery-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`📊 Resumen guardado: ${summaryPath}`);

  fs.appendFileSync(LOG_FILE, `\n${'='.repeat(60)}\n`);
  fs.appendFileSync(LOG_FILE, `RESUMEN FINAL\n`);
  fs.appendFileSync(LOG_FILE, `Completados: ${completed}\n`);
  fs.appendFileSync(LOG_FILE, `Fallidos: ${failed}\n`);
  fs.appendFileSync(LOG_FILE, `Timeout: ${skipped}\n`);
  fs.appendFileSync(LOG_FILE, `Fin: ${new Date().toISOString()}\n`);
}

runAll().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
