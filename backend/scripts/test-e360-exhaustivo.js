/**
 * Test exhaustivo del módulo Employee 360
 * Verifica TODAS las secciones del reporte
 */

const http = require('http');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc2NmRlNDk1LWU0ZjMtNGU5MS1hNTA5LTFhNDk1YzUyZTE1YyIsInJvbGUiOiJhZG1pbiIsImVtcGxveWVlSWQiOiJFTVAtSVNJLTAwMSIsImNvbXBhbnlfaWQiOjExLCJpYXQiOjE3NjQ0NTkxMDMsImV4cCI6MTc2NDU0NTUwM30.edZuE3ECgcCnNnW1qGT67liH35jxiFf5qJ9A01W8yTQ';

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 9998,
            path: path,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Parse error: ${data.substring(0, 200)}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function checkField(obj, path, label) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === undefined || current === null) {
            return { exists: false, value: undefined, label };
        }
        current = current[part];
    }
    return { exists: current !== undefined && current !== null, value: current, label };
}

async function testDashboard() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: DASHBOARD - Lista de empleados');
    console.log('='.repeat(60));

    try {
        const result = await makeRequest('/api/employee-360/dashboard');

        if (!result.success) {
            console.log('❌ FALLO: Dashboard no retorna success');
            return null;
        }

        console.log('✅ Dashboard OK');
        console.log(`   Total empleados: ${result.data.totalEmployees}`);
        console.log(`   Empleados listados: ${result.data.employees?.length || 0}`);

        if (result.data.employees?.length > 0) {
            console.log('\n   Empleados disponibles:');
            result.data.employees.forEach((emp, i) => {
                console.log(`   ${i+1}. ${emp.name} (${emp.employeeId}) - ${emp.role}`);
            });
        }

        return result.data.employees;
    } catch (e) {
        console.log('❌ ERROR:', e.message);
        return null;
    }
}

