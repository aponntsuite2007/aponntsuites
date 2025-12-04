const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/routes/modulesRoutes.js');
let code = fs.readFileSync(filePath, 'utf8');

// Buscar el bloque donde se construye el objeto de módulo
const oldPattern = `        // Construir objeto de módulo para frontend
        // Prioridad: campos directos > objeto frontend > fallback generado
        availableModules.push({
          module_key: moduleKey,
          name: metadata.name || moduleKey,
          icon: metadata.icon || '📦',
          color: metadata.color || '#666',
          category: metadata.category || 'general',
          is_core: isCore,
          version: metadata.version || '1.0.0',
          description: metadata.description?.short || '',
          frontend_file: metadata.frontend_file || metadata.frontend?.file || \`/js/modules/\${moduleKey}.js\`,
          init_function: metadata.init_function || metadata.frontend?.init_function || \`show\${capitalize(moduleKey)}Content\`,
          submódulos: metadata.submódulos || [],
          available_in: availableIn
        });
      }`;

const newPattern = `        // Construir objeto de módulo para frontend
        // Prioridad: campos directos > objeto frontend > fallback generado
        // ⚠️ IMPORTANTE: Para frontend_file, verificar BD primero
        let frontendFile = metadata.frontend_file || metadata.frontend?.file;
        let initFunction = metadata.init_function || metadata.frontend?.init_function;

        // Si no tiene frontend_file definido, buscar en BD
        if (!frontendFile || frontendFile === \`/js/modules/\${moduleKey}.js\`) {
          try {
            const dbModule = await SystemModule.findOne({
              where: { moduleKey: moduleKey }
            });
            if (dbModule && dbModule.metadata) {
              if (dbModule.metadata.frontend_file) {
                frontendFile = dbModule.metadata.frontend_file;
                console.log(\`🔧 [DYNAMIC-MODULES] Usando frontend_file de BD para "\${moduleKey}": \${frontendFile}\`);
              }
              if (dbModule.metadata.init_function) {
                initFunction = dbModule.metadata.init_function;
              }
            }
          } catch (dbError) {
            console.warn(\`⚠️  [DYNAMIC-MODULES] Error consultando BD para "\${moduleKey}":\`, dbError.message);
          }
        }

        availableModules.push({
          module_key: moduleKey,
          name: metadata.name || moduleKey,
          icon: metadata.icon || '📦',
          color: metadata.color || '#666',
          category: metadata.category || 'general',
          is_core: isCore,
          version: metadata.version || '1.0.0',
          description: metadata.description?.short || '',
          frontend_file: frontendFile || \`/js/modules/\${moduleKey}.js\`,
          init_function: initFunction || \`show\${capitalize(moduleKey)}Content\`,
          submódulos: metadata.submódulos || [],
          available_in: availableIn
        });
      }`;

if (code.includes(oldPattern)) {
  code = code.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('✅ Archivo parchado exitosamente (V2 - con verificación BD)');
} else {
  console.error('❌ Patrón de búsqueda no encontrado');
  console.log('Buscando versión simplificada...');

  // Intentar con patrón más simple
  const simpleOld = `frontend_file: metadata.frontend_file || metadata.frontend?.file || \`/js/modules/\${moduleKey}.js\`,`;
  const simpleNew = `frontend_file: await getFrontendFile(moduleKey, metadata, SystemModule) || \`/js/modules/\${moduleKey}.js\`,`;

  if (code.includes(simpleOld)) {
    // Primero agregar la función helper al principio del bloque
    const helperFunction = `
  // Helper: Obtener frontend_file con prioridad BD
  async function getFrontendFile(moduleKey, metadata, SystemModule) {
    let frontendFile = metadata.frontend_file || metadata.frontend?.file;

    if (!frontendFile || frontendFile === \`/js/modules/\${moduleKey}.js\`) {
      try {
        const dbModule = await SystemModule.findOne({ where: { moduleKey } });
        if (dbModule?.metadata?.frontend_file) {
          console.log(\`🔧 [DYNAMIC-MODULES] BD override for "\${moduleKey}": \${dbModule.metadata.frontend_file}\`);
          return dbModule.metadata.frontend_file;
        }
      } catch (err) {
        console.warn(\`⚠️  [DYNAMIC-MODULES] DB error for "\${moduleKey}":\`, err.message);
      }
    }
    return frontendFile;
  }
`;

    // Buscar dónde insertar la función (antes del for loop)
    const insertPoint = code.indexOf('for (const [moduleKey, metadata] of knowledgeService.metadata.entries()) {');
    if (insertPoint > 0) {
      code = code.substring(0, insertPoint) + helperFunction + '\n' + code.substring(insertPoint);
      code = code.replace(simpleOld, simpleNew);
      fs.writeFileSync(filePath, code, 'utf8');
      console.log('✅ Archivo parchado exitosamente (V2 - helper function method)');
    } else {
      console.error('❌ No se pudo encontrar el punto de inserción');
      process.exit(1);
    }
  } else {
    console.error('❌ Ningún patrón coincide');
    process.exit(1);
  }
}
