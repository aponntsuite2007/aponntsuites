/**
 * Script para configurar variables de entorno en Render
 */

const https = require('https');

const RENDER_API_KEY = 'rnd_iEHggaMyekPvZwwcCQpyrjI1dD0X';
const RENDER_API_BASE = 'api.render.com';
const SERVICE_ID = 'srv-d3i6p2gdl3ps73cve9vg';
// BASE DE PRODUCCIÓN (tiene empresa DEMO) - URL COMPLETA con hostname
const DATABASE_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com/aponnt_db';

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
        console.log('🔍 Obteniendo variables de entorno actuales...\n');

        // Obtener env vars actuales
        const envVars = await makeRequest('GET', `/services/${SERVICE_ID}/env-vars`);

        console.log('📋 Variables actuales:', JSON.stringify(envVars, null, 2));

        // Verificar si DATABASE_URL existe
        const currentDb = envVars.find(env => env.envVar?.key === 'DATABASE_URL');

        if (currentDb) {
            console.log('\n📋 DATABASE_URL actual:', currentDb.envVar.value.substring(0, 50) + '...');

            if (currentDb.envVar.value === DATABASE_URL) {
                console.log('✅ DATABASE_URL ya apunta a la base correcta');
            } else {
                console.log('\n⚠️  DATABASE_URL apunta a base INCORRECTA');
                console.log('💡 Actualizando DATABASE_URL a aponnt_db (producción)...\n');

                const result = await makeRequest('PUT', `/services/${SERVICE_ID}/env-vars`, {
                    envVars: [
                        {
                            key: 'DATABASE_URL',
                            value: DATABASE_URL
                        }
                    ]
                });

                console.log('✅ DATABASE_URL actualizado');
                console.log('⚠️  IMPORTANTE: Render redesplegará el servicio automáticamente en 1-2 minutos');
            }
        } else {
            console.log('\n⚠️  DATABASE_URL NO está configurado');
            console.log('💡 Agregando DATABASE_URL...\n');

            const result = await makeRequest('PUT', `/services/${SERVICE_ID}/env-vars`, {
                envVars: [
                    {
                        key: 'DATABASE_URL',
                        value: DATABASE_URL
                    }
                ]
            });

            console.log('✅ DATABASE_URL agregado');
            console.log('⚠️  IMPORTANTE: Render redesplegará el servicio automáticamente');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();
