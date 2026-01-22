/**
 * ============================================================================
 * AUDITORÍA COMPLETA DE DEPENDENCIAS - Sistema Plug & Play
 * ============================================================================
 * Análisis exhaustivo de módulos para arquitectura modular:
 * - CORE: Obligatorios, el sistema no funciona sin ellos
 * - OPTIONAL: Pueden contratarse/descontratarse sin romper el sistema
 * - BUNDLE: Grupos de módulos que se venden juntos
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// Cargar registry
const registryPath = path.join(__dirname, '../src/auditor/registry/modules-registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Colores
const c = {
    green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
    blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
    white: '\x1b[37m', reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m'
};

// Convertir registry de array a objeto con id como key
const modulesById = {};
Object.values(registry.modules).forEach(mod => {
    if (mod.id) {
        modulesById[mod.id] = mod;
    }
});

const moduleIds = Object.keys(modulesById);

console.log('\n' + '═'.repeat(100));
console.log(`${c.bold}${c.cyan}AUDITORÍA COMPLETA DE DEPENDENCIAS - Sistema Plug & Play${c.reset}`);
console.log(`${c.dim}Fecha: ${new Date().toISOString()}${c.reset}`);
console.log('═'.repeat(100));
console.log(`\n${c.cyan}Total módulos encontrados: ${moduleIds.length}${c.reset}\n`);

// ============================================================================
// FASE 1: Definir módulos CORE por análisis de arquitectura
// ============================================================================

// Módulos que son FUNDAMENTALES para el funcionamiento del sistema
const MANDATORY_CORE = [
    'users',           // Sin usuarios no hay sistema
    'companies',       // Multi-tenant requiere empresas
    'auth',            // Autenticación es fundamental
    'attendance',      // Core del negocio - asistencia
    'shifts',          // Turnos son esenciales para asistencia
    'departments',     // Estructura organizacional básica
    'notifications',   // Sistema de comunicación interno
    'roles-permissions', // Control de acceso
    'kiosks',          // Punto de entrada biométrico
    'dashboard',       // Vista principal
    'biometric-consent' // Consentimiento biométrico - obligatorio por ley
];

// Módulos que son infraestructura pero pueden ser opcionales en ciertos planes
const INFRASTRUCTURE = [
    'face-auth',       // Autenticación facial
    'visitors',        // Visitantes
    'employee-map',    // Mapa de empleados
    'employee-360'     // Vista 360 del empleado
];

// Módulos claramente opcionales (features adicionales)
const CLEARLY_OPTIONAL = [
    'medical', 'vacation-management', 'sanctions-management',
    'payroll-liquidation', 'hour-bank', 'benefits-management',
    'training-management', 'job-postings', 'hse-management',
    'legal-cases', 'emotional-analysis', 'predictive-workforce',
    'finance-journal-entries', 'finance-chart-of-accounts',
    'finance-cost-centers', 'finance-budget', 'finance-treasury',
    'finance-cash-flow', 'finance-reports', 'finance-executive-dashboard',
    'logistics-dashboard', 'procurement-management', 'vendors',
    'voice-platform', 'ai-assistant', 'auditor'
];

// ============================================================================
// FASE 2: Construir grafo de dependencias
// ============================================================================

const dependencyGraph = {};
const reverseDependencyGraph = {};

moduleIds.forEach(id => {
    const mod = modulesById[id];
    const required = mod.dependencies?.required || [];
    const optional = mod.dependencies?.optional || [];
    const providesTo = mod.dependencies?.provides_to || [];
    const integratesWith = mod.dependencies?.integrates_with || [];

    dependencyGraph[id] = { required, optional, providesTo, integratesWith };

    // Inicializar reverse graph
    if (!reverseDependencyGraph[id]) {
        reverseDependencyGraph[id] = { requiredBy: [], optionalFor: [], integratesWith: [] };
    }

    // Construir reverse dependencies
    required.forEach(dep => {
        if (!reverseDependencyGraph[dep]) {
            reverseDependencyGraph[dep] = { requiredBy: [], optionalFor: [], integratesWith: [] };
        }
        if (!reverseDependencyGraph[dep].requiredBy.includes(id)) {
            reverseDependencyGraph[dep].requiredBy.push(id);
        }
    });

    optional.forEach(dep => {
        if (!reverseDependencyGraph[dep]) {
            reverseDependencyGraph[dep] = { requiredBy: [], optionalFor: [], integratesWith: [] };
        }
        if (!reverseDependencyGraph[dep].optionalFor.includes(id)) {
            reverseDependencyGraph[dep].optionalFor.push(id);
        }
    });
});

// ============================================================================
// FASE 3: Clasificación inteligente
// ============================================================================

const classification = {
    CORE: [],      // Nunca desactivar
    RECOMMENDED: [], // Recomendado mantener activo
    OPTIONAL: [],   // Puede desactivarse sin problemas
    STANDALONE: []  // Funciona completamente solo
};

const moduleAnalysis = {};

moduleIds.forEach(id => {
    const mod = modulesById[id];
    const isMarkedCore = mod.commercial?.is_core === true;
    const isMandatory = MANDATORY_CORE.includes(id);
    const isInfrastructure = INFRASTRUCTURE.includes(id);
    const isClearlyOptional = CLEARLY_OPTIONAL.includes(id);

    const reverse = reverseDependencyGraph[id] || { requiredBy: [], optionalFor: [] };
    const requiredByCount = reverse.requiredBy.length;
    const optionalForCount = reverse.optionalFor.length;

    const deps = dependencyGraph[id] || { required: [], optional: [] };
    const requiresCount = deps.required.length;

    // Determinar clasificación
    let type = 'OPTIONAL';
    let reason = [];
    let canDisable = true;
    let disableImpact = 'none';

    if (isMandatory) {
        type = 'CORE';
        reason.push('Módulo fundamental del sistema');
        canDisable = false;
        disableImpact = 'SISTEMA NO FUNCIONA';
    } else if (isMarkedCore && !isClearlyOptional) {
        type = 'CORE';
        reason.push('Marcado como core en registry');
        canDisable = false;
    } else if (requiredByCount >= 5) {
        type = 'CORE';
        reason.push(`${requiredByCount} módulos dependen de él`);
        canDisable = false;
        disableImpact = `ROMPE ${requiredByCount} módulos`;
    } else if (isInfrastructure) {
        type = 'RECOMMENDED';
        reason.push('Infraestructura importante');
        canDisable = true;
        disableImpact = 'Funcionalidad reducida';
    } else if (requiredByCount >= 2) {
        type = 'RECOMMENDED';
        reason.push(`${requiredByCount} módulos dependen de él`);
        canDisable = true;
        disableImpact = `Afecta ${requiredByCount} módulos`;
    } else if (requiresCount === 0 && requiredByCount === 0) {
        type = 'STANDALONE';
        reason.push('Funciona independiente');
        canDisable = true;
        disableImpact = 'none';
    } else {
        type = 'OPTIONAL';
        reason.push('Feature adicional');
        canDisable = true;
        disableImpact = requiredByCount > 0 ? `Menor impacto en ${requiredByCount} módulos` : 'none';
    }

    classification[type].push(id);

    moduleAnalysis[id] = {
        id,
        name: mod.name || id,
        category: mod.category || 'unknown',
        type,
        reason: reason.join(', '),
        canDisable,
        disableImpact,
        dependencies: {
            requires: deps.required,
            optionalDeps: deps.optional,
            requiredBy: reverse.requiredBy,
            optionalFor: reverse.optionalFor
        },
        pricing: mod.commercial?.monthly_price || 0,
        isStandalone: mod.commercial?.standalone || false
    };
});

// ============================================================================
// FASE 4: Mostrar resultados
// ============================================================================

console.log(`${c.bold}${'═'.repeat(100)}${c.reset}`);
console.log(`${c.bold}${c.white}CLASIFICACIÓN DE MÓDULOS${c.reset}`);
console.log(`${c.bold}${'═'.repeat(100)}${c.reset}\n`);

// CORE
console.log(`${c.red}${c.bold}🔴 MÓDULOS CORE (${classification.CORE.length}) - NUNCA DESACTIVAR${c.reset}`);
console.log(`${c.dim}${'─'.repeat(100)}${c.reset}`);
classification.CORE.forEach(id => {
    const a = moduleAnalysis[id];
    console.log(`  ${c.red}●${c.reset} ${c.bold}${id.padEnd(35)}${c.reset} ${c.dim}${a.name}${c.reset}`);
    console.log(`    ${c.dim}└─ ${a.reason}${c.reset}`);
    if (a.dependencies.requiredBy.length > 0) {
        console.log(`    ${c.dim}└─ Usado por: ${a.dependencies.requiredBy.slice(0, 5).join(', ')}${a.dependencies.requiredBy.length > 5 ? '...' : ''}${c.reset}`);
    }
});

// RECOMMENDED
console.log(`\n${c.yellow}${c.bold}🟡 MÓDULOS RECOMENDADOS (${classification.RECOMMENDED.length}) - DESACTIVAR CON CUIDADO${c.reset}`);
console.log(`${c.dim}${'─'.repeat(100)}${c.reset}`);
classification.RECOMMENDED.forEach(id => {
    const a = moduleAnalysis[id];
    console.log(`  ${c.yellow}●${c.reset} ${c.bold}${id.padEnd(35)}${c.reset} ${c.dim}${a.name}${c.reset}`);
    console.log(`    ${c.dim}└─ ${a.reason} | Impacto: ${a.disableImpact}${c.reset}`);
});

// OPTIONAL
console.log(`\n${c.green}${c.bold}🟢 MÓDULOS OPCIONALES (${classification.OPTIONAL.length}) - PUEDEN DESACTIVARSE${c.reset}`);
console.log(`${c.dim}${'─'.repeat(100)}${c.reset}`);
classification.OPTIONAL.forEach(id => {
    const a = moduleAnalysis[id];
    const impact = a.dependencies.requiredBy.length > 0
        ? `${c.yellow}⚠ ${a.dependencies.requiredBy.length} dependientes${c.reset}`
        : `${c.green}✓ Sin impacto${c.reset}`;
    console.log(`  ${c.green}●${c.reset} ${id.padEnd(35)} ${impact}`);
});

// STANDALONE
console.log(`\n${c.blue}${c.bold}🔵 MÓDULOS STANDALONE (${classification.STANDALONE.length}) - INDEPENDIENTES${c.reset}`);
console.log(`${c.dim}${'─'.repeat(100)}${c.reset}`);
classification.STANDALONE.forEach(id => {
    const a = moduleAnalysis[id];
    console.log(`  ${c.blue}●${c.reset} ${id.padEnd(35)} ${c.dim}${a.name}${c.reset}`);
});

// ============================================================================
// FASE 5: Análisis de bundles sugeridos
// ============================================================================

console.log(`\n${c.bold}${'═'.repeat(100)}${c.reset}`);
console.log(`${c.bold}${c.magenta}BUNDLES SUGERIDOS PARA COMERCIALIZACIÓN${c.reset}`);
console.log(`${c.bold}${'═'.repeat(100)}${c.reset}\n`);

const suggestedBundles = [
    {
        name: 'Bundle CORE (Obligatorio)',
        modules: classification.CORE,
        description: 'Incluido en todos los planes',
        pricing: 'Base'
    },
    {
        name: 'Bundle RRHH Completo',
        modules: ['medical', 'vacation-management', 'sanctions-management', 'training-management', 'benefits-management'],
        description: 'Gestión completa de recursos humanos',
        pricing: 'Premium'
    },
    {
        name: 'Bundle Nómina',
        modules: ['payroll-liquidation', 'hour-bank'],
        description: 'Cálculo de nómina y banco de horas',
        pricing: 'Add-on'
    },
    {
        name: 'Bundle Finanzas',
        modules: ['finance-journal-entries', 'finance-chart-of-accounts', 'finance-cost-centers', 'finance-budget', 'finance-treasury', 'finance-cash-flow', 'finance-reports', 'finance-executive-dashboard'],
        description: 'Suite completa de contabilidad',
        pricing: 'Enterprise'
    },
    {
        name: 'Bundle Seguridad HSE',
        modules: ['hse-management', 'hse-deliveries'],
        description: 'Salud, Seguridad y Medio Ambiente',
        pricing: 'Add-on'
    },
    {
        name: 'Bundle IA & Analytics',
        modules: ['ai-assistant', 'emotional-analysis', 'predictive-workforce', 'auditor'],
        description: 'Inteligencia artificial y análisis predictivo',
        pricing: 'Enterprise+'
    }
];

suggestedBundles.forEach(bundle => {
    const existingModules = bundle.modules.filter(m => modulesById[m]);
    console.log(`  ${c.magenta}📦${c.reset} ${c.bold}${bundle.name}${c.reset} (${existingModules.length} módulos) - ${bundle.pricing}`);
    console.log(`     ${c.dim}${bundle.description}${c.reset}`);
    console.log(`     ${c.dim}Módulos: ${existingModules.slice(0, 5).join(', ')}${existingModules.length > 5 ? '...' : ''}${c.reset}\n`);
});

// ============================================================================
// FASE 6: Matriz de dependencias críticas
// ============================================================================

console.log(`${c.bold}${'═'.repeat(100)}${c.reset}`);
console.log(`${c.bold}${c.cyan}MATRIZ DE DEPENDENCIAS CRÍTICAS${c.reset}`);
console.log(`${c.bold}${'═'.repeat(100)}${c.reset}\n`);

// Encontrar los módulos más dependidos
const byDependents = Object.entries(moduleAnalysis)
    .map(([id, a]) => ({ id, name: a.name, count: a.dependencies.requiredBy.length, by: a.dependencies.requiredBy }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

if (byDependents.length > 0) {
    console.log(`${c.cyan}Top módulos más dependidos:${c.reset}\n`);
    byDependents.forEach((m, i) => {
        const bar = '█'.repeat(Math.min(m.count, 30));
        const color = m.count >= 5 ? c.red : m.count >= 2 ? c.yellow : c.green;
        console.log(`  ${String(i+1).padStart(2)}. ${m.id.padEnd(30)} ${color}${bar}${c.reset} (${m.count})`);
    });
} else {
    console.log(`${c.yellow}No se encontraron dependencias explícitas en el registry.${c.reset}`);
    console.log(`${c.dim}Esto puede indicar que las dependencias no están documentadas en modules-registry.json${c.reset}`);
}

// ============================================================================
// FASE 7: Generar reporte JSON
// ============================================================================

const report = {
    generatedAt: new Date().toISOString(),
    summary: {
        totalModules: moduleIds.length,
        core: classification.CORE.length,
        recommended: classification.RECOMMENDED.length,
        optional: classification.OPTIONAL.length,
        standalone: classification.STANDALONE.length
    },
    classification: {
        CORE: classification.CORE,
        RECOMMENDED: classification.RECOMMENDED,
        OPTIONAL: classification.OPTIONAL,
        STANDALONE: classification.STANDALONE
    },
    moduleDetails: moduleAnalysis,
    suggestedBundles: suggestedBundles.map(b => ({
        ...b,
        modules: b.modules.filter(m => modulesById[m])
    })),
    plugAndPlayRules: {
        alwaysEnabled: classification.CORE,
        enableByDefault: [...classification.CORE, ...classification.RECOMMENDED],
        userControllable: [...classification.OPTIONAL, ...classification.STANDALONE],
        safeToDisable: classification.STANDALONE
    }
};

const reportPath = path.join(__dirname, '../dependency-audit-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

// ============================================================================
// RESUMEN FINAL
// ============================================================================

console.log(`\n${c.bold}${'═'.repeat(100)}${c.reset}`);
console.log(`${c.bold}${c.white}RESUMEN EJECUTIVO - ARQUITECTURA PLUG & PLAY${c.reset}`);
console.log(`${c.bold}${'═'.repeat(100)}${c.reset}`);

console.log(`
  ${c.bold}📊 DISTRIBUCIÓN DE MÓDULOS${c.reset}
  ─────────────────────────────────────────────
  🔴 CORE (nunca desactivar):        ${String(classification.CORE.length).padStart(3)} módulos (${((classification.CORE.length/moduleIds.length)*100).toFixed(1)}%)
  🟡 RECOMMENDED (con cuidado):      ${String(classification.RECOMMENDED.length).padStart(3)} módulos (${((classification.RECOMMENDED.length/moduleIds.length)*100).toFixed(1)}%)
  🟢 OPTIONAL (libremente):          ${String(classification.OPTIONAL.length).padStart(3)} módulos (${((classification.OPTIONAL.length/moduleIds.length)*100).toFixed(1)}%)
  🔵 STANDALONE (independientes):    ${String(classification.STANDALONE.length).padStart(3)} módulos (${((classification.STANDALONE.length/moduleIds.length)*100).toFixed(1)}%)

  ${c.bold}🎯 REGLAS PLUG & PLAY${c.reset}
  ─────────────────────────────────────────────
  ✅ Siempre habilitados:            ${classification.CORE.length} módulos
  📦 Habilitados por defecto:        ${classification.CORE.length + classification.RECOMMENDED.length} módulos
  🔧 Controlables por cliente:       ${classification.OPTIONAL.length + classification.STANDALONE.length} módulos
  🛡️  Seguros para desactivar:        ${classification.STANDALONE.length} módulos

  ${c.blue}📄 Reporte completo: ${reportPath}${c.reset}
`);

console.log('═'.repeat(100) + '\n');

module.exports = report;
