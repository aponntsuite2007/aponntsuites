const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
  });

  console.log('🔧 FIX: Consolidar columnas duplicadas de departamento y sucursal\n');

  // 1. Verificar cuántos usuarios tienen datos en cada columna
  const stats = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE "departmentId" IS NOT NULL) as dept_camel_count,
      COUNT(*) FILTER (WHERE department_id IS NOT NULL) as dept_snake_count,
      COUNT(*) FILTER (WHERE "defaultBranchId" IS NOT NULL) as branch_camel_count,
      COUNT(*) FILTER (WHERE default_branch_id IS NOT NULL) as branch_snake_count
    FROM users
  `);

  console.log('📊 USUARIOS CON DATOS:');
  console.log('   departmentId (VARCHAR):', stats.rows[0].dept_camel_count);
  console.log('   department_id (BIGINT):', stats.rows[0].dept_snake_count);
  console.log('   defaultBranchId (UUID):', stats.rows[0].branch_camel_count);
  console.log('   default_branch_id (UUID):', stats.rows[0].branch_snake_count);

  console.log('\n💡 DECISIÓN: Usar columnas snake_case (department_id, default_branch_id)');
  console.log('   Motivo: Son las que coinciden con el diseño estándar PostgreSQL\n');

  // 2. Copiar datos de departmentId → department_id (convirtiendo VARCHAR a BIGINT)
  console.log('📝 Copiando departmentId → department_id...');
  const copyDept = await pool.query(`
    UPDATE users 
    SET department_id = CAST("departmentId" AS BIGINT)
    WHERE "departmentId" IS NOT NULL AND "departmentId" != ''
  `);
  console.log(`   ✅ ${copyDept.rowCount} filas actualizadas\n`);

  // 3. Copiar datos de defaultBranchId → default_branch_id
  console.log('📝 Copiando defaultBranchId → default_branch_id...');
  const copyBranch = await pool.query(`
    UPDATE users 
    SET default_branch_id = CAST("defaultBranchId" AS UUID)
    WHERE "defaultBranchId" IS NOT NULL
  `);
  console.log(`   ✅ ${copyBranch.rowCount} filas actualizadas\n`);

  // 4. Eliminar columnas duplicadas camelCase
  console.log('🗑️  Eliminando columnas duplicadas...');
  await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS "departmentId"`);
  console.log('   ✅ departmentId eliminada');
  await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS "defaultBranchId"`);
  console.log('   ✅ defaultBranchId eliminada\n');

  console.log('✅ FIX COMPLETADO\n');
  console.log('📋 Ahora solo existen:');
  console.log('   - department_id (BIGINT)');
  console.log('   - default_branch_id (UUID)');

  await pool.end();
})();
