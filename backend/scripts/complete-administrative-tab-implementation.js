/**
 * IMPLEMENTACIÓN COMPLETA DEL TAB ADMINISTRATIVO
 * Hace TODOS los cambios necesarios en engineering-dashboard.js
 */

const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, '../public/js/modules/engineering-dashboard.js');

console.log('🛠️  IMPLEMENTACIÓN COMPLETA DEL TAB ADMINISTRATIVO');
console.log('='.repeat(80));
console.log('');

// Leer archivo
let content = fs.readFileSync(dashboardPath, 'utf8');
let changes = 0;

// CAMBIO 1: Agregar tab en navegación (usando línea exacta)
console.log('1️⃣  Agregando tab "Módulos Administrativos" en navegación...');

const navBefore = `      { id: 'commercial-modules', icon: '💰', label: 'Módulos Comerciales' },
      { id: 'applications', icon: '📱', label: 'Aplicaciones' },`;

const navAfter = `      { id: 'commercial-modules', icon: '💰', label: 'Módulos Comerciales' },
      { id: 'administrative-modules', icon: '🛠️', label: 'Módulos Administrativos' },
      { id: 'applications', icon: '📱', label: 'Aplicaciones' },`;

if (content.includes(navBefore) && !content.includes("id: 'administrative-modules'")) {
  content = content.replace(navBefore, navAfter);
  changes++;
  console.log('   ✅ Tab agregado en navegación');
} else if (content.includes("id: 'administrative-modules'")) {
  console.log('   ℹ️  Tab ya existe en navegación');
} else {
  console.log('   ⚠️  No se pudo agregar tab (patrón no encontrado)');
}

// CAMBIO 2: Agregar case en switchView
console.log('\n2️⃣  Agregando case en switchView...');

const switchBefore = `      case 'commercial-modules':
        await this.loadCommercialModulesView();
        break;
      case 'applications':`;

const switchAfter = `      case 'commercial-modules':
        await this.loadCommercialModulesView();
        break;
      case 'administrative-modules':
        await this.loadAdministrativeModulesView();
        break;
      case 'applications':`;

if (content.includes(switchBefore) && !content.includes("case 'administrative-modules':")) {
  content = content.replace(switchBefore, switchAfter);
  changes++;
  console.log('   ✅ Case agregado en switchView');
} else if (content.includes("case 'administrative-modules':")) {
  console.log('   ℹ️  Case ya existe en switchView');
} else {
  console.log('   ⚠️  No se pudo agregar case (patrón no encontrado)');
}

// CAMBIO 3: Agregar container div en renderContent
console.log('\n3️⃣  Agregando container div...');

const containerBefore = `        <div id="commercial-modules-dynamic"></div>
        <div id="applications-dynamic"></div>`;

const containerAfter = `        <div id="commercial-modules-dynamic"></div>
        <div id="administrative-modules-dynamic"></div>
        <div id="applications-dynamic"></div>`;

if (content.includes(containerBefore) && !content.includes('id="administrative-modules-dynamic"')) {
  content = content.replace(containerBefore, containerAfter);
  changes++;
  console.log('   ✅ Container div agregado');
} else if (content.includes('id="administrative-modules-dynamic"')) {
  console.log('   ℹ️  Container div ya existe');
} else {
  console.log('   ⚠️  No se pudo agregar container (patrón no encontrado)');
}

// CAMBIO 4: Agregar función loadAdministrativeModulesView
console.log('\n4️⃣  Agregando función loadAdministrativeModulesView()...');

