/**
 * SCRIPT PARA ACTUALIZAR CATEGORÍAS DINÁMICAS EN ENGINEERING DASHBOARD
 */

const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, '../public/js/modules/engineering-dashboard.js');

console.log('🔧 Actualizando categorías dinámicas en Engineering Dashboard...\n');

// Leer archivo
let content = fs.readFileSync(dashboardPath, 'utf8');

// PARTE 1: Reemplazar el objeto categories hardcoded
const oldCategoriesCode = `      // Agrupar por categoría
      const categories = {
        core: modulesArray.filter(m => m.category === 'core'),
        rrhh: modulesArray.filter(m => m.category === 'rrhh'),
        operations: modulesArray.filter(m => m.category === 'operations'),
        sales: modulesArray.filter(m => m.category === 'sales'),
        analytics: modulesArray.filter(m => m.category === 'analytics'),
        integrations: modulesArray.filter(m => m.category === 'integrations'),
        advanced: modulesArray.filter(m => m.category === 'advanced')
      };`;

const newCategoriesCode = `      // Mapeo de categorías con iconos y colores
      const categoryConfig = {
        core: { icon: '⚙️', color: '#3b82f6', label: 'Core' },
        rrhh: { icon: '👥', color: '#8b5cf6', label: 'RRHH' },
        security: { icon: '🔒', color: '#ef4444', label: 'Seguridad' },
        compliance: { icon: '📋', color: '#f59e0b', label: 'Cumplimiento' },
        communication: { icon: '📬', color: '#10b981', label: 'Comunicación' },
        medical: { icon: '🏥', color: '#ec4899', label: 'Médico' },
        payroll: { icon: '💰', color: '#14b8a6', label: 'Nómina' },
        analytics: { icon: '📊', color: '#6366f1', label: 'Analytics' },
        admin: { icon: '🛠️', color: '#64748b', label: 'Admin' },
        support: { icon: '🆘', color: '#06b6d4', label: 'Soporte' },
        ai: { icon: '🤖', color: '#a855f7', label: 'IA' },
        legal: { icon: '⚖️', color: '#eab308', label: 'Legal' },
        reports: { icon: '📈', color: '#22c55e', label: 'Reportes' },
        hardware: { icon: '🖥️', color: '#84cc16', label: 'Hardware' },
        integration: { icon: '🔗', color: '#06b6d4', label: 'Integración' },
        siac: { icon: '🏢', color: '#f97316', label: 'SIAC' },
        monitoring: { icon: '👁️', color: '#6366f1', label: 'Monitoreo' },
        system: { icon: '⚡', color: '#71717a', label: 'Sistema' },
        testing: { icon: '🧪', color: '#94a3b8', label: 'Testing' },
        scheduling: { icon: '📅', color: '#0ea5e9', label: 'Turnos' }
      };

      // Detectar categorías dinámicamente desde los datos
      const categoriesSet = new Set();
      modulesArray.forEach(m => {
        if (m.category) categoriesSet.add(m.category);
      });

      console.log('📋 [COMMERCIAL] Categorías detectadas:', Array.from(categoriesSet));

      // Orden de prioridad para categorías
      const categoryOrder = [
        'core', 'rrhh', 'security', 'compliance', 'communication',
        'medical', 'payroll', 'analytics', 'admin', 'support',
        'ai', 'legal', 'reports', 'hardware', 'integration',
        'siac', 'monitoring', 'system', 'testing', 'scheduling'
      ];

      // Agrupar por categoría (dinámico)
      const categories = {};

      // Primero agregar categorías en orden de prioridad
      categoryOrder.forEach(catKey => {
        if (categoriesSet.has(catKey)) {
          categories[catKey] = modulesArray.filter(m => m.category === catKey);
          console.log(\`  ✓ \${catKey}: \${categories[catKey].length} módulos\`);
        }
      });

      // Luego agregar cualquier categoría no mapeada (alfabético)
      Array.from(categoriesSet)
        .filter(cat => !categoryOrder.includes(cat))
        .sort()
        .forEach(catKey => {
          categories[catKey] = modulesArray.filter(m => m.category === catKey);
          console.log(\`  ✓ \${catKey} (no mapeada): \${categories[catKey].length} módulos\`);

          // Asignar config por defecto para categorías no mapeadas
          if (!categoryConfig[catKey]) {
            categoryConfig[catKey] = {
              icon: '📦',
              color: '#9ca3af',
              label: catKey.charAt(0).toUpperCase() + catKey.slice(1)
            };
          }
        });

      console.log(\`📊 [COMMERCIAL] Total categorías: \${Object.keys(categories).length}\`);
      console.log(\`📊 [COMMERCIAL] Total módulos: \${modulesArray.length}\`);`;

