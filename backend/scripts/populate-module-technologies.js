/**
 * ============================================================================
 * SCRIPT: POPULAR TECNOLOGÍAS EN TODOS LOS MÓDULOS
 * ============================================================================
 *
 * PROPÓSITO:
 * - Analizar cada módulo con TechnologyDetector
 * - Generar descripción técnica (programadores)
 * - Generar descripción marketing (empresas/staff)
 * - Actualizar engineering-metadata.js automáticamente
 *
 * USO:
 * node scripts/populate-module-technologies.js
 *
 * RESULTADO:
 * - engineering-metadata.js actualizado con campo 'technologies' por módulo
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const TechnologyDetector = require('../src/services/TechnologyDetector');

const metadataPath = path.join(__dirname, '../engineering-metadata.js');

async function populateAllModules() {
  console.log('🔍 [TECH POPULATOR] Iniciando análisis de módulos...\n');

  // Leer metadata actual
  const metadataContent = fs.readFileSync(metadataPath, 'utf8');

  // Extraer el objeto (es un module.exports)
  const metadataMatch = metadataContent.match(/module\.exports\s*=\s*({[\s\S]*});?\s*$/);
  if (!metadataMatch) {
    console.error('❌ No se pudo parsear engineering-metadata.js');
    process.exit(1);
  }

  // Evaluar el objeto (seguro porque es nuestro archivo)
  const metadata = eval('(' + metadataMatch[1] + ')');

  let totalModules = 0;
  let modulesAnalyzed = 0;
  let technologiesDetected = 0;

  // Analizar cada módulo
  for (const [moduleKey, moduleData] of Object.entries(metadata.modules || {})) {
    totalModules++;

    console.log(`\n📦 Analizando: ${moduleKey}`);
    console.log(`   Nombre: ${moduleData.name}`);

    try {
      // Detectar tecnologías
      const technologies = await TechnologyDetector.analyzeModule(moduleKey, moduleData);

      // Contar tecnologías detectadas
      const techCount = Object.values(technologies).reduce((sum, arr) => sum + arr.length, 0);
      technologiesDetected += techCount;

      // Generar descripciones
      const technicalDesc = TechnologyDetector.generateTechnicalDescription(technologies);
      const marketingDesc = TechnologyDetector.generateMarketingDescription(technologies);

      // Agregar al módulo
      moduleData.technologies = {
        // Arrays de tecnologías por categoría
        backend: technologies.backend.map(t => ({
          name: t.name,
          description: t.description,
          icon: t.icon
        })),
        frontend: technologies.frontend.map(t => ({
          name: t.name,
          description: t.description,
          icon: t.icon
        })),
        database: technologies.database.map(t => ({
          name: t.name,
          description: t.description,
          icon: t.icon
        })),
        ai: technologies.ai.map(t => ({
          name: t.name,
          description: t.description,
          icon: t.icon
        })),
        apis: technologies.apis.map(t => ({
          name: t.name,
          description: t.description,
          icon: t.icon
        })),
        security: technologies.security.map(t => ({
          name: t.name,
          description: t.description,
          icon: t.icon
        })),
        realtime: technologies.realtime.map(t => ({
          name: t.name,
          description: t.description,
          icon: t.icon
        })),
        testing: technologies.testing.map(t => ({
          name: t.name,
          description: t.description,
          icon: t.icon
        })),

        // Descripciones generadas
        technical: technicalDesc,
        marketing: marketingDesc,

        // Metadata
        detectedAt: new Date().toISOString(),
        detectedCount: techCount
      };

      console.log(`   ✅ ${techCount} tecnologías detectadas`);
      console.log(`   📝 Tech: ${technicalDesc.substring(0, 80)}...`);
      console.log(`   💰 Marketing: ${marketingDesc.substring(0, 80)}...`);

      modulesAnalyzed++;

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  // Actualizar metadata general
  metadata.systemInfo = metadata.systemInfo || {};
  metadata.systemInfo.technologiesLastUpdated = new Date().toISOString();
  metadata.systemInfo.totalTechnologiesDetected = technologiesDetected;

  // Agregar stack tecnológico general del sistema
  metadata.systemInfo.technologyStack = {
    backend: [
      { name: 'Node.js', version: 'v18+', icon: '⚡' },
      { name: 'Express.js', version: '4.x', icon: '🚀' },
      { name: 'Sequelize ORM', version: '6.x', icon: '🗄️' }
    ],
    database: [
      { name: 'PostgreSQL', version: '14+', icon: '🐘' },
      { name: 'Redis', version: '6.x', icon: '⚡' }
    ],
    frontend: [
      { name: 'Vanilla JavaScript', version: 'ES6+', icon: '📜' },
      { name: 'Chart.js', version: '3.x', icon: '📊' },
      { name: 'Three.js', version: '0.140+', icon: '🎨' },
      { name: 'FullCalendar', version: '6.x', icon: '📅' }
    ],
    ai: [
      { name: 'Ollama (Llama 3.1)', version: '8B', icon: '🧠' },
      { name: 'Azure Face API', version: 'v1.0', icon: '🤖' }
    ],
    security: [
      { name: 'bcrypt', version: '5.x', icon: '🔒' },
      { name: 'JWT', version: 'jsonwebtoken 9.x', icon: '🔐' }
    ],
    realtime: [
      { name: 'Socket.IO', version: '4.x', icon: '⚡' },
      { name: 'WebSocket', version: 'Native', icon: '🔌' }
    ],
    testing: [
      { name: 'Playwright', version: '1.x', icon: '🎭' },
      { name: 'Jest', version: '29.x', icon: '✅' }
    ],
    devops: [
      { name: 'Docker', version: '20+', icon: '🐳' },
      { name: 'PM2', version: '5.x', icon: '⚙️' }
    ]
  };

  // Guardar archivo actualizado
  const newContent = `module.exports = ${JSON.stringify(metadata, null, 2)};\n`;
  fs.writeFileSync(metadataPath, newContent, 'utf8');

  // Resumen
  console.log('\n' + '='.repeat(80));
  console.log('✅ ANÁLISIS COMPLETADO\n');
  console.log(`📊 ESTADÍSTICAS:`);
  console.log(`   - Módulos totales: ${totalModules}`);
  console.log(`   - Módulos analizados: ${modulesAnalyzed}`);
  console.log(`   - Tecnologías detectadas: ${technologiesDetected}`);
  console.log(`   - Promedio por módulo: ${(technologiesDetected / modulesAnalyzed).toFixed(1)}`);
  console.log('\n📁 Archivo actualizado: engineering-metadata.js');
  console.log('='.repeat(80) + '\n');

  return {
    totalModules,
    modulesAnalyzed,
    technologiesDetected,
    metadata
  };
}

// Ejecutar
if (require.main === module) {
  populateAllModules()
    .then(result => {
      console.log('🎉 ¡Proceso completado exitosamente!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ ERROR FATAL:', error);
      process.exit(1);
    });
}

module.exports = { populateAllModules };
