/**
 * Script de prueba para el módulo Employee 360°
 */

const fetch = require('node-fetch');

async function testEmployee360() {
    const baseUrl = 'http://localhost:9998';

    console.log('🧪 Iniciando pruebas del módulo Employee 360°\n');

    // 1. Login para obtener token
    console.log('📝 Paso 1: Autenticación...');
    const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            identifier: 'admin@isi.com',
            password: 'admin123',
            companyId: 11  // ISI company ID
        })
    });

    const loginData = await loginResponse.json();

    if (!loginData.success && !loginData.token) {
        console.error('❌ Error en login:', loginData);
        return;
    }

    const token = loginData.token;
    console.log('✅ Login exitoso, token obtenido\n');

    // 2. Obtener dashboard para ver empleados
    console.log('📊 Paso 2: Obteniendo dashboard...');
    const dashboardResponse = await fetch(`${baseUrl}/api/employee-360/dashboard`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    const dashboardData = await dashboardResponse.json();
    console.log('Dashboard response:', JSON.stringify(dashboardData, null, 2).slice(0, 500), '...\n');

    if (!dashboardData.success || !dashboardData.data.employees.length) {
        console.log('⚠️  No hay empleados disponibles para probar\n');
        return;
    }

    // 3. Probar reporte 360° con un empleado
    const testEmployee = dashboardData.data.employees[0];
    console.log(`📊 Paso 3: Generando expediente 360° para ${testEmployee.name}...`);

    const reportResponse = await fetch(
        `${baseUrl}/api/employee-360/${testEmployee.id}/report?includeAI=false`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    const reportData = await reportResponse.json();

    if (reportData.success) {
        console.log('✅ Reporte 360° generado exitosamente!\n');
        console.log('📊 Resumen del expediente:');
        console.log('   Empleado:', reportData.data.employee.fullName);
        console.log('   Score Total:', reportData.data.scoring.total + '/100');
        console.log('   Grado:', reportData.data.scoring.grade.letter, '-', reportData.data.scoring.grade.label);
        console.log('\n📈 Scores por categoría:');
        Object.entries(reportData.data.scoring.categories).forEach(([key, value]) => {
            console.log(`   - ${value.label}: ${value.score}%`);
        });
        console.log('\n📅 Datos del período:');
        console.log('   Desde:', reportData.data.period.from);
        console.log('   Hasta:', reportData.data.period.to);
        console.log('\n📋 Secciones disponibles:');
        Object.keys(reportData.data.sections).forEach(section => {
            console.log(`   - ${section}`);
        });
        console.log('\n🎉 PRUEBA EXITOSA - El módulo Employee 360° funciona correctamente!');
    } else {
        console.log('❌ Error generando reporte:', reportData.error);
        if (reportData.details) {
            console.log('   Detalles:', reportData.details);
        }
    }
}

testEmployee360().catch(err => {
    console.error('❌ Error en prueba:', err.message);
    process.exit(1);
});
