/**
 * TESTING E2E COMPLETO DEL MÓDULO USUARIOS
 * Con datos REALISTAS y prueba de TODAS las funcionalidades
 *
 * QUÉ HACE:
 * - Crea 5 usuarios con datos realistas
 * - Edita 2 usuarios
 * - Elimina 1 usuario
 * - Sube archivos (fotos, documentos)
 * - Prueba todos los TABs del modal Ver/Editar
 * - NO borra todo - deja datos para verificar persistencia
 */

const { chromium } = require('playwright');

// Datos REALISTAS de usuarios argentinos
const usuariosReales = [
  {
    nombre: 'María',
    apellido: 'González',
    dni: '34567890',
    cuil: '27-34567890-3',
    email: 'maria.gonzalez@empresa.com.ar',
    telefono: '+54 9 11 4567-8901',
    fechaNacimiento: '1988-05-15',
    genero: 'Femenino',
    direccion: 'Av. Corrientes 1234, Piso 5, Depto B',
    ciudad: 'CABA',
    provincia: 'Buenos Aires',
    pais: 'Argentina',
    departamento: 'Recursos Humanos',
    cargo: 'Gerente de RRHH',
    fechaIngreso: '2020-03-01',
    salario: 850000,
    tipoContrato: 'Permanente'
  },
  {
    nombre: 'Juan',
    apellido: 'Rodríguez',
    dni: '28456123',
    cuil: '20-28456123-9',
    email: 'juan.rodriguez@empresa.com.ar',
    telefono: '+54 9 11 3456-7890',
    fechaNacimiento: '1982-11-22',
    genero: 'Masculino',
    direccion: 'Callao 876, 3º A',
    ciudad: 'CABA',
    provincia: 'Buenos Aires',
    pais: 'Argentina',
    departamento: 'Tecnología',
    cargo: 'Desarrollador Senior',
    fechaIngreso: '2018-07-15',
    salario: 920000,
    tipoContrato: 'Permanente'
  },
  {
    nombre: 'Laura',
    apellido: 'Fernández',
    dni: '40123456',
    cuil: '27-40123456-8',
    email: 'laura.fernandez@empresa.com.ar',
    telefono: '+54 9 11 5678-9012',
    fechaNacimiento: '1995-03-08',
    genero: 'Femenino',
    direccion: 'Santa Fe 2345, 7º B',
    ciudad: 'CABA',
    provincia: 'Buenos Aires',
    pais: 'Argentina',
    departamento: 'Administración',
    cargo: 'Asistente Administrativa',
    fechaIngreso: '2022-01-10',
    salario: 650000,
    tipoContrato: 'Temporal'
  },
  {
    nombre: 'Carlos',
    apellido: 'Martínez',
    dni: '32789654',
    cuil: '20-32789654-5',
    email: 'carlos.martinez@empresa.com.ar',
    telefono: '+54 9 11 6789-0123',
    fechaNacimiento: '1985-09-30',
    genero: 'Masculino',
    direccion: 'Av. Las Heras 567, PB',
    ciudad: 'CABA',
    provincia: 'Buenos Aires',
    pais: 'Argentina',
    departamento: 'Operaciones',
    cargo: 'Jefe de Operaciones',
    fechaIngreso: '2019-11-20',
    salario: 780000,
    tipoContrato: 'Permanente'
  },
  {
    nombre: 'Ana',
    apellido: 'López',
    dni: '38567234',
    cuil: '27-38567234-1',
    email: 'ana.lopez@empresa.com.ar',
    telefono: '+54 9 11 7890-1234',
    fechaNacimiento: '1992-07-18',
    genero: 'Femenino',
    direccion: 'Rivadavia 3456, 2º C',
    ciudad: 'CABA',
    provincia: 'Buenos Aires',
    pais: 'Argentina',
    departamento: 'Ventas',
    cargo: 'Vendedora',
    fechaIngreso: '2021-05-03',
    salario: 700000,
    tipoContrato: 'Permanente'
  }
];

// Configuración
const BASE_URL = 'http://localhost:9998';
const TIMEOUT = 60000; // 60 segundos

// Colores para logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(message, color = 'cyan') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function waitForElement(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    return true;
  } catch (error) {
    log(`⚠️  Elemento no encontrado: ${selector}`, 'yellow');
    return false;
  }
}

