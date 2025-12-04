const http = require('http');

// Login primero - campos correctos: identifier, password, companyId
const loginData = JSON.stringify({
    identifier: 'admin@isi.com',
    password: 'admin123',
    companyId: 11
});

const loginReq = http.request({
    hostname: 'localhost',
    port: 9998,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
    }
}, (loginRes) => {
    let loginBody = '';
    loginRes.on('data', c => loginBody += c);
    loginRes.on('end', () => {
        const login = JSON.parse(loginBody);
        if (!login.token) {
            console.log('Login failed:', loginBody);
            return;
        }

        const token = login.token;
        const userId = login.user.id;

        console.log('=== LOGIN OK ===');
        console.log('User ID:', userId);
        console.log('');

        // Ahora probar el reporte completo
        const reportReq = http.request({
            hostname: 'localhost',
            port: 9998,
            path: '/api/employee-360/' + userId + '/report',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }, (reportRes) => {
            let reportBody = '';
            reportRes.on('data', c => reportBody += c);
            reportRes.on('end', () => {
                const report = JSON.parse(reportBody);

                if (!report.success) {
                    console.log('ERROR:', report.message || report.error);
                    return;
                }

                const d = report.data;

                console.log('=== REPORTE EMPLOYEE 360 ===\n');

                // 1. Employee Basic Info
                console.log('--- 1. EMPLOYEE INFO ---');
                console.log('firstName:', d.employee?.firstName || 'MISSING');
                console.log('lastName:', d.employee?.lastName || 'MISSING');
                console.log('email:', d.employee?.email || 'MISSING');
                console.log('employeeId:', d.employee?.employeeId || 'MISSING');
                console.log('role:', d.employee?.role || 'MISSING');
                console.log('position:', d.employee?.position || 'MISSING');
                console.log('department:', d.employee?.department || 'MISSING');
                console.log('hireDate:', d.employee?.hireDate || 'MISSING');

                // 2. Scoring
                console.log('\n--- 2. SCORING ---');
                console.log('overall:', d.scoring?.overall);
                console.log('attendance:', d.scoring?.attendance);
                console.log('punctuality:', d.scoring?.punctuality);
                console.log('performance:', d.scoring?.performance);
                console.log('compliance:', d.scoring?.compliance);

                // 3. Sections Summary
                console.log('\n--- 3. SECTIONS ---');
                console.log('attendance records:', d.attendance?.total || d.attendance?.length || 0);
                console.log('sanctions:', d.sanctions?.total || d.sanctions?.length || 0);
                console.log('training:', d.training?.total || d.training?.length || 0);
                console.log('vacations:', d.vacations?.total || d.vacations?.length || 0);
                console.log('medical:', d.medical?.total || d.medical?.length || 0);

                // 4. Enterprise Features
                console.log('\n--- 4. ENTERPRISE FEATURES ---');
                console.log('biometricAnalysis.hasModule:', d.biometricAnalysis?.hasModule);
                if (d.biometricAnalysis?.hasModule !== false) {
                    console.log('  emotionalHistory:', d.biometricAnalysis?.emotionalHistory?.length || 0);
                    console.log('  correlations:', d.biometricAnalysis?.correlations?.length || 0);
                    console.log('  alerts:', d.biometricAnalysis?.alerts?.length || 0);
                }

                console.log('taskCompatibility.hasModule:', d.taskCompatibility?.hasModule);
                if (d.taskCompatibility?.hasModule !== false) {
                    console.log('  replacements:', d.taskCompatibility?.replacements?.length || 0);
                    console.log('  canReplace:', d.taskCompatibility?.canReplace?.length || 0);
                }

                // 5. AI Analysis
                console.log('\n--- 5. AI ANALYSIS ---');
                console.log('hasAI:', d.aiAnalysis ? 'YES' : 'NO');
                if (d.aiAnalysis) {
                    console.log('summary:', (d.aiAnalysis.summary || '').substring(0, 100) + '...');
                }

                // 6. Timeline
                console.log('\n--- 6. TIMELINE ---');
                console.log('events:', d.timeline?.length || 0);

                // 7. Documents
                console.log('\n--- 7. DOCUMENTS ---');
                console.log('documents:', d.documents?.length || 'NO SECTION');

                // Report completeness
                console.log('\n=== COMPLETENESS CHECK ===');
                let total = 10;
                let present = 0;
                if (d.employee) present++;
                if (d.scoring) present++;
                if (d.attendance !== undefined) present++;
                if (d.sanctions !== undefined) present++;
                if (d.training !== undefined) present++;
                if (d.vacations !== undefined) present++;
                if (d.medical !== undefined) present++;
                if (d.biometricAnalysis !== undefined) present++;
                if (d.taskCompatibility !== undefined) present++;
                if (d.timeline !== undefined) present++;

                console.log('Sections present: ' + present + '/' + total);
                console.log('Completeness: ' + Math.round(present/total*100) + '%');

                // RAW response for debugging
                console.log('\n=== RAW KEYS ===');
                console.log('Top-level keys:', Object.keys(d).join(', '));
            });
        });

        reportReq.on('error', (e) => console.log('Report error:', e.message));
        reportReq.end();
    });
});

loginReq.on('error', (e) => console.log('Login error:', e.message));
loginReq.write(loginData);
loginReq.end();
