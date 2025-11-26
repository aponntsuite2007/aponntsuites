/**
 * Script para agregar ubicación de código (Bk/Fe + archivos + líneas) a todos los módulos
 *
 * Agrega sección `codeLocation` con:
 * - Backend files (Bk) - archivo + líneas
 * - Frontend files (Fe) - archivo + líneas
 *
 * Esto permite a programadores navegar directo al código desde Engineering Dashboard
 *
 * Autor: Claude Code
 * Fecha: 2025-01-22
 */

const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '../engineering-metadata.js');

console.log('📍 Agregando ubicación de código a módulos en engineering-metadata.js...\n');

/**
 * Metadata de ubicación de código por módulo
 * Formato: { backend: [{file, lines}], frontend: [{file, lines}] }
 */
const codeLocations = {
  authentication: {
    backend: [
      { file: 'src/middleware/auth.js', lines: '1-450', description: 'Middleware de autenticación JWT' },
      { file: 'src/routes/authRoutes.js', lines: '1-250', description: 'Rutas de auth (empleados)' },
      { file: 'src/routes/aponntAuthRoutes.js', lines: '1-180', description: 'Rutas de auth (staff/partners)' }
    ],
    frontend: [
      { file: 'public/js/modules/aponnt-login.js', lines: '1-600', description: 'Login de staff/partners' },
      { file: 'public/login.html', lines: '1-200', description: 'Pantalla de login empleados' }
    ]
  },

  companies: {
    backend: [
      { file: 'src/models/Company.js', lines: '1-300', description: 'Modelo Sequelize de empresas' },
      { file: 'src/routes/aponntDashboard.js', lines: '150-450', description: 'CRUD de empresas (admin)' },
      { file: 'src/services/PricingService.js', lines: '1-200', description: 'Cálculo de precios por módulos' }
    ],
    frontend: [
      { file: 'public/panel-administrativo.html', lines: '500-1200', description: 'UI gestión de empresas' },
      { file: 'public/js/modules/companies.js', lines: '1-800', description: 'Lógica CRUD empresas' }
    ]
  },

  users: {
    backend: [
      { file: 'src/models/User.js', lines: '1-400', description: 'Modelo Sequelize de usuarios' },
      { file: 'src/routes/users.js', lines: '1-9500', description: 'CRUD completo de usuarios (366 campos)' },
      { file: 'src/services/UserService.js', lines: '1-600', description: 'Lógica de negocio usuarios' }
    ],
    frontend: [
      { file: 'public/panel-empresa.html', lines: '2000-3500', description: 'Modal de usuario (9 tabs)' },
      { file: 'public/js/modules/users.js', lines: '1-4000', description: 'Lógica frontend usuarios' }
    ]
  },

  attendance: {
    backend: [
      { file: 'src/models/Attendance.js', lines: '1-250', description: 'Modelo de asistencias' },
      { file: 'src/routes/attendance.js', lines: '1-1500', description: 'CRUD + scoring + patterns' },
      { file: 'src/services/ScoringEngine.js', lines: '1-400', description: 'Motor de scoring 0-100' },
      { file: 'src/services/PatternDetectionService.js', lines: '1-600', description: 'Detección de 15+ patterns' }
    ],
    frontend: [
      { file: 'public/panel-empresa.html', lines: '4500-6000', description: 'UI de asistencias' },
      { file: 'public/js/modules/attendance.js', lines: '1-2500', description: 'Lógica frontend asistencias' }
    ]
  },

  departments: {
    backend: [
      { file: 'src/models/Department.js', lines: '1-150', description: 'Modelo de departamentos' },
      { file: 'src/routes/departments.js', lines: '1-400', description: 'CRUD departamentos' }
    ],
    frontend: [
      { file: 'public/panel-empresa.html', lines: '1500-2000', description: 'UI departamentos' },
      { file: 'public/js/modules/departments.js', lines: '1-600', description: 'Lógica frontend departamentos' }
    ]
  },

  shifts: {
    backend: [
      { file: 'src/models/Shift.js', lines: '1-200', description: 'Modelo de turnos' },
      { file: 'src/routes/shifts.js', lines: '1-600', description: 'CRUD + rotación de turnos' },
      { file: 'src/services/ShiftRotationService.js', lines: '1-300', description: 'Lógica de rotación' }
    ],
    frontend: [
      { file: 'public/panel-empresa.html', lines: '3000-4000', description: 'UI turnos + calendario' },
      { file: 'public/js/modules/shift-calendar-view.js', lines: '1-1200', description: 'Calendario visual de turnos' }
    ]
  },

  kiosks: {
    backend: [
      { file: 'src/models/Kiosk.js', lines: '1-150', description: 'Modelo de kioscos' },
      { file: 'src/routes/kiosks.js', lines: '1-400', description: 'CRUD kioscos + GPS' }
    ],
    frontend: [
      { file: 'public/panel-empresa.html', lines: '7000-7500', description: 'UI gestión kioscos' },
      { file: 'public/js/modules/kiosks.js', lines: '1-500', description: 'Lógica frontend kioscos' }
    ]
  },

  notifications: {
    backend: [
      { file: 'src/services/NotificationService.js', lines: '1-300', description: 'Servicio de notificaciones' },
      { file: 'src/routes/notifications.js', lines: '1-200', description: 'API de notificaciones' }
    ],
    frontend: [
      { file: 'public/js/modules/notifications.js', lines: '1-400', description: 'Sistema de notificaciones UI' }
    ]
  },

  medical: {
    backend: [
      { file: 'src/models/MedicalLeave.js', lines: '1-150', description: 'Modelo de licencias médicas' },
      { file: 'src/routes/medical.js', lines: '1-400', description: 'CRUD licencias médicas' }
    ],
    frontend: [
      { file: 'public/panel-empresa.html', lines: '8000-8500', description: 'UI licencias médicas' }
    ]
  },

  legal: {
    backend: [
      { file: 'src/models/LegalDocument.js', lines: '1-150', description: 'Modelo de documentos legales' },
      { file: 'src/routes/legal.js', lines: '1-300', description: 'Gestión documentos legales' }
    ],
    frontend: [
      { file: 'public/panel-empresa.html', lines: '8500-9000', description: 'UI documentos legales' }
    ]
  },

  vacation: {
    backend: [
      { file: 'src/models/Vacation.js', lines: '1-200', description: 'Modelo de vacaciones' },
      { file: 'src/routes/vacation.js', lines: '1-500', description: 'CRUD + aprobaciones vacaciones' }
    ],
    frontend: [
      { file: 'public/panel-empresa.html', lines: '9000-9500', description: 'UI solicitudes vacaciones' }
    ]
  },

  partners: {
    backend: [
      { file: 'src/models/Partner.js', lines: '1-200', description: 'Modelo de partners' },
      { file: 'src/routes/partners.js', lines: '1-400', description: 'CRUD partners' }
    ],
    frontend: [
      { file: 'public/panel-administrativo.html', lines: '2000-2500', description: 'UI gestión partners' }
    ]
  },

  aiAssistant: {
    backend: [
      { file: 'src/services/AssistantService.js', lines: '1-800', description: 'Motor de IA con Ollama + RAG' },
      { file: 'src/routes/assistantRoutes.js', lines: '1-300', description: 'API del asistente IA' },
      { file: 'src/models/AssistantKnowledgeBase.js', lines: '1-100', description: 'Knowledge base global' },
      { file: 'src/models/AssistantConversation.js', lines: '1-100', description: 'Historial por empresa' }
    ],
    frontend: [
      { file: 'public/js/modules/ai-assistant-chat.js', lines: '1-1100', description: 'Chat flotante con IA' },
      { file: 'public/panel-empresa.html', lines: '6815-6850', description: 'Integración chat IA' }
    ]
  },

  auditor: {
    backend: [
      { file: 'src/auditor/core/AuditorEngine.js', lines: '1-400', description: 'Orchestrator de auditoría' },
      { file: 'src/auditor/registry/SystemRegistry.js', lines: '1-300', description: 'Registry de 45 módulos' },
      { file: 'src/auditor/collectors/EndpointCollector.js', lines: '1-250', description: 'Tests de API' },
      { file: 'src/auditor/collectors/DatabaseCollector.js', lines: '1-250', description: 'Tests de BD' },
      { file: 'src/auditor/healers/HybridHealer.js', lines: '1-300', description: 'Auto-reparación' },
      { file: 'src/auditor/seeders/UniversalSeeder.js', lines: '1-326', description: 'Generador datos fake' },
      { file: 'src/routes/auditorRoutes.js', lines: '1-200', description: 'API del auditor' }
    ],
    frontend: [
      { file: 'public/js/modules/auditor-dashboard.js', lines: '1-1150', description: 'Dashboard del auditor (6 tabs)' },
      { file: 'public/panel-empresa.html', lines: '10000-10500', description: 'UI integrada auditor' }
    ]
  },

  vendorsCommissions: {
    backend: [
      { file: 'src/models/VendorCommission.js', lines: '1-200', description: 'Modelo de comisiones piramidales' },
      { file: 'src/routes/vendorCommissions.js', lines: '1-600', description: 'CRUD + cálculo comisiones' },
      { file: 'src/services/CommissionCalculationService.js', lines: '1-400', description: 'Motor de cálculo piramidal' }
    ],
    frontend: [
      { file: 'public/panel-administrativo.html', lines: '3000-4000', description: 'UI comisiones vendors' }
    ]
  },

  budgets: {
    backend: [
      { file: 'src/models/Budget.js', lines: '1-150', description: 'Modelo de presupuestos' },
      { file: 'src/routes/budgets.js', lines: '1-400', description: 'CRUD presupuestos' }
    ],
    frontend: [
      { file: 'public/panel-administrativo.html', lines: '4000-4500', description: 'UI presupuestos' }
    ]
  },

  contracts: {
    backend: [
      { file: 'src/models/Contract.js', lines: '1-200', description: 'Modelo de contratos' },
      { file: 'src/routes/contracts.js', lines: '1-400', description: 'Gestión de contratos' }
    ],
    frontend: [
      { file: 'public/panel-administrativo.html', lines: '4500-5000', description: 'UI contratos' }
    ]
  },

  invoicing: {
    backend: [
      { file: 'src/models/Invoice.js', lines: '1-200', description: 'Modelo de facturas' },
      { file: 'src/routes/invoicing.js', lines: '1-500', description: 'CRUD + generación facturas' }
    ],
    frontend: [
      { file: 'public/panel-administrativo.html', lines: '5000-5500', description: 'UI facturación' }
    ]
  },

  commissionLiquidation: {
    backend: [
      { file: 'src/models/CommissionLiquidation.js', lines: '1-200', description: 'Modelo de liquidaciones' },
      { file: 'src/routes/commissionLiquidation.js', lines: '1-400', description: 'Liquidación comisiones' }
    ],
    frontend: [
      { file: 'public/panel-administrativo.html', lines: '5500-6000', description: 'UI liquidaciones' }
    ]
  },

  cobranzas: {
    backend: [
      { file: 'src/models/Collection.js', lines: '1-150', description: 'Modelo de cobranzas' },
      { file: 'src/routes/cobranzas.js', lines: '1-400', description: 'Gestión de cobranzas' }
    ],
    frontend: [
      { file: 'public/panel-administrativo.html', lines: '6000-6500', description: 'UI cobranzas' }
    ]
  }
};

