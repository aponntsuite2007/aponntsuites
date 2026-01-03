/**
 * ═══════════════════════════════════════════════════════════
 * AUTH HELPER - Sistema Unificado de Autenticación
 * ═══════════════════════════════════════════════════════════
 *
 * Funciones reutilizables para login, logout, gestión de tokens
 * Usadas por TODOS los tests E2E
 */

const CREDENTIALS = {
  ISI: {
    identifier: 'admin',        // Usuario admin que ya existe
    password: 'admin123',        // Clave que funciona
    companyId: 11,
    companySlug: 'isi'
  }
};

/**
 * Login vía API y configurar sesión en navegador
 * @param {Page} page - Página de Playwright
 * @param {string} company - Empresa (default: ISI)
 * @returns {Promise<{token: string, user: object}>}
 */
async function loginViaAPI(page, company = 'ISI') {
  const creds = CREDENTIALS[company];

  console.log(`   🔐 Login vía API: ${creds.identifier}`);

  const loginResponse = await page.request.post('http://localhost:9998/api/v1/auth/login', {
    data: {
      identifier: creds.identifier,
      password: creds.password,
      companyId: creds.companyId
    }
  });

  if (!loginResponse.ok()) {
    throw new Error(`Login failed: ${await loginResponse.text()}`);
  }

  const loginData = await loginResponse.json();

  console.log(`   ✅ Token obtenido: ${loginData.token.substring(0, 30)}...`);

  return loginData;
}

/**
 * Configurar sesión en el navegador (localStorage)
 * @param {Page} page - Página de Playwright
 * @param {object} loginData - Datos del login (token, user, company)
 */
async function setupBrowserSession(page, loginData) {
  await page.evaluate(({ token, user, company }) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id
    }));
    localStorage.setItem('currentCompany', JSON.stringify({
      company_id: company.company_id,
      name: company.name,
      slug: company.slug
    }));
  }, loginData);

  console.log(`   ✅ Sesión configurada en navegador`);
}

/**
 * Login completo: REAL de 3 pasos (como un humano)
 * @param {Page} page - Página de Playwright
 * @param {string} company - Empresa (default: ISI)
 * @returns {Promise<{token: string, user: object}>}
 */
async function login(page, company = 'ISI') {
  console.log(`\n🔐 [AUTH] Iniciando login REAL de 3 pasos para ${company}...`);

  const creds = CREDENTIALS[company];

  // 1. Ir al panel-empresa.html
  // MEJORA #19: Aumentar timeout a 90s (antes era default 60s) para evitar timeouts intermitentes
  console.log('   📂 Navegando a panel-empresa.html...');
  await page.goto('http://localhost:9998/panel-empresa.html', { timeout: 90000 });
  await page.waitForLoadState('domcontentloaded');

  // 2. Esperar a que se carguen las empresas en el dropdown
  console.log('   ⏳ Esperando que carguen las empresas...');
  await page.waitForSelector('#companySelect option:not([value=""])', { state: 'attached', timeout: 10000 });
  await page.waitForTimeout(500); // Dar tiempo a que termine de cargar

  // 3. PASO 1: Seleccionar empresa "ISI" del dropdown
  console.log('   🏢 PASO 1: Seleccionando empresa ISI...');
  // Intentar seleccionar por slug (value) primero, luego por label
  try {
    await page.selectOption('#companySelect', { value: creds.companySlug }); // 'isi'
    console.log(`   ✅ Empresa seleccionada por slug: ${creds.companySlug}`);
  } catch (err) {
    // Si falla, intentar por label
    await page.selectOption('#companySelect', { label: 'ISI' });
    console.log('   ✅ Empresa seleccionada por label: ISI');
  }
  await page.waitForTimeout(500);

  // 3. PASO 2: Escribir usuario (se habilita automáticamente al seleccionar empresa)
  console.log('   👤 PASO 2: Ingresando usuario...');
  await page.fill('#userInput', creds.identifier);
  console.log(`   ✅ Usuario ingresado: ${creds.identifier}`);
  await page.waitForTimeout(500);

  // 4. PASO 3: Escribir contraseña (se habilita al ingresar usuario)
  console.log('   🔑 PASO 3: Ingresando contraseña...');
  await page.fill('#passwordInput', creds.password);
  console.log('   ✅ Contraseña ingresada');
  await page.waitForTimeout(500);

  // 5. Click en "Iniciar Sesión" (se habilita automáticamente)
  console.log('   🚀 Haciendo click en "Iniciar Sesión"...');
  await page.click('#loginButton');
  console.log('   ✅ Click en botón login');

  // 6. Esperar que cargue el panel (redireccionamiento + módulos)
  console.log('   ⏳ Esperando que cargue el panel...');
  await page.waitForTimeout(4000); // 4 segundos para que cargue TODO

  console.log(`✅ [AUTH] Login REAL completado\n`);

  // Retornar datos básicos
  return {
    token: await page.evaluate(() => localStorage.getItem('authToken')),
    user: { identifier: creds.identifier },
    company: { slug: creds.companySlug }
  };
}

/**
 * Logout y limpiar sesión
 * @param {Page} page - Página de Playwright
 */
async function logout(page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  console.log(`   🚪 Logout completado`);
}

/**
 * Verificar si la sesión está activa
 * @param {Page} page - Página de Playwright
 * @returns {Promise<boolean>}
 */
async function isLoggedIn(page) {
  const token = await page.evaluate(() => localStorage.getItem('authToken'));
  return !!token;
}

/**
 * Obtener token actual
 * @param {Page} page - Página de Playwright
 * @returns {Promise<string|null>}
 */
async function getToken(page) {
  return await page.evaluate(() => localStorage.getItem('authToken'));
}

module.exports = {
  CREDENTIALS,
  loginViaAPI,
  setupBrowserSession,
  login,
  logout,
  isLoggedIn,
  getToken
};
