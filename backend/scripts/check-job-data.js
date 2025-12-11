/**
 * Script para verificar si hay datos en job_postings y job_applications
 */

const { sequelize } = require('../src/config/database');

async function checkData() {
  try {
    console.log('🔍 Verificando datos en tablas job_...\n');

    // Check job_postings
    const [postings] = await sequelize.query(`SELECT COUNT(*) as count FROM job_postings;`);
    console.log(`📊 job_postings: ${postings[0].count} registros`);

    // Check job_applications
    const [applications] = await sequelize.query(`SELECT COUNT(*) as count FROM job_applications;`);
    console.log(`📊 job_applications: ${applications[0].count} registros`);

    if (applications[0].count > 0) {
      console.log('\n⚠️  HAY DATOS EN job_applications');
      console.log('   Se necesita migración cuidadosa para no perder datos');

      // Mostrar sample
      const [sample] = await sequelize.query(`
        SELECT id, candidate_first_name, candidate_last_name, status, reviewed_by, interviewer_id
        FROM job_applications
        LIMIT 3;
      `);
      console.log('\n📋 Muestra de datos:');
      sample.forEach(row => {
        console.log(`   ID ${row.id}: ${row.candidate_first_name} ${row.candidate_last_name} - ${row.status}`);
        console.log(`      reviewed_by: ${row.reviewed_by}, interviewer_id: ${row.interviewer_id}`);
      });
    } else {
      console.log('\n✅ No hay datos en job_applications');
      console.log('   Se puede hacer DROP/CREATE sin perder información');
    }

  } catch (error) {
    console.error('❌ Error verificando datos:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkData();
