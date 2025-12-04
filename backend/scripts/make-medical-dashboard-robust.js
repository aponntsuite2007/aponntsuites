const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/medical-dashboard-professional.js');
let code = fs.readFileSync(filePath, 'utf8');

const oldInit = `    window.initMedicalDashboard = function() {
        console.log('🩺 [MEDICAL-DASHBOARD] Inicializando Dashboard Médico Profesional...');

        const container = document.getElementById('medical-dashboard-container');
        if (!container) {
            console.error('❌ [MEDICAL-DASHBOARD] Container no encontrado');
            return;
        }

        renderDashboard(container);
        loadPendingCases();`;

const newInit = `    window.initMedicalDashboard = function(retryCount = 0) {
        console.log('🩺 [MEDICAL-DASHBOARD] Inicializando Dashboard Médico Profesional... (intento ' + (retryCount + 1) + ')');

        const container = document.getElementById('medical-dashboard-container');
        if (!container) {
            console.warn('⚠️  [MEDICAL-DASHBOARD] Container no encontrado en DOM');
            console.log('🔍 [DEBUG] Elementos con "medical" en el DOM:');
            const allElements = document.querySelectorAll('*');
            let found = false;
            allElements.forEach(el => {
                if (el.id && el.id.includes('medical')) {
                    console.log('  - Encontrado:', el.id, el.tagName);
                    found = true;
                }
            });
            if (!found) {
                console.log('  - No se encontraron elementos con "medical" en el ID');
            }

            // Retry hasta 5 veces con delay incremental
            if (retryCount < 5) {
                const delay = 100 * (retryCount + 1); // 100ms, 200ms, 300ms, etc.
                console.log(\`🔄 [MEDICAL-DASHBOARD] Reintentando en \${delay}ms...\`);
                setTimeout(() => window.initMedicalDashboard(retryCount + 1), delay);
            } else {
                console.error('❌ [MEDICAL-DASHBOARD] Container no encontrado después de 5 intentos');
                alert('Error: No se pudo inicializar el Dashboard Médico.\\nPor favor, recargue la página con Ctrl+F5');
            }
            return;
        }

        console.log('✅ [MEDICAL-DASHBOARD] Container encontrado:', container);
        renderDashboard(container);
        loadPendingCases();`;

if (code.includes(oldInit)) {
  code = code.replace(oldInit, newInit);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('✅ Función initMedicalDashboard mejorada con retry automático y debugging');
} else {
  console.error('❌ Patrón no encontrado - puede que ya esté modificado');
  process.exit(1);
}
