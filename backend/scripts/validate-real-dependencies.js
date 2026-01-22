/**
 * ============================================================================
 * VALIDACIÓN DE DEPENDENCIAS REALES EN CÓDIGO
 * ============================================================================
 * Analiza el código fuente para detectar dependencias reales vs registry
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, '../public/js/modules');
const routesDir = path.join(__dirname, '../src/routes');

const c = {
    green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
    blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
    reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m'
};

console.log('\n' + '═'.repeat(100));
console.log(`${c.bold}${c.cyan}VALIDACIÓN DE DEPENDENCIAS REALES EN CÓDIGO${c.reset}`);
console.log('═'.repeat(100) + '\n');

// Patrones de APIs core
const coreAPIs = {
    users: /\/api\/v1\/users/g,
    attendance: /\/api\/v1\/attendance/g,
    shifts: /\/api\/v1\/shifts/g,
    departments: /\/api\/v1\/departments/g,
    companies: /\/api\/v1\/companies/g,
    kiosks: /\/api\/v1\/kiosks/g,
    notifications: /\/api\/v1\/notifications/g,
    visitors: /\/api\/v1\/visitors/g
};

// Analizar módulos frontend
const frontendModules = fs.readdirSync(modulesDir)
    .filter(f => f.endsWith('.js') && !f.includes('.backup') && !f.includes('.bak'));

console.log(`${c.cyan}Analizando ${frontendModules.length} módulos frontend...${c.reset}\n`);

const moduleDependencies = {};

frontendModules.forEach(file => {
    const moduleName = file.replace('.js', '');
    const content = fs.readFileSync(path.join(modulesDir, file), 'utf8');

    moduleDependencies[moduleName] = {
        file,
        size: (content.length / 1024).toFixed(1) + ' KB',
        apiCalls: {},
        totalAPICalls: 0
    };

    Object.entries(coreAPIs).forEach(([api, pattern]) => {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
            moduleDependencies[moduleName].apiCalls[api] = matches.length;
            moduleDependencies[moduleName].totalAPICalls += matches.length;
        }
    });
});

// Ordenar por dependencias
const byDependencies = Object.entries(moduleDependencies)
    .filter(([name, data]) => data.totalAPICalls > 0)
    .sort((a, b) => b[1].totalAPICalls - a[1].totalAPICalls);

console.log(`${c.bold}MÓDULOS CON DEPENDENCIAS DE APIs CORE${c.reset}`);
console.log('─'.repeat(100));
console.log(`${'Módulo'.padEnd(40)} ${'Tamaño'.padStart(10)} ${'Calls'.padStart(6)}  APIs usadas`);
console.log('─'.repeat(100));

byDependencies.forEach(([name, data]) => {
    const apis = Object.entries(data.apiCalls)
        .map(([api, count]) => `${api}(${count})`)
        .join(', ');
    console.log(`${name.padEnd(40)} ${data.size.padStart(10)} ${String(data.totalAPICalls).padStart(6)}  ${c.dim}${apis}${c.reset}`);
});

// Análisis inverso: qué módulos usan cada API
console.log(`\n${c.bold}DEPENDENCIAS INVERSAS - ¿Quién usa cada API?${c.reset}`);
console.log('─'.repeat(100));

const apiUsage = {};
Object.keys(coreAPIs).forEach(api => apiUsage[api] = []);

Object.entries(moduleDependencies).forEach(([name, data]) => {
    Object.entries(data.apiCalls).forEach(([api, count]) => {
        apiUsage[api].push({ module: name, calls: count });
    });
});

Object.entries(apiUsage)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([api, users]) => {
        if (users.length === 0) return;
        const bar = '█'.repeat(Math.min(users.length, 30));
        const color = users.length >= 10 ? c.red : users.length >= 5 ? c.yellow : c.green;
        console.log(`\n${c.bold}${api.toUpperCase()}${c.reset} ${color}${bar}${c.reset} (${users.length} módulos)`);
        users.slice(0, 8).forEach(u => {
            console.log(`  ${c.dim}└─ ${u.module} (${u.calls} calls)${c.reset}`);
        });
        if (users.length > 8) {
            console.log(`  ${c.dim}└─ ... y ${users.length - 8} más${c.reset}`);
        }
    });

// Identificar módulos sin dependencias (STANDALONE reales)
const standalone = Object.entries(moduleDependencies)
    .filter(([name, data]) => data.totalAPICalls === 0)
    .map(([name]) => name);

console.log(`\n${c.bold}${c.blue}MÓDULOS STANDALONE (sin llamadas a APIs core)${c.reset}`);
console.log('─'.repeat(100));
standalone.forEach(name => console.log(`  ${c.blue}●${c.reset} ${name}`));

// Generar matriz de impacto
console.log(`\n${c.bold}MATRIZ DE IMPACTO SI SE DESACTIVA UNA API CORE${c.reset}`);
console.log('─'.repeat(100));

Object.entries(apiUsage)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([api, users]) => {
        const impactLevel = users.length >= 10 ? `${c.red}CRÍTICO${c.reset}`
            : users.length >= 5 ? `${c.yellow}ALTO${c.reset}`
            : users.length >= 2 ? `${c.cyan}MEDIO${c.reset}`
            : `${c.green}BAJO${c.reset}`;
        console.log(`  Si se desactiva ${c.bold}${api}${c.reset}: ${impactLevel} - Afecta ${users.length} módulos`);
    });

// Resumen
console.log(`\n${c.bold}${'═'.repeat(100)}${c.reset}`);
console.log(`${c.bold}RESUMEN DE VALIDACIÓN${c.reset}`);
console.log(`${'═'.repeat(100)}${c.reset}`);
console.log(`
  📊 Total módulos analizados: ${frontendModules.length}
  🔗 Módulos con dependencias: ${byDependencies.length}
  🔵 Módulos standalone: ${standalone.length}

  🎯 APIs más críticas (por uso):
     1. users - ${apiUsage.users.length} módulos dependen
     2. attendance - ${apiUsage.attendance.length} módulos dependen
     3. shifts - ${apiUsage.shifts.length} módulos dependen
     4. departments - ${apiUsage.departments.length} módulos dependen
`);

console.log('═'.repeat(100) + '\n');

// Exportar datos
module.exports = { moduleDependencies, apiUsage, standalone };
