/**
 * APPLY METADATA UPDATES
 * Aplica los cambios del inventario al engineering-metadata.js
 * Incluye: módulo engineering, inventario, problemas detectados, tareas de limpieza
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..');
const METADATA_PATH = path.join(BACKEND_ROOT, 'engineering-metadata.js');
const INVENTORY_PATH = path.join(BACKEND_ROOT, 'temp_inventory_full.json');

console.log('=== APLICANDO ACTUALIZACIONES AL METADATA ===\n');

// Cargar inventario
const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));

// Cargar metadata (usando require para parsear correctamente)
delete require.cache[require.resolve(METADATA_PATH)];
const metadata = require(METADATA_PATH);

// ============================================================
// 1. AGREGAR MÓDULO ENGINEERING
// ============================================================

console.log('1. Agregando módulo engineering...');

metadata.modules.engineering = {
  name: "Engineering Dashboard",
  category: "INTERNAL_TOOLS",
  status: "PRODUCTION",
  progress: 95,
  phase: "PRODUCTION",
  description: "Dashboard profesional para visualización de arquitectura, progreso, roadmap, código y coherencia del sistema. Permite ver todas las solapas del sistema de manera coherente.",
  features: {
    vistaGeneral: { done: true, tested: true, name: "Vista General (Overview)" },
    aplicaciones: { done: true, tested: true, name: "Vista de Aplicaciones (7 apps)" },
    modulos: { done: true, tested: true, name: "Vista de Módulos Backend (22 módulos)" },
    archivosBackend: { done: true, tested: true, name: "Explorador Archivos Backend" },
    archivosFrontend: { done: true, tested: true, name: "Explorador Archivos Frontend" },
    roadmap: { done: true, tested: true, name: "Roadmap con Gantt" },
    caminoCritico: { done: true, tested: true, name: "Camino Crítico (CPM/PERT)" },
    organigrama: { done: true, tested: true, name: "Organigrama Organizacional" },
    database: { done: true, tested: true, name: "Vista Base de Datos (151 tablas)" },
    workflows: { done: true, tested: true, name: "Workflows del Sistema (6+)" },
    codeViewer: { done: true, tested: true, name: "Visor de Código (VS Code style)" },
    coherenceCheck: { done: false, inProgress: true, name: "Verificación de Coherencia entre Solapas" },
    orphanDetection: { done: false, inProgress: true, name: "Detección de Código Huérfano" },
    duplicateDetection: { done: true, tested: false, name: "Detección de Duplicados" },
    backupCleanup: { done: false, inProgress: true, name: "Limpieza de Archivos Backup" }
  },
  files: [
    "public/js/modules/engineering-dashboard.js",
    "public/js/modules/critical-path-ui.js",
    "src/routes/engineeringRoutes.js",
    "engineering-metadata.js",
    "scripts/sync-metadata-exhaustive.js",
    "scripts/apply-metadata-updates.js"
  ],
  codeLocation: {
    backend: [
      { file: "src/routes/engineeringRoutes.js", lines: "1-500", description: "API REST del dashboard" },
      { file: "engineering-metadata.js", lines: "1-262000+", description: "Metadata completa del sistema (9.7MB)" }
    ],
    frontend: [
      { file: "public/js/modules/engineering-dashboard.js", lines: "1-3700+", description: "Dashboard UI con 10 tabs" },
      { file: "public/js/modules/critical-path-ui.js", lines: "1-800+", description: "UI del Camino Crítico CPM" }
    ]
  },
  tables: [],
  apiEndpoints: [
    "GET /api/engineering/metadata",
    "GET /api/engineering/stats",
    "GET /api/engineering/scan-files",
    "GET /api/engineering/read-file",
    "GET /api/critical-path/analyze",
    "POST /api/critical-path/update-priority"
  ],
  knownIssues: [
    "Verificación de coherencia entre solapas en progreso",
    "Detección automática de huérfanos pendiente",
    "Archivo metadata muy grande (9.7MB) - considerar split"
  ],
  lastUpdated: new Date().toISOString(),
  documentation: {
    status: "partial",
    file: "docs/modules/ENGINEERING-MODULE.md",
    sections: {
      resumenEjecutivo: false,
      guiaDeUso: true,
      funcionalidadInterna: false,
      stackTecnologico: false,
      diagramasDeFlujo: false,
      apiRest: true,
      baseDeDatos: false,
      ejemplosDeUso: false,
      troubleshooting: false
    },
    tasks: [
      { id: "ENGINEERING-DOC-1", name: "Documentar todas las solapas y su función", done: false },
      { id: "ENGINEERING-DOC-2", name: "Documentar cómo mantener coherencia", done: false },
      { id: "ENGINEERING-DOC-3", name: "Documentar scripts de sincronización", done: false }
    ]
  },
  technologies: {
    backend: [
      { name: "Express.js", description: "API REST para metadata", icon: "⚡" },
      { name: "Node.js fs", description: "Escaneo de archivos del sistema", icon: "📁" }
    ],
    frontend: [
      { name: "Vanilla JS", description: "Dashboard interactivo sin frameworks", icon: "🟨" },
      { name: "CSS Grid/Flexbox", description: "Layouts responsivos", icon: "🎨" }
    ],
    database: [],
    ai: [],
    apis: [],
    security: [],
    realtime: [],
    testing: []
  }
};

console.log('   ✅ Módulo engineering agregado');

// ============================================================
// 2. ACTUALIZAR INVENTARIO COMPLETO
// ============================================================

console.log('2. Actualizando inventario completo...');

metadata.inventory = {
  lastScan: inventory.timestamp,
  totalFiles: inventory.inventory.total,
  summary: {
    routes: inventory.inventory.routes,
    models: inventory.inventory.models,
    services: inventory.inventory.services,
    auditor: inventory.inventory.auditor,
    frontendModules: inventory.inventory.frontendModules,
    htmlPages: inventory.inventory.htmlPages,
    scripts: inventory.inventory.scripts,
    migrations: inventory.inventory.migrations
  },
  backendScripts: inventory.files.routes.reduce((acc, f) => {
    const name = path.basename(f, '.js');
    acc[name] = { path: f, type: 'route', status: 'ACTIVE' };
    return acc;
  }, {}),
  frontendModules: inventory.files.frontendModules.reduce((acc, f) => {
    const name = path.basename(f, '.js');
    const isBackup = f.includes('backup') || f.includes('BACKUP') || f.includes('-v5.');
    acc[name] = {
      path: f,
      type: 'frontend-module',
      status: isBackup ? 'BACKUP' : 'ACTIVE',
      needsReview: isBackup
    };
    return acc;
  }, {}),
  routes: inventory.files.routes.reduce((acc, f) => {
    acc[path.basename(f, '.js')] = { path: f, status: 'ACTIVE' };
    return acc;
  }, {}),
  models: inventory.files.models.reduce((acc, f) => {
    acc[path.basename(f, '.js')] = { path: f, status: 'ACTIVE' };
    return acc;
  }, {})
};

console.log(`   ✅ Inventario actualizado: ${inventory.inventory.total} archivos`);

// ============================================================
// 3. ACTUALIZAR PROBLEMAS DE CÓDIGO
// ============================================================

console.log('3. Actualizando problemas detectados...');

metadata.codeProblems = {
  lastScan: inventory.timestamp,

  // Archivos backup
  backups: {
    count: inventory.issues.backups.length,
    status: 'PENDING_CLEANUP',
    files: inventory.issues.backups.map((f, i) => ({
      id: `BACKUP-${i + 1}`,
      path: f,
      type: 'BACKUP',
      action: 'DELETE_AFTER_REVIEW',
      reviewed: false
    }))
  },

  // Duplicados
  duplicates: {
    count: 3 + inventory.issues.potentialDuplicates.length,
    confirmed: [
      {
        id: 'DUP-CONF-1',
        type: 'ROUTE_DUPLICATE',
        files: ['src/routes/biometric_v2.js', 'src/routes/biometric-api.js'],
        keep: 'src/routes/biometric-api.js',
        delete: 'src/routes/biometric_v2.js',
        reason: 'biometric_v2.js es versión antigua',
        status: 'PENDING_REVIEW'
      },
      {
        id: 'DUP-CONF-2',
        type: 'ROUTE_DUPLICATE',
        files: ['src/routes/attendance_stats_advanced.js', 'src/routes/attendanceAnalyticsRoutes.js'],
        keep: 'src/routes/attendanceAnalyticsRoutes.js',
        delete: 'src/routes/attendance_stats_advanced.js',
        reason: 'attendance_stats_advanced.js es subset',
        status: 'PENDING_REVIEW'
      },
      {
        id: 'DUP-CONF-3',
        type: 'MODEL_DUPLICATE',
        files: ['src/models/biometric_template.js', 'src/models/BiometricTemplate.js'],
        keep: 'src/models/BiometricTemplate.js',
        delete: 'src/models/biometric_template.js',
        reason: 'Case inconsistency - mismo modelo',
        status: 'PENDING_REVIEW'
      }
    ],
    potential: inventory.issues.potentialDuplicates.map((d, i) => ({
      id: `DUP-POT-${i + 1}`,
      file: d.file,
      similarTo: d.similar,
      action: 'REVIEW_AND_CONSOLIDATE',
      status: 'NEEDS_ANALYSIS'
    }))
  },

  // Páginas de test/debug
  testDebugPages: {
    count: inventory.issues.testDebugPages.length,
    status: 'REVIEW_FOR_PRODUCTION',
    files: inventory.issues.testDebugPages.map((f, i) => ({
      id: `TEST-PAGE-${i + 1}`,
      path: f,
      type: f.includes('debug') ? 'DEBUG' : 'TEST',
      action: 'VERIFY_IF_NEEDED_IN_PRODUCTION',
      reviewed: false
    }))
  },

  // Huérfanos potenciales
  potentialOrphans: {
    count: 0,
    status: 'NEEDS_ANALYSIS',
    note: 'Requiere análisis de imports/requires para detectar archivos no utilizados',
    files: []
  }
};

console.log(`   ✅ Problemas registrados:`);
console.log(`      - Backups: ${metadata.codeProblems.backups.count}`);
console.log(`      - Duplicados: ${metadata.codeProblems.duplicates.count}`);
console.log(`      - Test/Debug pages: ${metadata.codeProblems.testDebugPages.count}`);

// ============================================================
// 4. CREAR FASE DE LIMPIEZA EN ROADMAP
// ============================================================

console.log('4. Creando fase de limpieza en roadmap...');

// Generar tareas individuales para cada archivo
const cleanupTasks = [];
let taskCounter = 1;

// Tareas de backups
inventory.issues.backups.forEach((file) => {
  cleanupTasks.push({
    id: `CLEANUP-BK-${taskCounter++}`,
    name: `Revisar y eliminar backup: ${path.basename(file)}`,
    type: 'BACKUP_FILE',
    file: file,
    action: 'REVIEW_AND_DELETE',
    done: false,
    priority: 'MEDIUM'
  });
});

// Tareas de duplicados confirmados
cleanupTasks.push({
  id: `CLEANUP-DUP-${taskCounter++}`,
  name: 'Eliminar src/routes/biometric_v2.js (duplicado)',
  type: 'CONFIRMED_DUPLICATE',
  file: 'src/routes/biometric_v2.js',
  action: 'DELETE',
  done: false,
  priority: 'HIGH'
});

cleanupTasks.push({
  id: `CLEANUP-DUP-${taskCounter++}`,
  name: 'Eliminar src/routes/attendance_stats_advanced.js (duplicado)',
  type: 'CONFIRMED_DUPLICATE',
  file: 'src/routes/attendance_stats_advanced.js',
  action: 'DELETE',
  done: false,
  priority: 'HIGH'
});

cleanupTasks.push({
  id: `CLEANUP-DUP-${taskCounter++}`,
  name: 'Eliminar src/models/biometric_template.js (duplicado case)',
  type: 'CONFIRMED_DUPLICATE',
  file: 'src/models/biometric_template.js',
  action: 'DELETE',
  done: false,
  priority: 'HIGH'
});

// Tareas de consolidación de medical routes
cleanupTasks.push({
  id: `CLEANUP-CONS-${taskCounter++}`,
  name: 'Consolidar medicalRoutes: basic, simple, main en uno solo',
  type: 'CONSOLIDATION',
  files: ['src/routes/medicalRoutes.js', 'src/routes/medicalRoutes-basic.js', 'src/routes/medicalRoutes-simple.js'],
  action: 'CONSOLIDATE_AND_CLEANUP',
  done: false,
  priority: 'HIGH'
});

// Tareas de páginas test/debug
inventory.issues.testDebugPages.forEach((file) => {
  cleanupTasks.push({
    id: `CLEANUP-TEST-${taskCounter++}`,
    name: `Verificar necesidad de: ${path.basename(file)}`,
    type: 'TEST_DEBUG_PAGE',
    file: file,
    action: 'VERIFY_OR_DELETE',
    done: false,
    priority: 'LOW'
  });
});

// Tareas de coherencia
cleanupTasks.push({
  id: `CLEANUP-COH-${taskCounter++}`,
  name: 'Verificar todos los routes estén registrados en server.js',
  type: 'COHERENCE_CHECK',
  action: 'VERIFY',
  done: false,
  priority: 'MEDIUM'
});

cleanupTasks.push({
  id: `CLEANUP-COH-${taskCounter++}`,
  name: 'Verificar todos los models estén en database.js',
  type: 'COHERENCE_CHECK',
  action: 'VERIFY',
  done: false,
  priority: 'MEDIUM'
});

cleanupTasks.push({
  id: `CLEANUP-COH-${taskCounter++}`,
  name: 'Verificar frontend modules cargados en panel-*.html',
  type: 'COHERENCE_CHECK',
  action: 'VERIFY',
  done: false,
  priority: 'MEDIUM'
});

// Tareas de módulos sin archivos en metadata
['budgets', 'contracts', 'invoicing', 'commissionLiquidation', 'cobranzas'].forEach(mod => {
  cleanupTasks.push({
    id: `CLEANUP-META-${taskCounter++}`,
    name: `Completar metadata del módulo: ${mod}`,
    type: 'METADATA_INCOMPLETE',
    module: mod,
    action: 'ADD_FILES_TO_METADATA',
    done: false,
    priority: 'MEDIUM'
  });
});

// Crear la fase de limpieza
metadata.roadmap.codeCleanupPhase = {
  name: "Limpieza y Coherencia del Código",
  status: "IN_PROGRESS",
  startDate: "2025-11-25",
  progress: 0,
  priority: "HIGH",
  estimatedEffort: "15-25 horas",
  description: "Revisión exhaustiva de todo el código para eliminar duplicados, backups, huérfanos y verificar coherencia entre todas las solapas del Engineering Dashboard",

  tasks: cleanupTasks,

  summary: {
    totalTasks: cleanupTasks.length,
    backupTasks: cleanupTasks.filter(t => t.type === 'BACKUP_FILE').length,
    duplicateTasks: cleanupTasks.filter(t => t.type === 'CONFIRMED_DUPLICATE').length,
    consolidationTasks: cleanupTasks.filter(t => t.type === 'CONSOLIDATION').length,
    testPageTasks: cleanupTasks.filter(t => t.type === 'TEST_DEBUG_PAGE').length,
    coherenceTasks: cleanupTasks.filter(t => t.type === 'COHERENCE_CHECK').length,
    metadataTasks: cleanupTasks.filter(t => t.type === 'METADATA_INCOMPLETE').length
  },

  dependencies: [],
  documentReference: "scripts/apply-metadata-updates.js"
};

console.log(`   ✅ Fase de limpieza creada con ${cleanupTasks.length} tareas:`);
console.log(`      - Backups: ${metadata.roadmap.codeCleanupPhase.summary.backupTasks}`);
console.log(`      - Duplicados: ${metadata.roadmap.codeCleanupPhase.summary.duplicateTasks}`);
console.log(`      - Consolidación: ${metadata.roadmap.codeCleanupPhase.summary.consolidationTasks}`);
console.log(`      - Test/Debug: ${metadata.roadmap.codeCleanupPhase.summary.testPageTasks}`);
console.log(`      - Coherencia: ${metadata.roadmap.codeCleanupPhase.summary.coherenceTasks}`);
console.log(`      - Metadata: ${metadata.roadmap.codeCleanupPhase.summary.metadataTasks}`);

// ============================================================
// 5. ACTUALIZAR WORKFLOWS
// ============================================================

console.log('5. Actualizando workflows...');

// Agregar workflows del inventario si no existen
let workflowsAdded = 0;
Object.entries(inventory.newWorkflows).forEach(([key, workflow]) => {
  if (!metadata.workflows[key]) {
    metadata.workflows[key] = workflow;
    workflowsAdded++;
  }
});
console.log(`   ✅ ${workflowsAdded} workflows nuevos agregados`);

// ============================================================
// 6. ACTUALIZAR PROJECT INFO
// ============================================================

console.log('6. Actualizando información del proyecto...');

metadata.project.lastUpdated = new Date().toISOString();
metadata.project.latestChanges = [
  `🧹 LIMPIEZA DE CÓDIGO: Fase creada con ${cleanupTasks.length} tareas individuales de revisión`,
  `📦 MÓDULO ENGINEERING: Agregado como módulo oficial del sistema`,
  `📊 INVENTARIO COMPLETO: ${inventory.inventory.total} archivos JS escaneados y categorizados`,
  `🔍 PROBLEMAS DETECTADOS: ${metadata.codeProblems.backups.count} backups, ${metadata.codeProblems.duplicates.count} duplicados, ${metadata.codeProblems.testDebugPages.count} test/debug pages`,
  `✅ Tareas individuales creadas para CADA archivo problemático`,
  ...metadata.project.latestChanges
].slice(0, 50);

// ============================================================
// 7. GUARDAR METADATA
// ============================================================

console.log('7. Guardando metadata...');

const metadataContent = `/**
 * ENGINEERING METADATA - AUTO-UPDATED
 * Last update: ${new Date().toISOString()}
 */

module.exports = ${JSON.stringify(metadata, null, 2)};
`;

fs.writeFileSync(METADATA_PATH, metadataContent, 'utf8');

console.log('\n=== ACTUALIZACIÓN COMPLETADA ===');
console.log(`✅ Metadata guardado en: ${METADATA_PATH}`);
console.log(`✅ Total de tareas de limpieza: ${cleanupTasks.length}`);
console.log(`✅ Las solapas del Engineering Dashboard ahora mostrarán:`);
console.log(`   - Módulo 'engineering' en la solapa Módulos`);
console.log(`   - Fase 'codeCleanupPhase' en la solapa Roadmap`);
console.log(`   - Inventario completo en Overview`);
console.log(`   - Problemas detectados para revisión uno a uno`);

// FIN DEL SCRIPT