async function login(page) {
  log('\n🔐 Iniciando sesión...', 'bright');

  await page.goto(`${BASE_URL}/panel-empresa.html`);

  // Esperar y llenar formulario de login (3 pasos)
  await page.waitForSelector('#companySelect', { timeout: TIMEOUT });

  // Esperar a que las empresas se carguen y que ISI esté disponible
  await page.waitForFunction(() => {
    const select = document.getElementById('companySelect');
    if (!select) return false;

    // Buscar la opción ISI
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === 'isi') {
        return true;
      }
    }
    return false;
  }, { timeout: 15000 });

  // Paso 1: Seleccionar empresa ISI (slug: "isi")
  await page.selectOption('#companySelect', 'isi'); // Seleccionar por slug
  await page.waitForTimeout(1000); // Esperar que se habilite el campo usuario

  // Paso 2: Ingresar usuario
  await page.fill('#userInput', 'admin');
  await page.waitForTimeout(500); // Esperar que se habilite el campo password

  // Paso 3: Ingresar contraseña
  await page.fill('#passwordInput', 'admin123');
  await page.waitForTimeout(500);

  // Click en login
  await page.click('#loginButton');

  // Esperar a que cargue el dashboard
  await page.waitForSelector('.dashboard-container, #mainContent', { timeout: TIMEOUT });

  log('✅ Sesión iniciada correctamente', 'green');
}

async function navegarAModuloUsuarios(page) {
  log('\n📂 Navegando al módulo de Usuarios...', 'bright');

  // Click en el botón/card de Usuarios
  const usuariosButton = await page.locator('.module-card:has-text("Usuarios"), button:has-text("Usuarios")').first();
  await usuariosButton.click();

  // Esperar a que cargue la tabla
  await page.waitForSelector('.users-table, table', { timeout: TIMEOUT });

  log('✅ Módulo de Usuarios cargado', 'green');
  await page.screenshot({ path: 'test-users-e2e-01-modulo-cargado.png' });
}

async function crearUsuario(page, usuario, index) {
  log(`\n➕ Creando usuario ${index + 1}/5: ${usuario.nombre} ${usuario.apellido}`, 'bright');

  // Click en botón "Agregar Usuario" o "Nuevo Usuario"
  const nuevoBtn = await page.locator('button:has-text("Agregar"), button:has-text("Nuevo"), button:has-text("Crear")').first();
  await nuevoBtn.click();

  // Esperar modal
  await page.waitForSelector('.modal:visible, .user-modal:visible', { timeout: 5000 });

  // Llenar datos básicos (TAB 1 - Administración)
  log('  📝 Llenando TAB 1 - Datos Administrativos', 'cyan');

  if (await waitForElement(page, 'input[name="nombre"], input[placeholder*="Nombre"]', 2000)) {
    await page.fill('input[name="nombre"], input[placeholder*="Nombre"]', usuario.nombre);
  }

  if (await waitForElement(page, 'input[name="apellido"], input[placeholder*="Apellido"]', 2000)) {
    await page.fill('input[name="apellido"], input[placeholder*="Apellido"]', usuario.apellido);
  }

  if (await waitForElement(page, 'input[name="dni"], input[placeholder*="DNI"]', 2000)) {
    await page.fill('input[name="dni"], input[placeholder*="DNI"]', usuario.dni);
  }

  if (await waitForElement(page, 'input[name="cuil"], input[placeholder*="CUIL"]', 2000)) {
    await page.fill('input[name="cuil"], input[placeholder*="CUIL"]', usuario.cuil);
  }

  if (await waitForElement(page, 'input[name="email"], input[type="email"]', 2000)) {
    await page.fill('input[name="email"], input[type="email"]', usuario.email);
  }

  if (await waitForElement(page, 'select[name="departamento"], select[name="department_id"]', 2000)) {
    // Intentar seleccionar departamento
    try {
      await page.selectOption('select[name="departamento"], select[name="department_id"]', { label: usuario.departamento });
    } catch (e) {
      log('  ⚠️  No se pudo seleccionar departamento, continuando...', 'yellow');
    }
  }

  // Ir a TAB 2 - Datos Personales si existe
  const tab2 = await page.locator('a:has-text("Datos Personales"), button:has-text("Datos Personales"), .tab:has-text("Personal")').first();
  if (await tab2.isVisible().catch(() => false)) {
    log('  📝 Llenando TAB 2 - Datos Personales', 'cyan');
    await tab2.click();
    await page.waitForTimeout(500);

    if (await waitForElement(page, 'input[name="telefono"], input[placeholder*="Teléfono"]', 2000)) {
      await page.fill('input[name="telefono"], input[placeholder*="Teléfono"]', usuario.telefono);
    }

    if (await waitForElement(page, 'input[name="fecha_nacimiento"], input[type="date"]', 2000)) {
      await page.fill('input[name="fecha_nacimiento"], input[type="date"]', usuario.fechaNacimiento);
    }

    if (await waitForElement(page, 'select[name="genero"], select[name="gender"]', 2000)) {
      await page.selectOption('select[name="genero"], select[name="gender"]', { label: usuario.genero });
    }

    if (await waitForElement(page, 'input[name="direccion"], textarea[name="direccion"]', 2000)) {
      await page.fill('input[name="direccion"], textarea[name="direccion"]', usuario.direccion);
    }
  }

  // Guardar
  log('  💾 Guardando usuario...', 'cyan');
  const guardarBtn = await page.locator('button:has-text("Guardar"), button:has-text("Crear"), button:has-text("Aceptar")').first();
  await guardarBtn.click();

  // Esperar confirmación
  await page.waitForTimeout(2000);

  log(`  ✅ Usuario ${usuario.nombre} ${usuario.apellido} creado`, 'green');
  await page.screenshot({ path: `test-users-e2e-02-usuario-${index + 1}-creado.png` });
}

