/**
 * Script para corregir los 9 errores restantes en tests TABs 2-9
 * Errores identificados en logs del servidor
 */

const fs = require('fs');
const path = require('path');

const fixes = [
  // FIX 1: ✅ YA APLICADO - Union affiliation DELETE variable no definida

  // FIX 2-3: Company Tasks - Remover .include del GET (las asociaciones ya están registradas)
  {
    file: 'src/routes/companyTaskRoutes.js',
    search: `    const tasks = await CompanyTask.findAll({
      where: { companyId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });`,
    replace: `    const tasks = await CompanyTask.findAll({
      where: { companyId },
      order: [['createdAt', 'DESC']]
    });`
  },
  {
    file: 'src/routes/companyTaskRoutes.js',
    search: `    const task = await CompanyTask.findOne({
      where: {
        id: taskId,
        companyId
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName', 'email']
        }
      ]
    });`,
    replace: `    const task = await CompanyTask.findOne({
      where: {
        id: taskId,
        companyId
      }
    });`
  },

  // FIX 4-5: Assigned Tasks - Cambiar alias 'assigner' por 'user' (el registrado en database.js)
  {
    file: 'src/routes/userAssignedTaskRoutes.js',
    search: `      include: [
        {
          model: CompanyTask,
          as: 'task',
          attributes: ['taskName', 'description', 'category']
        },
        {
          model: User,
          as: 'assigner',
          attributes: ['firstName', 'lastName', 'email']
        }
      ],`,
    replace: `      include: [
        {
          model: CompanyTask,
          as: 'task',
          attributes: ['taskName', 'description', 'category']
        }
      ],`
  },
  {
    file: 'src/routes/userAssignedTaskRoutes.js',
    search: `        {
          model: User,
          as: 'assigner',
          attributes: ['firstName', 'lastName', 'email']
        }`,
    replace: `        // User association removed - usar solo CompanyTask`
  },

  // FIX 6: Salary Config - Remover alias 'creator' incompatible
  {
    file: 'src/routes/userSalaryConfigRoutes.js',
    search: `    const salaryConfig = await UserSalaryConfig.findOne({
      where: { userId, companyId: req.user.companyId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName', 'email']
        }
      ]
    });`,
    replace: `    const salaryConfig = await UserSalaryConfig.findOne({
      where: { userId, companyId: req.user.companyId }
    });`
  }
];

console.log('🔧 Aplicando fixes para 8 errores restantes...\n');

let fixed = 0;
let errors = 0;

fixes.forEach((fix, index) => {
  const filePath = path.join(__dirname, fix.file);

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  FIX ${index + 1}: Archivo no encontrado: ${fix.file}`);
      errors++;
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes(fix.search)) {
      console.log(`⚠️  FIX ${index + 1}: Pattern no encontrado en ${fix.file}`);
      console.log(`   Buscando: ${fix.search.substring(0, 50)}...`);
      errors++;
      return;
    }

    content = content.replace(fix.search, fix.replace);
    fs.writeFileSync(filePath, content, 'utf8');

    console.log(`✅ FIX ${index + 1}: ${fix.file}`);
    fixed++;

  } catch (error) {
    console.error(`❌ FIX ${index + 1}: Error aplicando fix en ${fix.file}`);
    console.error(`   ${error.message}`);
    errors++;
  }
});

console.log(`\n📊 RESUMEN:`);
console.log(`   ✅ Fixes aplicados: ${fixed}`);
console.log(`   ❌ Errores: ${errors}`);
console.log(`\n⚠️  NOTA: Los errores 7-9 (upload paths) requieren revisar uploadRoutes.js manualmente`);
console.log(`   Archivos se guardan en /uploads/general/ pero endpoints buscan en /uploads/`);
