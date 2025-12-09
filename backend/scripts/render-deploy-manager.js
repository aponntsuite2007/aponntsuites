/**
 * Script para gestionar deploys en Render
 */

const https = require('https');

const RENDER_API_KEY = 'rnd_iEHggaMyekPvZwwcCQpyrjI1dD0X';
const RENDER_API_BASE = 'api.render.com';

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: RENDER_API_BASE,
            path: `/v1${path}`,
            method: method,
            headers: {
                'Authorization': `Bearer ${RENDER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed);
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function main() {
    try {
        console.log('🔍 Obteniendo servicios de Render...\n');

        const response = await makeRequest('GET', '/services');

        // Extraer servicios del formato cursor-based
        const services = Array.isArray(response) ? response.map(item => item.service) : [];

        if (!services || services.length === 0) {
            console.log('⚠️  No se encontraron servicios');
            return;
        }

        console.log(`\n📦 Servicios encontrados: ${services.length}\n`);

        for (const service of services) {
            console.log(`\n🔹 Servicio: ${service.name}`);
            console.log(`   ID: ${service.id}`);
            console.log(`   Tipo: ${service.type}`);
            console.log(`   Estado: ${service.suspended}`);

            if (service.type === 'web_service') {
                // Obtener deploys del servicio
                console.log(`\n   📋 Obteniendo deploys recientes...`);

                const deploysResponse = await makeRequest('GET', `/services/${service.id}/deploys?limit=5`);

                // Extraer deploys del formato cursor-based
                const deploys = Array.isArray(deploysResponse) ? deploysResponse.map(item => item.deploy || item) : [];

                if (deploys && deploys.length > 0) {
                    console.log(`   ✅ Últimos ${deploys.length} deploys:\n`);

                    deploys.forEach((deploy, idx) => {
                        const status = deploy.status;
                        const emoji = status === 'live' ? '🟢' :
                                     status === 'building' ? '🔵' :
                                     status === 'failed' ? '🔴' : '⚪';

                        console.log(`   ${emoji} Deploy #${idx + 1}:`);
                        console.log(`      ID: ${deploy.id}`);
                        console.log(`      Status: ${status}`);
                        console.log(`      Commit: ${deploy.commit?.id?.substring(0, 7) || 'N/A'}`);
                        console.log(`      Message: ${deploy.commit?.message?.split('\n')[0] || 'N/A'}`);
                        console.log(`      Created: ${new Date(deploy.createdAt).toLocaleString()}`);

                        if (status === 'building') {
                            console.log(`      ⏳ Deploy en progreso...`);
                        } else if (status === 'live') {
                            console.log(`      ✅ Deploy activo`);
                        } else if (status === 'failed') {
                            console.log(`      ❌ Deploy falló`);
                        }
                        console.log('');
                    });

                    // Verificar si el último deploy es el commit reciente
                    const lastDeploy = deploys[0];
                    if (lastDeploy.commit?.message?.includes('SIAC Clientes modal')) {
                        console.log(`   ✅ El último deploy incluye tus cambios!\n`);
                    } else {
                        console.log(`   ⚠️  El último deploy NO incluye tus cambios recientes`);
                        console.log(`   💡 Triggereando nuevo deploy...\n`);

                        // Trigger manual deploy
                        const newDeploy = await makeRequest('POST', `/services/${service.id}/deploys`, {
                            clearCache: 'clear'
                        });

                        if (newDeploy.id) {
                            console.log(`   ✅ Nuevo deploy iniciado!`);
                            console.log(`      Deploy ID: ${newDeploy.id}`);
                            console.log(`      Status: ${newDeploy.status}`);
                        }
                    }
                } else {
                    console.log(`   ⚠️  No hay deploys disponibles`);
                }
            }
        }

        console.log('\n✅ Verificación completada\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();
