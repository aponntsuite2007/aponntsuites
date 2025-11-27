/**
 * Fix: Actualizar validación de departments para respetar multi_branch_enabled
 * Ejecutar: node scripts/fix-department-multibranch-validation.js
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');

function fixValidation() {
    console.log('Corrigiendo validacion de multi-branch en server.js...\n');

    let content = fs.readFileSync(serverPath, 'utf8');

    // El patrón a buscar (la validación problemática)
    const oldPattern = `// LÓGICA MULTI-SUCURSAL: Verificar duplicados según si la empresa tiene sucursales
    const [branches] = await database.sequelize.query(
      'SELECT COUNT(*) as total FROM branches WHERE company_id = 1 AND "isActive" = true'
    );
    const hasBranches = branches[0].total > 0;

    if (hasBranches) {
      // Si tiene sucursales, verificar que branch_id sea obligatorio
      if (!deptData.branchId) {
        return res.status(400).json({
          success: false,
          error: 'Debe seleccionar una sucursal. La empresa tiene múltiples sucursales.'
        });
      }

      // Verificar que no exista otro departamento con el mismo nombre EN LA MISMA SUCURSAL
      const existingDept = await Department.findOne({
        where: {
          name: deptData.name.trim(),
          branch_id: deptData.branchId,
          company_id: 1,
          is_active: true
        }
      });

      if (existingDept) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un departamento con ese nombre en esta sucursal'
        });
      }
    } else {
      // Si NO tiene sucursales, verificar que no exista el nombre en la empresa
      const existingDept = await Department.findOne({
        where: {
          name: deptData.name.trim(),
          company_id: 1,
          is_active: true
        }
      });

      if (existingDept) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un departamento con ese nombre'
        });
      }
    }`;

    const newPattern = `// LÓGICA MULTI-SUCURSAL: Verificar según multi_branch_enabled de la empresa
    // Obtener company_id del usuario autenticado o usar 1 como fallback
    const companyId = req.user?.companyId || 1;

    // Verificar si la empresa tiene multi_branch_enabled = true
    const [companyConfig] = await database.sequelize.query(
      'SELECT multi_branch_enabled FROM companies WHERE company_id = $1',
      { bind: [companyId], type: database.sequelize.QueryTypes.SELECT }
    );
    const multiBranchEnabled = companyConfig?.multi_branch_enabled === true;

    if (multiBranchEnabled) {
      // Solo si multi_branch_enabled = true, verificar branch_id
      const [branches] = await database.sequelize.query(
        'SELECT COUNT(*) as total FROM company_branches WHERE company_id = $1 AND is_active = true',
        { bind: [companyId] }
      );
      const hasBranches = parseInt(branches[0]?.total || 0) > 0;

      if (hasBranches && !deptData.branchId) {
        return res.status(400).json({
          success: false,
          error: 'Debe seleccionar una sucursal. La empresa tiene multi-branch habilitado.'
        });
      }

      if (deptData.branchId) {
        // Verificar que no exista otro departamento con el mismo nombre EN LA MISMA SUCURSAL
        const existingDept = await Department.findOne({
          where: {
            name: deptData.name.trim(),
            branch_id: deptData.branchId,
            company_id: companyId,
            is_active: true
          }
        });

        if (existingDept) {
          return res.status(400).json({
            success: false,
            error: 'Ya existe un departamento con ese nombre en esta sucursal'
          });
        }
      }
    }

    // Verificar que no exista el nombre en la empresa (globales o sin multi-branch)
    const whereClause = {
      name: deptData.name.trim(),
      company_id: companyId,
      is_active: true
    };
    if (!multiBranchEnabled) {
      whereClause.branch_id = null; // Solo verificar departamentos globales
    }

    const existingDept = await Department.findOne({ where: whereClause });

    if (existingDept) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un departamento con ese nombre'
      });
    }`;

    if (content.includes('Debe seleccionar una sucursal. La empresa tiene múltiples sucursales.')) {
        content = content.replace(oldPattern, newPattern);
        fs.writeFileSync(serverPath, content, 'utf8');
        console.log('Validacion de multi-branch corregida en server.js');
        console.log('\nCambios realizados:');
        console.log('  - Ahora verifica multi_branch_enabled en vez de solo existencia de branches');
        console.log('  - Solo requiere branch_id si multi_branch_enabled = true');
        console.log('  - Usa company_branches en vez de branches');
        console.log('  - Usa company_id dinamico del usuario');
    } else if (content.includes('multi_branch_enabled')) {
        console.log('El fix ya fue aplicado anteriormente');
    } else {
        console.log('No se encontro el patron a reemplazar. Verificar manualmente.');
    }
}

fixValidation();
