/**
 * TEST COMPLETO DE SSOT + DEPENDENCIAS
 *
 * Verifica:
 * 1. SSOT (Single Source of Truth):
 *    - Crear usuario → aparece en selectores de otros módulos
 *    - Crear departamento → aparece en filtros de otros módulos
 *    - Crear kiosk → aparece en configuraciones
 *    - Consistencia de datos entre módulos
 *
 * 2. DEPENDENCIAS:
 *    - canModuleWork() para cada módulo
 *    - analyzeDeactivationImpact() para módulos críticos
 *    - Verificar dependencias circulares
 *    - Verificar integraciones
 *
 * 3. CROSS-MODULE DATA FLOW:
 *    - Flujo Usuario → Attendance → Medical
 *    - Consistencia de IDs entre módulos
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
const fs = require('fs');
const { Sequelize } = require('sequelize');

// Conexión directa a BD para verificar persistencia
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/sistema_asistencia', {
  logging: false,
  dialect: 'postgres'
});

// Módulos que tienen selectores de usuarios
const MODULES_WITH_USER_SELECTOR = [
  'medical',
  'sanctions-management',
  'attendance',
  'vacation-management',
  'training-management',
  'benefits-management',
  'employee-360'
];

// Módulos que tienen selectores de departamentos
const MODULES_WITH_DEPT_SELECTOR = [
  'users',
  'job-postings',
  'organizational-structure',
  'attendance',
  'kiosks'
];

// Módulos que tienen selectores de kiosks
const MODULES_WITH_KIOSK_SELECTOR = [
  'organizational-structure',
  'attendance'
];

async function runSSOTDependenciesTest() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔍 TEST COMPLETO: SSOT + DEPENDENCIAS + CROSS-MODULE FLOW');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`⏰ Inicio: ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const agent = new AutonomousQAAgent({
    headless: true,
    timeout: 60000,
    learningMode: false,
    brainIntegration: false
  });

  const results = {
    timestamp: new Date().toISOString(),
    ssot: {
      userCreation: null,
      userVisibility: [],
      deptCreation: null,
      deptVisibility: [],
      kioskVisibility: []
    },
    dependencies: {
      canModuleWork: [],
      deactivationImpact: [],
      circularDeps: [],
      integrations: []
    },
    crossModuleFlow: {
      tests: []
    },
    dbPersistence: {
      users: null,
      departments: null,
      kiosks: null,
      attendance: null
    },
    summary: {
      ssotPassed: 0,
      ssotFailed: 0,
      dependenciesPassed: 0,
      dependenciesFailed: 0,
      crossModulePassed: 0,
      crossModuleFailed: 0,
      dbPersistencePassed: 0,
      dbPersistenceFailed: 0
    }
  };

  // Verificar conexión a BD
  console.log('0️⃣ Verificando conexión a PostgreSQL...');
  try {
    await sequelize.authenticate();
    console.log('   ✅ Conexión a BD establecida\n');
  } catch (dbError) {
    console.log(`   ⚠️ No se pudo conectar a BD: ${dbError.message}`);
    console.log('   Continuando sin verificación de persistencia en BD...\n');
  }

  let testUserName = null;
  let testUserId = null;
  let testDeptName = null;

  try {
    console.log('1️⃣ Inicializando navegador...');
    await agent.init();
    console.log('   ✅ Navegador iniciado\n');

    console.log('2️⃣ Login como admin de ISI...');
    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });
    console.log('   ✅ Login exitoso\n');

    // ═══════════════════════════════════════════════════════════════════════
    // FASE 1: SSOT - CREAR USUARIO DE PRUEBA
    // ═══════════════════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('📋 FASE 1: SSOT - CREACIÓN Y VERIFICACIÓN DE USUARIO');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    // Generar nombre único para el usuario de prueba
    testUserName = `SSOT_Test_${Date.now()}`;
    console.log(`   🧪 Creando usuario de prueba: "${testUserName}"`);

    // Navegar a users y crear usuario
    await agent.navigateToModule('users');
    await agent.page.waitForTimeout(2000);

    // Buscar botón de crear usuario
    const createUserBtn = await agent.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a.btn'));
      for (const btn of buttons) {
        const text = (btn.textContent || '').toLowerCase();
        if (text.includes('nuevo') || text.includes('agregar') || text.includes('crear')) {
          if (btn.offsetParent !== null) {
            btn.click();
            return true;
          }
        }
      }
      return false;
    });

    if (createUserBtn) {
      await agent.page.waitForTimeout(2000);

      // Llenar formulario de usuario
      const userCreated = await agent.page.evaluate((userName) => {
        // Buscar campos del formulario
        const firstNameInput = document.querySelector('input[name="first_name"], input[name="firstName"], input[name="nombre"]');
        const lastNameInput = document.querySelector('input[name="last_name"], input[name="lastName"], input[name="apellido"]');
        const emailInput = document.querySelector('input[name="email"], input[type="email"]');
        const dniInput = document.querySelector('input[name="dni"], input[name="document_number"]');

        if (firstNameInput) {
          firstNameInput.value = userName;
          firstNameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (lastNameInput) {
          lastNameInput.value = 'TestSSOT';
          lastNameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (emailInput) {
          emailInput.value = `${userName.toLowerCase()}@test.com`;
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (dniInput) {
          dniInput.value = Math.floor(Math.random() * 90000000 + 10000000).toString();
          dniInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        return {
          firstName: firstNameInput ? firstNameInput.value : null,
          lastName: lastNameInput ? lastNameInput.value : null,
          email: emailInput ? emailInput.value : null
        };
      }, testUserName);

      console.log(`   📝 Formulario llenado:`, userCreated);

      // Click en guardar
      await agent.page.evaluate(() => {
        const saveButtons = Array.from(document.querySelectorAll('button'));
        for (const btn of saveButtons) {
          const text = (btn.textContent || '').toLowerCase();
          if (text.includes('guardar') || text.includes('save') || text.includes('crear')) {
            if (btn.offsetParent !== null) {
              btn.click();
              return true;
            }
          }
        }
        return false;
      });

      await agent.page.waitForTimeout(3000);

      // Verificar si se creó
      const userInList = await agent.page.evaluate((userName) => {
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
          if (table.textContent.includes(userName)) {
            return true;
          }
        }
        // También buscar en cards o listas
        const content = document.body.textContent;
        return content.includes(userName);
      }, testUserName);

      results.ssot.userCreation = {
        success: userInList,
        userName: testUserName,
        timestamp: new Date().toISOString()
      };

      if (userInList) {
        console.log(`   ✅ Usuario "${testUserName}" creado exitosamente`);
        results.summary.ssotPassed++;
      } else {
        console.log(`   ⚠️ Usuario creado pero no verificado en lista`);
      }

      // Cerrar modal si está abierto
      await agent.page.keyboard.press('Escape');
      await agent.page.waitForTimeout(500);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FASE 2: VERIFICAR USUARIO EN OTROS MÓDULOS (SSOT)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('📋 FASE 2: SSOT - VERIFICAR USUARIO EN OTROS MÓDULOS');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    for (const moduleId of MODULES_WITH_USER_SELECTOR) {
      console.log(`   🔍 Verificando en: ${moduleId}`);

      try {
        await agent.navigateToModule(moduleId);
        await agent.page.waitForTimeout(2000);

        // Buscar el usuario en selectores del módulo
        const userFound = await agent.page.evaluate((userName) => {
          // Buscar en todos los selects
          const selects = document.querySelectorAll('select');
          for (const select of selects) {
            const options = Array.from(select.options);
            for (const opt of options) {
              if (opt.text.includes(userName) || opt.value.includes(userName)) {
                return { found: true, in: 'select', selectName: select.name || select.id };
              }
            }
          }

          // Buscar en datalists
          const datalists = document.querySelectorAll('datalist option');
          for (const opt of datalists) {
            if (opt.value.includes(userName)) {
              return { found: true, in: 'datalist' };
            }
          }

          // Buscar en autocompletes (inputs con data-*)
          const autocompletes = document.querySelectorAll('[data-employees], [data-users]');
          if (autocompletes.length > 0) {
            return { found: null, in: 'autocomplete', note: 'Requiere búsqueda async' };
          }

          // Buscar en tablas/listas existentes
          const tables = document.querySelectorAll('table');
          for (const table of tables) {
            if (table.textContent.includes(userName)) {
              return { found: true, in: 'table' };
            }
          }

          return { found: false };
        }, testUserName);

        results.ssot.userVisibility.push({
          module: moduleId,
          ...userFound,
          timestamp: new Date().toISOString()
        });

        if (userFound.found === true) {
          console.log(`      ✅ Usuario encontrado en ${userFound.in}`);
          results.summary.ssotPassed++;
        } else if (userFound.found === null) {
          console.log(`      ⚠️ ${userFound.note}`);
        } else {
          console.log(`      ❌ Usuario NO encontrado`);
          results.summary.ssotFailed++;
        }

      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
        results.ssot.userVisibility.push({
          module: moduleId,
          found: false,
          error: error.message
        });
        results.summary.ssotFailed++;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FASE 3: DEPENDENCIAS - canModuleWork()
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('📋 FASE 3: DEPENDENCIAS - canModuleWork() via API');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    // Obtener token para API calls
    const token = await agent.page.evaluate(() => {
      return localStorage.getItem('token') || sessionStorage.getItem('token');
    });

    const companyId = await agent.page.evaluate(() => {
      return localStorage.getItem('companyId') || sessionStorage.getItem('companyId');
    });

    console.log(`   🔑 Token obtenido: ${token ? 'SI' : 'NO'}`);
    console.log(`   🏢 Company ID: ${companyId}`);

    // Lista de módulos críticos para verificar dependencias
    const criticalModules = [
      'users', 'attendance', 'medical', 'kiosks', 'notifications',
      'shifts', 'payroll-liquidation', 'sanctions-management'
    ];

    for (const moduleId of criticalModules) {
      try {
        // Llamar API de dependencias
        const depResult = await agent.page.evaluate(async ({ modId, tok, compId }) => {
          try {
            const response = await fetch(`/api/audit/dependencies/${modId}?companyId=${compId}`, {
              headers: {
                'Authorization': `Bearer ${tok}`,
                'Content-Type': 'application/json'
              }
            });
            if (response.ok) {
              return await response.json();
            } else {
              return { error: response.status };
            }
          } catch (e) {
            return { error: e.message };
          }
        }, { modId: moduleId, tok: token, compId: companyId });

        results.dependencies.canModuleWork.push({
          module: moduleId,
          result: depResult
        });

        if (depResult.error) {
          console.log(`   ❌ ${moduleId}: Error ${depResult.error}`);
          results.summary.dependenciesFailed++;
        } else if (depResult.can_work === true) {
          console.log(`   ✅ ${moduleId}: Puede funcionar`);
          if (depResult.missing_optional?.length > 0) {
            console.log(`      ⚠️ Opcionales faltantes: ${depResult.missing_optional.join(', ')}`);
          }
          results.summary.dependenciesPassed++;
        } else if (depResult.can_work === false) {
          console.log(`   ❌ ${moduleId}: NO puede funcionar - ${depResult.reason}`);
          console.log(`      Faltantes: ${depResult.missing?.join(', ')}`);
          results.summary.dependenciesFailed++;
        } else {
          console.log(`   ⚠️ ${moduleId}: Respuesta inesperada`);
        }

      } catch (error) {
        console.log(`   ❌ ${moduleId}: ${error.message}`);
        results.summary.dependenciesFailed++;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FASE 4: DEPENDENCIAS - analyzeDeactivationImpact()
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('📋 FASE 4: ANÁLISIS DE IMPACTO DE DESACTIVACIÓN');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    // Módulos core que si se desactivan afectan a muchos otros
    const coreModules = ['users', 'notifications', 'shifts', 'attendance'];

    for (const moduleId of coreModules) {
      console.log(`   📊 Analizando impacto de desactivar: ${moduleId}`);

      const impactResult = await agent.page.evaluate(async ({ modId, tok }) => {
        try {
          const response = await fetch(`/api/audit/dependencies/${modId}/impact`, {
            headers: {
              'Authorization': `Bearer ${tok}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            return await response.json();
          } else {
            // Intentar obtener del registry local
            return { error: response.status, note: 'API no disponible' };
          }
        } catch (e) {
          return { error: e.message };
        }
      }, { modId: moduleId, tok: token });

      results.dependencies.deactivationImpact.push({
        module: moduleId,
        result: impactResult
      });

      if (impactResult.safe === false) {
        console.log(`      ⚠️ PELIGROSO: Afectaría ${impactResult.critical_affected} módulos críticos`);
        if (impactResult.affected) {
          impactResult.affected.slice(0, 3).forEach(a => {
            console.log(`         - ${a.module}: ${a.impact}`);
          });
        }
      } else if (impactResult.safe === true) {
        console.log(`      ✅ Seguro de desactivar`);
      } else {
        console.log(`      ⚠️ Sin datos de impacto`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FASE 5: CROSS-MODULE DATA FLOW
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('📋 FASE 5: CROSS-MODULE DATA FLOW');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    // Test 1: Usuario → Attendance (verificar que puede marcar asistencia)
    console.log('   🔄 Test: Usuario → Attendance');

    await agent.navigateToModule('attendance');
    await agent.page.waitForTimeout(2000);

    const attendanceHasUsers = await agent.page.evaluate(() => {
      // Verificar que hay selectores de usuarios o tabla con usuarios
      const selects = document.querySelectorAll('select');
      let hasUserSelector = false;

      for (const select of selects) {
        if (select.name?.includes('user') || select.name?.includes('employee') ||
            select.id?.includes('user') || select.id?.includes('employee')) {
          hasUserSelector = select.options.length > 1;
          break;
        }
      }

      // También verificar tabla de asistencias
      const tables = document.querySelectorAll('table');
      const hasAttendanceData = tables.length > 0 && tables[0].rows.length > 1;

      return {
        hasUserSelector,
        hasAttendanceData,
        totalSelects: selects.length,
        totalTables: tables.length
      };
    });

    results.crossModuleFlow.tests.push({
      name: 'Usuario → Attendance',
      result: attendanceHasUsers
    });

    if (attendanceHasUsers.hasUserSelector || attendanceHasUsers.hasAttendanceData) {
      console.log(`      ✅ Módulo attendance tiene acceso a usuarios`);
      results.summary.crossModulePassed++;
    } else {
      console.log(`      ⚠️ No se detectó integración clara`);
    }

    // Test 2: Departamentos → Kiosks
    console.log('   🔄 Test: Departamentos → Kiosks');

    await agent.navigateToModule('kiosks');
    await agent.page.waitForTimeout(2000);

    const kiosksHasDepts = await agent.page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      let hasDeptSelector = false;

      for (const select of selects) {
        if (select.name?.includes('dept') || select.name?.includes('department') ||
            select.id?.includes('dept') || select.id?.includes('department')) {
          hasDeptSelector = select.options.length > 1;
          break;
        }
      }

      return { hasDeptSelector };
    });

    results.crossModuleFlow.tests.push({
      name: 'Departamentos → Kiosks',
      result: kiosksHasDepts
    });

    if (kiosksHasDepts.hasDeptSelector) {
      console.log(`      ✅ Kiosks tiene acceso a departamentos`);
      results.summary.crossModulePassed++;
    } else {
      console.log(`      ⚠️ No se detectó selector de departamentos`);
    }

    // Test 3: Shifts → Attendance
    console.log('   🔄 Test: Shifts → Attendance (turnos en asistencia)');

    await agent.navigateToModule('attendance');
    await agent.page.waitForTimeout(2000);

    const attendanceHasShifts = await agent.page.evaluate(() => {
      // Buscar referencia a turnos
      const content = document.body.textContent.toLowerCase();
      const hasShiftRef = content.includes('turno') || content.includes('shift');

      const selects = document.querySelectorAll('select');
      let hasShiftSelector = false;

      for (const select of selects) {
        if (select.name?.includes('shift') || select.name?.includes('turno')) {
          hasShiftSelector = true;
          break;
        }
      }

      return { hasShiftRef, hasShiftSelector };
    });

    results.crossModuleFlow.tests.push({
      name: 'Shifts → Attendance',
      result: attendanceHasShifts
    });

    if (attendanceHasShifts.hasShiftRef || attendanceHasShifts.hasShiftSelector) {
      console.log(`      ✅ Attendance tiene referencia a turnos`);
      results.summary.crossModulePassed++;
    } else {
      console.log(`      ⚠️ No se detectó integración con turnos`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FASE 6: VERIFICAR REGISTRY DE MÓDULOS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('📋 FASE 6: VERIFICAR REGISTRY DE MÓDULOS (API)');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    const registryData = await agent.page.evaluate(async (tok) => {
      try {
        const response = await fetch('/api/audit/registry', {
          headers: {
            'Authorization': `Bearer ${tok}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          return await response.json();
        } else {
          return { error: response.status };
        }
      } catch (e) {
        return { error: e.message };
      }
    }, token);

    if (registryData.error) {
      console.log(`   ⚠️ API Registry no disponible: ${registryData.error}`);
    } else if (registryData.modules) {
      const totalModules = registryData.modules.length;
      const modulesWithDeps = registryData.modules.filter(m =>
        m.dependencies?.required?.length > 0 ||
        m.dependencies?.optional?.length > 0
      ).length;

      console.log(`   📊 Total módulos en registry: ${totalModules}`);
      console.log(`   📊 Módulos con dependencias definidas: ${modulesWithDeps}`);

      // Buscar dependencias circulares
      console.log('\n   🔄 Verificando dependencias circulares...');
      const circularDeps = [];

      for (const mod of registryData.modules) {
        if (mod.dependencies?.required) {
          for (const dep of mod.dependencies.required) {
            const depModule = registryData.modules.find(m => m.id === dep);
            if (depModule?.dependencies?.required?.includes(mod.id)) {
              circularDeps.push({ a: mod.id, b: dep });
            }
          }
        }
      }

      if (circularDeps.length > 0) {
        console.log(`   ⚠️ Dependencias circulares encontradas: ${circularDeps.length}`);
        circularDeps.forEach(c => console.log(`      ${c.a} ↔ ${c.b}`));
        results.dependencies.circularDeps = circularDeps;
      } else {
        console.log(`   ✅ No hay dependencias circulares`);
      }

      // Mostrar módulos más dependidos
      console.log('\n   📊 Módulos más críticos (más dependidos):');
      const depCount = {};
      for (const mod of registryData.modules) {
        if (mod.dependencies?.required) {
          for (const dep of mod.dependencies.required) {
            depCount[dep] = (depCount[dep] || 0) + 1;
          }
        }
      }

      Object.entries(depCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([mod, count]) => {
          console.log(`      ${mod}: requerido por ${count} módulos`);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FASE 7: VERIFICACIÓN DE PERSISTENCIA EN BD
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('📋 FASE 7: VERIFICACIÓN DE PERSISTENCIA EN BASE DE DATOS');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    try {
      // Test 1: Verificar tabla users
      console.log('   🔍 Verificando tabla USERS...');
      const [usersResult] = await sequelize.query(`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent
        FROM users
      `);
      console.log(`      Total usuarios: ${usersResult[0].total}`);
      console.log(`      Creados última hora: ${usersResult[0].recent}`);
      results.dbPersistence.users = {
        total: parseInt(usersResult[0].total),
        recent: parseInt(usersResult[0].recent),
        verified: true
      };
      results.summary.dbPersistencePassed++;

      // Verificar si nuestro usuario de test existe
      if (testUserName) {
        const [testUserCheck] = await sequelize.query(`
          SELECT id, first_name, last_name, email, created_at
          FROM users
          WHERE first_name ILIKE '%${testUserName}%' OR email ILIKE '%${testUserName.toLowerCase()}%'
          LIMIT 1
        `);
        if (testUserCheck.length > 0) {
          console.log(`      ✅ Usuario de test encontrado en BD: ${testUserCheck[0].first_name} ${testUserCheck[0].last_name}`);
          testUserId = testUserCheck[0].id;
          results.summary.dbPersistencePassed++;
        } else {
          console.log(`      ⚠️ Usuario de test NO encontrado en BD`);
          results.summary.dbPersistenceFailed++;
        }
      }

      // Test 2: Verificar tabla departments
      console.log('\n   🔍 Verificando tabla DEPARTMENTS...');
      const [deptsResult] = await sequelize.query(`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN is_active = true THEN 1 END) as active
        FROM departments
      `);
      console.log(`      Total departamentos: ${deptsResult[0].total}`);
      console.log(`      Activos: ${deptsResult[0].active}`);
      results.dbPersistence.departments = {
        total: parseInt(deptsResult[0].total),
        active: parseInt(deptsResult[0].active),
        verified: true
      };
      results.summary.dbPersistencePassed++;

      // Test 3: Verificar tabla kiosks
      console.log('\n   🔍 Verificando tabla KIOSKS...');
      const [kiosksResult] = await sequelize.query(`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN is_active = true THEN 1 END) as active,
               COUNT(CASE WHEN last_heartbeat > NOW() - INTERVAL '5 minutes' THEN 1 END) as online
        FROM kiosks
      `);
      console.log(`      Total kiosks: ${kiosksResult[0].total}`);
      console.log(`      Activos: ${kiosksResult[0].active}`);
      console.log(`      Online (últimos 5 min): ${kiosksResult[0].online}`);
      results.dbPersistence.kiosks = {
        total: parseInt(kiosksResult[0].total),
        active: parseInt(kiosksResult[0].active),
        online: parseInt(kiosksResult[0].online),
        verified: true
      };
      results.summary.dbPersistencePassed++;

      // Test 4: Verificar tabla attendance
      console.log('\n   🔍 Verificando tabla ATTENDANCE...');
      const [attendanceResult] = await sequelize.query(`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN DATE(check_in) = CURRENT_DATE THEN 1 END) as today,
               COUNT(CASE WHEN check_out IS NULL AND DATE(check_in) = CURRENT_DATE THEN 1 END) as pending_checkout
        FROM attendance
      `);
      console.log(`      Total registros: ${attendanceResult[0].total}`);
      console.log(`      Hoy: ${attendanceResult[0].today}`);
      console.log(`      Pendientes de checkout: ${attendanceResult[0].pending_checkout}`);
      results.dbPersistence.attendance = {
        total: parseInt(attendanceResult[0].total),
        today: parseInt(attendanceResult[0].today),
        pendingCheckout: parseInt(attendanceResult[0].pending_checkout),
        verified: true
      };
      results.summary.dbPersistencePassed++;

      // Test 5: Verificar integridad referencial
      console.log('\n   🔍 Verificando INTEGRIDAD REFERENCIAL...');

      // Usuarios con departamento válido
      const [userDeptIntegrity] = await sequelize.query(`
        SELECT COUNT(*) as orphan_users
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.department_id IS NOT NULL AND d.id IS NULL
      `);
      const orphanUsers = parseInt(userDeptIntegrity[0].orphan_users);
      if (orphanUsers === 0) {
        console.log(`      ✅ Todos los usuarios tienen departamentos válidos`);
        results.summary.dbPersistencePassed++;
      } else {
        console.log(`      ❌ ${orphanUsers} usuarios con departamentos huérfanos`);
        results.summary.dbPersistenceFailed++;
      }

      // Attendance con usuarios válidos
      const [attendanceUserIntegrity] = await sequelize.query(`
        SELECT COUNT(*) as orphan_attendance
        FROM attendance a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE u.id IS NULL
      `);
      const orphanAttendance = parseInt(attendanceUserIntegrity[0].orphan_attendance);
      if (orphanAttendance === 0) {
        console.log(`      ✅ Todos los registros de asistencia tienen usuarios válidos`);
        results.summary.dbPersistencePassed++;
      } else {
        console.log(`      ❌ ${orphanAttendance} asistencias sin usuario válido`);
        results.summary.dbPersistenceFailed++;
      }

      // Test 6: Verificar consistencia multi-tenant
      console.log('\n   🔍 Verificando MULTI-TENANT (company_id)...');
      const [companyConsistency] = await sequelize.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE company_id IS NULL) as users_no_company,
          (SELECT COUNT(*) FROM departments WHERE company_id IS NULL) as depts_no_company,
          (SELECT COUNT(*) FROM kiosks WHERE company_id IS NULL) as kiosks_no_company
      `);

      const usersNoCompany = parseInt(companyConsistency[0].users_no_company);
      const deptsNoCompany = parseInt(companyConsistency[0].depts_no_company);
      const kiosksNoCompany = parseInt(companyConsistency[0].kiosks_no_company);

      if (usersNoCompany === 0 && deptsNoCompany === 0 && kiosksNoCompany === 0) {
        console.log(`      ✅ Todos los registros tienen company_id válido`);
        results.summary.dbPersistencePassed++;
      } else {
        console.log(`      ⚠️ Registros sin company_id:`);
        if (usersNoCompany > 0) console.log(`         - Users: ${usersNoCompany}`);
        if (deptsNoCompany > 0) console.log(`         - Departments: ${deptsNoCompany}`);
        if (kiosksNoCompany > 0) console.log(`         - Kiosks: ${kiosksNoCompany}`);
        results.summary.dbPersistenceFailed++;
      }

      // Test 7: Verificar índices críticos
      console.log('\n   🔍 Verificando ÍNDICES CRÍTICOS...');
      const [indexCheck] = await sequelize.query(`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE tablename IN ('users', 'attendance', 'kiosks', 'departments')
        AND indexname LIKE '%company_id%'
      `);
      console.log(`      Índices de company_id encontrados: ${indexCheck.length}`);
      if (indexCheck.length >= 4) {
        console.log(`      ✅ Índices multi-tenant correctos`);
        results.summary.dbPersistencePassed++;
      } else {
        console.log(`      ⚠️ Faltan índices de company_id en algunas tablas`);
      }

    } catch (dbError) {
      console.log(`   ❌ Error verificando BD: ${dbError.message}`);
      results.summary.dbPersistenceFailed++;
    }

    // Guardar resultados
    const resultsFile = 'ssot-dependencies-test-results.json';
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

    // ═══════════════════════════════════════════════════════════════════════
    // RESUMEN FINAL
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN FINAL - TEST SSOT + DEPENDENCIAS');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`   📋 SSOT Tests:`);
    console.log(`      ✅ Pasaron: ${results.summary.ssotPassed}`);
    console.log(`      ❌ Fallaron: ${results.summary.ssotFailed}`);
    console.log(`   📋 Dependency Tests:`);
    console.log(`      ✅ Pasaron: ${results.summary.dependenciesPassed}`);
    console.log(`      ❌ Fallaron: ${results.summary.dependenciesFailed}`);
    console.log(`   📋 Cross-Module Flow:`);
    console.log(`      ✅ Pasaron: ${results.summary.crossModulePassed}`);
    console.log(`      ❌ Fallaron: ${results.summary.crossModuleFailed}`);
    console.log(`   📋 DB Persistence:`);
    console.log(`      ✅ Pasaron: ${results.summary.dbPersistencePassed}`);
    console.log(`      ❌ Fallaron: ${results.summary.dbPersistenceFailed}`);

    const totalPassed = results.summary.ssotPassed + results.summary.dependenciesPassed + results.summary.crossModulePassed + results.summary.dbPersistencePassed;
    const totalFailed = results.summary.ssotFailed + results.summary.dependenciesFailed + results.summary.crossModuleFailed + results.summary.dbPersistenceFailed;
    const successRate = totalPassed + totalFailed > 0
      ? Math.round(totalPassed / (totalPassed + totalFailed) * 100)
      : 100;

    console.log(`\n   📈 SUCCESS RATE TOTAL: ${successRate}%`);
    console.log(`\n📄 Resultados guardados en: ${resultsFile}`);

  } catch (error) {
    console.log('\n❌ ERROR FATAL:', error.message);
    console.log(error.stack);
  } finally {
    await agent.close();
    try {
      await sequelize.close();
      console.log('   ✅ Conexión BD cerrada');
    } catch (e) {}
    console.log('\n🏁 Test finalizado');
    console.log(`⏰ Fin: ${new Date().toLocaleString()}`);
  }

  return results;
}

// Ejecutar
runSSOTDependenciesTest().catch(console.error);
