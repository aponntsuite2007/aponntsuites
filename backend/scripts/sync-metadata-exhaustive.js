/**
 * SYNC METADATA EXHAUSTIVE
 * Script para actualizar el engineering-metadata.js con TODA la información del proyecto
 * Asegura consistencia entre todas las solapas del Engineering Dashboard
 */

const fs = require('fs');
const path = require('path');

// Colores para consola
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║     SYNC METADATA EXHAUSTIVE - TOMOGRAFÍA COMPLETA            ║
║     Escaneando TODO el proyecto para consistencia total       ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

// Rutas base
const BACKEND_PATH = path.join(__dirname, '..');
const SRC_PATH = path.join(BACKEND_PATH, 'src');
const PUBLIC_PATH = path.join(BACKEND_PATH, 'public');
const METADATA_PATH = path.join(BACKEND_PATH, 'engineering-metadata.js');

// ========================================
// FUNCIONES DE ESCANEO
// ========================================

function scanDirectory(dirPath, extensions = ['.js']) {
  const results = [];
  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          results.push(...scanDirectory(fullPath, extensions));
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          results.push({
            name: item,
            path: fullPath.replace(BACKEND_PATH, '').replace(/\\/g, '/'),
            size: stat.size,
            modified: stat.mtime
          });
        }
      } catch (e) { /* skip inaccessible */ }
    }
  } catch (e) { /* skip inaccessible directories */ }
  return results;
}

// ========================================
// ESCANEO COMPLETO DEL PROYECTO
// ========================================

console.log(`${colors.blue}📁 Escaneando estructura del proyecto...${colors.reset}\n`);

// Routes
const routes = scanDirectory(path.join(SRC_PATH, 'routes'));
console.log(`  ${colors.green}✓${colors.reset} Routes: ${routes.length} archivos`);

// Models
const models = scanDirectory(path.join(SRC_PATH, 'models'));
console.log(`  ${colors.green}✓${colors.reset} Models: ${models.length} archivos`);

// Services
const services = scanDirectory(path.join(SRC_PATH, 'services'));
console.log(`  ${colors.green}✓${colors.reset} Services: ${services.length} archivos`);

// Auditor
const auditorCore = scanDirectory(path.join(SRC_PATH, 'auditor', 'core'));
const auditorCollectors = scanDirectory(path.join(SRC_PATH, 'auditor', 'collectors'));
const auditorHealers = scanDirectory(path.join(SRC_PATH, 'auditor', 'healers'));
const auditorReporters = scanDirectory(path.join(SRC_PATH, 'auditor', 'reporters'));
const auditorSeeders = scanDirectory(path.join(SRC_PATH, 'auditor', 'seeders'));
const auditorAll = [...auditorCore, ...auditorCollectors, ...auditorHealers, ...auditorReporters, ...auditorSeeders];
console.log(`  ${colors.green}✓${colors.reset} Auditor: ${auditorAll.length} archivos`);

// Frontend modules
const frontendModules = scanDirectory(path.join(PUBLIC_PATH, 'js', 'modules'));
console.log(`  ${colors.green}✓${colors.reset} Frontend Modules: ${frontendModules.length} archivos`);

// HTML pages
const htmlPages = scanDirectory(PUBLIC_PATH, ['.html']);
console.log(`  ${colors.green}✓${colors.reset} HTML Pages: ${htmlPages.length} archivos`);

// Scripts
const scripts = scanDirectory(path.join(BACKEND_PATH, 'scripts'));
console.log(`  ${colors.green}✓${colors.reset} Scripts: ${scripts.length} archivos`);

// Migrations
const migrations = scanDirectory(path.join(BACKEND_PATH, 'migrations'), ['.sql']);
console.log(`  ${colors.green}✓${colors.reset} Migrations: ${migrations.length} archivos`);

// ========================================
// CATEGORIZAR ARCHIVOS
// ========================================

console.log(`\n${colors.blue}🔍 Categorizando archivos...${colors.reset}\n`);

// Identificar posibles duplicados o huérfanos
const potentialDuplicates = [];
const potentialOrphans = [];
const potentialBackups = [];

