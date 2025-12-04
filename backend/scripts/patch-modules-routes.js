const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/routes/modulesRoutes.js');
const code = fs.readFileSync(filePath, 'utf8');

// Buscar la línea donde hacer la inserción
const searchPattern = `      }

      // Ordenar por categoría y nombre`;

const replacement = `      }

      // ⚠️ IMPORTANTE: Buscar módulos contratados que NO estén en knowledgeService
      // Estos módulos se obtienen de SystemModule (base de datos)
      const addedModuleKeys = new Set(availableModules.map(m => m.module_key));
      const missingModules = activeModulesKeys.filter(key => !addedModuleKeys.has(key));

      if (missingModules.length > 0) {
        console.log(\`🔍 [DYNAMIC-MODULES] Módulos contratados NO en registry: \${missingModules.join(', ')}\`);

        const dbModules = await SystemModule.findAll({
          where: {
            moduleKey: missingModules,
            isActive: true
          }
        });

        for (const m of dbModules) {
          console.log(\`✅ [DYNAMIC-MODULES] Agregando "\${m.moduleKey}" desde BD con metadata:\`, m.metadata);
          availableModules.push({
            module_key: m.moduleKey,
            name: m.name,
            icon: m.icon || '📦',
            color: m.color || '#666',
            category: m.category || 'general',
            is_core: m.isCore,
            version: m.version || '1.0.0',
            description: m.description || '',
            frontend_file: (m.metadata?.frontend_file) || \`/js/modules/\${m.moduleKey}.js\`,
            init_function: (m.metadata?.init_function) || \`show\${capitalize(m.moduleKey)}Content\`,
            submódulos: [],
            available_in: m.availableIn
          });
        }
      }

      // Ordenar por categoría y nombre`;

if (code.includes(searchPattern)) {
  const patchedCode = code.replace(searchPattern, replacement);
  fs.writeFileSync(filePath, patchedCode, 'utf8');
  console.log('✅ Archivo parchado exitosamente');
} else {
  console.error('❌ Patrón de búsqueda no encontrado');
  process.exit(1);
}
