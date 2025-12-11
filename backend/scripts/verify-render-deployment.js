/**
 * Verifica que el deployment en Render funcionó correctamente
 * Usa el API key de Render para consultar endpoints y verificar funcionalidad
 */

const axios = require('axios');

// URL base de Render (actualizar con la URL real del deployment)
const RENDER_BASE_URL = process.env.RENDER_URL || 'https://aponntsuites.onrender.com';
const RENDER_API_KEY = process.env.RENDER_API_KEY || 'rnd_CZESvxEjEWyYoQMPDv7mnn7HH1zi';

async function verifyDeployment() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  VERIFICACIÓN DE DEPLOYMENT EN RENDER                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const results = {
        healthCheck: false,
        engineeringMetadata: false,
        liveMetadataHealth: false,
        moduleCount: 0,
        errors: []
    };

    try {
        // 1. VERIFICAR HEALTH CHECK GENERAL
        console.log('1️⃣  Verificando health check general...');
        try {
            const healthResponse = await axios.get(`${RENDER_BASE_URL}/api/v1/health`, {
                timeout: 10000
            });

            if (healthResponse.status === 200 && healthResponse.data.status === 'OK') {
                console.log('   ✅ Health check: OK');
                results.healthCheck = true;
            } else {
                console.log('   ❌ Health check: FAILED');
                results.errors.push('Health check returned unexpected data');
            }
        } catch (error) {
            console.log(`   ❌ Health check: ERROR - ${error.message}`);
            results.errors.push(`Health check error: ${error.message}`);
        }

        // 2. VERIFICAR ENDPOINT DE ENGINEERING METADATA VIVA
        console.log('\n2️⃣  Verificando endpoint de metadata viva...');
        try {
            const metadataHealthResponse = await axios.get(
                `${RENDER_BASE_URL}/api/engineering-live/health`,
                { timeout: 10000 }
            );

            if (metadataHealthResponse.status === 200 &&
                metadataHealthResponse.data.success === true &&
                metadataHealthResponse.data.version === '2.0.0-live') {
                console.log('   ✅ Engineering Metadata API: ACTIVO');
                console.log(`   📌 Versión: ${metadataHealthResponse.data.version}`);
                console.log(`   📌 Modo: ${metadataHealthResponse.data.mode}`);
                results.liveMetadataHealth = true;
            } else {
                console.log('   ❌ Engineering Metadata API: FAILED');
                results.errors.push('Metadata API returned unexpected response');
            }
        } catch (error) {
            console.log(`   ❌ Engineering Metadata API: ERROR - ${error.message}`);
            results.errors.push(`Metadata API error: ${error.message}`);
        }

        // 3. VERIFICAR QUE PUEDE GENERAR METADATA VIVA (SIN AUTH)
        console.log('\n3️⃣  Verificando generación de metadata viva...');
        try {
            const statsResponse = await axios.get(
                `${RENDER_BASE_URL}/api/engineering-live/stats`,
                { timeout: 30000 }
            );

            if (statsResponse.status === 200 && statsResponse.data.success === true) {
                const stats = statsResponse.data.data;
                console.log('   ✅ Metadata viva generada correctamente');
                console.log(`   📊 Total módulos: ${stats.totalModules}`);
                console.log(`   📊 Total endpoints: ${stats.totalEndpoints}`);
                console.log(`   📊 Total tablas: ${stats.totalTables}`);
                console.log(`   📊 Total LOC: ${stats.totalLinesOfCode.toLocaleString()}`);
                console.log(`   📊 Progress promedio: ${stats.averageProgress}%`);

                results.engineeringMetadata = true;
                results.moduleCount = stats.totalModules;
            } else {
                console.log('   ❌ No se pudo generar metadata');
                results.errors.push('Stats endpoint failed');
            }
        } catch (error) {
            console.log(`   ❌ Error generando metadata: ${error.message}`);
            results.errors.push(`Stats error: ${error.message}`);
        }

        // 4. VERIFICAR MÓDULO ESPECÍFICO (departments)
        console.log('\n4️⃣  Verificando metadata de módulo específico (departments)...');
        try {
            const moduleResponse = await axios.get(
                `${RENDER_BASE_URL}/api/engineering-live/live-metadata/departments`,
                { timeout: 20000 }
            );

            if (moduleResponse.status === 200 && moduleResponse.data.success === true) {
                const module = moduleResponse.data.data;
                console.log('   ✅ Metadata de módulo departments generada');
                console.log(`   📂 Archivos backend: ${module.files.backend.length}`);
                console.log(`   📂 Archivos frontend: ${module.files.frontend.length}`);
                console.log(`   🔌 API endpoints: ${module.apiEndpoints.length}`);
                console.log(`   🗄️  Database tables: ${module.databaseTables.length}`);
                console.log(`   📈 Progress: ${module.progress}%`);
            } else {
                console.log('   ⚠️  No se pudo obtener metadata de departments');
            }
        } catch (error) {
            console.log(`   ⚠️  Error obteniendo metadata de departments: ${error.message}`);
        }

        // 5. RESUMEN FINAL
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  RESUMEN DE VERIFICACIÓN                                  ║');
        console.log('╠═══════════════════════════════════════════════════════════╣');
        console.log(`║  Health Check:           ${results.healthCheck ? '✅ OK' : '❌ FAIL'}`);
        console.log(`║  Metadata API Health:    ${results.liveMetadataHealth ? '✅ OK' : '❌ FAIL'}`);
        console.log(`║  Metadata Generada:      ${results.engineeringMetadata ? '✅ OK' : '❌ FAIL'}`);
        console.log(`║  Módulos Detectados:     ${results.moduleCount}`);
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        if (results.errors.length > 0) {
            console.log('⚠️  ERRORES DETECTADOS:\n');
            results.errors.forEach((err, idx) => {
                console.log(`   ${idx + 1}. ${err}`);
            });
            console.log('');
        }

        const allOk = results.healthCheck && results.liveMetadataHealth && results.engineeringMetadata;

        if (allOk) {
            console.log('🎉 DEPLOYMENT EN RENDER VERIFICADO EXITOSAMENTE\n');
            console.log(`✅ Sistema de metadata viva funcionando correctamente`);
            console.log(`✅ ${results.moduleCount} módulos auto-detectados en producción`);
            console.log(`✅ API REST /api/engineering-live/* activa\n`);
            process.exit(0);
        } else {
            console.log('❌ DEPLOYMENT TIENE PROBLEMAS - Revisar errores arriba\n');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ ERROR FATAL en verificación:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar verificación
verifyDeployment();
