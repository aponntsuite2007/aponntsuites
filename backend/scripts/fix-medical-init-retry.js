const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/medical-dashboard-professional.js');

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');

// Patrón a buscar (más específico)
const oldCode = `    window.initMedicalDashboard = function(retryCount = 0) {
        console.log('🩺 [MEDICAL-DASHBOARD] Inicializando Dashboard Médico Profesional...');

        const container = document.getElementById('medical-dashboard-container');
        if (!container) {
            console.error('❌ [MEDICAL-DASHBOARD] Container no encontrado');
            return;
        }

        renderDashboard(container);
        loadPendingCases();
        setupWebSocketConnection();
    };`;

// Nuevo código con retry automático
const newCode = `    window.initMedicalDashboard = function(retryCount = 0) {
        console.log(\`🩺 [MEDICAL-DASHBOARD] Inicializando Dashboard Médico Profesional... (intento \${retryCount + 1})\`);

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
        loadPendingCases();
        setupWebSocketConnection();
    };`;

// Verificar si ya está aplicado
if (content.includes('Reintentando en ${delay}ms')) {
    console.log('✅ El fix ya está aplicado');
    process.exit(0);
}

// Aplicar reemplazo
if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fix de retry automático aplicado exitosamente');
    console.log('📝 Funcionalidad agregada:');
    console.log('   - Retry automático hasta 5 veces');
    console.log('   - Delays incrementales (100ms, 200ms, 300ms...)');
    console.log('   - Debug logging de elementos con "medical" en DOM');
    console.log('   - Alert al usuario si falla después de 5 intentos');
} else {
    console.error('❌ No se encontró el patrón esperado');
    console.error('El archivo puede haber sido modificado por otra sesión');
    process.exit(1);
}
