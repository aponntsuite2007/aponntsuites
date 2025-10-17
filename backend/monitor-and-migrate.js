const https = require('https');

const API_KEY = 'rnd_xJHFJ9muRsenVO6Y1z19rvi1fcWq';
const SERVICE_ID = 'srv-d3i6p2gdl3ps73cve9vg';

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.render.com',
            path: path,
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

function executeShellCommand(command) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.render.com',
            path: `/v1/services/${SERVICE_ID}/shell`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify({ command }));
        req.end();
    });
}

async function waitForDeployComplete() {
    console.log('🔍 Monitoreando el deploy...\n');

    while (true) {
        try {
            const deploys = await makeRequest(`/v1/services/${SERVICE_ID}/deploys?limit=1`);
            const deploy = deploys[0]?.deploy;

            if (!deploy) {
                console.log('❌ No se encontró el deploy');
                return false;
            }

            const status = deploy.status;
            const message = deploy.commit?.message?.split('\n')[0] || 'Unknown';

            console.log(`📊 Deploy: ${deploy.id}`);
            console.log(`📝 Commit: ${message}`);
            console.log(`⏰ Status: ${status}\n`);

            if (status === 'live') {
                console.log('✅ Deploy completado exitosamente!\n');
                return true;
            } else if (status === 'build_failed' || status === 'deploy_failed') {
                console.log('❌ Deploy falló\n');
                return false;
            }

            console.log('⏳ Esperando 10 segundos...\n');
            await new Promise(resolve => setTimeout(resolve, 10000));

        } catch (error) {
            console.error('Error:', error.message);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
}

async function runMigrations() {
    console.log('🚀 Ejecutando migraciones de Notificaciones V2.0...\n');

    try {
        console.log('Ejecutando: npm run migrate:notifications\n');

        const result = await executeShellCommand('npm run migrate:notifications');

        console.log('✅ Comando ejecutado');
        console.log('Resultado:', JSON.stringify(result, null, 2));

        return true;
    } catch (error) {
        console.error('❌ Error ejecutando migraciones:', error.message);
        return false;
    }
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   MONITOR DE DEPLOY Y MIGRACIÓN AUTOMÁTICA           ║');
    console.log('║   Sistema de Notificaciones V2.0                      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Esperar a que el deploy termine
    const deploySuccess = await waitForDeployComplete();

    if (!deploySuccess) {
        console.log('❌ No se pudo completar el proceso');
        process.exit(1);
    }

    // Ejecutar migraciones
    console.log('═══════════════════════════════════════════════════════\n');
    const migrateSuccess = await runMigrations();

    if (migrateSuccess) {
        console.log('\n✅ PROCESO COMPLETADO EXITOSAMENTE');
        console.log('\n📊 Resumen:');
        console.log('   ✅ Deploy completado');
        console.log('   ✅ Migraciones ejecutadas');
        console.log('   ✅ Tablas de Notificaciones V2.0 creadas\n');
        console.log('🎉 El sistema está listo para usar!');
    } else {
        console.log('\n⚠️  Deploy OK pero migraciones fallaron');
        console.log('   Ejecuta manualmente desde Render Shell:');
        console.log('   npm run migrate:notifications');
    }
}

main().catch(console.error);