if (!content.includes('loadAdministrativeModulesView()')) {
  // Buscar el final de loadCommercialModulesView
  const functionInsertPoint = content.indexOf('  /**\n   * Sincronizar módulos comerciales');

  if (functionInsertPoint > 0) {
    const newFunction = `
  /**
   * VISTA: Módulos Administrativos - NO comercializables
   */
  async loadAdministrativeModulesView() {
    console.log('🛠️  [ADMINISTRATIVE] Cargando vista de módulos administrativos...');

    const container = document.getElementById('administrative-modules-dynamic');
    if (!container) {
      console.error('❌ [ADMINISTRATIVE] Container no encontrado');
      return;
    }

    try {
      // Fetch módulos comerciales desde API (filtramos los administrativos)
      const response = await fetch('/api/engineering/commercial-modules');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error cargando módulos');
      }

      const { modules, stats, version, lastSync } = result.data;
      const modulesArray = Object.values(modules);

      // Filtrar SOLO módulos administrativos
      const administrative = modulesArray.filter(m => m.isAdministrative === true);

      console.log(\`🛠️  [ADMINISTRATIVE] Módulos administrativos: \${administrative.length}\`);

      // Renderizar vista
      container.innerHTML = \`
        <div style="max-width: 1400px; margin: 0 auto;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <h1 style="margin: 0 0 10px 0; font-size: 32px; display: flex; align-items: center; gap: 15px;">
              <span>🛠️</span>
              <span>Módulos Administrativos</span>
              <span style="background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 14px;">v\${version}</span>
            </h1>
            <p style="margin: 0; opacity: 0.95; font-size: 16px;">Módulos de uso interno - NO comercializables</p>
            <p style="margin: 8px 0 0 0; opacity: 0.8; font-size: 13px;">Última sincronización: \${new Date(lastSync).toLocaleString('es-AR')}</p>
          </div>

          <!-- Alert -->
          <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 24px;">⚠️</span>
              <div>
                <div style="font-weight: 700; color: #92400e; margin-bottom: 4px;">Módulos de Uso Interno</div>
                <div style="color: #78350f; font-size: 14px;">
                  Estos módulos son parte del núcleo del sistema pero <strong>NO se comercializan</strong> a clientes.
                  Son utilizados por panel-administrativo y panel-empresa internamente.
                </div>
              </div>
            </div>
          </div>

          <!-- Stats Card -->
          <div style="background: white; padding: 25px; border-radius: 12px; border-left: 4px solid #64748b; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 30px;">
            <div style="font-size: 48px; font-weight: bold; color: #64748b; margin-bottom: 8px;">\${administrative.length}</div>
            <div style="color: #6b7280; font-size: 16px; font-weight: 600;">MÓDULOS ADMINISTRATIVOS</div>
            <div style="color: #9ca3af; font-size: 13px; margin-top: 8px;">Uso exclusivo del sistema</div>
          </div>

          <!-- Lista de módulos -->
          <div style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 25px;">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #1f2937;">Módulos del Sistema</h2>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
              \${administrative.map(module => \`
                <div style="
                  border: 2px solid #e5e7eb;
                  border-radius: 10px;
                  padding: 20px;
                  transition: all 0.3s;
                  background: #f9fafb;
                "
                onmouseover="this.style.borderColor='#64748b'; this.style.boxShadow='0 4px 12px rgba(100, 116, 139, 0.15)'"
                onmouseout="this.style.borderColor='#e5e7eb'; this.style.boxShadow=''"
                >
                  <!-- Header del módulo -->
                  <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 15px;">
                    <div>
                      <div style="font-size: 32px; margin-bottom: 8px;">\${module.icon}</div>
                      <h3 style="margin: 0; font-size: 18px; color: #1f2937; font-weight: 700;">\${module.name}</h3>
                      <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600;">ADMINISTRATIVO</div>
                    </div>
                    <span style="background: #64748b; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;">CORE</span>
                  </div>

                  <!-- Descripción -->
                  <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">\${module.description || 'Módulo administrativo del sistema'}</p>

                  <!-- Info -->
                  <div style="background: white; border-radius: 8px; padding: 12px; border-left: 3px solid #64748b;">
                    <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 4px;">Uso Interno</div>
                    <div style="font-size: 11px; color: #9ca3af;">No comercializable - Sistema core</div>
                  </div>

                  <!-- Key -->
                  <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                    <div style="font-size: 11px; color: #9ca3af; font-family: monospace;">\${module.key}</div>
                  </div>
                </div>
              \`).join('')}
            </div>
          </div>
        </div>
      \`;

      console.log('✅ [ADMINISTRATIVE] Vista renderizada');

    } catch (error) {
      console.error('❌ [ADMINISTRATIVE] Error:', error);
      container.innerHTML = \`
        <div style="padding: 40px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
          <div style="font-size: 18px; color: #ef4444; font-weight: 600;">Error cargando módulos administrativos</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 8px;">\${error.message}</div>
        </div>
      \`;
    }
  }

`;

    content = content.slice(0, functionInsertPoint) + newFunction + content.slice(functionInsertPoint);
    changes++;
    console.log('   ✅ Función loadAdministrativeModulesView() agregada');
  } else {
    console.log('   ⚠️  No se pudo encontrar punto de inserción');
  }
} else {
  console.log('   ℹ️  Función loadAdministrativeModulesView() ya existe');
}

// Guardar archivo
if (changes > 0) {
  fs.writeFileSync(dashboardPath, content, 'utf8');
  console.log('\n✅ Archivo guardado con ' + changes + ' cambios aplicados');
} else {
  console.log('\nℹ️  No se aplicaron cambios (todo ya estaba implementado)');
}

console.log('\n' + '='.repeat(80));
console.log('✅ IMPLEMENTACIÓN COMPLETADA');
console.log('='.repeat(80));
console.log('\n📝 Cambios aplicados:');
console.log('   1. Tab "🛠️ Módulos Administrativos" agregado a navegación');
console.log('   2. Case en switchView agregado');
console.log('   3. Container div agregado');
console.log('   4. Función loadAdministrativeModulesView() implementada');
console.log('\n🔄 Refrescar http://localhost:9998/panel-administrativo.html para ver cambios\n');

process.exit(0);
