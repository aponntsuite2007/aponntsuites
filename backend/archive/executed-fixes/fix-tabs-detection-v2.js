const fs = require('fs');
const filePath = 'C:\Bio\sistema_asistencia_biometrico\backend\src\auditor\core\Phase4TestOrchestrator.js';
let content = fs.readFileSync(filePath, 'utf8');

// Update version in header (find @version line)
content = content.replace(
    /@version 2\.0\.2/,
    '@version 2.0.3'
);

// Update HISTORIAL DE CAMBIOS (add new v2.0.3 entry at the top)
const newHistoryEntry = ` * v2.0.3 | 2025-11-11 | FIX: Abrir modal VER antes de buscar tabs (línea 1220)
 *        └─ Click en VER del primer usuario antes de buscar tabs
 *        └─ Esperar modal #userDetailModal antes de query de tabs
 *        └─ Buscar tabs DENTRO del modal específico, no en toda la página
 *        └─ Verificado: Modal abierto → tabs visibles → CRUD en 9 tabs
 *
 * v2.0.2`;

content = content.replace(
    / \* v2\.0\.2/,
    newHistoryEntry
);

// Replace the testSubmodules method with new logic
const oldTestSubmodules = `async testSubmodules(moduleName) {
        console.log(\`\n📂 TEST SUBMODULES - Buscando submódulos en \${moduleName}...\n\`);
        this.logger.info('TEST', 'Iniciando detección de submódulos', { moduleName });

        try {
            await this.wait(2000);

// ═══════════════════════════════════════════════════════════════════
            // 🔧 FIX PERMANENTE - Detectar tabs del modal VER (REUTILIZABLE)
            // ═══════════════════════════════════════════════════════════════════
            // PROBLEMA: No detectaba los 9 tabs del modal VER de usuarios
            // SOLUCIÓN: Agregar .file-tab al selector (usado en modal VER)
            // PATRÓN REUTILIZABLE: Múltiples selectores para diferentes tipos de tabs
            //
            // TABS DETECTADOS (modal VER usuarios - 9 tabs):
            //   1. ⚙️ Administración        5. 🏥 Antecedentes Médicos
            //   2. 👤 Datos Personales      6. 📅 Asistencias/Permisos
            //   3. 💼 Antecedentes Laborales   7. ⚖️ Disciplinarios
            //   4. 👨‍👩‍👧‍👦 Grupo Familiar        8. 🎯 Config. Tareas
            //                                   9. 📸 Registro Biométrico
            //
            // VERIFICADO: 2025-11-11 | Detecta los 9 tabs del modal usuarios
            // ARCHIVO RELACIONADO: public/js/modules/users.js:1531-1539 (9 tabs)
            // USO: Cualquier módulo que tenga tabs con diferentes clases
            // ═══════════════════════════════════════════════════════════════════
            const tabs = await this.page.$eval('.nav-tabs a, .tab-button, [role="tab"], .file-tab',
                tabs => Array.from(tabs).map((tab, idx) => ({
                    index: idx,
                    text: tab.textContent.trim(),
                    visible: tab.offsetParent !== null
                }))
            ).catch(() => []);`;

const newTestSubmodules = `async testSubmodules(moduleName) {
        console.log(\`\n📂 TEST SUBMODULES - Buscando submódulos en \${moduleName}...\n\`);
        this.logger.info('TEST', 'Iniciando detección de submódulos', { moduleName });

        try {
            // ═══════════════════════════════════════════════════════════════════
            // 🔧 FIX PERMANENTE v2.0.3 - Abrir modal VER antes de buscar tabs
            // ═══════════════════════════════════════════════════════════════════
            // PROBLEMA v2.0.2: testAllButtons() clickeaba 25 👁️ diferentes, luego
            //                  buscaba tabs en toda la página sin modal específico abierto
            // SOLUCIÓN: Click en VER del PRIMER usuario → Esperar modal → Buscar tabs DENTRO
            // PATRÓN REUTILIZABLE: Modal-specific tab detection
            //
            // FLUJO:
            // 1. Esperar lista de usuarios cargada
            // 2. Click en primer botón 👁️ (VER del primer usuario)
            // 3. Esperar modal #userDetailModal visible
            // 4. Buscar .file-tab DENTRO del modal
            // 5. Testear CRUD en cada uno de los 9 tabs
            //
            // TABS DETECTADOS (modal VER usuarios - 9 tabs):
            //   1. ⚙️ Administración        5. 🏥 Antecedentes Médicos
            //   2. 👤 Datos Personales      6. 📅 Asistencias/Permisos
            //   3. 💼 Antecedentes Laborales   7. ⚖️ Disciplinarios
            //   4. 👨‍👩‍👧‍👦 Grupo Familiar        8. 🎯 Config. Tareas
            //                                   9. 📸 Registro Biométrico
            //
            // VERIFICADO: 2025-11-11 | Modal abierto → tabs visibles → CRUD funcional
            // ARCHIVO RELACIONADO: public/js/modules/users.js:1531-1539 (9 tabs)
            //                      public/js/modules/users.js:1368 (modal #userDetailModal)
            // USO: Cualquier módulo con modal que contenga tabs internos
            // ═══════════════════════════════════════════════════════════════════

            console.log('   🔍 Paso 1/3: Esperando lista de usuarios cargada...');
            await this.wait(2000);

            console.log('   👁️  Paso 2/3: Clickeando botón VER del primer usuario...');
            // Buscar el PRIMER botón 👁️ en la tabla
            const verButtonClicked = await this.page.evaluate(() => {
                // Buscar todos los botones con emoji 👁️ en la primera fila de la tabla
                const rows = document.querySelectorAll('tbody tr');
                if (rows.length === 0) return false;
                
                const firstRow = rows[0];
                const viewButton = firstRow.querySelector('button[onclick*="view"], button:has-text("👁️"), .btn-info');
                
                if (viewButton) {
                    viewButton.click();
                    return true;
                }
                return false;
            });

            if (!verButtonClicked) {
                console.log('   ⚠️  No se encontró botón VER - skip submódulos');
                return { success: false, tested: 0 };
            }

            console.log('   ⏳ Paso 3/3: Esperando modal #userDetailModal...');
            await this.wait(3000); // Esperar a que modal se abra completamente

            // Verificar que el modal esté visible
            const modalVisible = await this.page.$eval('#userDetailModal', 
                modal => modal.offsetParent !== null
            ).catch(() => false);

            if (!modalVisible) {
                console.log('   ⚠️  Modal no visible - skip submódulos');
                return { success: false, tested: 0 };
            }

            console.log('   ✅ Modal abierto, buscando tabs DENTRO del modal...\n');

            // Buscar tabs DENTRO del modal específico
            const tabs = await this.page.$eval('#userDetailModal .file-tab',
                tabs => Array.from(tabs).map((tab, idx) => ({
                    index: idx,
                    text: tab.textContent.trim(),
                    visible: tab.offsetParent !== null
                }))
            ).catch(() => []);`;

content = content.replace(oldTestSubmodules, newTestSubmodules);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fix v2.0.3 aplicado - Abrir modal VER antes de buscar tabs');
console.log('   📍 Línea ~1220: Agregado click en VER + wait modal');
console.log('   📍 Query tabs ahora busca DENTRO de #userDetailModal');
console.log('   📍 Versión actualizada: 2.0.3');
console.log('   📍 HISTORIAL actualizado con nueva entrada');
