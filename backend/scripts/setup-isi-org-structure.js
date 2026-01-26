/**
 * Configurar estructura organizacional completa para ISI
 * - Organigrama con jerarquía real
 * - Asignar posiciones a todos los empleados
 * - Configurar cadena de aprobación para escalamiento
 */
const { Sequelize } = require('sequelize');
const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', { logging: false });

const COMPANY_ID = 11;

async function setup() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     CONFIGURACIÓN ESTRUCTURA ORGANIZACIONAL ISI                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // 1. Limpiar posiciones anteriores mal configuradas
  console.log('═══ PASO 1: Limpiar posiciones anteriores ═══');
  // Primero desasignar usuarios
  await seq.query(`UPDATE users SET organizational_position_id = NULL WHERE company_id = ${COMPANY_ID}`);
  await seq.query(`DELETE FROM organizational_positions WHERE company_id = ${COMPANY_ID}`);
  console.log('   ✅ Posiciones anteriores eliminadas');

  // 2. Crear estructura jerárquica real
  console.log('\n═══ PASO 2: Crear organigrama jerárquico ═══');

  const positions = [
    // Nivel 0 - Dirección
    { code: 'CEO', name: 'Director General', level: 0, parent: null },

    // Nivel 1 - Gerencias
    { code: 'GER-RRHH', name: 'Gerente de RRHH', level: 1, parent: 'CEO' },
    { code: 'GER-OPS', name: 'Gerente de Operaciones', level: 1, parent: 'CEO' },
    { code: 'GER-FIN', name: 'Gerente de Finanzas', level: 1, parent: 'CEO' },
    { code: 'GER-TEC', name: 'Gerente de Tecnología', level: 1, parent: 'CEO' },

    // Nivel 2 - Jefaturas
    { code: 'JEF-ADM', name: 'Jefe de Administración', level: 2, parent: 'GER-RRHH' },
    { code: 'JEF-PROD', name: 'Jefe de Producción', level: 2, parent: 'GER-OPS' },
    { code: 'JEF-LOG', name: 'Jefe de Logística', level: 2, parent: 'GER-OPS' },
    { code: 'JEF-CAL', name: 'Jefe de Calidad', level: 2, parent: 'GER-OPS' },
    { code: 'JEF-CONT', name: 'Jefe de Contabilidad', level: 2, parent: 'GER-FIN' },

    // Nivel 3 - Supervisores
    { code: 'SUP-PROD-M', name: 'Supervisor Producción Mañana', level: 3, parent: 'JEF-PROD' },
    { code: 'SUP-PROD-T', name: 'Supervisor Producción Tarde', level: 3, parent: 'JEF-PROD' },
    { code: 'SUP-PROD-N', name: 'Supervisor Producción Noche', level: 3, parent: 'JEF-PROD' },
    { code: 'SUP-LOG', name: 'Supervisor Logística', level: 3, parent: 'JEF-LOG' },
    { code: 'SUP-CAL', name: 'Supervisor Calidad', level: 3, parent: 'JEF-CAL' },

    // Nivel 4 - Operativos
    { code: 'OP-PROD', name: 'Operario Producción', level: 4, parent: null }, // Se asigna dinámicamente
    { code: 'OP-LOG', name: 'Operario Logística', level: 4, parent: 'SUP-LOG' },
    { code: 'OP-CAL', name: 'Inspector Calidad', level: 4, parent: 'SUP-CAL' },
    { code: 'ADM-GEN', name: 'Administrativo General', level: 4, parent: 'JEF-ADM' },
  ];

  const positionIds = {};

  for (const pos of positions) {
    const [result] = await seq.query(`
      INSERT INTO organizational_positions (company_id, position_code, position_name, level_order, parent_position_id, created_at, updated_at)
      VALUES (${COMPANY_ID}, :code, :name, :level, NULL, NOW(), NOW())
      RETURNING id
    `, { replacements: { code: pos.code, name: pos.name, level: pos.level } });

    positionIds[pos.code] = result[0].id;
    console.log(`   ✅ ${pos.name} (nivel ${pos.level})`);
  }

  // 3. Actualizar parent_position_id
  console.log('\n═══ PASO 3: Configurar jerarquía (parent_position_id) ═══');
  for (const pos of positions) {
    if (pos.parent && positionIds[pos.parent]) {
      await seq.query(`
        UPDATE organizational_positions
        SET parent_position_id = :parentId
        WHERE id = :id
      `, { replacements: { parentId: positionIds[pos.parent], id: positionIds[pos.code] } });
    }
  }
  console.log('   ✅ Jerarquía configurada');

  // 4. Obtener empleados y asignar posiciones
  console.log('\n═══ PASO 4: Asignar posiciones a empleados ═══');

  const [employees] = await seq.query(`
    SELECT user_id, "firstName", "lastName", role
    FROM users WHERE company_id = ${COMPANY_ID}
    ORDER BY role DESC, user_id
  `);

  let assigned = 0;
  const adminUsers = employees.filter(e => e.role === 'admin');
  const employeeUsers = employees.filter(e => e.role === 'employee');

  // Asignar admins a posiciones de liderazgo
  const leadershipPositions = ['CEO', 'GER-RRHH', 'GER-OPS', 'GER-FIN', 'GER-TEC',
                               'JEF-ADM', 'JEF-PROD', 'JEF-LOG', 'JEF-CAL', 'JEF-CONT'];

  for (let i = 0; i < Math.min(adminUsers.length, leadershipPositions.length); i++) {
    await seq.query(`
      UPDATE users SET organizational_position_id = :posId WHERE user_id = :userId
    `, { replacements: { posId: positionIds[leadershipPositions[i]], userId: adminUsers[i].user_id } });
    assigned++;
  }
  console.log(`   ✅ ${assigned} admins asignados a posiciones de liderazgo`);

  // Asignar empleados a posiciones operativas (rotando)
  const operativePositions = ['SUP-PROD-M', 'SUP-PROD-T', 'SUP-PROD-N', 'SUP-LOG', 'SUP-CAL',
                              'OP-PROD', 'OP-LOG', 'OP-CAL', 'ADM-GEN'];

  let empAssigned = 0;
  for (let i = 0; i < employeeUsers.length; i++) {
    const posCode = operativePositions[i % operativePositions.length];
    await seq.query(`
      UPDATE users SET organizational_position_id = :posId WHERE user_id = :userId
    `, { replacements: { posId: positionIds[posCode], userId: employeeUsers[i].user_id } });
    empAssigned++;
  }
  console.log(`   ✅ ${empAssigned} empleados asignados a posiciones operativas`);

  // 5. Verificar asignaciones
  console.log('\n═══ PASO 5: Verificar estructura ═══');
  const [verification] = await seq.query(`
    SELECT op.position_name, op.level_order, COUNT(u.user_id) as usuarios
    FROM organizational_positions op
    LEFT JOIN users u ON u.organizational_position_id = op.id
    WHERE op.company_id = ${COMPANY_ID}
    GROUP BY op.id, op.position_name, op.level_order
    ORDER BY op.level_order, op.position_name
  `);

  verification.forEach(v => {
    console.log(`   Nivel ${v.level_order}: ${v.position_name} (${v.usuarios} usuarios)`);
  });

  // 6. Crear/actualizar supervisores en la tabla de aprobadores
  console.log('\n═══ PASO 6: Configurar aprobadores de tardanzas ═══');

  // Los jefes y gerentes pueden aprobar tardanzas
  const approverPositions = ['CEO', 'GER-RRHH', 'GER-OPS', 'JEF-PROD', 'JEF-LOG', 'JEF-CAL', 'JEF-ADM',
                             'SUP-PROD-M', 'SUP-PROD-T', 'SUP-PROD-N', 'SUP-LOG', 'SUP-CAL'];

  for (const posCode of approverPositions) {
    await seq.query(`
      UPDATE users
      SET can_authorize_late_arrivals = true
      WHERE organizational_position_id = :posId AND company_id = ${COMPANY_ID}
    `, { replacements: { posId: positionIds[posCode] } });
  }

  const [[approverCount]] = await seq.query(`
    SELECT COUNT(*) as c FROM users
    WHERE company_id = ${COMPANY_ID} AND can_authorize_late_arrivals = true
  `);
  console.log(`   ✅ ${approverCount.c} usuarios configurados como aprobadores de tardanzas`);

  console.log('\n✅ Estructura organizacional configurada correctamente');
  await seq.close();
}

setup().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
