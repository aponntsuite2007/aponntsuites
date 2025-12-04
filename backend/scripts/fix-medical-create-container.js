const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/medical-dashboard-professional.js');

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');

// Patrón OLD: Busca el container pero no lo crea
const oldCode = `    window.initMedicalDashboard = function(retryCount = 0) {
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

// Nuevo código: Crea el container dinámicamente si no existe
const newCode = `    window.initMedicalDashboard = function(retryCount = 0) {
        console.log(\`🩺 [MEDICAL-DASHBOARD] Inicializando Dashboard Médico Profesional... (intento \${retryCount + 1})\`);

        let container = document.getElementById('medical-dashboard-container');

        // Si el container no existe, crearlo dinámicamente en modulesContainer
        if (!container) {
            console.warn('⚠️  [MEDICAL-DASHBOARD] Container no encontrado, creando dinámicamente...');

            const modulesContainer = document.getElementById('modulesContainer');
            if (!modulesContainer) {
                console.error('❌ [MEDICAL-DASHBOARD] modulesContainer no encontrado en DOM');

                // Retry hasta 5 veces con delay incremental
                if (retryCount < 5) {
                    const delay = 100 * (retryCount + 1);
                    console.log(\`🔄 [MEDICAL-DASHBOARD] Reintentando en \${delay}ms...\`);
                    setTimeout(() => window.initMedicalDashboard(retryCount + 1), delay);
                } else {
                    console.error('❌ [MEDICAL-DASHBOARD] modulesContainer no encontrado después de 5 intentos');
                    alert('Error: No se pudo inicializar el Dashboard Médico.\\nPor favor, recargue la página con Ctrl+F5');
                }
                return;
            }

            // Crear el container dinámicamente
            console.log('🔨 [MEDICAL-DASHBOARD] Creando container dinámicamente en modulesContainer');
            modulesContainer.innerHTML = \`
                <div id="medical-dashboard-container" style="height: calc(100vh - 150px);"></div>
            \`;
            container = document.getElementById('medical-dashboard-container');

            if (!container) {
                console.error('❌ [MEDICAL-DASHBOARD] Error creando container dinámicamente');
                return;
            }

            console.log('✅ [MEDICAL-DASHBOARD] Container creado exitosamente');
        } else {
            console.log('✅ [MEDICAL-DASHBOARD] Container encontrado:', container);
        }

        renderDashboard(container);
        loadPendingCases();
        setupWebSocketConnection();
    };`;

// Verificar si ya está aplicado
if (content.includes('Creando container dinámicamente en modulesContainer')) {
    console.log('✅ El fix ya está aplicado');
    process.exit(0);
}

// Aplicar reemplazo
if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fix aplicado: initMedicalDashboard ahora crea su propio container');
    console.log('📝 Cambios:');
    console.log('   - Busca #modulesContainer en el DOM');
    console.log('   - Crea #medical-dashboard-container dinámicamente');
    console.log('   - Ya no depende del switch statement (if false)');
    console.log('   - Compatible con sistema de carga dinámica');
} else {
    console.error('❌ No se encontró el patrón esperado');
    console.error('El archivo puede haber sido modificado por otra sesión');
    console.log('\n💡 Solución alternativa: Espera a que la otra sesión termine');
    process.exit(1);
}
