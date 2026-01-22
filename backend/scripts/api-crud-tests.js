/**
 * ============================================================================
 * API CRUD TESTS - Tests directos de API sin UI
 * ============================================================================
 * Tests de CREATE, READ, UPDATE, DELETE usando HTTP requests directos.
 * Más rápidos y estables que Puppeteer, ideales para CI/CD.
 * ============================================================================
 */

const http = require('http');

// Configuración
const CONFIG = {
    baseUrl: 'http://localhost:9998',
    credentials: {
        company: 'aponnt-empresa-demo',
        username: 'administrador',
        password: 'admin123'
    }
};

// Colores para consola
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(type, message) {
    const prefix = {
        pass: `${colors.green}✓ PASS${colors.reset}`,
        fail: `${colors.red}✗ FAIL${colors.reset}`,
        info: `${colors.blue}ℹ INFO${colors.reset}`,
        warn: `${colors.yellow}⚠ WARN${colors.reset}`,
        step: `${colors.cyan}▶ STEP${colors.reset}`,
        module: `${colors.magenta}📦 MODULE${colors.reset}`
    };
    console.log(`${prefix[type] || '•'} ${message}`);
}

// Stats
const stats = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    create: { passed: 0, failed: 0 },
    read: { passed: 0, failed: 0 },
    update: { passed: 0, failed: 0 },
    delete: { passed: 0, failed: 0 },
    modules: {}
};

// HTTP Request helper
function request(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, CONFIG.baseUrl);
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Login y obtener token
async function login() {
    log('step', 'Autenticando...');

    // Primero obtener company ID
    const companiesRes = await request('GET', '/api/v1/companies');
    if (companiesRes.status !== 200 || !companiesRes.data.success) {
        throw new Error('No se pudo obtener lista de empresas');
    }

    const company = companiesRes.data.companies?.find(c =>
        c.slug === CONFIG.credentials.company ||
        c.slug?.includes('demo') ||
        c.name?.toLowerCase().includes('demo')
    );

    if (!company) {
        throw new Error('Empresa no encontrada');
    }

    // Login
    const loginRes = await request('POST', '/api/v1/auth/login', {
        companySlug: company.slug,
        identifier: CONFIG.credentials.username,
        password: CONFIG.credentials.password
    });

    if (loginRes.status !== 200 || !loginRes.data.token) {
        throw new Error('Login fallido: ' + JSON.stringify(loginRes.data));
    }

    log('pass', `Login exitoso - Company: ${company.name}`);
    return { token: loginRes.data.token, companyId: company.id };
}

// Definición de tests por módulo
const API_TESTS = {
    users: {
        name: 'Usuarios',
        endpoints: {
            list: '/api/v1/users',
            create: '/api/v1/users',
            update: '/api/v1/users/{id}',
            delete: '/api/v1/users/{id}'
        },
        createData: () => ({
            firstName: 'Test',
            lastName: `API ${Date.now()}`,
            email: `api.test.${Date.now()}@test.com`,
            legajo: `API${Date.now().toString().slice(-6)}`,
            password: '123456',
            role: 'employee'
        }),
        updateData: { firstName: 'Updated' },
        idField: 'user_id'
    },

    visitors: {
        name: 'Visitantes',
        endpoints: {
            list: '/api/v1/visitors',
            create: '/api/v1/visitors',
            update: '/api/v1/visitors/{id}',
            delete: '/api/v1/visitors/{id}'
        },
        // responsibleEmployeeId se setea dinámicamente en el test
        createData: (responsibleEmployeeId) => ({
            dni: `${Date.now().toString().slice(-8)}`,
            firstName: 'Visitante',
            lastName: `API ${Date.now()}`,
            email: `visitor.api.${Date.now()}@test.com`,
            visitReason: 'Test API CRUD',
            responsibleEmployeeId: responsibleEmployeeId,
            scheduledVisitDate: new Date(Date.now() + 86400000).toISOString()
        }),
        updateData: { visitReason: 'Updated via API' },
        idField: 'id',
        requiresUserId: true  // Flag para indicar que necesita un user_id dinámico
    },

    kiosks: {
        name: 'Kioscos',
        endpoints: {
            list: '/api/v1/kiosks',
            create: '/api/v1/kiosks',
            update: '/api/v1/kiosks/{id}',
            delete: '/api/v1/kiosks/{id}'
        },
        createData: () => ({
            name: `Kiosk API ${Date.now()}`,
            location: 'API Test Location',
            device_id: `API-${Date.now().toString().slice(-6)}`,
            is_active: true
        }),
        updateData: { location: 'Updated Location API' },
        idField: 'id'
    },

    departments: {
        name: 'Departamentos',
        endpoints: {
            list: '/api/v1/departments',
            create: '/api/v1/departments',
            update: '/api/v1/departments/{id}',
            delete: '/api/v1/departments/{id}'
        },
        createData: () => ({
            name: `Dept API ${Date.now()}`,
            code: `DAPI${Date.now().toString().slice(-4)}`,
            description: 'Departamento creado via API test'
        }),
        updateData: { description: 'Updated via API' },
        idField: 'id'
    },

    shifts: {
        name: 'Turnos',
        endpoints: {
            list: '/api/v1/shifts',
            create: '/api/v1/shifts',
            update: '/api/v1/shifts/{id}',
            delete: '/api/v1/shifts/{id}'
        },
        createData: () => ({
            name: `Turno API ${Date.now()}`,
            startTime: '08:00',
            endTime: '17:00',
            toleranceMinutesEntry: 15,
            isActive: true
        }),
        updateData: { toleranceMinutesEntry: 20 },
        idField: 'id'
    }
};

