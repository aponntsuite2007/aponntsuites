/**
 * Script para ejecutar todas las migraciones del Sistema de Emails
 * en el orden correcto
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const migrations = [
    {
        file: '20251028_email_system_multicapa.sql',
        description: 'Sistema de Emails Multicapa (Base: Aponnt, Empresa, Empleados)'
    },
    {
        file: '20251028_extend_email_for_partners_vendors.sql',
        description: 'Extensión para Partners, Vendedores y Soporte'
    },
    {
        file: '20251028_integrate_email_with_notifications.sql',
        description: 'Integración con Sistema de Notificaciones Enterprise'
    }
];

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system';

console.log('🚀 Iniciando migración del Sistema de Emails...\n');

async function runMigration(migration) {
    return new Promise((resolve, reject) => {
        const migrationPath = path.join(__dirname, 'migrations', migration.file);

        // Verificar que el archivo existe
        if (!fs.existsSync(migrationPath)) {
            reject(new Error(`Archivo no encontrado: ${migrationPath}`));
            return;
        }

        console.log(`📄 Ejecutando: ${migration.description}`);
        console.log(`   Archivo: ${migration.file}`);

        // Ejecutar migración usando psql
        const command = `psql "${DATABASE_URL}" -f "${migrationPath}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error en ${migration.file}:`);
                console.error(stderr || error.message);
                reject(error);
                return;
            }

            console.log(`✅ Completado: ${migration.file}\n`);
            if (stdout) {
                console.log(stdout);
            }
            resolve();
        });
    });
}

async function runAllMigrations() {
    try {
        console.log(`🔗 Conectando a: ${DATABASE_URL.replace(/:[^:]*@/, ':****@')}\n`);

        for (const migration of migrations) {
            await runMigration(migration);
            // Esperar 1 segundo entre migraciones
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n═════════════════════════════════════════════════════════');
        console.log('✅ TODAS LAS MIGRACIONES COMPLETADAS EXITOSAMENTE');
        console.log('═════════════════════════════════════════════════════════\n');

        console.log('📋 RESUMEN DEL SISTEMA DE EMAILS:');
        console.log('   ✅ 5 Capas: Aponnt → Partners → Vendedores → Empresa → Empleados');
        console.log('   ✅ 11 Tablas creadas (email_configurations, user_emails, partner_emails, etc.)');
        console.log('   ✅ Triggers automáticos de sincronización');
        console.log('   ✅ Integración con Sistema de Notificaciones');
        console.log('   ✅ Validación SMTP obligatoria al crear empresas');
        console.log('   ✅ Logs y auditoría completa\n');

        console.log('🚀 PRÓXIMOS PASOS:');
        console.log('   1. Configurar emails de Aponnt en aponnt_email_config');
        console.log('   2. Actualizar panel-administrativo.html para requerir config SMTP');
        console.log('   3. Iniciar worker de procesamiento de emails');
        console.log('   4. Probar creación de empresa con validación SMTP\n');

        console.log('📚 DOCUMENTACIÓN:');
        console.log('   - EMAIL-SYSTEM-ARCHITECTURE.md');
        console.log('   - SISTEMA-EMAIL-5-CAPAS-COMPLETO.md\n');

        process.exit(0);

    } catch (error) {
        console.error('\n═════════════════════════════════════════════════════════');
        console.error('❌ ERROR EN LAS MIGRACIONES');
        console.error('═════════════════════════════════════════════════════════');
        console.error(error.message);
        console.error('\n💡 SOLUCIÓN:');
        console.error('   1. Verifica que PostgreSQL esté corriendo');
        console.error('   2. Verifica las credenciales en DATABASE_URL');
        console.error('   3. Verifica que la base de datos "attendance_system" exista');
        console.error('   4. Ejecuta manualmente: psql -f migrations/[archivo].sql\n');
        process.exit(1);
    }
}

// Ejecutar
runAllMigrations();
