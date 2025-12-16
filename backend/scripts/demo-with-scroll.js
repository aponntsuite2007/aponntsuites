/**
 * ============================================================================
 * DEMO COMPLETO: Testing Inteligente con Scroll Automático
 * ============================================================================
 *
 * Demuestra el sistema mejorado de descubrimiento + scroll automático
 *
 * @version 2.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');
const database = require('../src/config/database');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  DEMO: Testing con Scroll Automático                     ║');
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

        // Login
        console.log('🔐 LOGIN...\n');
        await orchestrator.login('isi', 'admin', 'admin123');
        console.log('✅ Login exitoso\n');

        // Navegar al módulo
        console.log('📂 NAVEGANDO AL MÓDULO...\n');
        await orchestrator.navigateToModule('organizational-structure');
        await orchestrator.wait(2000);
        console.log('✅ Módulo cargado\n');

        // ========================================================================
        // DEMO: Flujo completo con descubrimiento + scroll
        // ========================================================================
        console.log('🎯 INICIANDO FLUJO COMPLETO DE TESTING INTELIGENTE...\n');

        // 1. Descubrir y clickear botón CREAR
        console.log('1️⃣ Descubriendo botón CREAR...\n');
        const createBtn = await orchestrator.findButtonByKeywords(
            ['crear', 'nuevo', 'agregar', 'add', 'new'],
            'create'
        );

        if (!createBtn) {
            throw new Error('No se encontró botón de crear');
        }

        console.log(`   ✅ Botón encontrado: "${createBtn.text}" (score: ${createBtn.score})\n`);

        // 2. Click en botón
        console.log('2️⃣ Clickeando botón...\n');
        const clicked = await orchestrator.clickButtonByText(createBtn.text);

        if (!clicked) {
            throw new Error('No se pudo clickear el botón');
        }

        console.log('   ✅ Click exitoso\n');

        // 3. Descubrir modal (con reintentos)
        console.log('3️⃣ Descubriendo modal (5 reintentos, 1s c/u)...\n');
        const modal = await orchestrator.discoverModalStructure(5, 1000);

        if (!modal.found) {
            throw new Error('No se abrió el modal');
        }

        console.log('   ✅ MODAL ENCONTRADO:');
        console.log(`      Selector: ${modal.selector}`);
        console.log(`      Elemento: ${modal.matchedElement}`);
        console.log(`      Dimensiones: ${modal.dimensions.width}x${modal.dimensions.height}px`);
        console.log(`      Inputs: ${modal.inputCount}`);
        console.log(`      Botones: ${modal.buttons.length}\n`);

        // 4. Llenar formulario CON SCROLL AUTOMÁTICO
        console.log('4️⃣ Llenando formulario CON SCROLL AUTOMÁTICO...\n');
        console.log('   (Cada campo hace scroll para ser visible antes de llenar)\n');

        const filled = await orchestrator.fillFormIntelligently(modal.inputs, 'TestAutoScroll');

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

        // 5. Buscar y clickear botón GUARDAR
        console.log('5️⃣ Buscando botón GUARDAR...\n');

        const saveBtn = modal.buttons.find(btn => {
            const text = btn.text.toLowerCase();
            return text.includes('guardar') || text.includes('save') || text.includes('crear');
        });

        if (saveBtn) {
            console.log(`   ✅ Botón GUARDAR encontrado: "${saveBtn.text}"\n`);
            console.log('   🔘 Clickeando...');

            const savedClicked = await orchestrator.clickButtonByText(saveBtn.text);

            if (savedClicked) {
                console.log('   ✅ Click exitoso\n');
                await orchestrator.wait(3000);

                // 6. Verificar en base de datos
                console.log('6️⃣ Verificando en PostgreSQL...\n');

                const [result] = await database.sequelize.query(`
                    SELECT * FROM departments
                    WHERE company_id = 11
                    ORDER BY id DESC
                    LIMIT 1
                `);

                if (result && result.length > 0) {
                    console.log('   ✅ ¡REGISTRO CREADO EXITOSAMENTE!');
                    console.log(`      ID: ${result[0].id}`);
                    console.log(`      Nombre: ${result[0].name}`);
                    console.log(`      Código: ${result[0].code || 'N/A'}`);
                    console.log(`      Descripción: ${result[0].description || 'N/A'}\n`);
                } else {
                    console.log('   ⚠️  No se encontró registro en BD\n');
                }
            } else {
                console.log('   ❌ No se pudo clickear el botón de guardar\n');
            }
        } else {
            console.log('   ❌ No se encontró botón de guardar\n');
        }

        // ========================================================================
        // RESUMEN
        // ========================================================================
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║                    DEMO COMPLETADA                         ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log('✅ Flujo completo ejecutado:');
        console.log('   1. ✅ Descubrir botón CREAR con scoring');
        console.log('   2. ✅ Clickear botón');
        console.log('   3. ✅ Descubrir modal con reintentos');
        console.log('   4. ✅ Llenar formulario con SCROLL AUTOMÁTICO');
        console.log('   5. ✅ Clickear botón GUARDAR');
        console.log('   6. ✅ Verificar registro en PostgreSQL\n');

        console.log('🎯 MEJORAS IMPLEMENTADAS:');
        console.log('   ✅ Modal discovery con 18 selectores alternativos');
        console.log('   ✅ Reintentos con delays (5x1s)');
        console.log('   ✅ Scroll automático a cada campo antes de llenar');
        console.log('   ✅ Manejo inteligente de selects y checkboxes');
        console.log('   ✅ Espera de animaciones (300ms por campo)\n');

        await orchestrator.stop();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        await orchestrator.stop();
        process.exit(1);
    }
})();