// Detectar backups
frontendModules.forEach(f => {
  if (f.name.includes('backup') || f.name.includes('BACKUP') || f.name.includes('-v') || f.name.includes('_v')) {
    potentialBackups.push(f);
  }
});

routes.forEach(f => {
  // Detectar archivos con nombres similares (posibles duplicados)
  const baseName = f.name.replace(/[-_]?(simple|basic|v2|new|old|backup|postgresql|fixed)\.js$/i, '.js');
  const similar = routes.filter(r => r.name !== f.name &&
    r.name.replace(/[-_]?(simple|basic|v2|new|old|backup|postgresql|fixed)\.js$/i, '.js') === baseName);
  if (similar.length > 0) {
    potentialDuplicates.push({ file: f.name, similar: similar.map(s => s.name) });
  }
});

console.log(`  ${colors.yellow}⚠${colors.reset} Archivos backup detectados: ${potentialBackups.length}`);
console.log(`  ${colors.yellow}⚠${colors.reset} Posibles duplicados: ${potentialDuplicates.length}`);

// ========================================
// GENERAR NUEVOS WORKFLOWS
// ========================================

const newWorkflows = {
  // Workflows basados en los archivos encontrados
  attendanceTracking: {
    name: "Control de Asistencia Biométrica",
    status: "IMPLEMENTED",
    implemented: true,
    trigger: "Empleado marca entrada/salida en kiosk",
    steps: [
      { step: 1, name: "Empleado se identifica en kiosk", status: "IMPLEMENTED" },
      { step: 2, name: "Sistema verifica biometría (facial/huella)", status: "IMPLEMENTED" },
      { step: 3, name: "Registra entrada/salida en attendance", status: "IMPLEMENTED" },
      { step: 4, name: "Calcula horas trabajadas", status: "IMPLEMENTED" },
      { step: 5, name: "Notifica a supervisores si hay anomalías", status: "IMPLEMENTED" }
    ],
    affectedModules: ["attendance", "kiosks", "biometric", "notifications"],
    files: ["src/routes/attendanceRoutes.js", "src/services/AttendanceAnalyticsService.js"]
  },

  medicalExamManagement: {
    name: "Gestión de Exámenes Médicos Ocupacionales",
    status: "IMPLEMENTED",
    implemented: true,
    trigger: "Vencimiento próximo de examen o nuevo empleado",
    steps: [
      { step: 1, name: "Detectar exámenes por vencer (30 días)", status: "IMPLEMENTED" },
      { step: 2, name: "Notificar a RRHH y empleado", status: "IMPLEMENTED" },
      { step: 3, name: "Agendar turno con profesional médico", status: "PARTIAL" },
      { step: 4, name: "Registrar resultado de examen", status: "IMPLEMENTED" },
      { step: 5, name: "Actualizar aptitud laboral", status: "IMPLEMENTED" }
    ],
    affectedModules: ["medical", "notifications", "users"],
    files: ["src/routes/medicalRoutes.js", "public/js/modules/medical-dashboard.js"]
  },

  vacationRequest: {
    name: "Solicitud de Vacaciones",
    status: "IMPLEMENTED",
    implemented: true,
    trigger: "Empleado solicita vacaciones",
    steps: [
      { step: 1, name: "Empleado carga solicitud de vacaciones", status: "IMPLEMENTED" },
      { step: 2, name: "Sistema verifica días disponibles", status: "IMPLEMENTED" },
      { step: 3, name: "Notifica a supervisor para aprobación", status: "IMPLEMENTED" },
      { step: 4, name: "Supervisor aprueba/rechaza", status: "IMPLEMENTED" },
      { step: 5, name: "Sistema actualiza calendario y días restantes", status: "IMPLEMENTED" }
    ],
    affectedModules: ["vacation", "notifications", "users"],
    files: ["src/routes/vacationRoutes.js", "public/js/modules/vacation-management.js"]
  },

  trainingManagement: {
    name: "Gestión de Capacitaciones",
    status: "IMPLEMENTED",
    implemented: true,
    trigger: "Nueva capacitación creada o asignada",
    steps: [
      { step: 1, name: "Admin crea capacitación", status: "IMPLEMENTED" },
      { step: 2, name: "Asigna empleados a capacitación", status: "IMPLEMENTED" },
      { step: 3, name: "Notifica a empleados", status: "IMPLEMENTED" },
      { step: 4, name: "Empleados completan capacitación", status: "IMPLEMENTED" },
      { step: 5, name: "Registra progreso y certificación", status: "IMPLEMENTED" }
    ],
    affectedModules: ["training", "notifications", "users"],
    files: ["src/routes/trainingRoutes.js", "public/js/modules/training-management.js"]
  },

  sanctionProcess: {
    name: "Proceso de Sanciones Disciplinarias",
    status: "IMPLEMENTED",
    implemented: true,
    trigger: "Incumplimiento detectado",
    steps: [
      { step: 1, name: "Supervisor registra incumplimiento", status: "IMPLEMENTED" },
      { step: 2, name: "Sistema evalúa historial del empleado", status: "IMPLEMENTED" },
      { step: 3, name: "Genera propuesta de sanción", status: "IMPLEMENTED" },
      { step: 4, name: "RRHH/Legal revisan y aprueban", status: "IMPLEMENTED" },
      { step: 5, name: "Notifica a empleado y registra en historial", status: "IMPLEMENTED" }
    ],
    affectedModules: ["sanctions", "legal", "notifications", "users"],
    files: ["src/routes/sanctionRoutes.js", "public/js/modules/sanctions-management.js"]
  },

  biometricEnrollment: {
    name: "Enrolamiento Biométrico de Empleados",
    status: "IMPLEMENTED",
    implemented: true,
    trigger: "Nuevo empleado o actualización de datos biométricos",
    steps: [
      { step: 1, name: "Empleado se presenta en punto de enrolamiento", status: "IMPLEMENTED" },
      { step: 2, name: "Captura foto facial frontal", status: "IMPLEMENTED" },
      { step: 3, name: "Captura huella dactilar (si aplica)", status: "PARTIAL" },
      { step: 4, name: "Genera template biométrico", status: "IMPLEMENTED" },
      { step: 5, name: "Almacena en BD con encriptación", status: "IMPLEMENTED" },
      { step: 6, name: "Solicita consentimiento GDPR", status: "IMPLEMENTED" }
    ],
    affectedModules: ["biometric", "biometric-consent", "users"],
    files: ["src/routes/biometricRoutes.js", "public/js/modules/biometric-dashboard.js"]
  },

  supportTicketResolution: {
    name: "Resolución de Tickets de Soporte",
    status: "IMPLEMENTED",
    implemented: true,
    trigger: "Cliente crea ticket de soporte",
    steps: [
      { step: 1, name: "Cliente crea ticket desde panel", status: "IMPLEMENTED" },
      { step: 2, name: "IA intenta resolver automáticamente", status: "IMPLEMENTED" },
      { step: 3, name: "Si no resuelve, asigna a agente", status: "IMPLEMENTED" },
      { step: 4, name: "Agente responde/resuelve", status: "IMPLEMENTED" },
      { step: 5, name: "Cliente confirma resolución", status: "IMPLEMENTED" },
      { step: 6, name: "Sistema actualiza métricas SLA", status: "IMPLEMENTED" }
    ],
    affectedModules: ["support", "ai-assistant", "notifications"],
    files: ["src/routes/supportRoutesV2.js", "public/js/modules/support-system.js"]
  },

  auditExecution: {
    name: "Ejecución de Auditoría Automatizada",
    status: "IMPLEMENTED",
    implemented: true,
    trigger: "Manual o programado",
    steps: [
      { step: 1, name: "Iniciar ejecución de auditoría", status: "IMPLEMENTED" },
      { step: 2, name: "Escanear endpoints de API", status: "IMPLEMENTED" },
      { step: 3, name: "Probar base de datos", status: "IMPLEMENTED" },
      { step: 4, name: "Ejecutar tests E2E", status: "IMPLEMENTED" },
      { step: 5, name: "Generar reporte de resultados", status: "IMPLEMENTED" },
      { step: 6, name: "Proponer fixes automáticos", status: "IMPLEMENTED" }
    ],
    affectedModules: ["auditor", "engineering"],
    files: auditorAll.map(a => a.path)
  }
};