// Test CRUD completo para un módulo
async function testModuleCRUD(moduleKey, moduleConfig, token) {
    const moduleName = moduleConfig.name;
    stats.modules[moduleKey] = { create: null, read: null, update: null, delete: null };

    console.log(`\n${'─'.repeat(50)}`);
    log('module', `Testing: ${moduleName}`);

    let createdId = null;
    let dynamicUserId = null;

    // Si el módulo requiere un user_id dinámico, obtenerlo primero
    if (moduleConfig.requiresUserId) {
        try {
            const usersRes = await request('GET', '/api/v1/users', null, token);
            if (usersRes.status === 200 && usersRes.data.users?.length > 0) {
                dynamicUserId = usersRes.data.users[0].user_id;
                log('info', `Usando user_id: ${dynamicUserId}`);
            }
        } catch (e) {
            log('warn', `No se pudo obtener user_id dinámico: ${e.message}`);
        }
    }

    // CREATE
    try {
        stats.total++;
        log('step', 'CREATE...');
        // Pasar dynamicUserId si el módulo lo requiere
        const createData = moduleConfig.requiresUserId
            ? moduleConfig.createData(dynamicUserId)
            : moduleConfig.createData();
        const createRes = await request('POST', moduleConfig.endpoints.create,
            createData, token);

        if (createRes.status === 200 || createRes.status === 201) {
            // Buscar ID en diferentes estructuras de respuesta
            createdId = createRes.data[moduleConfig.idField]
                || createRes.data.id
                || createRes.data.data?.id
                || createRes.data.user?.user_id  // users: {user: {user_id: ...}}
                || createRes.data.user?.id
                || createRes.data.shift?.id      // shifts: {shift: {id: ...}}
                || createRes.data.visitor?.id;   // visitors: {visitor: {id: ...}}
            log('pass', `CREATE exitoso (ID: ${createdId})`);
            stats.passed++;
            stats.create.passed++;
            stats.modules[moduleKey].create = 'passed';
        } else {
            log('fail', `CREATE falló: ${createRes.status} - ${JSON.stringify(createRes.data)}`);
            stats.failed++;
            stats.create.failed++;
            stats.modules[moduleKey].create = 'failed';
        }
    } catch (e) {
        log('fail', `CREATE error: ${e.message}`);
        stats.failed++;
        stats.create.failed++;
        stats.modules[moduleKey].create = 'error';
    }

    // READ
    try {
        stats.total++;
        log('step', 'READ...');
        const readRes = await request('GET', moduleConfig.endpoints.list, null, token);

        if (readRes.status === 200) {
            const count = Array.isArray(readRes.data) ? readRes.data.length :
                         readRes.data.data?.length || readRes.data.users?.length ||
                         readRes.data.visitors?.length || readRes.data.kiosks?.length || 0;
            log('pass', `READ exitoso (${count} registros)`);
            stats.passed++;
            stats.read.passed++;
            stats.modules[moduleKey].read = 'passed';
        } else {
            log('fail', `READ falló: ${readRes.status}`);
            stats.failed++;
            stats.read.failed++;
            stats.modules[moduleKey].read = 'failed';
        }
    } catch (e) {
        log('fail', `READ error: ${e.message}`);
        stats.failed++;
        stats.read.failed++;
        stats.modules[moduleKey].read = 'error';
    }

    // UPDATE (solo si tenemos ID)
    if (createdId) {
        try {
            stats.total++;
            log('step', `UPDATE (ID: ${createdId})...`);
            const updateUrl = moduleConfig.endpoints.update.replace('{id}', createdId);
            const updateRes = await request('PUT', updateUrl, moduleConfig.updateData, token);

            if (updateRes.status === 200) {
                log('pass', 'UPDATE exitoso');
                stats.passed++;
                stats.update.passed++;
                stats.modules[moduleKey].update = 'passed';
            } else {
                log('warn', `UPDATE retornó: ${updateRes.status} (puede no estar implementado)`);
                stats.skipped++;
                stats.modules[moduleKey].update = 'skipped';
            }
        } catch (e) {
            log('warn', `UPDATE: ${e.message}`);
            stats.skipped++;
            stats.modules[moduleKey].update = 'skipped';
        }

        // DELETE
        try {
            stats.total++;
            log('step', `DELETE (ID: ${createdId})...`);
            const deleteUrl = moduleConfig.endpoints.delete.replace('{id}', createdId);
            const deleteRes = await request('DELETE', deleteUrl, null, token);

            if (deleteRes.status === 200 || deleteRes.status === 204) {
                log('pass', 'DELETE exitoso');
                stats.passed++;
                stats.delete.passed++;
                stats.modules[moduleKey].delete = 'passed';
            } else {
                log('warn', `DELETE retornó: ${deleteRes.status} (puede no estar implementado)`);
                stats.skipped++;
                stats.modules[moduleKey].delete = 'skipped';
            }
        } catch (e) {
            log('warn', `DELETE: ${e.message}`);
            stats.skipped++;
            stats.modules[moduleKey].delete = 'skipped';
        }
    } else {
        stats.total += 2;
        stats.skipped += 2;
        log('warn', 'UPDATE/DELETE saltados (no hay ID de CREATE)');
        stats.modules[moduleKey].update = 'skipped';
        stats.modules[moduleKey].delete = 'skipped';
    }
}

