/**
 * Script para disparar un deploy manual en Render
 */

const https = require('https');

const RENDER_API_KEY = 'rnd_iEHggaMyekPvZwwcCQpyrjI1dD0X';
const RENDER_API_BASE = 'api.render.com';
const SERVICE_ID = 'srv-d3i6p2gdl3ps73cve9vg';

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
        console.log('🚀 Disparando deploy manual en Render...\n');

        const result = await makeRequest('POST', `/services/${SERVICE_ID}/deploys`, {
            clearCache: 'clear'
        });

        if (result.deploy || result.id) {
            const deploy = result.deploy || result;
            console.log('✅ Deploy iniciado:');
            console.log(`   ID: ${deploy.id}`);
            console.log(`   Status: ${deploy.status}`);
            console.log(`   Commit: ${deploy.commit?.id?.substring(0, 7) || 'N/A'}`);
            console.log(`\n⏳ El deploy tardará 2-4 minutos en completarse`);
            console.log(`📊 Monitorear en: https://dashboard.render.com/web/${SERVICE_ID}`);
        } else {
            console.log('⚠️  Respuesta inesperada:', JSON.stringify(result, null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();
