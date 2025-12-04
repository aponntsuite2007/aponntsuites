const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/medical-dashboard-professional.js');
let content = fs.readFileSync(filePath, 'utf8');

// Buscar la función actual (puede variar por modificaciones previas)
const functionStart = 'window.initMedicalDashboard = function';
const functionEnd = '};';

// Encontrar el inicio y fin de la función
const startIndex = content.indexOf(functionStart);
if (startIndex === -1) {
    console.error('❌ No se encontró window.initMedicalDashboard');
    process.exit(1);
}

// Buscar el cierre de la función (el primer }; después del inicio)
let endIndex = content.indexOf('};', startIndex);
let braceCount = 0;
let inFunction = false;

// Contar llaves para encontrar el cierre correcto
for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
        braceCount++;
        inFunction = true;
    }
    if (content[i] === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
            endIndex = i;
            break;
        }
    }
}

// Nueva función siguiendo el patrón de users.js
const newFunction = `window.initMedicalDashboard = function() {
        console.log('🩺 [MEDICAL-DASHBOARD] Inicializando Dashboard Médico Profesional...');

        // ✅ MISMO PATRÓN QUE users.js - usar #mainContent
        const content = document.getElementById('mainContent');
        if (!content) {
            console.error('❌ [MEDICAL-DASHBOARD] mainContent no encontrado');
            return;
        }

        console.log('✅ [MEDICAL-DASHBOARD] Renderizando en #mainContent');

        // Crear container específico para el médico (igual que users crea .users-dashboard)
        content.innerHTML = \`
            <div id="medical-dashboard-container" style="height: calc(100vh - 150px);"></div>
        \`;

        const container = document.getElementById('medical-dashboard-container');
        if (!container) {
            console.error('❌ [MEDICAL-DASHBOARD] Error creando container');
            return;
        }

        renderDashboard(container);
        loadPendingCases();
        setupWebSocketConnection();
    }`;

// Reemplazar función completa
const oldFunction = content.substring(startIndex, endIndex + 1);
content = content.replace(oldFunction, newFunction);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fix aplicado: initMedicalDashboard ahora sigue el patrón de users.js');
console.log('📝 Cambios:');
console.log('   - Usa #mainContent (igual que users.js)');
console.log('   - Crea #medical-dashboard-container dinámicamente');
console.log('   - No más retries innecesarios');
console.log('   - Compatible con sistema dinámico');
