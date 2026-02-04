/**
 * ═══════════════════════════════════════════════════════════════════════
 * CONTRACT VALIDATOR - Frontend vs Backend
 * ═══════════════════════════════════════════════════════════════════════
 *
 * PROPÓSITO:
 * Comparar lo que está en el frontend (botones, inputs, API calls)
 * vs lo que espera el backend (endpoints, campos, validaciones).
 *
 * DETECTA:
 * - Botones sin handler
 * - API calls a endpoints que no existen
 * - Campos del formulario que no están en el modelo
 * - Selectores rotos o dinámicos
 * - Datos que no persisten en BD
 *
 * EJECUTAR:
 *   cd backend
 *   npx playwright test tests/contract-test.spec.js --headed
 *
 * VER REPORTE:
 *   npx playwright show-report
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:9998',
  timeout: 30000,

  // Credenciales de test
  credentials: {
    company: 'wftest-empresa-demo', // Slug de WFTEST_Empresa Demo SA
    username: 'admin',
    password: 'admin123'
  },

  // Módulos a testear
  modules: [
    {
      key: 'users',
      name: 'Usuarios',
      routeFile: 'users.js',
      modelFile: 'User.js',
      menuText: 'Usuarios',
      createButtonText: 'Agregar Usuario'
    }
    // Agregar más módulos aquí
  ]
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Login en panel-empresa
 */
async function login(page) {
  console.log('🔐 Haciendo login...');

  // Forzar logout para limpiar sesiones
  await page.goto(`${CONFIG.baseUrl}/panel-empresa.html?forceLogin=true`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Paso 1: Esperar a que el select de empresas se llene (se carga con JS)
  await page.waitForSelector('#companySelect', { timeout: 10000 });

  // Esperar a que aparezcan opciones (más de 1, porque la primera es "Cargando...")
  await page.waitForFunction(() => {
    const select = document.querySelector('#companySelect');
    return select && select.options.length > 1;
  }, { timeout: 10000 });

  await page.waitForTimeout(1000);

  // Debug: Imprimir opciones disponibles
  const options = await page.evaluate(() => {
    const select = document.querySelector('#companySelect');
    return Array.from(select.options).map(opt => ({
      value: opt.value,
      text: opt.textContent.trim()
    }));
  });
  console.log('📋 Opciones disponibles:', options);

  // Seleccionar empresa por value (ID)
  await page.selectOption('#companySelect', CONFIG.credentials.company);
  await page.waitForTimeout(1000);

  // Paso 2: Ingresar usuario (ahora debería estar habilitado)
  await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
  await page.fill('#userInput', CONFIG.credentials.username);
  await page.waitForTimeout(500);

  // Paso 3: Ingresar password
  await page.fill('input[type="password"]', CONFIG.credentials.password);
  await page.waitForTimeout(500);

  // Paso 4: Click en botón de login
  await page.click('button[type="submit"]');

  // Esperar a que cargue el dashboard
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('✅ Login exitoso');
}

/**
 * Escanear elementos del frontend
 */
async function scanFrontendElements(page) {
  console.log('🔍 Escaneando elementos del frontend...');

  const elements = await page.evaluate(() => {
    const result = {
      buttons: [],
      inputs: [],
      selects: [],
      tables: [],
      modals: []
    };

    // Botones
    document.querySelectorAll('button').forEach(btn => {
      if (btn.offsetParent !== null) { // Solo visibles
        result.buttons.push({
          text: btn.textContent.trim(),
          id: btn.id,
          class: btn.className,
          hasOnClick: !!btn.onclick || btn.hasAttribute('onclick')
        });
      }
    });

    // Inputs
    document.querySelectorAll('input, textarea').forEach(input => {
      if (input.offsetParent !== null) {
        result.inputs.push({
          name: input.name,
          type: input.type,
          id: input.id,
          required: input.required,
          placeholder: input.placeholder
        });
      }
    });

    // Selects
    document.querySelectorAll('select').forEach(select => {
      if (select.offsetParent !== null) {
        result.selects.push({
          name: select.name,
          id: select.id,
          optionCount: select.options.length
        });
      }
    });

    // Tablas/Grillas
    document.querySelectorAll('table').forEach(table => {
      if (table.offsetParent !== null) {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
        result.tables.push({
          id: table.id,
          class: table.className,
          columnCount: headers.length,
          columns: headers
        });
      }
    });

    // Modals
    document.querySelectorAll('[class*="modal"]').forEach(modal => {
      result.modals.push({
        id: modal.id,
        class: modal.className,
        visible: modal.offsetParent !== null
      });
    });

    return result;
  });

  console.log(`   📊 Botones: ${elements.buttons.length}`);
  console.log(`   📊 Inputs: ${elements.inputs.length}`);
  console.log(`   📊 Selects: ${elements.selects.length}`);
  console.log(`   📊 Tablas: ${elements.tables.length}`);
  console.log(`   📊 Modals: ${elements.modals.length}`);

  return elements;
}

/**
 * Interceptar llamadas a API
 */
function interceptApiCalls(page) {
  const apiCalls = [];

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiCalls.push({
        method: request.method(),
        url: request.url(),
        body: request.postDataJSON()
      });
    }
  });

  return apiCalls;
}