async function testFullReport(userId, employeeName) {
    console.log('\n' + '='.repeat(60));
    console.log(`TEST 2: REPORTE COMPLETO - ${employeeName}`);
    console.log('='.repeat(60));

    try {
        const result = await makeRequest(`/api/employee-360/${userId}/report`);

        if (!result.success) {
            console.log('❌ FALLO: Reporte no retorna success');
            console.log('   Error:', result.error || result.message);
            return null;
        }

        const data = result.data;
        console.log('✅ Reporte generado exitosamente\n');

        // ============================================
        // SECCIÓN 1: EMPLOYEE (Datos del empleado)
        // ============================================
        console.log('📋 SECCIÓN: EMPLOYEE (Datos básicos)');
        const empFields = [
            checkField(data, 'employee.id', 'ID'),
            checkField(data, 'employee.employee_id', 'Employee ID'),
            checkField(data, 'employee.first_name', 'Nombre'),
            checkField(data, 'employee.last_name', 'Apellido'),
            checkField(data, 'employee.email', 'Email'),
            checkField(data, 'employee.phone', 'Teléfono'),
            checkField(data, 'employee.role', 'Rol'),
            checkField(data, 'employee.department_id', 'Departamento ID'),
            checkField(data, 'employee.position', 'Posición'),
            checkField(data, 'employee.hire_date', 'Fecha contratación'),
            checkField(data, 'employee.is_active', 'Activo'),
        ];
        empFields.forEach(f => {
            const icon = f.exists ? '✅' : '⚠️';
            const val = f.exists ? (typeof f.value === 'object' ? JSON.stringify(f.value).substring(0,50) : f.value) : 'NO EXISTE';
            console.log(`   ${icon} ${f.label}: ${val}`);
        });

        // ============================================
        // SECCIÓN 2: SCORING
        // ============================================
        console.log('\n📊 SECCIÓN: SCORING');
        const scoringFields = [
            checkField(data, 'scoring.overall', 'Score General'),
            checkField(data, 'scoring.attendance', 'Score Asistencia'),
            checkField(data, 'scoring.punctuality', 'Score Puntualidad'),
            checkField(data, 'scoring.discipline', 'Score Disciplina'),
            checkField(data, 'scoring.training', 'Score Capacitación'),
            checkField(data, 'scoring.seniority', 'Score Antigüedad'),
        ];
        scoringFields.forEach(f => {
            const icon = f.exists ? '✅' : '⚠️';
            console.log(`   ${icon} ${f.label}: ${f.exists ? f.value : 'NO EXISTE'}`);
        });

        // ============================================
        // SECCIÓN 3: SECTIONS (Secciones del expediente)
        // ============================================
        console.log('\n📁 SECCIÓN: SECTIONS');

        // Asistencia
        const att = data.sections?.attendance || {};
        console.log('\n   📅 ATTENDANCE (Asistencia):');
        console.log(`      ✅ Total registros: ${att.totalRecords || 0}`);
        console.log(`      ✅ Días trabajados: ${att.daysWorked || 0}`);
        console.log(`      ✅ Llegadas tarde: ${att.lateArrivals || 0}`);
        console.log(`      ✅ Salidas tempranas: ${att.earlyDepartures || 0}`);
        console.log(`      ✅ Ausencias: ${att.absences || 0}`);
        console.log(`      ✅ Horas extras: ${att.overtimeHours || 0}`);
        console.log(`      ✅ Últimos registros: ${att.recentRecords?.length || 0}`);

        // Sanciones
        const sanc = data.sections?.sanctions || {};
        console.log('\n   ⚖️ SANCTIONS (Sanciones):');
        console.log(`      ✅ Total: ${sanc.total || 0}`);
        console.log(`      ✅ Activas: ${sanc.active || 0}`);
        console.log(`      ✅ Verbales: ${sanc.byType?.verbal || 0}`);
        console.log(`      ✅ Escritas: ${sanc.byType?.written || 0}`);
        console.log(`      ✅ Suspensiones: ${sanc.byType?.suspension || 0}`);
        console.log(`      ✅ Lista sanciones: ${sanc.list?.length || 0}`);

        // Capacitaciones
        const train = data.sections?.training || {};
        console.log('\n   🎓 TRAINING (Capacitaciones):');
        console.log(`      ✅ Total: ${train.total || 0}`);
        console.log(`      ✅ Completadas: ${train.completed || 0}`);
        console.log(`      ✅ En progreso: ${train.inProgress || 0}`);
        console.log(`      ✅ Certificaciones: ${train.certifications || 0}`);
        console.log(`      ✅ Lista capacitaciones: ${train.list?.length || 0}`);

        // Vacaciones
        const vac = data.sections?.vacations || {};
        console.log('\n   🏖️ VACATIONS (Vacaciones):');
        console.log(`      ✅ Días disponibles: ${vac.availableDays || 0}`);
        console.log(`      ✅ Días usados: ${vac.usedDays || 0}`);
        console.log(`      ✅ Días pendientes: ${vac.pendingDays || 0}`);
        console.log(`      ✅ Solicitudes: ${vac.requests?.length || 0}`);

        // Historial médico
        const med = data.sections?.medical || {};
        console.log('\n   🏥 MEDICAL (Historial médico):');
        console.log(`      ✅ Total licencias: ${med.totalLeaves || 0}`);
        console.log(`      ✅ Días totales: ${med.totalDays || 0}`);
        console.log(`      ✅ Licencias actuales: ${med.currentLeaves || 0}`);
        console.log(`      ✅ Lista licencias: ${med.leaves?.length || 0}`);

        // ============================================
        // SECCIÓN 4: TIMELINE
        // ============================================
        console.log('\n📜 SECCIÓN: TIMELINE');
        const timeline = data.timeline || [];
        console.log(`   ✅ Total eventos: ${timeline.length}`);
        if (timeline.length > 0) {
            console.log('   Últimos 5 eventos:');
            timeline.slice(0, 5).forEach((evt, i) => {
                console.log(`      ${i+1}. [${evt.type}] ${evt.description?.substring(0, 50) || 'Sin descripción'}`);
            });
        }

        // ============================================
        // SECCIÓN 5: AI ANALYSIS
        // ============================================
        console.log('\n🤖 SECCIÓN: AI ANALYSIS');
        const ai = data.aiAnalysis || {};
        console.log(`   ✅ Tiene análisis: ${ai.summary ? 'SÍ' : 'NO'}`);
        console.log(`   ✅ Fortalezas: ${ai.strengths?.length || 0}`);
        console.log(`   ✅ Áreas de mejora: ${ai.areasOfImprovement?.length || 0}`);
        console.log(`   ✅ Recomendaciones: ${ai.recommendations?.length || 0}`);

        // ============================================
        // SECCIÓN 6: BIOMETRIC ANALYSIS (NUEVO)
        // ============================================
        console.log('\n🧠 SECCIÓN: BIOMETRIC ANALYSIS (Enterprise)');
        const bio = data.biometricAnalysis || {};
        console.log(`   ✅ Módulo activo: ${bio.hasModule ? 'SÍ' : 'NO'}`);
        console.log(`   ✅ Historial emocional: ${bio.emotionalHistory?.length || 0} registros`);
        console.log(`   ✅ Correlaciones: ${bio.correlations?.length || 0}`);
        console.log(`   ✅ Eventos correlacionados: ${bio.correlatedEvents?.length || 0}`);
        console.log(`   ✅ Alertas: ${bio.alerts?.length || 0}`);
        if (bio.emotionalHistory?.length > 0) {
            console.log('   Muestra de emociones:');
            bio.emotionalHistory.slice(0, 3).forEach((em, i) => {
                console.log(`      ${i+1}. ${em.emotion || em.primary_emotion} - Conf: ${em.confidence || em.emotion_confidence}`);
            });
        }

        // ============================================
        // SECCIÓN 7: TASK COMPATIBILITY (NUEVO)
        // ============================================
        console.log('\n👥 SECCIÓN: TASK COMPATIBILITY (Enterprise)');
        const compat = data.taskCompatibility || {};
        console.log(`   ✅ Módulo activo: ${compat.hasModule ? 'SÍ' : 'NO'}`);
        console.log(`   ✅ Reemplazos posibles: ${compat.replacements?.length || 0}`);
        console.log(`   ✅ Puede reemplazar a: ${compat.canReplace?.length || 0}`);
        console.log(`   ✅ Sin reemplazo: ${compat.hasNoReplacement ? 'SÍ - ALERTA' : 'NO'}`);
        if (compat.alert) {
            console.log(`   ⚠️ Alerta: ${compat.alert}`);
        }
        if (compat.replacements?.length > 0) {
            console.log('   Reemplazos potenciales:');
            compat.replacements.slice(0, 3).forEach((rep, i) => {
                console.log(`      ${i+1}. ${rep.name || rep.full_name} - ${rep.compatibility_score || rep.score}%`);
            });
        }

        // ============================================
        // SECCIÓN 8: DOCUMENTS (Si existe)
        // ============================================
        console.log('\n📄 SECCIÓN: DOCUMENTS');
        const docs = data.documents || {};
        console.log(`   ✅ Contratos: ${docs.contracts?.length || 0}`);
        console.log(`   ✅ Certificados: ${docs.certificates?.length || 0}`);
        console.log(`   ✅ Docs médicos: ${docs.medicalDocuments?.length || 0}`);
        console.log(`   ✅ Licencia conducir: ${docs.driverLicense ? 'SÍ' : 'NO'}`);

        // ============================================
        // RESUMEN FINAL
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DEL REPORTE');
        console.log('='.repeat(60));

        const sections = {
            'Employee': !!data.employee,
            'Scoring': !!data.scoring,
            'Attendance': !!data.sections?.attendance,
            'Sanctions': !!data.sections?.sanctions,
            'Training': !!data.sections?.training,
            'Vacations': !!data.sections?.vacations,
            'Medical': !!data.sections?.medical,
            'Timeline': !!data.timeline,
            'AI Analysis': !!data.aiAnalysis,
            'Biometric': !!data.biometricAnalysis,
            'Compatibility': !!data.taskCompatibility,
            'Documents': !!data.documents,
        };

        let complete = 0;
        let missing = [];
        Object.entries(sections).forEach(([name, exists]) => {
            if (exists) complete++;
            else missing.push(name);
        });

        console.log(`\n✅ Secciones completas: ${complete}/${Object.keys(sections).length}`);
        if (missing.length > 0) {
            console.log(`⚠️ Secciones faltantes: ${missing.join(', ')}`);
        } else {
            console.log('🎉 TODAS LAS SECCIONES PRESENTES');
        }

        return data;

    } catch (e) {
        console.log('❌ ERROR:', e.message);
        return null;
    }
}

