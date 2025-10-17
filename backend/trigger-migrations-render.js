/**
 * SCRIPT PARA EJECUTAR MIGRACIONES EN RENDER VIA HTTP
 */

const https = require('https');

const RENDER_URL = 'sistema-asistencia-biometrico.onrender.com';
const MIGRATION_TOKEN = 'rnd_xJHFJ9muRsenVO6Y1z19rvi1fcWq';

function makeRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: RENDER_URL,
            path: path,
            method: method,
            headers: {
                'x-migration-token': MIGRATION_TOKEN,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        body: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        body: data
                    });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function main() {
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║   EJECUTOR DE MIGRACIONES VIA HTTP EN RENDER        ║');
    console.log('║   Sistema de Notificaciones V2.0                     ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    try {
        // 1. Verificar tablas actuales
        console.log('📊 Verificando estado actual de tablas...\n');
        const checkResult = await makeRequest('/api/v1/admin/migrations/check-tables', 'GET');

        if (checkResult.statusCode === 200) {
            console.log('✅ Tablas actuales:');
            console.log(`   ${checkResult.body.notificationTables.join(', ')}`);
            console.log(`   Total: ${checkResult.body.count} tablas\n`);
        }

        // 2. Ejecutar migraciones de notificaciones
        console.log('🚀 Ejecutando migraciones de Notificaciones V2.0...\n');
        const migrateResult = await makeRequest('/api/v1/admin/migrations/migrate-notifications', 'POST');

        if (migrateResult.statusCode === 200) {
            if (migrateResult.body.alreadyExists) {
                console.log('ℹ️  Las tablas ya existen');
            } else {
                console.log('✅ Migración ejecutada exitosamente');
                console.log(`   ${migrateResult.body.tables}`);
                console.log(`   Timestamp: ${migrateResult.body.timestamp}\n`);
            }
        } else {
            console.error('❌ Error en migración:', migrateResult.body);
            process.exit(1);
        }

        // 3. Verificar tablas después de migración
        console.log('📊 Verificando tablas después de migración...\n');
        const checkAfterResult = await makeRequest('/api/v1/admin/migrations/check-tables', 'GET');

        if (checkAfterResult.statusCode === 200) {
            console.log('✅ Tablas de notificaciones:');
            checkAfterResult.body.notificationTables.forEach(table => {
                console.log(`   ✓ ${table}`);
            });
            console.log(`\n   Total: ${checkAfterResult.body.count} tablas\n`);
        }

        // 4. Ampliar columna de íconos
        console.log('🔧 Ampliando columna de íconos...\n');
        const iconResult = await makeRequest('/api/v1/admin/migrations/fix-icon-column', 'POST');

        if (iconResult.statusCode === 200) {
            console.log('✅ Columna de íconos ampliada');
        } else {
            console.warn('⚠️  No se pudo ampliar columna de íconos:', iconResult.body);
        }

        console.log('\n╔═══════════════════════════════════════════════════════╗');
        console.log('║   ✅ PROCESO COMPLETADO EXITOSAMENTE                 ║');
        console.log('╚═══════════════════════════════════════════════════════╝');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