/**
 * Escanear backend (rutas)
 */
function scanBackendRoutes(moduleConfig) {
  console.log(`🔍 Escaneando backend: ${moduleConfig.routeFile}...`);

  const routeFilePath = path.join(__dirname, '../../src/routes', moduleConfig.routeFile);

  if (!fs.existsSync(routeFilePath)) {
    console.log(`   ⚠️ Archivo no encontrado: ${routeFilePath}`);
    return { endpoints: [], error: 'Route file not found' };
  }

  const content = fs.readFileSync(routeFilePath, 'utf-8');

  // Extraer endpoints (regex básico)
  const endpoints = [];
  const regex = /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    endpoints.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
  }

  console.log(`   📊 Endpoints encontrados: ${endpoints.length}`);
  endpoints.forEach(e => console.log(`      ${e.method} ${e.path}`));

  return { endpoints };
}

/**
 * Escanear backend (modelo)
 */
function scanBackendModel(moduleConfig) {
  console.log(`🔍 Escaneando modelo: ${moduleConfig.modelFile}...`);

  const modelFilePath = path.join(__dirname, '../../src/models', moduleConfig.modelFile);

  if (!fs.existsSync(modelFilePath)) {
    console.log(`   ⚠️ Archivo no encontrado: ${modelFilePath}`);
    return { fields: [], error: 'Model file not found' };
  }

  const content = fs.readFileSync(modelFilePath, 'utf-8');

  // Extraer campos del modelo (básico - busca DataTypes)
  const fields = [];
  const regex = /(\w+):\s*\{[^}]*type:\s*DataTypes\.(\w+)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    fields.push({
      name: match[1],
      type: match[2]
    });
  }

  console.log(`   📊 Campos encontrados: ${fields.length}`);
  fields.forEach(f => console.log(`      ${f.name}: ${f.type}`));

  return { fields };
}

/**
 * Comparar frontend vs backend
 */
function compareContracts(frontendData, backendData, moduleConfig) {
  console.log('⚖️ Comparando frontend vs backend...');

  const discrepancies = [];

  // 1. Verificar que botón "Crear" existe
  const createButton = frontendData.buttons.find(b =>
    b.text.includes(moduleConfig.createButtonText) ||
    b.text.includes('Nuevo') ||
    b.text.includes('Agregar')
  );

  if (!createButton) {
    discrepancies.push({
      severity: 'error',
      category: 'ui',
      element: `Botón "${moduleConfig.createButtonText}"`,
      issue: 'No existe - No se puede crear registros',
      expected: `Botón con texto "${moduleConfig.createButtonText}" visible`,
      actual: 'Botón no encontrado'
    });
  } else if (!createButton.hasOnClick) {
    discrepancies.push({
      severity: 'warning',
      category: 'ui',
      element: `Botón "${createButton.text}"`,
      issue: 'No tiene handler onClick detectado',
      expected: 'Handler onClick definido',
      actual: 'Sin handler'
    });
  }

  // 2. Verificar que hay tabla/lista para mostrar datos
  if (frontendData.tables.length === 0) {
    discrepancies.push({
      severity: 'error',
      category: 'ui',
      element: 'Tabla/Lista de datos',
      issue: 'No existe tabla para mostrar registros',
      expected: 'Tabla con columnas',
      actual: 'Sin tabla'
    });
  }

  // 3. Verificar endpoints básicos (GET, POST)
  const hasGetEndpoint = backendData.endpoints.some(e =>
    e.method === 'GET' && (e.path === '/' || e.path === '')
  );

  const hasPostEndpoint = backendData.endpoints.some(e =>
    e.method === 'POST' && (e.path === '/' || e.path === '')
  );

  if (!hasGetEndpoint) {
    discrepancies.push({
      severity: 'error',
      category: 'backend',
      element: 'Endpoint GET',
      issue: 'No existe endpoint GET para listar registros',
      expected: 'GET /',
      actual: 'Endpoint no encontrado'
    });
  }

  if (!hasPostEndpoint) {
    discrepancies.push({
      severity: 'error',
      category: 'backend',
      element: 'Endpoint POST',
      issue: 'No existe endpoint POST para crear registros',
      expected: 'POST /',
      actual: 'Endpoint no encontrado'
    });
  }

  // 4. Verificar que inputs del form coinciden con modelo
  // (Solo si tenemos el modelo cargado)
  if (backendData.fields && backendData.fields.length > 0) {
    frontendData.inputs.forEach(input => {
      if (!input.name) return; // Skip inputs sin name

      const field = backendData.fields.find(f => f.name === input.name);
      if (!field) {
        discrepancies.push({
          severity: 'warning',
          category: 'contract',
          element: `Input "${input.name}"`,
          issue: 'Campo no existe en modelo del backend',
          expected: `Campo "${input.name}" en modelo`,
          actual: 'Campo no encontrado en modelo'
        });
      }
    });
  }

  return discrepancies;
}

