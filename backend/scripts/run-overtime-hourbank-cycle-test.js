#!/usr/bin/env node
/**
 * ============================================================================
 * TEST: CICLO COMPLETO HORAS EXTRAS + BANCO DE HORAS + DOBLE APROBACIÓN
 * ============================================================================
 *
 * Este script ejecuta el test del ciclo completo:
 * 1. Fichaje con horas extras (10h en turno de 8h)
 * 2. Detección automática de HE (descontando recesos)
 * 3. Notificación al empleado vía sistema CENTRAL
 * 4. Decisión del empleado (cobrar vs depositar)
 * 5. Conversión según plantilla de sucursal
 * 6. Workflow de DOBLE aprobación (Supervisor + RRHH)
 * 7. Validación de final_approved solo con ambas
 *
 * Uso:
 *   node scripts/run-overtime-hourbank-cycle-test.js
 *   node scripts/run-overtime-hourbank-cycle-test.js --company=11
 *   node scripts/run-overtime-hourbank-cycle-test.js --choice=pay
 *
 * @date 2025-12-15
 * ============================================================================
 */

const path = require('path');
const fs = require('fs');

// Parsear argumentos
const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, value] = arg.replace('--', '').split('=');
    acc[key] = value || true;
    return acc;
}, {});

async function runTest() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   🧪 INICIANDO TEST CICLO HORAS EXTRAS + BANCO DE HORAS      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        // Cargar configuración
        require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

        // Conectar base de datos
        const { sequelize } = require('../src/config/database');
        await sequelize.authenticate();
        console.log('✅ Base de datos conectada');

        // Cargar Phase4TestOrchestrator
        const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');

        // Crear instancia
        const orchestrator = new Phase4TestOrchestrator({
            verbose: true,
            saveResults: true
        }, sequelize);

        // Configuración del test
        const config = {
            companyId: args.company ? parseInt(args.company) : 11, // ISI por defecto
            choice: args.choice || 'bank', // 'bank' o 'pay'
            userId: args.user || null
        };

        console.log('');
        console.log('📋 Configuración del test:');
        console.log(`   • Empresa ID: ${config.companyId}`);
        console.log(`   • Elección empleado: ${config.choice === 'bank' ? '🏦 Depositar' : '💵 Cobrar'}`);
        console.log(`   • Usuario específico: ${config.userId || 'auto-selección'}`);
        console.log('');

        // Ejecutar test
        const results = await orchestrator.runOvertimeHourBankCycleTest(config);

        // Guardar resultados
        const resultsPath = path.join(__dirname, '..', 'logs', `overtime-hourbank-test-${Date.now()}.json`);
        fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

        console.log('');
        console.log(`📁 Resultados guardados en: ${resultsPath}`);

        // Cerrar conexión
        await sequelize.close();

        // Exit code basado en resultado
        process.exit(results.success ? 0 : 1);

    } catch (error) {
        console.error('');
        console.error('❌ ERROR FATAL:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar
runTest();