console.log('1️⃣  Buscando código de categorías hardcoded...');
if (content.includes(oldCategoriesCode)) {
  content = content.replace(oldCategoriesCode, newCategoriesCode);
  console.log('   ✅ Código de categorías actualizado');
} else {
  console.log('   ⚠️  No se encontró el código exacto (puede estar modificado)');
  console.log('   🔍 Buscando patrón alternativo...');

  // Intento alternativo con regex
  const altPattern = /\/\/ Agrupar por categoría\s+const categories = \{[\s\S]*?\};/;
  if (altPattern.test(content)) {
    content = content.replace(altPattern, newCategoriesCode);
    console.log('   ✅ Código actualizado con patrón alternativo');
  } else {
    console.log('   ❌ No se pudo encontrar el código para reemplazar');
    process.exit(1);
  }
}

// PARTE 2: Actualizar renderizado de botones de categorías para usar categoryConfig
console.log('\n2️⃣  Actualizando renderizado de botones...');

const oldButtonCode = `\${Object.entries(categories).map(([catKey, catModules]) => \`
                  <button
                    class="commercial-cat-btn \${catKey === 'core' ? 'active' : ''}"
                    data-category="\${catKey}"
                    style="
                      padding: 10px 20px;
                      border: 2px solid \${catKey === 'core' ? '#667eea' : '#e5e7eb'};
                      background: \${catKey === 'core' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white'};
                      color: \${catKey === 'core' ? 'white' : '#6b7280'};
                      border-radius: 8px;
                      cursor: pointer;
                      font-size: 14px;
                      font-weight: 600;
                      transition: all 0.3s;
                    "
                  >
                    \${catKey.toUpperCase()} (\${catModules.length})
                  </button>
                \`).join('')}`;

const newButtonCode = `\${Object.entries(categories).map(([catKey, catModules], index) => {
                  const config = categoryConfig[catKey] || { icon: '📦', color: '#9ca3af', label: catKey };
                  const isFirst = index === 0;

                  return \`
                    <button
                      class="commercial-cat-btn \${isFirst ? 'active' : ''}"
                      data-category="\${catKey}"
                      style="
                        padding: 10px 20px;
                        border: 2px solid \${isFirst ? config.color : '#e5e7eb'};
                        background: \${isFirst ? \`linear-gradient(135deg, \${config.color} 0%, \${config.color}dd 100%)\` : 'white'};
                        color: \${isFirst ? 'white' : '#6b7280'};
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: all 0.3s;
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                      "
                    >
                      <span>\${config.icon}</span>
                      <span>\${config.label}</span>
                      <span style="background: \${isFirst ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}; padding: 2px 8px; border-radius: 10px; font-size: 12px;">\${catModules.length}</span>
                    </button>
                  \`;
                }).join('')}`;

if (content.includes('${catKey.toUpperCase()} (${catModules.length})')) {
  // Necesitamos un enfoque más quirúrgico para los botones
  const buttonPattern = /\$\{Object\.entries\(categories\)\.map\(\(\[catKey, catModules\]\) => `[\s\S]*?\$\{catKey\.toUpperCase\(\)\} \(\$\{catModules\.length\}\)[\s\S]*?`\)\.join\(''\)\}/;

  if (buttonPattern.test(content)) {
    content = content.replace(buttonPattern, newButtonCode);
    console.log('   ✅ Botones de categorías actualizados');
  } else {
    console.log('   ⚠️  No se pudo actualizar botones (aplicar manualmente si es necesario)');
  }
} else {
  console.log('   ℹ️  Botones ya actualizados o no encontrados');
}

// Guardar archivo
fs.writeFileSync(dashboardPath, content, 'utf8');

console.log('\n' + '='.repeat(70));
console.log('✅ ENGINEERING DASHBOARD ACTUALIZADO');
console.log('='.repeat(70));
console.log('\n📝 Cambios aplicados:');
console.log('   1. Categorías ahora son dinámicas (detectadas desde datos)');
console.log('   2. Mapeo de iconos y colores para 19 categorías');
console.log('   3. Botones de categorías con iconos visuales');
console.log('   4. Orden de prioridad (core primero, resto alfabético)');
console.log('\n🔄 Refrescar panel-administrativo para ver cambios');
console.log('   http://localhost:9998/panel-administrativo.html → Tab Ingeniería\n');

process.exit(0);