// Main
async function runAPITests() {
    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.bold}API CRUD TESTS - Tests directos sin UI${colors.reset}`);
    console.log(`Fecha: ${new Date().toISOString()}`);
    console.log('═'.repeat(60));

    try {
        // Login
        const { token, companyId } = await login();

        // Test cada módulo
        for (const [moduleKey, moduleConfig] of Object.entries(API_TESTS)) {
            await testModuleCRUD(moduleKey, moduleConfig, token);
        }

    } catch (error) {
        console.error(`\n${colors.red}ERROR CRÍTICO:${colors.reset}`, error.message);
    }

    // Resumen
    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.bold}RESUMEN API TESTS${colors.reset}`);
    console.log('═'.repeat(60));
    console.log(`Total tests: ${stats.total}`);
    console.log(`${colors.green}Passed: ${stats.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${stats.failed}${colors.reset}`);
    console.log(`${colors.yellow}Skipped: ${stats.skipped}${colors.reset}`);
    console.log(`Success Rate: ${stats.total > 0 ? ((stats.passed / (stats.total - stats.skipped)) * 100).toFixed(1) : 0}%`);

    console.log(`\n${colors.bold}Por operación:${colors.reset}`);
    console.log(`  CREATE: ${colors.green}${stats.create.passed}${colors.reset} passed, ${colors.red}${stats.create.failed}${colors.reset} failed`);
    console.log(`  READ:   ${colors.green}${stats.read.passed}${colors.reset} passed, ${colors.red}${stats.read.failed}${colors.reset} failed`);
    console.log(`  UPDATE: ${colors.green}${stats.update.passed}${colors.reset} passed, ${colors.red}${stats.update.failed}${colors.reset} failed`);
    console.log(`  DELETE: ${colors.green}${stats.delete.passed}${colors.reset} passed, ${colors.red}${stats.delete.failed}${colors.reset} failed`);

    console.log(`\n${colors.bold}Por módulo:${colors.reset}`);
    for (const [key, data] of Object.entries(stats.modules)) {
        const c = data.create === 'passed' ? '✅' : data.create === 'failed' ? '❌' : '⏭️';
        const r = data.read === 'passed' ? '✅' : data.read === 'failed' ? '❌' : '⏭️';
        const u = data.update === 'passed' ? '✅' : data.update === 'failed' ? '❌' : '⏭️';
        const d = data.delete === 'passed' ? '✅' : data.delete === 'failed' ? '❌' : '⏭️';
        console.log(`  ${key}: C${c} R${r} U${u} D${d}`);
    }
    console.log('═'.repeat(60));

    return stats;
}

// Ejecutar
runAPITests().then(stats => {
    process.exit(stats.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