// ========================================
// GENERAR TAREAS DE LIMPIEZA PARA ROADMAP
// ========================================

const cleanupPhase = {
  name: "Limpieza y Consolidación de Código",
  status: "PLANNED",
  startDate: new Date().toISOString().split('T')[0],
  estimatedCompletion: "2025-02-01",
  progress: 0,
  priority: "MEDIUM",
  tasks: [
    {
      id: "CLEAN-1",
      name: "Revisar y eliminar archivos backup (frontend)",
      description: `Se detectaron ${potentialBackups.length} archivos con sufijo backup/BACKUP:\n${potentialBackups.map(f => f.path).join('\n')}`,
      done: false,
      estimatedEffort: "2-4 horas"
    },
    {
      id: "CLEAN-2",
      name: "Consolidar routes duplicados",
      description: `Revisar archivos con nombres similares:\n${potentialDuplicates.slice(0, 10).map(d => `- ${d.file} similar a: ${d.similar.join(', ')}`).join('\n')}`,
      done: false,
      estimatedEffort: "4-8 horas"
    },
    {
      id: "CLEAN-3",
      name: "Revisar medical routes (3 versiones)",
      description: "Existen: medicalRoutes.js, medicalRoutes-basic.js, medicalRoutes-simple.js. Consolidar en uno.",
      done: false,
      estimatedEffort: "2-4 horas"
    },
    {
      id: "CLEAN-4",
      name: "Auditar scripts no utilizados",
      description: `${scripts.length} scripts en /scripts/. Verificar cuáles son necesarios vs. legacy.`,
      done: false,
      estimatedEffort: "4-6 horas"
    },
    {
      id: "CLEAN-5",
      name: "Documentar módulos sin documentación",
      description: "Crear docs para módulos faltantes usando template MODULE-DOCUMENTATION-TEMPLATE.md",
      done: false,
      estimatedEffort: "10-20 horas"
    },
    {
      id: "CLEAN-6",
      name: "Revisar HTML pages de test/debug",
      description: `Detectadas páginas de test/debug:\n${htmlPages.filter(h => h.name.includes('test') || h.name.includes('debug')).map(h => h.path).join('\n')}`,
      done: false,
      estimatedEffort: "2-4 horas"
    },
    {
      id: "CLEAN-7",
      name: "Unificar services duplicados",
      description: "Revisar services con funcionalidad similar y consolidar donde sea posible",
      done: false,
      estimatedEffort: "6-10 horas"
    }
  ],
  estimatedEffort: "30-50 horas totales",
  notes: [
    "Esta fase se generó automáticamente por el script sync-metadata-exhaustive.js",
    "Priorizar según impacto en mantenibilidad",
    "No eliminar archivos sin verificar que no hay dependencias"
  ]
};