async function testSummary(userId) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: SUMMARY ENDPOINT');
    console.log('='.repeat(60));

    try {
        const result = await makeRequest(`/api/employee-360/${userId}/summary`);
        console.log(`✅ Summary: ${result.success ? 'OK' : 'FALLO'}`);
        if (result.data) {
            console.log(`   Score general: ${result.data.scoring?.overall || 'N/A'}`);
        }
    } catch (e) {
        console.log('❌ ERROR:', e.message);
    }
}

async function testScoring(userId) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: SCORING ENDPOINT');
    console.log('='.repeat(60));

    try {
        const result = await makeRequest(`/api/employee-360/${userId}/scoring`);
        console.log(`✅ Scoring: ${result.success ? 'OK' : 'FALLO'}`);
        if (result.data?.scoring) {
            const s = result.data.scoring;
            console.log(`   Overall: ${s.overall}, Attendance: ${s.attendance}, Punctuality: ${s.punctuality}`);
        }
    } catch (e) {
        console.log('❌ ERROR:', e.message);
    }
}

async function testTimeline(userId) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: TIMELINE ENDPOINT');
    console.log('='.repeat(60));

    try {
        const result = await makeRequest(`/api/employee-360/${userId}/timeline`);
        console.log(`✅ Timeline: ${result.success ? 'OK' : 'FALLO'}`);
        console.log(`   Eventos: ${result.data?.timeline?.length || 0}`);
    } catch (e) {
        console.log('❌ ERROR:', e.message);
    }
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     TEST EXHAUSTIVO - MÓDULO EMPLOYEE 360 v2.0.0          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Test 1: Dashboard
    const employees = await testDashboard();

    if (!employees || employees.length === 0) {
        console.log('\n❌ No hay empleados para testear');
        return;
    }

    // Test 2: Reporte completo del primer empleado
    const testEmployee = employees[0];
    await testFullReport(testEmployee.id, testEmployee.name);

    // Test 3-5: Otros endpoints
    await testSummary(testEmployee.id);
    await testScoring(testEmployee.id);
    await testTimeline(testEmployee.id);

    console.log('\n' + '═'.repeat(60));
    console.log('🏁 TESTS COMPLETADOS');
    console.log('═'.repeat(60));
}

main().catch(console.error);
