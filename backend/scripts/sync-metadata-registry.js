/**
 * Script de sincronización: engineering-metadata.js → modules-registry.json
 *
 * Mantiene actualizado el registry de módulos con la información más reciente
 * del engineering-metadata (dependencies, knownIssues, etc.)
 */

const fs = require('fs');
const path = require('path');

const engineeringMetadata = require('../engineering-metadata');
const modulesRegistryPath = path.join(__dirname, '../src/auditor/registry/modules-registry.json');

function syncMetadataToRegistry() {
  console.log('🔄 Sincronizando engineering-metadata.js → modules-registry.json...\n');

  // Cargar registry actual
  const registryData = JSON.parse(fs.readFileSync(modulesRegistryPath, 'utf8'));
  const modulesRegistry = registryData.modules || [];

  let updatedCount = 0;
  let newCount = 0;

  // Por cada módulo en engineering-metadata
  for (const [key, engineeringModule] of Object.entries(engineeringMetadata.modules)) {

    // Buscar en modules-registry
    let registryModule = modulesRegistry.find(m => m.id === key);

    // Si NO existe en registry → CREAR
    if (!registryModule) {
      console.log(`➕ Creando módulo "${key}" en registry...`);

      registryModule = {
        id: key,
        name: engineeringModule.name,
        category: engineeringModule.category.toLowerCase(),
        version: "1.0.0",
        description: engineeringModule.description || "",
        dependencies: engineeringModule.dependencies || { required: [], optional: [], integrates_with: [], provides_to: [] },
        api: engineeringModule.api || { base_path: "", endpoints: [] },
        database: engineeringModule.database || { tables: [], modifications: [] },
        help: {
          quickStart: "Tutorial pendiente",
          commonIssues: []
        },
        commercial: {
          is_core: engineeringModule.category === 'CORE',
          can_work_standalone: false,
          base_price_usd: 0
        }
      };

      modulesRegistry.push(registryModule);
      newCount++;

    } else {
      console.log(`🔄 Actualizando módulo "${key}" en registry...`);
      updatedCount++;
    }

    // SINCRONIZAR CAMPOS CRÍTICOS
    registryModule.name = engineeringModule.name;
    registryModule.description = engineeringModule.description || registryModule.description;
    registryModule.dependencies = engineeringModule.dependencies || registryModule.dependencies;
    registryModule.database = engineeringModule.database || registryModule.database;

    // Si hay knownIssues en engineering → agregar a commonIssues
    if (engineeringModule.knownIssues && engineeringModule.knownIssues.length > 0) {
      if (!registryModule.help) registryModule.help = { quickStart: "", commonIssues: [] };

      engineeringModule.knownIssues.forEach(issue => {
        const existingIssue = registryModule.help.commonIssues.find(i => i.problem === issue.description);
        if (!existingIssue) {
          registryModule.help.commonIssues.push({
            problem: issue.description,
            solution: issue.workaround || "Contactar a soporte técnico"
          });
        }
      });
    }
  }

  // Actualizar metadata del registry
  registryData.modules = modulesRegistry;
  registryData.total_modules = modulesRegistry.length;
  registryData.generated_at = new Date().toISOString().split('T')[0];

  // Guardar registry actualizado
  fs.writeFileSync(
    modulesRegistryPath,
    JSON.stringify(registryData, null, 2),
    'utf8'
  );

  console.log(`\n✅ Sincronización completa:`);
  console.log(`   - Módulos nuevos: ${newCount}`);
  console.log(`   - Módulos actualizados: ${updatedCount}`);
  console.log(`   - Total en registry: ${modulesRegistry.length}`);
}

// Ejecutar
syncMetadataToRegistry();
