/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 VERIFICACIÓN EXHAUSTIVA DE DATOS POST-STRESS TEST
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Verifica la integridad y consistencia de todos los datos generados
 * durante el stress test de la APK Kiosk biométrica.
 *
 * @author Claude Opus 4.5
 * @date 2026-01-21
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { sequelize } = require('../src/config/database');

const COMPANY_ID = 11; // ISI

async function verifyData() {
    console.log('═'.repeat(80));
    console.log('🔍 VERIFICACIÓN EXHAUSTIVA DE DATOS POST-STRESS TEST');
    console.log('═'.repeat(80));
    console.log(`\n🏢 Empresa: ISI (ID: ${COMPANY_ID})`);
    console.log(`📅 Fecha: ${new Date().toISOString()}\n`);

    const results = {
        templates: null,
        attendances: null,
        detections: null,
        integrity: null,
        performance: null
    };

    try {
        // ═══════════════════════════════════════════════════════════════════════
        // 1. VERIFICACIÓN DE TEMPLATES BIOMÉTRICOS
        // ═══════════════════════════════════════════════════════════════════════
        console.log('━'.repeat(80));
        console.log('📋 1. TEMPLATES BIOMÉTRICOS');
        console.log('━'.repeat(80));

        const [templatesStats] = await sequelize.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN is_active = true THEN 1 END) as activos,
                COUNT(CASE WHEN is_validated = true THEN 1 END) as validados,
                AVG(quality_score::numeric) as avg_quality,
                AVG(confidence_score::numeric) as avg_confidence,
                MIN(created_at) as primer_creado,
                MAX(created_at) as ultimo_creado
            FROM biometric_templates
            WHERE company_id = ${COMPANY_ID}
        `);

        console.log(`   Total templates: ${templatesStats[0].total}`);
        console.log(`   Activos: ${templatesStats[0].activos}`);
        console.log(`   Validados: ${templatesStats[0].validados}`);
        console.log(`   Calidad promedio: ${parseFloat(templatesStats[0].avg_quality).toFixed(3)}`);
        console.log(`   Confianza promedio: ${parseFloat(templatesStats[0].avg_confidence).toFixed(3)}`);
        console.log(`   Primer creado: ${templatesStats[0].primer_creado}`);
        console.log(`   Último creado: ${templatesStats[0].ultimo_creado}`);

        // Verificar que todos tienen embedding encriptado válido
        const [invalidTemplates] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM biometric_templates
            WHERE company_id = ${COMPANY_ID}
              AND (embedding_encrypted IS NULL OR embedding_encrypted = '')
        `);
        console.log(`   Templates sin embedding: ${invalidTemplates[0].count} ${parseInt(invalidTemplates[0].count) === 0 ? '✅' : '❌'}`);

        // Verificar integridad referencial con users
        const [orphanTemplates] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM biometric_templates bt
            LEFT JOIN users u ON bt.employee_id::text = u.user_id::text
            WHERE bt.company_id = ${COMPANY_ID} AND u.user_id IS NULL
        `);
        console.log(`   Templates huérfanos: ${orphanTemplates[0].count} ${parseInt(orphanTemplates[0].count) === 0 ? '✅' : '❌'}`);

        results.templates = {
            total: parseInt(templatesStats[0].total),
            activos: parseInt(templatesStats[0].activos),
            invalidCount: parseInt(invalidTemplates[0].count),
            orphanCount: parseInt(orphanTemplates[0].count)
        };

        // ═══════════════════════════════════════════════════════════════════════
        // 2. VERIFICACIÓN DE ASISTENCIAS
        // ═══════════════════════════════════════════════════════════════════════
        console.log('\n' + '━'.repeat(80));
        console.log('📋 2. REGISTROS DE ASISTENCIA');
        console.log('━'.repeat(80));

        const today = new Date().toISOString().split('T')[0];

        const [attendanceStats] = await sequelize.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN "checkOutTime" IS NOT NULL THEN 1 END) as con_salida,
                COUNT(CASE WHEN "checkOutTime" IS NULL THEN 1 END) as sin_salida,
                COUNT(DISTINCT "UserId") as empleados_distintos,
                MIN("checkInTime") as primera_entrada,
                MAX("checkInTime") as ultima_entrada
            FROM attendances
            WHERE company_id = ${COMPANY_ID}
              AND DATE("checkInTime") = '${today}'
        `);

        console.log(`   Total asistencias hoy: ${attendanceStats[0].total}`);
        console.log(`   Con check-out: ${attendanceStats[0].con_salida}`);
        console.log(`   Sin check-out: ${attendanceStats[0].sin_salida}`);
        console.log(`   Empleados distintos: ${attendanceStats[0].empleados_distintos}`);
        console.log(`   Primera entrada: ${attendanceStats[0].primera_entrada}`);
        console.log(`   Última entrada: ${attendanceStats[0].ultima_entrada}`);

        // Verificar integridad referencial
        const [orphanAttendances] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM attendances a
            LEFT JOIN users u ON a."UserId"::text = u.user_id::text
            WHERE a.company_id = ${COMPANY_ID}
              AND DATE(a."checkInTime") = '${today}'
              AND u.user_id IS NULL
        `);
        console.log(`   Asistencias huérfanas: ${orphanAttendances[0].count} ${parseInt(orphanAttendances[0].count) === 0 ? '✅' : '❌'}`);

        // Verificar duplicados (mismo usuario, mismo día, mismo minuto)
        const [duplicates] = await sequelize.query(`
            SELECT "UserId", DATE_TRUNC('minute', "checkInTime") as minuto, COUNT(*) as count
            FROM attendances
            WHERE company_id = ${COMPANY_ID}
              AND DATE("checkInTime") = '${today}'
            GROUP BY "UserId", DATE_TRUNC('minute', "checkInTime")
            HAVING COUNT(*) > 1
            LIMIT 5
        `);
        console.log(`   Posibles duplicados: ${duplicates.length} ${duplicates.length === 0 ? '✅' : '⚠️'}`);
        if (duplicates.length > 0) {
            duplicates.forEach(d => console.log(`      - User ${d.UserId}: ${d.count} registros en ${d.minuto}`));
        }

        results.attendances = {
            total: parseInt(attendanceStats[0].total),
            conSalida: parseInt(attendanceStats[0].con_salida),
            sinSalida: parseInt(attendanceStats[0].sin_salida),
            empleadosDistintos: parseInt(attendanceStats[0].empleados_distintos),
            orphanCount: parseInt(orphanAttendances[0].count),
            duplicates: duplicates.length
        };

        // ═══════════════════════════════════════════════════════════════════════
        // 3. VERIFICACIÓN DE DETECCIONES BIOMÉTRICAS
        // ═══════════════════════════════════════════════════════════════════════
        console.log('\n' + '━'.repeat(80));
        console.log('📋 3. DETECCIONES BIOMÉTRICAS');
        console.log('━'.repeat(80));

        const [detectionStats] = await sequelize.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN was_registered = true THEN 1 END) as registradas,
                COUNT(CASE WHEN was_registered = false THEN 1 END) as no_registradas,
                COUNT(CASE WHEN operation_type = 'clock_in' THEN 1 END) as clock_in,
                COUNT(CASE WHEN operation_type = 'clock_out' THEN 1 END) as clock_out,
                AVG(similarity) as avg_similarity,
                AVG(processing_time_ms) as avg_processing_time,
                MIN(processing_time_ms) as min_processing_time,
                MAX(processing_time_ms) as max_processing_time
            FROM biometric_detections
            WHERE company_id = ${COMPANY_ID}
              AND DATE(detection_timestamp) = '${today}'
        `);

        console.log(`   Total detecciones hoy: ${detectionStats[0].total}`);
        console.log(`   Registradas en asistencia: ${detectionStats[0].registradas}`);
        console.log(`   No registradas (cooldown): ${detectionStats[0].no_registradas}`);
        console.log(`   Clock-in: ${detectionStats[0].clock_in}`);
        console.log(`   Clock-out: ${detectionStats[0].clock_out}`);
        console.log(`   Similaridad promedio: ${parseFloat(detectionStats[0].avg_similarity || 0).toFixed(4)}`);
        console.log(`   Tiempo procesamiento promedio: ${parseFloat(detectionStats[0].avg_processing_time || 0).toFixed(2)}ms`);
        console.log(`   Tiempo mínimo: ${detectionStats[0].min_processing_time}ms`);
        console.log(`   Tiempo máximo: ${detectionStats[0].max_processing_time}ms`);

        // Distribución de similaridades
        const [similarityDistribution] = await sequelize.query(`
            SELECT
                CASE
                    WHEN similarity >= 0.95 THEN '95-100%'
                    WHEN similarity >= 0.90 THEN '90-95%'
                    WHEN similarity >= 0.85 THEN '85-90%'
                    WHEN similarity >= 0.80 THEN '80-85%'
                    WHEN similarity >= 0.75 THEN '75-80%'
                    ELSE '<75%'
                END as rango,
                COUNT(*) as count
            FROM biometric_detections
            WHERE company_id = ${COMPANY_ID}
              AND DATE(detection_timestamp) = '${today}'
            GROUP BY 1
            ORDER BY 1 DESC
        `);
        console.log(`\n   📊 Distribución de similaridad:`);
        similarityDistribution.forEach(d => console.log(`      ${d.rango}: ${d.count} detecciones`));

        results.detections = {
            total: parseInt(detectionStats[0].total),
            registradas: parseInt(detectionStats[0].registradas || 0),
            avgSimilarity: parseFloat(detectionStats[0].avg_similarity || 0),
            avgProcessingTime: parseFloat(detectionStats[0].avg_processing_time || 0)
        };

        // ═══════════════════════════════════════════════════════════════════════
        // 4. VERIFICACIÓN DE INTEGRIDAD CRUZADA
        // ═══════════════════════════════════════════════════════════════════════
        console.log('\n' + '━'.repeat(80));
        console.log('📋 4. INTEGRIDAD CRUZADA');
        console.log('━'.repeat(80));

        // Empleados con template pero sin asistencias hoy
        const [templatesNoAttendance] = await sequelize.query(`
            SELECT COUNT(DISTINCT bt.employee_id) as count
            FROM biometric_templates bt
            LEFT JOIN attendances a ON bt.employee_id::text = a."UserId"::text
                AND DATE(a."checkInTime") = '${today}'
            WHERE bt.company_id = ${COMPANY_ID}
              AND bt.is_active = true
              AND a.id IS NULL
        `);
        console.log(`   Empleados con biometría sin asistencia hoy: ${templatesNoAttendance[0].count}`);

        // Asistencias sin detección biométrica
        const [attendancesNoDetection] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM attendances a
            LEFT JOIN biometric_detections bd ON a."UserId"::text = bd.employee_id::text
                AND DATE(bd.detection_timestamp) = DATE(a."checkInTime")
            WHERE a.company_id = ${COMPANY_ID}
              AND DATE(a."checkInTime") = '${today}'
              AND bd.id IS NULL
        `);
        console.log(`   Asistencias sin detección biométrica: ${attendancesNoDetection[0].count}`);

        // Consistencia de company_id
        const [companyMismatch] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM attendances a
            JOIN users u ON a."UserId"::text = u.user_id::text
            WHERE a.company_id = ${COMPANY_ID}
              AND u.company_id != ${COMPANY_ID}
        `);
        console.log(`   Inconsistencias de company_id: ${companyMismatch[0].count} ${parseInt(companyMismatch[0].count) === 0 ? '✅' : '❌'}`);

        results.integrity = {
            templatesNoAttendance: parseInt(templatesNoAttendance[0].count),
            attendancesNoDetection: parseInt(attendancesNoDetection[0].count),
            companyMismatch: parseInt(companyMismatch[0].count)
        };

        // ═══════════════════════════════════════════════════════════════════════
        // 5. TEST DE PERFORMANCE DE QUERIES
        // ═══════════════════════════════════════════════════════════════════════
        console.log('\n' + '━'.repeat(80));
        console.log('📋 5. PERFORMANCE DE QUERIES');
        console.log('━'.repeat(80));

        // Query típica de verificación biométrica
        let start = Date.now();
        await sequelize.query(`
            SELECT bt.*, u."firstName", u."lastName"
            FROM biometric_templates bt
            JOIN users u ON bt.employee_id::text = u.user_id::text
            WHERE bt.company_id = ${COMPANY_ID} AND bt.is_active = true
        `);
        const templateQueryTime = Date.now() - start;
        console.log(`   Query templates + users: ${templateQueryTime}ms ${templateQueryTime < 100 ? '✅' : '⚠️'}`);

        // Query de asistencias del día
        start = Date.now();
        await sequelize.query(`
            SELECT a.*, u."firstName", u."lastName"
            FROM attendances a
            JOIN users u ON a."UserId"::text = u.user_id::text
            WHERE a.company_id = ${COMPANY_ID}
              AND DATE(a."checkInTime") = '${today}'
            ORDER BY a."checkInTime" DESC
            LIMIT 100
        `);
        const attendanceQueryTime = Date.now() - start;
        console.log(`   Query asistencias día: ${attendanceQueryTime}ms ${attendanceQueryTime < 100 ? '✅' : '⚠️'}`);

        // Query de detecciones
        start = Date.now();
        await sequelize.query(`
            SELECT *
            FROM biometric_detections
            WHERE company_id = ${COMPANY_ID}
              AND DATE(detection_timestamp) = '${today}'
            ORDER BY detection_timestamp DESC
            LIMIT 100
        `);
        const detectionQueryTime = Date.now() - start;
        console.log(`   Query detecciones día: ${detectionQueryTime}ms ${detectionQueryTime < 100 ? '✅' : '⚠️'}`);

        results.performance = {
            templateQueryTime,
            attendanceQueryTime,
            detectionQueryTime
        };

        // ═══════════════════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ═══════════════════════════════════════════════════════════════════════
        console.log('\n' + '═'.repeat(80));
        console.log('📊 RESUMEN DE VERIFICACIÓN');
        console.log('═'.repeat(80));

        const checks = [
            { name: 'Templates válidos', pass: results.templates.invalidCount === 0 },
            { name: 'Templates sin huérfanos', pass: results.templates.orphanCount === 0 },
            { name: 'Asistencias sin huérfanos', pass: results.attendances.orphanCount === 0 },
            { name: 'Consistencia company_id', pass: results.integrity.companyMismatch === 0 },
            { name: 'Query templates < 100ms', pass: results.performance.templateQueryTime < 100 },
            { name: 'Query asistencias < 100ms', pass: results.performance.attendanceQueryTime < 100 },
            { name: 'Query detecciones < 100ms', pass: results.performance.detectionQueryTime < 100 }
        ];

        let passed = 0;
        checks.forEach(check => {
            const status = check.pass ? '✅ PASS' : '❌ FAIL';
            console.log(`   ${status}: ${check.name}`);
            if (check.pass) passed++;
        });

        console.log(`\n   RESULTADO: ${passed}/${checks.length} checks pasados`);

        if (passed === checks.length) {
            console.log('\n   🎉 VERIFICACIÓN COMPLETA: TODOS LOS DATOS SON VÁLIDOS Y CONSISTENTES');
        } else {
            console.log('\n   ⚠️  VERIFICACIÓN CON ADVERTENCIAS: Revisar checks fallidos');
        }

        console.log('═'.repeat(80));

    } catch (error) {
        console.error('❌ Error en verificación:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

verifyData();