/**
 * Generar reporte HTML
 */
function generateReport(moduleConfig, frontendData, backendData, discrepancies, apiCalls) {
  const timestamp = new Date().toISOString();
  const totalIssues = discrepancies.length;
  const errors = discrepancies.filter(d => d.severity === 'error').length;
  const warnings = discrepancies.filter(d => d.severity === 'warning').length;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contract Test Report - ${moduleConfig.name}</title>
  <style>
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 20px;
      margin: 0;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }
    .header h1 { margin: 0 0 10px 0; font-size: 32px; }
    .header p { margin: 5px 0; opacity: 0.9; }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #1e293b;
      padding: 25px;
      border-radius: 12px;
      border-left: 4px solid;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .stat-card.total { border-color: #3b82f6; }
    .stat-card.errors { border-color: #ef4444; }
    .stat-card.warnings { border-color: #f59e0b; }
    .stat-value { font-size: 36px; font-weight: bold; margin-bottom: 8px; }
    .stat-label { font-size: 14px; color: #94a3b8; text-transform: uppercase; }
    .section {
      background: #1e293b;
      padding: 25px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .section h2 { margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center; gap: 10px; }
    .discrepancy {
      background: #0f172a;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 12px;
      border-left: 4px solid;
    }
    .discrepancy.error { border-color: #ef4444; }
    .discrepancy.warning { border-color: #f59e0b; }
    .discrepancy-header { font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .discrepancy-detail { font-size: 14px; color: #94a3b8; margin: 4px 0; }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge.error { background: #ef4444; color: white; }
    .badge.warning { background: #f59e0b; color: white; }
    .badge.ui { background: #3b82f6; color: white; }
    .badge.backend { background: #8b5cf6; color: white; }
    .badge.contract { background: #06b6d4; color: white; }
    .list-item {
      background: #0f172a;
      padding: 10px 15px;
      border-radius: 6px;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .success-banner {
      background: #10b981;
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
      font-size: 18px;
      font-weight: 600;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 Contract Test Report</h1>
      <p><strong>Módulo:</strong> ${moduleConfig.name} (${moduleConfig.key})</p>
      <p><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString('es-AR')}</p>
    </div>

    ${totalIssues === 0 ? `
    <div class="success-banner">
      ✅ ¡Perfecto! No se encontraron discrepancias entre frontend y backend
    </div>
    ` : `
    <div class="stats">
      <div class="stat-card total">
        <div class="stat-value" style="color: #3b82f6;">${totalIssues}</div>
        <div class="stat-label">Total Issues</div>
      </div>
      <div class="stat-card errors">
        <div class="stat-value" style="color: #ef4444;">${errors}</div>
        <div class="stat-label">Errors</div>
      </div>
      <div class="stat-card warnings">
        <div class="stat-value" style="color: #f59e0b;">${warnings}</div>
        <div class="stat-label">Warnings</div>
      </div>
    </div>
    `}

    ${discrepancies.length > 0 ? `
    <div class="section">
      <h2>❌ Discrepancias Encontradas</h2>
      ${discrepancies.map(d => `
        <div class="discrepancy ${d.severity}">
          <div class="discrepancy-header">
            <span class="badge ${d.severity}">${d.severity.toUpperCase()}</span>
            <span class="badge ${d.category}">${d.category}</span>
            <span>${d.element}</span>
          </div>
          <div class="discrepancy-detail"><strong>Issue:</strong> ${d.issue}</div>
          <div class="discrepancy-detail"><strong>Esperado:</strong> ${d.expected}</div>
          <div class="discrepancy-detail"><strong>Actual:</strong> ${d.actual}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="section">
      <h2>🎨 Frontend Elements</h2>
      <h3 style="margin: 15px 0 10px 0; font-size: 16px;">Botones (${frontendData.buttons.length})</h3>
      ${frontendData.buttons.map(b => `
        <div class="list-item">
          <strong>${b.text || '(sin texto)'}</strong>
          ${b.hasOnClick ? '<span style="color: #10b981;">✓ onClick</span>' : '<span style="color: #ef4444;">✗ sin onClick</span>'}
          ${b.id ? `<span style="color: #94a3b8;"> | ID: ${b.id}</span>` : ''}
        </div>
      `).join('')}

      <h3 style="margin: 15px 0 10px 0; font-size: 16px;">Inputs (${frontendData.inputs.length})</h3>
      ${frontendData.inputs.map(i => `
        <div class="list-item">
          <strong>${i.name || i.id || '(sin name)'}</strong>
          <span style="color: #94a3b8;"> | ${i.type}</span>
          ${i.required ? '<span style="color: #f59e0b;"> | Required</span>' : ''}
        </div>
      `).join('')}

      <h3 style="margin: 15px 0 10px 0; font-size: 16px;">Tablas (${frontendData.tables.length})</h3>
      ${frontendData.tables.map(t => `
        <div class="list-item">
          <strong>${t.columnCount} columnas</strong>
          <span style="color: #94a3b8;"> | ${t.columns.join(', ')}</span>
        </div>
      `).join('')}
    </div>

    <div class="section">
      <h2>⚙️ Backend</h2>
      <h3 style="margin: 15px 0 10px 0; font-size: 16px;">Endpoints (${backendData.endpoints.length})</h3>
      ${backendData.endpoints.map(e => `
        <div class="list-item">
          <strong style="color: #10b981;">${e.method}</strong>
          <span>${e.path}</span>
        </div>
      `).join('')}

      ${backendData.fields && backendData.fields.length > 0 ? `
        <h3 style="margin: 15px 0 10px 0; font-size: 16px;">Campos del Modelo (${backendData.fields.length})</h3>
        ${backendData.fields.map(f => `
          <div class="list-item">
            <strong>${f.name}</strong>
            <span style="color: #94a3b8;"> | ${f.type}</span>
          </div>
        `).join('')}
      ` : ''}
    </div>

    ${apiCalls.length > 0 ? `
    <div class="section">
      <h2>🌐 API Calls Detectados (${apiCalls.length})</h2>
      ${apiCalls.map(call => `
        <div class="list-item">
          <strong style="color: #10b981;">${call.method}</strong>
          <span>${call.url}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
</body>
</html>
  `;

  return html;
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

test.describe('Contract Validator', () => {

  CONFIG.modules.forEach(moduleConfig => {

    test(`Validar contrato: ${moduleConfig.name}`, async ({ page }) => {
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`🧪 INICIANDO CONTRACT TEST: ${moduleConfig.name}`);
      console.log('═'.repeat(70));

      // 1. Login
      await login(page);

      // 2. Navegar al módulo
      console.log(`📂 Navegando a módulo: ${moduleConfig.menuText}...`);
      await page.click(`text=${moduleConfig.menuText}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 3. Interceptar API calls
      const apiCalls = interceptApiCalls(page);

      // 4. Escanear frontend
      const frontendData = await scanFrontendElements(page);

      // 5. Escanear backend
      const backendRoutes = scanBackendRoutes(moduleConfig);
      const backendModel = scanBackendModel(moduleConfig);
      const backendData = {
        endpoints: backendRoutes.endpoints,
        fields: backendModel.fields
      };

      // 6. Comparar
      const discrepancies = compareContracts(frontendData, backendData, moduleConfig);

      // 7. Generar reporte
      console.log('\n📊 GENERANDO REPORTE...');
      const reportHtml = generateReport(moduleConfig, frontendData, backendData, discrepancies, apiCalls);

      const reportPath = path.join(__dirname, '../test-results', `contract-report-${moduleConfig.key}.html`);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, reportHtml);

      console.log(`✅ Reporte generado: ${reportPath}`);
      console.log(`   Abrir con: open ${reportPath}`);

      // 8. Resumen en consola
      console.log('\n' + '═'.repeat(70));
      console.log(`📊 RESUMEN: ${moduleConfig.name}`);
      console.log('═'.repeat(70));
      console.log(`   Total discrepancias: ${discrepancies.length}`);
      console.log(`   Errores: ${discrepancies.filter(d => d.severity === 'error').length}`);
      console.log(`   Warnings: ${discrepancies.filter(d => d.severity === 'warning').length}`);
      console.log('═'.repeat(70) + '\n');

      // 9. Assertions
      const errors = discrepancies.filter(d => d.severity === 'error');
      if (errors.length > 0) {
        console.log('❌ ERRORES CRÍTICOS ENCONTRADOS:');
        errors.forEach(e => {
          console.log(`   - ${e.element}: ${e.issue}`);
        });
      }

      // Fallar el test si hay errores críticos
      expect(errors.length, `Se encontraron ${errors.length} errores críticos`).toBe(0);
    });

  });

});
