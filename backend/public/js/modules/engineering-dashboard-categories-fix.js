/**
 * FIX CATEGORIES - Engineering Dashboard
 * Este archivo contiene el código actualizado para categorías dinámicas
 * Debe reemplazar la función loadCommercialModulesView() en engineering-dashboard.js
 */

// CÓDIGO A INSERTAR EN loadCommercialModulesView() después de línea 3712:

/*
      const { modules, bundles, stats, version, lastSync } = result.data;
      const modulesArray = Object.values(modules);

      // Mapeo de categorías con iconos y colores
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
          console.log(`  ✓ ${catKey}: ${categories[catKey].length} módulos`);
        }
      });

      // Luego agregar cualquier categoría no mapeada (alfabético)
      Array.from(categoriesSet)
        .filter(cat => !categoryOrder.includes(cat))
        .sort()
        .forEach(catKey => {
          categories[catKey] = modulesArray.filter(m => m.category === catKey);
          console.log(`  ✓ ${catKey} (no mapeada): ${categories[catKey].length} módulos`);

          // Asignar config por defecto para categorías no mapeadas
          if (!categoryConfig[catKey]) {
            categoryConfig[catKey] = {
              icon: '📦',
              color: '#9ca3af',
              label: catKey.charAt(0).toUpperCase() + catKey.slice(1)
            };
          }
        });

      console.log(`📊 [COMMERCIAL] Total categorías: ${Object.keys(categories).length}`);
      console.log(`📊 [COMMERCIAL] Total módulos: ${modulesArray.length}`);
*/

// TAMBIÉN ACTUALIZAR LA SECCIÓN DE RENDERIZADO DE TABS (línea ~3771):

/*
BUSCAR ESTO:
  ${Object.entries(categories).map(([catKey, catModules]) => `

REEMPLAZAR CON:
  ${Object.entries(categories).map(([catKey, catModules], index) => {
    const config = categoryConfig[catKey] || { icon: '📦', color: '#9ca3af', label: catKey };
    const isFirst = index === 0;

    return `
    <button
      class="commercial-cat-btn ${isFirst ? 'active' : ''}"
      data-category="${catKey}"
      style="
        padding: 10px 20px;
        border: 2px solid ${isFirst ? config.color : '#e5e7eb'};
        background: ${isFirst ? `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)` : 'white'};
        color: ${isFirst ? 'white' : '#6b7280'};
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
      <span>${config.icon}</span>
      <span>${config.label}</span>
      <span style="background: ${isFirst ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}; padding: 2px 8px; border-radius: 10px; font-size: 12px;">${catModules.length}</span>
    </button>
  `}).join('')}
*/

console.log('📝 Ver este archivo para código actualizado de categorías dinámicas');
console.log('Aplicar manualmente en engineering-dashboard.js');