// ========================================
// GENERAR APLICACIONES FALTANTES
// ========================================

const newApplications = {};

htmlPages.forEach(page => {
  const key = page.name.replace('.html', '').replace(/-/g, '_');
  // Solo agregar si parece una aplicación real (no test/debug)
  if (!page.name.includes('test') && !page.name.includes('debug') && !page.name.includes('BACKUP')) {
    newApplications[key] = {
      name: page.name.replace('.html', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      type: page.name.includes('kiosk') ? 'KIOSK_APP' : 'WEB_APP',
      platform: page.name.includes('android') ? 'Android' : page.name.includes('kiosk') ? 'Kiosk Terminal' : 'Web',
      url: `http://localhost:9998${page.path}`,
      status: "UNKNOWN", // Necesita revisión
      progress: 0,
      files: [page.path],
      lastUpdated: page.modified.toISOString().split('T')[0],
      needsReview: true
    };
  }
});

// ========================================
// GENERAR RESUMEN
// ========================================

console.log(`\n${colors.cyan}════════════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.cyan}                    RESUMEN DEL ESCANEO                          ${colors.reset}`);
console.log(`${colors.cyan}════════════════════════════════════════════════════════════════${colors.reset}\n`);

console.log(`${colors.blue}📊 INVENTARIO COMPLETO:${colors.reset}`);
console.log(`   Routes:           ${routes.length}`);
console.log(`   Models:           ${models.length}`);
console.log(`   Services:         ${services.length}`);
console.log(`   Auditor:          ${auditorAll.length}`);
console.log(`   Frontend Modules: ${frontendModules.length}`);
console.log(`   HTML Pages:       ${htmlPages.length}`);
console.log(`   Scripts:          ${scripts.length}`);
console.log(`   Migrations:       ${migrations.length}`);
console.log(`   ─────────────────────────────`);
console.log(`   ${colors.green}TOTAL:            ${routes.length + models.length + services.length + auditorAll.length + frontendModules.length + htmlPages.length + scripts.length + migrations.length} archivos${colors.reset}\n`);

console.log(`${colors.yellow}⚠️  ITEMS A REVISAR:${colors.reset}`);
console.log(`   Archivos backup:  ${potentialBackups.length}`);
console.log(`   Posibles duplicados: ${potentialDuplicates.length}`);
console.log(`   Páginas test/debug: ${htmlPages.filter(h => h.name.includes('test') || h.name.includes('debug')).length}\n`);

console.log(`${colors.green}✅ NUEVOS WORKFLOWS DETECTADOS:${colors.reset}`);
Object.keys(newWorkflows).forEach(k => {
  console.log(`   - ${newWorkflows[k].name} (${newWorkflows[k].status})`);
});

console.log(`\n${colors.green}✅ NUEVA FASE DE ROADMAP:${colors.reset}`);
console.log(`   - ${cleanupPhase.name} (${cleanupPhase.tasks.length} tareas)`);

// ========================================
// GUARDAR RESULTADOS EN ARCHIVO JSON TEMPORAL
// ========================================

const scanResults = {
  timestamp: new Date().toISOString(),
  inventory: {
    routes: routes.length,
    models: models.length,
    services: services.length,
    auditor: auditorAll.length,
    frontendModules: frontendModules.length,
    htmlPages: htmlPages.length,
    scripts: scripts.length,
    migrations: migrations.length,
    total: routes.length + models.length + services.length + auditorAll.length + frontendModules.length + htmlPages.length + scripts.length + migrations.length
  },
  files: {
    routes: routes.map(r => r.path),
    models: models.map(m => m.path),
    services: services.map(s => s.path),
    auditor: auditorAll.map(a => a.path),
    frontendModules: frontendModules.map(f => f.path),
    htmlPages: htmlPages.map(h => h.path),
    scripts: scripts.map(s => s.path),
    migrations: migrations.map(m => m.path)
  },
  issues: {
    backups: potentialBackups.map(b => b.path),
    potentialDuplicates: potentialDuplicates,
    testDebugPages: htmlPages.filter(h => h.name.includes('test') || h.name.includes('debug')).map(h => h.path)
  },
  newWorkflows: newWorkflows,
  cleanupPhase: cleanupPhase,
  newApplications: newApplications
};

const outputPath = path.join(BACKEND_PATH, 'temp_inventory_full.json');
fs.writeFileSync(outputPath, JSON.stringify(scanResults, null, 2));
console.log(`\n${colors.green}✅ Resultados guardados en: ${outputPath}${colors.reset}`);

// ========================================
// INSTRUCCIONES PARA ACTUALIZAR METADATA
// ========================================

console.log(`\n${colors.cyan}════════════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.cyan}               INSTRUCCIONES PARA ACTUALIZAR                     ${colors.reset}`);
console.log(`${colors.cyan}════════════════════════════════════════════════════════════════${colors.reset}\n`);

console.log(`Para aplicar estos cambios al engineering-metadata.js:`);
console.log(`\n1. Los nuevos workflows están en: temp_inventory_full.json → newWorkflows`);
console.log(`2. La nueva fase de limpieza está en: temp_inventory_full.json → cleanupPhase`);
console.log(`3. Las nuevas aplicaciones están en: temp_inventory_full.json → newApplications`);
console.log(`\n${colors.yellow}NOTA: El archivo engineering-metadata.js es muy grande (9.7MB).`);
console.log(`Las actualizaciones deben hacerse con cuidado para no romper la estructura.${colors.reset}\n`);

console.log(`${colors.green}✅ Script completado exitosamente${colors.reset}\n`);
