/**
 * ============================================================================
 * DEMO: Testing Inteligente con Descubrimiento Automático
 * ============================================================================
 *
 * Este script demuestra los nuevos métodos inteligentes de Phase4TestOrchestrator:
 * - Descubre botones dinámicamente (sin selectores hardcoded)
 * - Encuentra modales automáticamente
 * - Llena formularios adaptándose a la estructura real
 * - Scoring de candidatos para elegir el mejor
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');
const database = require('../src/config/database');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  DEMO: Testing Inteligente con Auto-Discovery            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

(async () => {
    const orchestrator = new Phase4TestOrchestrator({
        headless: false,
        slowMo: 100,
        timeout: 60000
    }, database.sequelize);

    try {
        // Iniciar orchestrator
        await orchestrator.start();

        // Login (este método ya existe y funciona)
        console.log('🔐 LOGIN...\n');
        await orchestrator.login('isi', 'admin', 'admin123');
        console.log('✅ Login exitoso\n');

        // Navegar al módulo organizational-structure
        console.log('📂 NAVEGANDO AL MÓDULO...\n');
        await orchestrator.navigateToModule('organizational-structure');
        await orchestrator.wait(2000);
        console.log('✅ Módulo cargado\n');

        // ========================================================================
        // DEMO 1: Descubrir TODOS los botones
        // ========================================================================
        console.log('🔍 DEMO 1: Descubriendo TODOS los botones visibles...\n');
        const allButtons = await orchestrator.discoverAllButtons();

        console.log(`   📊 Total de botones encontrados: ${allButtons.length}\n`);
        console.log('   Primeros 10 botones:');
        allButtons.slice(0, 10).forEach((btn, i) => {
            console.log(`   ${i + 1}. "${btn.text}" ${btn.id ? `[id="${btn.id}"]` : ''} ${btn.onclick ? '[onclick]' : ''}`);
        });
        console.log('');

        // ========================================================================
        // DEMO 2: Encontrar botón de CREAR con scoring
        // ========================================================================
        console.log('🎯 DEMO 2: Buscando botón de CREAR con scoring inteligente...\n');

        const createBtn = await orchestrator.findButtonByKeywords(
            ['crear', 'nuevo', 'agregar', 'add', 'new'],
            'create'
        );

        if (createBtn) {
            console.log('   ✅ BOTÓN ENCONTRADO:');
            console.log(`      Texto: "${createBtn.text}"`);
            console.log(`      Score: ${createBtn.score}`);
            console.log(`      ID: ${createBtn.id || 'N/A'}`);
            console.log(`      Onclick: ${createBtn.onclick ? 'Sí' : 'No'}`);
            console.log(`      Data-action: ${createBtn.dataAction || 'N/A'}\n`);

            // Clickear el botón
            console.log('   🔘 Clickeando botón...');
            const clicked = await orchestrator.clickButtonByText(createBtn.text);

            if (clicked) {
                console.log('   ✅ Click exitoso\n');

                // ====================================================================
                // DEMO 3: Descubrir modal abierto (con reintentos y más selectores)
                // ====================================================================
                console.log('💬 DEMO 3: Descubriendo modal abierto (con sistema mejorado)...\n');
                console.log('   ⏳ Esperando a que el modal se abra completamente (5 reintentos, 1s c/u)...\n');

                const modal = await orchestrator.discoverModalStructure(5, 1000);

                if (modal.found) {
                    console.log('   ✅ MODAL ENCONTRADO:');
                    console.log(`      Selector usado: ${modal.selector}`);
                    console.log(`      Elemento matched: ${modal.matchedElement}`);
                    console.log(`      Dimensiones: ${modal.dimensions.width}x${modal.dimensions.height}px`);
                    console.log(`      Posición: (${modal.dimensions.x}, ${modal.dimensions.y})`);
                    console.log(`      Inputs: ${modal.inputCount}`);
                    console.log(`      Botones: ${modal.buttons.length}\n`);

                    console.log('   📝 Campos del formulario:');
                    modal.inputs.forEach((inp, i) => {
                        console.log(`      ${i + 1}. name="${inp.name}" type="${inp.type}" ${inp.required ? '[REQUIRED]' : ''}`);
                    });

                    console.log('\n   🔘 Botones del modal:');
                    modal.buttons.forEach((btn, i) => {
                        console.log(`      ${i + 1}. "${btn.text}"`);
                    });
                    console.log('');

                    // ================================================================
                    // DEMO 4: Llenar formulario inteligentemente
                    // ================================================================
                    console.log('📝 DEMO 4: Llenando formulario inteligentemente...\n');

                    const filled = await orchestrator.fillFormIntelligently(modal.inputs, 'AutoTest');

                    console.log('   ✅ Campos llenados exitosamente:');
                    filled.success.forEach((f, i) => {
                        console.log(`      ${i + 1}. ${f.field} = "${f.value}"`);
                    });

                    if (filled.failed.length > 0) {
                        console.log('\n   ⚠️  Campos que no se pudieron llenar:');
                        filled.failed.forEach((f, i) => {
                            console.log(`      ${i + 1}. ${f.field} - ${f.error}`);
                        });
                    }

                    console.log('');

                    // ================================================================
                    // DEMO 5: Buscar y clickear botón GUARDAR
                    // ================================================================
                    console.log('💾 DEMO 5: Buscando botón GUARDAR...\n');

                    const saveBtn = modal.buttons.find(btn => {
                        const text = btn.text.toLowerCase();
                        return text.includes('guardar') || text.includes('save') || text.includes('aceptar');
                    });

                    if (saveBtn) {
                        console.log(`   ✅ Botón GUARDAR encontrado: "${saveBtn.text}"\n`);
                        console.log('   🔘 Clickeando...');

                        const savedClicked = await orchestrator.clickButtonByText(saveBtn.text);

                        if (savedClicked) {
                            console.log('   ✅ Click exitoso\n');
                            await orchestrator.wait(3000);

                            // Verificar en base de datos
                            console.log('🎯 Verificando en PostgreSQL...\n');

                            const [result] = await database.sequelize.query(`
                                SELECT * FROM departments
                                WHERE company_id = 11
                                ORDER BY id DESC
                                LIMIT 1
                            `);

                            if (result && result.length > 0) {
                                console.log('   ✅ ¡REGISTRO CREADO EXITOSAMENTE!');
                                console.log(`      ID: ${result[0].id}`);
                                console.log(`      Nombre: ${result[0].name}\n`);
                            } else {
                                console.log('   ⚠️  No se encontró registro en BD\n');
                            }
                        }
                    } else {
                        console.log('   ⚠️  No se encontró botón de guardar\n');
                    }

                } else {
                    console.log('   ❌ No se encontró modal abierto\n');
                }

            } else {
                console.log('   ❌ No se pudo clickear el botón\n');
            }

        } else {
            console.log('   ❌ No se encontró botón de crear\n');
        }

        // ========================================================================
        // RESUMEN
        // ========================================================================
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║                    DEMO COMPLETADA                         ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log('✅ Métodos inteligentes demostrados:');
        console.log('   1. discoverAllButtons() - Descubre botones sin selectores');
        console.log('   2. findButtonByKeywords() - Scoring inteligente');
        console.log('   3. discoverModalStructure() - Encuentra modales automáticamente');
        console.log('   4. fillFormIntelligently() - Llena campos adaptándose');
        console.log('   5. clickButtonByText() - Click por texto\n');

        console.log('🎯 VENTAJAS:');
        console.log('   ✅ No asume selectores hardcoded');
        console.log('   ✅ Se adapta a cambios en el frontend');
        console.log('   ✅ Usa scoring para elegir mejores candidatos');
        console.log('   ✅ Descubre estructura real en tiempo de ejecución\n');

        await orchestrator.stop();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        await orchestrator.stop();
        process.exit(1);
    }
})();