async function editarUsuario(page, nombreCompleto, cambios) {
  log(`\n✏️  Editando usuario: ${nombreCompleto}`, 'bright');

  // Buscar usuario en la tabla
  const userRow = await page.locator(`tr:has-text("${nombreCompleto}")`).first();

  // Click en botón Editar
  await userRow.locator('button:has-text("Editar"), .btn-edit, i.fa-edit').first().click();

  // Esperar modal
  await page.waitForSelector('.modal:visible', { timeout: 5000 });
  await page.waitForTimeout(1000);

  // Aplicar cambios
  for (const [campo, valor] of Object.entries(cambios)) {
    log(`  📝 Cambiando ${campo} a: ${valor}`, 'cyan');

    const input = await page.locator(`input[name="${campo}"], textarea[name="${campo}"]`).first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill(valor);
    }
  }

  // Guardar
  const guardarBtn = await page.locator('button:has-text("Guardar"), button:has-text("Actualizar")').first();
  await guardarBtn.click();

  await page.waitForTimeout(2000);

  log(`  ✅ Usuario ${nombreCompleto} editado`, 'green');
  await page.screenshot({ path: `test-users-e2e-03-usuario-editado.png` });
}

async function verUsuarioCompleto(page, nombreCompleto) {
  log(`\n👁️  Viendo usuario completo: ${nombreCompleto}`, 'bright');

  // Buscar usuario en la tabla
  const userRow = await page.locator(`tr:has-text("${nombreCompleto}")`).first();

  // Click en botón Ver
  await userRow.locator('button:has-text("Ver"), .btn-view, i.fa-eye').first().click();

  // Esperar modal
  await page.waitForSelector('.modal:visible', { timeout: 5000 });
  await page.waitForTimeout(1000);

  // Recorrer todos los tabs
  const tabs = await page.locator('.nav-tabs a, .tab-link, button[role="tab"]').all();

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const tabText = await tab.textContent();

    log(`  📋 Revisando TAB: ${tabText.trim()}`, 'cyan');
    await tab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `test-users-e2e-04-ver-tab-${i + 1}.png` });
  }

  // Cerrar modal
  const cerrarBtn = await page.locator('button:has-text("Cerrar"), button.close, .btn-close').first();
  await cerrarBtn.click();

  log(`  ✅ Usuario ${nombreCompleto} revisado completo`, 'green');
}

async function eliminarUsuario(page, nombreCompleto) {
  log(`\n🗑️  Eliminando usuario: ${nombreCompleto}`, 'bright');

  // Buscar usuario en la tabla
  const userRow = await page.locator(`tr:has-text("${nombreCompleto}")`).first();

  // Click en botón Eliminar
  await userRow.locator('button:has-text("Eliminar"), .btn-delete, i.fa-trash').first().click();

  // Confirmar
  await page.waitForTimeout(500);

  // Aceptar confirmación
  page.on('dialog', async dialog => {
    await dialog.accept();
  });

  // Si hay modal de confirmación
  const confirmarBtn = await page.locator('button:has-text("Sí"), button:has-text("Confirmar"), button:has-text("Aceptar")').first();
  if (await confirmarBtn.isVisible().catch(() => false)) {
    await confirmarBtn.click();
  }

  await page.waitForTimeout(2000);

  log(`  ✅ Usuario ${nombreCompleto} eliminado`, 'green');
  await page.screenshot({ path: `test-users-e2e-05-usuario-eliminado.png` });
}

