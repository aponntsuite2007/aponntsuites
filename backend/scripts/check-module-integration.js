const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

async function checkIntegration() {
  await sequelize.authenticate();

  // Get all modules with workflows
  const modules = await sequelize.query(`
    SELECT DISTINCT module
    FROM notification_workflows
    WHERE is_active = true
    ORDER BY module
  `, { type: QueryTypes.SELECT });

  console.log('🔍 ANÁLISIS DE INTEGRACIÓN REAL - MÓDULO POR MÓDULO\n');
  console.log('Módulo'.padEnd(20) + 'Workflows'.padEnd(12) + 'Integrado');
  console.log('─'.repeat(50));

  let integrated = 0;
  let notIntegrated = 0;
  const integratedList = [];
  const notIntegratedList = [];

  for (const mod of modules) {
    const modName = mod.module;

    // Count workflows for this module
    const [count] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM notification_workflows
      WHERE module = :module AND is_active = true
    `, {
      replacements: { module: modName },
      type: QueryTypes.SELECT
    });

    // Check if any service file for this module uses NCE
    const servicesDir = path.join(__dirname, '..', 'src', 'services');
    const routesDir = path.join(__dirname, '..', 'src', 'routes');
    const workflowsDir = path.join(__dirname, '..', 'src', 'workflows');

    let hasIntegration = false;
    const moduleNameCapitalized = modName.charAt(0).toUpperCase() + modName.slice(1);

    try {
      // Search in services
      const files = fs.readdirSync(servicesDir);
      for (const file of files) {
        const fileLower = file.toLowerCase();
        const modLower = modName.toLowerCase();

        if (fileLower.includes(modLower) ||
            (modName === 'hse' && fileLower.includes('hse')) ||
            (modName === 'vacation' && fileLower.includes('vacation')) ||
            (modName === 'legal' && fileLower.includes('legal')) ||
            (modName === 'medical' && fileLower.includes('medical'))) {

          const filePath = path.join(servicesDir, file);
          if (fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath, 'utf8');
            // Buscar uso directo de NCE o uso de clases de integración
            if (content.includes('NotificationCentralExchange') ||
                content.includes('NCE.send') ||
                content.includes(`${moduleNameCapitalized}Notifications`) ||
                content.includes(`integrations/${modName}-notifications`)) {
              hasIntegration = true;
              break;
            }
          }
        }
      }

      // Search in routes
      if (!hasIntegration && fs.existsSync(routesDir)) {
        const routeFiles = fs.readdirSync(routesDir);
        for (const file of routeFiles) {
          const fileLower = file.toLowerCase();
          const modLower = modName.toLowerCase();
          // Manejar singular/plural: documents → document, suppliers → supplier
          const modSingular = modLower.endsWith('s') ? modLower.slice(0, -1) : modLower;

          if (fileLower.includes(modLower) || fileLower.includes(modSingular)) {
            const filePath = path.join(routesDir, file);
            if (fs.statSync(filePath).isFile()) {
              const content = fs.readFileSync(filePath, 'utf8');
              // Buscar uso directo de NCE o uso de clases de integración
              if (content.includes('NotificationCentralExchange') ||
                  content.includes('NCE.send') ||
                  content.includes(`${moduleNameCapitalized}Notifications`) ||
                  content.includes(`integrations/${modName}-notifications`)) {
                hasIntegration = true;
                break;
              }
            }
          }
        }
      }

      // Search in workflows/generated
      if (!hasIntegration && fs.existsSync(workflowsDir)) {
        const genDir = path.join(workflowsDir, 'generated');
        if (fs.existsSync(genDir)) {
          const wfFiles = fs.readdirSync(genDir);
          for (const file of wfFiles) {
            if (file.toLowerCase().includes(modName.toLowerCase())) {
              const content = fs.readFileSync(path.join(genDir, file), 'utf8');
              if (content.includes('NotificationCentralExchange') || content.includes('NCE.send')) {
                hasIntegration = true;
                break;
              }
            }
          }
        }
      }
    } catch (err) {
      // Ignore errors
    }

    const status = hasIntegration ? '✅ SÍ' : '❌ NO';
    console.log(
      modName.padEnd(20) +
      count.count.toString().padEnd(12) +
      status
    );

    if (hasIntegration) {
      integrated++;
      integratedList.push(modName);
    } else {
      notIntegrated++;
      notIntegratedList.push(modName);
    }
  }

  console.log('─'.repeat(50));
  console.log('\n📊 RESUMEN:');
  console.log(`   ✅ Integrados: ${integrated}/${modules.length} módulos`);
  console.log(`   ❌ Pendientes: ${notIntegrated}/${modules.length} módulos`);

  const percentage = Math.round((integrated / modules.length) * 100);
  console.log(`   📈 Porcentaje: ${percentage}%`);

  console.log('\n✅ MÓDULOS INTEGRADOS:');
  integratedList.forEach(m => console.log(`   - ${m}`));

  console.log('\n❌ MÓDULOS PENDIENTES DE INTEGRACIÓN:');
  notIntegratedList.forEach(m => console.log(`   - ${m}`));

  process.exit(0);
}

checkIntegration();
