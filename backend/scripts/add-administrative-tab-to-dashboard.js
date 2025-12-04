/**
 * AGREGAR TAB "MÓDULOS ADMINISTRATIVOS" AL ENGINEERING DASHBOARD
 *
 * Separa:
 * - 💰 Módulos Comerciales (50 módulos comercializables)
 * - 🛠️ Módulos Administrativos (7 módulos NO comerciales)
 */

const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, '../public/js/modules/engineering-dashboard.js');

console.log('🛠️  Agregando tab "Módulos Administrativos" al Engineering Dashboard\n');

// Leer archivo
let content = fs.readFileSync(dashboardPath, 'utf8');

// PASO 1: Agregar nuevo tab en navegación
console.log('1️⃣  Agregando tab en navegación...');

const oldTabsCode = `    const tabs = [
      { id: 'overview', icon: '🌍', label: 'Vista General' },
      { id: 'commercial-modules', icon: '💰', label: 'Módulos Comerciales' },
      { id: 'applications', icon: '📱', label: 'Aplicaciones' },`;

const newTabsCode = `    const tabs = [
      { id: 'overview', icon: '🌍', label: 'Vista General' },
      { id: 'commercial-modules', icon: '💰', label: 'Módulos Comerciales' },
      { id: 'administrative-modules', icon: '🛠️', label: 'Módulos Administrativos' },
      { id: 'applications', icon: '📱', label: 'Aplicaciones' },`;

if (content.includes(oldTabsCode)) {
  content = content.replace(oldTabsCode, newTabsCode);
  console.log('   ✅ Tab agregado a navegación');
} else {
  console.log('   ⚠️  Código de tabs no encontrado o ya modificado');
}

// PASO 2: Agregar case en switchView
console.log('\n2️⃣  Agregando case en switchView...');

const switchViewPattern = /case 'commercial-modules':\s+await this\.loadCommercialModulesView\(\);\s+break;/;

if (switchViewPattern.test(content)) {
  const replacement = `case 'commercial-modules':
        await this.loadCommercialModulesView();
        break;
      case 'administrative-modules':
        await this.loadAdministrativeModulesView();
        break;`;

  content = content.replace(switchViewPattern, replacement);
  console.log('   ✅ Case agregado en switchView');
} else {
  console.log('   ⚠️  switchView case no encontrado o ya modificado');
}

// PASO 3: Agregar container en HTML
console.log('\n3️⃣  Agregando container div...');

const containerPattern = /<div id="commercial-modules-dynamic"><\/div>/;

if (containerPattern.test(content)) {
  const containerReplacement = `<div id="commercial-modules-dynamic"></div>
        <div id="administrative-modules-dynamic"></div>`;

  content = content.replace(containerPattern, containerReplacement);
  console.log('   ✅ Container div agregado');
} else {
  console.log('   ⚠️  Container ya existe o no encontrado');
}

// Guardar archivo
fs.writeFileSync(dashboardPath, content, 'utf8');

console.log('\n' + '='.repeat(70));
console.log('✅ SCRIPT DE NAVEGACIÓN COMPLETADO');
console.log('='.repeat(70));
console.log('\n📝 Ahora necesitas agregar la función loadAdministrativeModulesView()');
console.log('   Puedes copiar loadCommercialModulesView() y filtrar por isAdministrative');
console.log('\n🔄 Refrescar panel-administrativo para ver cambios\n');

process.exit(0);
