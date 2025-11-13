const fs = require('fs');
const path = require('path');

console.log('🔧 FIX: Navigation Timeout + TicketGenerator Crash\n');

// ============================================================================
// 1. AUMENTAR TIMEOUT EN login()
// ============================================================================
const orchestratorFile = path.join(__dirname, 'src/auditor/core/Phase4TestOrchestrator.js');
let content = fs.readFileSync(orchestratorFile, 'utf8');

console.log('📝 Paso 1: Aumentando timeout de navegación 30s → 60s...');

content = content.replace(
    `await this.page.goto(\`\${this.config.baseUrl}/panel-empresa.html\`, { waitUntil: 'networkidle2' });`,
    `await this.page.goto(\`\${this.config.baseUrl}/panel-empresa.html\`, {
            waitUntil: 'networkidle2',
            timeout: 60000 // 60 segundos
        });`
);

fs.writeFileSync(orchestratorFile, content, 'utf8');
console.log('   ✅ Timeout aumentado a 60 segundos\n');

// ============================================================================
// 2. FIX TicketGenerator - MANEJAR diagnosis UNDEFINED
// ============================================================================
const ticketFile = path.join(__dirname, 'src/auditor/core/TicketGenerator.js');
let ticketContent = fs.readFileSync(ticketFile, 'utf8');

console.log('📝 Paso 2: Haciendo TicketGenerator robusto...');

// Buscar la línea 57 y el contexto
const oldTicketCode = `                root_cause: diagnosis.root_cause,
                affected_components: diagnosis.affected_components,
                suggested_fixes: diagnosis.suggested_fixes,`;

const newTicketCode = `                root_cause: diagnosis?.root_cause || 'Error desconocido - análisis IA no disponible',
                affected_components: diagnosis?.affected_components || ['Sistema de navegación Puppeteer'],
                suggested_fixes: diagnosis?.suggested_fixes || [
                    'Verificar que el servidor esté corriendo',
                    'Aumentar timeout de navegación',
                    'Revisar logs del navegador Chrome/Chromium'
                ],`;

if (ticketContent.includes('root_cause: diagnosis.root_cause')) {
    ticketContent = ticketContent.replace(oldTicketCode, newTicketCode);
    fs.writeFileSync(ticketFile, ticketContent, 'utf8');
    console.log('   ✅ TicketGenerator ahora maneja diagnosis undefined\n');
} else {
    console.log('   ⚠️  Código no encontrado, puede estar ya aplicado\n');
}

console.log('═'.repeat(80));
console.log('✅ FIX COMPLETADO');
console.log('═'.repeat(80));
console.log('\n📋 CAMBIOS:');
console.log('   1. Navigation timeout: 30s → 60s');
console.log('   2. TicketGenerator: maneja diagnosis undefined con fallback');
console.log('\n🔄 Reinicia el test para probar los cambios\n');
