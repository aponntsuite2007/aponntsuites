/**
 * TEST DE MÓDULOS FRONTEND
 * Verifica que los módulos JS del frontend existen y están configurados
 */
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const JS_MODULES_DIR = path.join(PUBLIC_DIR, 'js', 'modules');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║              VERIFICACIÓN MÓDULOS FRONTEND                      ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// 1. Verificar archivos HTML principales
console.log('═══ 1. ARCHIVOS HTML PRINCIPALES ═══');
const htmlFiles = [
  'panel-empresa.html',
  'panel-administrativo.html',
  'login.html',
  'index.html'
];

htmlFiles.forEach(file => {
  const exists = fs.existsSync(path.join(PUBLIC_DIR, file));
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// 2. Verificar módulos JS de RRHH
console.log('\n═══ 2. MÓDULOS JS DE RRHH ═══');
const rrhhModules = [
  'attendance-management.js',
  'shift-management.js',
  'vacation-management.js',
  'medical-leaves.js',
  'training-management.js',
  'benefits-management.js',
  'payroll-liquidation.js',
  'users-management.js',
  'user-documents.js',
  'user-profile.js',
  'organigrama.js',
  'sanctions.js',
  'employee-benefits.js'
];

let foundModules = 0;
let missingModules = [];

rrhhModules.forEach(module => {
  const exists = fs.existsSync(path.join(JS_MODULES_DIR, module));
  if (exists) {
    foundModules++;
    console.log(`   ✅ ${module}`);
  } else {
    missingModules.push(module);
    console.log(`   ❌ ${module} (no encontrado)`);
  }
});

// 3. Buscar módulos alternativos
console.log('\n═══ 3. BÚSQUEDA DE MÓDULOS SIMILARES ═══');
if (missingModules.length > 0) {
  const allModules = fs.readdirSync(JS_MODULES_DIR).filter(f => f.endsWith('.js'));

  missingModules.forEach(missing => {
    const baseName = missing.replace('.js', '').split('-')[0];
    const similar = allModules.filter(m => m.toLowerCase().includes(baseName.toLowerCase()));
    if (similar.length > 0) {
      console.log(`   ${missing} → Alternativas: ${similar.join(', ')}`);
    }
  });
}

// 4. Listar todos los módulos disponibles
console.log('\n═══ 4. MÓDULOS DISPONIBLES ═══');
const allModules = fs.readdirSync(JS_MODULES_DIR)
  .filter(f => f.endsWith('.js'))
  .sort();

console.log(`   Total módulos JS: ${allModules.length}`);

// Agrupar por categoría
const categories = {
  'Asistencia': ['attendance', 'late', 'authorization', 'check'],
  'Turnos': ['shift', 'schedule', 'calendar'],
  'Vacaciones': ['vacation', 'leave', 'holiday'],
  'Médico': ['medical', 'health', 'exam'],
  'Capacitación': ['training', 'course', 'learning'],
  'Beneficios': ['benefit', 'allowance'],
  'Nómina': ['payroll', 'salary', 'liquidation'],
  'Usuarios': ['user', 'employee', 'staff'],
  'Organización': ['organigrama', 'organization', 'position', 'department'],
  'Documentos': ['document', 'dms', 'file'],
  'Notificaciones': ['notification', 'alert']
};

console.log('\n   Por categoría:');
for (const [cat, keywords] of Object.entries(categories)) {
  const matched = allModules.filter(m =>
    keywords.some(k => m.toLowerCase().includes(k))
  );
  if (matched.length > 0) {
    console.log(`   ${cat}: ${matched.length} módulos`);
    matched.forEach(m => console.log(`      - ${m}`));
  }
}

// 5. Verificar panel-empresa.html incluye módulos críticos
console.log('\n═══ 5. VERIFICAR INTEGRACIONES EN PANEL-EMPRESA ═══');
const panelEmpresa = fs.readFileSync(path.join(PUBLIC_DIR, 'panel-empresa.html'), 'utf8');

const criticalIntegrations = [
  { name: 'Sistema de Turnos', pattern: /shift|turno/i },
  { name: 'Asistencias', pattern: /attendance|asistencia/i },
  { name: 'Vacaciones', pattern: /vacation|vacacion/i },
  { name: 'Nómina/Payroll', pattern: /payroll|liquidaci/i },
  { name: 'Notificaciones', pattern: /notification|notificaci/i },
  { name: 'Capacitaciones', pattern: /training|capacitaci/i },
  { name: 'Beneficios', pattern: /benefit|beneficio/i }
];

criticalIntegrations.forEach(({ name, pattern }) => {
  const found = pattern.test(panelEmpresa);
  console.log(`   ${found ? '✅' : '⚠️'} ${name}`);
});

// 6. Resumen
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                      RESUMEN                                    ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log(`   Módulos RRHH encontrados: ${foundModules}/${rrhhModules.length}`);
console.log(`   Total módulos JS: ${allModules.length}`);
console.log(`   Panel empresa: ${fs.existsSync(path.join(PUBLIC_DIR, 'panel-empresa.html')) ? '✅' : '❌'}`);

// 7. Instrucciones para test manual
console.log('\n═══ INSTRUCCIONES PARA TEST MANUAL ═══');
console.log('   1. Abrir en navegador: http://localhost:9998/panel-empresa.html');
console.log('   2. Login con:');
console.log('      - Empresa: isi');
console.log('      - Usuario: rrhh2@isi.test');
console.log('      - Password: admin123');
console.log('   3. Navegar a cada módulo y verificar:');
console.log('      - ¿Carga sin errores?');
console.log('      - ¿Muestra datos?');
console.log('      - ¿Los botones funcionan?');
console.log('      - ¿Las notificaciones aparecen?');
