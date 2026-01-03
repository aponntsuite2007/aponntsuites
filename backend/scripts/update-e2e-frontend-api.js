/**
 * Script para actualizar e2e-testing-control-v2.js
 * Cambia de JSON estático a API en tiempo real
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/e2e-testing-control-v2.js');

console.log('📝 Actualizando E2E Testing frontend para usar API en tiempo real...\n');

let content = fs.readFileSync(filePath, 'utf8');

// NUEVO CÓDIGO: loadModulesRegistry() que usa API
const newLoadModulesRegistry = `  /**
   * Cargar registry de módulos desde API en tiempo real
   */
  async loadModulesRegistry() {
    try {
      // Llamar a API en tiempo real (datos desde audit_test_logs)
      const response = await fetch('/api/e2e-testing/modules-status', {
        headers: {
          'Authorization': \`Bearer \${localStorage.getItem('authToken')}\`
        }
      });

      if (!response.ok) {
        throw new Error('API no disponible');
      }

      const apiData = await response.json();

      if (!apiData.success || !apiData.data.modules) {
        throw new Error('Datos inválidos de API');
      }

      // Transformar datos de API a formato de registry con categorías
      this.modulesRegistry = this.transformAPIToRegistry(apiData.data);

      console.log(\`   ✅ Registry cargado desde API: \${this.modulesRegistry.statistics.totalModules} módulos\`);

    } catch (err) {
      console.warn('   ⚠️  API no disponible, usando fallback:', err.message);

      // Fallback: crear registry mínimo
      this.modulesRegistry = {
        categories: [
          {
            id: 'panel-empresa-core',
            name: '🏢 Panel Empresa - Módulos CORE',
            description: 'Módulos esenciales del panel de empresa',
            priority: 'HIGH',
            modules: [
              { key: 'users', name: 'Gestión de Usuarios', hasConfig: true, estimatedTime: '90s' },
              { key: 'departments', name: 'Departamentos', hasConfig: true, estimatedTime: '60s' }
            ]
          }
        ],
        statistics: { totalModules: 2 }
      };
    }
  },

  /**
   * Transformar datos de API a formato de registry con categorías
   */
  transformAPIToRegistry(apiData) {
    const modules = apiData.modules || [];

    // Definir categorías basadas en prefijos/patrones de nombres
    const categoryMap = {
      'panel-empresa-core': {
        name: '🏢 Panel Empresa - Módulos CORE',
        description: 'Módulos esenciales de gestión empresarial',
        priority: 'CRITICAL',
        keywords: ['users', 'departments', 'attendance', 'dashboard']
      },
      'automation': {
        name: '🤖 Automatización & Brain',
        description: 'Módulos de automatización e inteligencia',
        priority: 'HIGH',
        keywords: ['auto-healing', 'testing-metrics', 'engineering', 'deploy']
      },
      'communication': {
        name: '💬 Comunicación & Notificaciones',
        description: 'Módulos de mensajería y notificaciones',
        priority: 'MEDIUM',
        keywords: ['notification', 'inbox', 'email']
      },
      'hr-biometric': {
        name: '👤 RRHH & Biométrico',
        description: 'Gestión de recursos humanos y control biométrico',
        priority: 'HIGH',
        keywords: ['biometric', 'consent', 'mi-espacio', 'vendor']
      },
      'integrations': {
        name: '🔗 Integraciones & Partners',
        description: 'Módulos de asociados y marketplace',
        priority: 'MEDIUM',
        keywords: ['partner', 'associate', 'marketplace']
      },
      'enterprise': {
        name: '🏢 Empresarial & Admin',
        description: 'Gestión empresarial y configuración',
        priority: 'HIGH',
        keywords: ['company', 'admin', 'organizational', 'roles', 'configurador']
      },
      'technical': {
        name: '🔧 Técnicos & Sync',
        description: 'Módulos técnicos y sincronización',
        priority: 'LOW',
        keywords: ['database-sync', 'deployment-sync', 'dms', 'hours-cube', 'support', 'phase4']
      }
    };

    // Crear objeto de categorías
    const categories = {};
    Object.keys(categoryMap).forEach(catId => {
      categories[catId] = {
        id: catId,
        name: categoryMap[catId].name,
        description: categoryMap[catId].description,
        priority: categoryMap[catId].priority,
        modules: []
      };
    });

    // Categoría por defecto para módulos no clasificados
    categories['others'] = {
      id: 'others',
      name: '📦 Otros Módulos',
      description: 'Módulos adicionales del sistema',
      priority: 'LOW',
      modules: []
    };

    // Asignar módulos a categorías
    modules.forEach(mod => {
      let assigned = false;

      // Buscar en qué categoría encaja el módulo
      for (const [catId, catInfo] of Object.entries(categoryMap)) {
        if (catInfo.keywords.some(keyword => mod.moduleName.includes(keyword))) {
          categories[catId].modules.push({
            key: mod.moduleName,
            name: this.formatModuleName(mod.moduleName),
            hasConfig: true,
            estimatedTime: \`\${Math.round(mod.avgDuration / 1000)}s\`,
            // Datos en tiempo real desde API
            totalTests: mod.totalTests,
            passed: mod.passed,
            failed: mod.failed,
            successRate: mod.successRate,
            lastTestAt: mod.lastTestAt,
            status: mod.status
          });
          assigned = true;
          break;
        }
      }

      // Si no encaja en ninguna categoría, va a "others"
      if (!assigned) {
        categories['others'].modules.push({
          key: mod.moduleName,
          name: this.formatModuleName(mod.moduleName),
          hasConfig: true,
          estimatedTime: \`\${Math.round(mod.avgDuration / 1000)}s\`,
          totalTests: mod.totalTests,
          passed: mod.passed,
          failed: mod.failed,
          successRate: mod.successRate,
          lastTestAt: mod.lastTestAt,
          status: mod.status
        });
      }
    });

    // Filtrar categorías vacías
    const finalCategories = Object.values(categories).filter(cat => cat.modules.length > 0);

    return {
      categories: finalCategories,
      statistics: {
        totalModules: modules.length,
        lastUpdate: new Date().toISOString(),
        source: 'API-REAL-TIME'
      }
    };
  },

  /**
   * Formatear nombre de módulo (de snake-case a Title Case)
   */
  formatModuleName(moduleKey) {
    return moduleKey
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },`;

// Buscar la función loadModulesRegistry actual (hasta el siguiente comentario /**...)
const functionPattern = /async loadModulesRegistry\(\) \{[\s\S]*?\n  \},\n\n  \/\*\*/;

// Reemplazar con nueva función
if (!content.match(functionPattern)) {
  console.error('❌ No se encontró la función loadModulesRegistry()');
  console.error('Buscando patrón alternativo...');

  // Intentar patrón más simple
  const simplePattern = /async loadModulesRegistry\(\)[\s\S]*?\n  \},/;
  if (!content.match(simplePattern)) {
    console.error('❌ Tampoco se encontró con patrón simple');
    process.exit(1);
  }
}

// Verificar si ya fue actualizado
if (content.includes('transformAPIToRegistry')) {
  console.log('✅ El archivo ya fue actualizado con la API en tiempo real');
  process.exit(0);
}

// Reemplazar la función completa
// Incluir el comentario siguiente para mantener la estructura
content = content.replace(
  /async loadModulesRegistry\(\) \{[\s\S]*?\n  \},\n\n  \/\*\*/,
  newLoadModulesRegistry + '\n\n  /**'
);

// Escribir archivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ E2E Testing frontend actualizado');
console.log('   ✅ loadModulesRegistry() ahora usa /api/e2e-testing/modules-status');
console.log('   ✅ Agrupa módulos en categorías automáticamente');
console.log('   ✅ Muestra datos en tiempo real desde audit_test_logs');
console.log('   ✅ Fallback si API no disponible\n');
console.log('🎯 El tab "E2E Testing Advanced V2" ahora funcionará correctamente');
console.log('   Refresh del navegador para ver cambios: http://localhost:9998/panel-empresa.html\n');
