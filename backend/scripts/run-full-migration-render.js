/**
 * Ejecutar migración completa en Render via API
 * Envía las migraciones en lotes para evitar timeouts
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const RENDER_URL = 'https://www.aponnt.com/api/deploy/emergency-migration';
const KEY = 'DEMO_SEED_2024_SECURE';
const BATCH_SIZE = 500; // Statements por batch

// Cargar migraciones
const migrationsPath = path.join(__dirname, 'full-migration-data.json');
const allMigrations = JSON.parse(fs.readFileSync(migrationsPath, 'utf8'));

console.log(`Total migraciones: ${allMigrations.length}`);
console.log(`Batch size: ${BATCH_SIZE}`);
console.log(`Total batches: ${Math.ceil(allMigrations.length / BATCH_SIZE)}\n`);

async function sendBatch(migrations, batchNum, totalBatches) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            key: KEY,
            migrations: migrations
        });

        const url = new URL(RENDER_URL);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            },
            timeout: 120000 // 2 minutos por batch
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve(result);
                } catch (e) {
                    resolve({ error: body.substring(0, 200) });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.write(data);
        req.end();
    });
}

async function main() {
    const startTime = Date.now();
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalErrors = [];

    const totalBatches = Math.ceil(allMigrations.length / BATCH_SIZE);

    for (let i = 0; i < allMigrations.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batch = allMigrations.slice(i, i + BATCH_SIZE);

        process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length} statements)... `);

        try {
            const result = await sendBatch(batch, batchNum, totalBatches);

            if (result.success !== undefined) {
                totalSuccess += result.success;
                totalFailed += result.failed || 0;
                if (result.errors?.length) {
                    totalErrors.push(...result.errors.slice(0, 3));
                }
                console.log(`✅ ${result.success} ok, ${result.failed || 0} failed`);
            } else if (result.error) {
                console.log(`⚠️ ${result.error.substring(0, 50)}`);
                // Continuar con el siguiente batch
            }
        } catch (e) {
            console.log(`❌ ${e.message}`);
            // Esperar un poco y continuar
            await new Promise(r => setTimeout(r, 5000));
        }

        // Pequeña pausa entre batches
        await new Promise(r => setTimeout(r, 1000));
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('MIGRACIÓN COMPLETA');
    console.log('='.repeat(60));
    console.log(`Tiempo total: ${elapsed}s`);
    console.log(`Éxitos: ${totalSuccess}`);
    console.log(`Fallos: ${totalFailed}`);

    if (totalErrors.length > 0) {
        console.log(`\nPrimeros errores:`);
        totalErrors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
    }
}

// Esperar a que el deploy esté listo
console.log('Esperando 90s para que el deploy esté listo...\n');
setTimeout(() => {
    main().catch(console.error);
}, 90000);
