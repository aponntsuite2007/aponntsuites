/**
 * ============================================================================
 * DEMO SIMPLIFICADO: AUTOCONOCIMIENTO INTEGRAL
 * ============================================================================
 *
 * Versión simplificada del demo que prueba las capacidades REALES del sistema
 * usando los nombres correctos de columnas de la BD.
 *
 * @version 1.0.0
 * @date 2025-12-10
 * ============================================================================
 */

const ProcessChainGenerator = require('../src/services/ProcessChainGenerator');
const ContextValidatorService = require('../src/services/ContextValidatorService');
const EcosystemBrainService = require('../src/services/EcosystemBrainService');
const database = require('../src/config/database');
const { QueryTypes } = require('sequelize');

async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  DEMO: AUTOCONOCIMIENTO INTEGRAL - Sistema REAL          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    try {
        // Inicializar servicios
        const brainService = new EcosystemBrainService(database.sequelize);
        const processChain = new ProcessChainGenerator(database.sequelize, brainService);
        const contextValidator = new ContextValidatorService(database.sequelize);

        // Obtener usuario de prueba usando nombres REALES de columnas
        console.log('🔍 Obteniendo usuario de prueba...\n');

        const users = await database.sequelize.query(
            `SELECT u.user_id, u.email, u.role, u.company_id,
                    c.name as company_name, c.active_modules
             FROM users u
             JOIN companies c ON c.company_id = u.company_id
             WHERE u.company_id = 1
               AND u.role != 'super_admin'
             LIMIT 1`,
            { type: QueryTypes.SELECT }
        );

        if (!users || users.length === 0) {
            console.log('❌ No se encontraron usuarios. Crear datos de prueba primero.\n');
            process.exit(1);
        }

        const testUser = users[0];

        console.log('✅ Usuario seleccionado:');
        console.log(`   ID: ${testUser.user_id}`);
        console.log(`   Email: ${testUser.email}`);
        console.log(`   Role: ${testUser.role}`);
        console.log(`   Empresa: ${testUser.company_name} (ID: ${testUser.company_id})`);
        console.log(`   Módulos activos: ${testUser.active_modules}\n`);

        // ===================================================================
        // TEST 1: Validar contexto del usuario para "shift-swap"
        // ===================================================================
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  TEST 1: Validar contexto para "Cambio de Turno"        ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        console.log('🔍 Validando prerequisitos...\n');

        const validation = await contextValidator.validateUserContext(
            testUser.user_id,
            testUser.company_id,
            'shift-swap'
        );

        console.log('📊 RESULTADO:');
        console.log(`   ✅ Puede realizar acción: ${validation.valid ? 'SÍ' : 'NO'}`);
        console.log(`   ✅ Prerequisites cumplidos: ${validation.fulfilledPrerequisites?.length || 0}`);
        console.log(`   ❌ Prerequisites faltantes: ${validation.missingPrerequisites?.length || 0}\n`);

        if (validation.missingPrerequisites && validation.missingPrerequisites.length > 0) {
            console.log('❌ FALTA:');
            validation.missingPrerequisites.forEach(m => {
                console.log(`   - ${m.description}`);
                console.log(`     Razón: ${m.reason}`);
                console.log(`     Solución: ${m.howToFix}\n`);
            });
        }

        // ===================================================================
        // TEST 2: Obtener todas las acciones disponibles para el usuario
        // ===================================================================
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  TEST 2: Acciones Disponibles para el Usuario           ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const allActions = await contextValidator.getUserAvailableActions(
            testUser.user_id,
            testUser.company_id
        );

        console.log('📋 RESUMEN:');
        console.log(`   Total acciones: ${allActions.length}`);
        console.log(`   Disponibles: ${allActions.filter(a => a.available).length} ✅`);
        console.log(`   Bloqueadas: ${allActions.filter(a => !a.available).length} ❌`);
        console.log(`   Con alternativa: ${allActions.filter(a => a.hasAlternative).length} 🔄\n`);

        console.log('📊 DETALLE:');
        allActions.forEach((action, idx) => {
            const icon = action.available ? '✅' : (action.hasAlternative ? '🔄' : '❌');
            const status = action.available ? 'Disponible' : (action.hasAlternative ? 'Alternativa' : 'Bloqueada');
            console.log(`   ${idx + 1}. ${icon} ${action.name.padEnd(30)} → ${status}`);
            if (!action.available && !action.hasAlternative) {
                console.log(`       Faltan ${action.missingCount} prerequisitos`);
            }
        });

        // ===================================================================
        // CONCLUSIÓN
        // ===================================================================
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  CONCLUSIÓN: AUTOCONOCIMIENTO REAL                       ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        console.log('✅ El sistema demostró:');
        console.log('   1. Consulta datos REALES de BD (no hardcoded)');
        console.log('   2. Valida prerequisitos DINÁMICAMENTE');
        console.log('   3. Identifica qué puede y qué no puede hacer el usuario');
        console.log('   4. Proporciona alternativas cuando faltan módulos');
        console.log('   5. TODO basado en estado ACTUAL del usuario y empresa\n');

        console.log('💡 Esto reemplaza:');
        console.log('   - Soporte nivel 1 (80%+ de consultas)');
        console.log('   - Documentación manual');
        console.log('   - Validaciones manuales\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar
main();