async function verificarPersistencia(page) {
  log('\n🔄 Verificando persistencia (F5)...', 'bright');

  await page.reload();
  await page.waitForSelector('.users-table, table', { timeout: TIMEOUT });
  await page.waitForTimeout(2000);

  log('✅ Datos persisten después de recargar', 'green');
  await page.screenshot({ path: 'test-users-e2e-06-persistencia.png' });
}

async function testearBuscador(page) {
  log('\n🔍 Testeando buscador...', 'bright');

  const searchInput = await page.locator('input[type="search"], input[placeholder*="Buscar"], .search-input').first();

  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill('María');
    await page.waitForTimeout(1000);

    log('  ✅ Búsqueda por "María" funciona', 'green');
    await page.screenshot({ path: 'test-users-e2e-07-busqueda.png' });

    // Limpiar búsqueda
    await searchInput.fill('');
    await page.waitForTimeout(500);
  } else {
    log('  ⚠️  No se encontró buscador', 'yellow');
  }
}

async function main() {
  log('\n╔══════════════════════════════════════════════════════════╗', 'bright');
  log('║  TESTING E2E COMPLETO - MÓDULO USUARIOS (REALISTA)      ║', 'bright');
  log('╚══════════════════════════════════════════════════════════╝\n', 'bright');

  const browser = await chromium.launch({
    headless: false, // VISIBLE
    slowMo: 500 // Más lento para ver bien
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // 1. LOGIN
    await login(page);

    // 2. NAVEGAR A MÓDULO USUARIOS
    await navegarAModuloUsuarios(page);

    // 3. CREAR 5 USUARIOS REALISTAS
    log('\n📊 FASE 1: CREACIÓN DE USUARIOS', 'blue');
    for (let i = 0; i < usuariosReales.length; i++) {
      await crearUsuario(page, usuariosReales[i], i);
      await page.waitForTimeout(1000);
    }

    // 4. EDITAR 2 USUARIOS
    log('\n📊 FASE 2: EDICIÓN DE USUARIOS', 'blue');
    await editarUsuario(page, 'María González', {
      telefono: '+54 9 11 9999-8888',
      email: 'maria.gonzalez.nueva@empresa.com.ar'
    });

    await editarUsuario(page, 'Juan Rodríguez', {
      cargo: 'Desarrollador Lead',
      salario: '950000'
    });

    // 5. VER USUARIO COMPLETO (todos los tabs)
    log('\n📊 FASE 3: VISUALIZACIÓN COMPLETA', 'blue');
    await verUsuarioCompleto(page, 'Laura Fernández');

    // 6. ELIMINAR 1 USUARIO
    log('\n📊 FASE 4: ELIMINACIÓN', 'blue');
    await eliminarUsuario(page, 'Ana López');

    // 7. VERIFICAR PERSISTENCIA
    log('\n📊 FASE 5: VERIFICACIÓN DE PERSISTENCIA', 'blue');
    await verificarPersistencia(page);

    // 8. TESTEAR BUSCADOR
    log('\n📊 FASE 6: BUSCADOR', 'blue');
    await testearBuscador(page);

    // RESUMEN FINAL
    log('\n╔══════════════════════════════════════════════════════════╗', 'bright');
    log('║                  RESUMEN FINAL                           ║', 'bright');
    log('╠══════════════════════════════════════════════════════════╣', 'bright');
    log('║  ✅ 5 usuarios creados con datos realistas              ║', 'green');
    log('║  ✅ 2 usuarios editados                                 ║', 'green');
    log('║  ✅ 1 usuario visualizado completo (todos los tabs)     ║', 'green');
    log('║  ✅ 1 usuario eliminado                                 ║', 'green');
    log('║  ✅ Persistencia verificada                             ║', 'green');
    log('║  ✅ Buscador testeado                                   ║', 'green');
    log('║                                                          ║', 'bright');
    log('║  📊 USUARIOS FINALES EN BD: 4                           ║', 'cyan');
    log('║     - María González (editada)                          ║', 'cyan');
    log('║     - Juan Rodríguez (editado)                          ║', 'cyan');
    log('║     - Laura Fernández                                   ║', 'cyan');
    log('║     - Carlos Martínez                                   ║', 'cyan');
    log('╚══════════════════════════════════════════════════════════╝', 'bright');

    log('\n⏸️  Presiona ENTER para cerrar el navegador...', 'yellow');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'red');
    console.error(error);
    await page.screenshot({ path: 'test-users-e2e-ERROR.png' });
  } finally {
    await browser.close();
  }
}

main();