// Leer archivo
let content = fs.readFileSync(metadataPath, 'utf8');

let modulesUpdated = 0;

// Para cada módulo, agregar codeLocation
Object.entries(codeLocations).forEach(([moduleKey, location]) => {
  console.log(`🔍 Procesando ${moduleKey}...`);

  // Buscar si ya tiene sección codeLocation
  const moduleBlockRegex = new RegExp(
    `${moduleKey}:\\s*\\{[\\s\\S]*?\\n    \\},?\\n`,
    'g'
  );

  const moduleBlock = content.match(moduleBlockRegex);

  if (moduleBlock && moduleBlock[0].includes('codeLocation: {')) {
    console.log(`   ⏭️  Ya tiene codeLocation, saltando...`);
    return;
  }

  // Generar código de codeLocation
  const backendFiles = location.backend.map(f =>
    `        { file: "${f.file}", lines: "${f.lines}", description: "${f.description}" }`
  ).join(',\n');

  const frontendFiles = location.frontend.map(f =>
    `        { file: "${f.file}", lines: "${f.lines}", description: "${f.description}" }`
  ).join(',\n');

  const codeLocationSection = `
    codeLocation: {
      backend: [
${backendFiles}
      ],
      frontend: [
${frontendFiles}
      ]
    },`;

  // Insertar después de lastUpdated (antes de documentation si existe, sino antes del cierre)
  const insertPattern = new RegExp(
    `(${moduleKey}:[\\s\\S]*?lastUpdated:\\s*"[^"]*",)`
  );

  const match = content.match(insertPattern);

  if (match) {
    content = content.replace(insertPattern, `$1${codeLocationSection}`);
    console.log(`   ✅ Agregado codeLocation (${location.backend.length} Bk + ${location.frontend.length} Fe)`);
    modulesUpdated++;
  } else {
    console.log(`   ⚠️  No se encontró patrón lastUpdated para ${moduleKey}`);
  }
});

// Guardar archivo actualizado
fs.writeFileSync(metadataPath, content, 'utf8');

console.log(`\n✅ COMPLETADO:`);
console.log(`   - Módulos procesados: ${Object.keys(codeLocations).length}`);
console.log(`   - Módulos actualizados: ${modulesUpdated}`);
console.log(`\n📁 Archivo actualizado: ${metadataPath}`);
console.log(`\n📍 Ahora cada módulo tiene ubicación de código (Bk + Fe) visible en Engineering Dashboard`);
