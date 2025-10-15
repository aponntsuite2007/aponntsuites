const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/attendance_db',
  {
    dialect: 'postgres',
    logging: false
  }
);

async function checkTemplates() {
  try {
    console.log('🔍 Consultando templates biométricos...\n');
    
    const [results] = await sequelize.query(`
      SELECT 
        id,
        employee_id,
        modality,
        algorithm,
        quality_score,
        created_at,
        LENGTH(encrypted_template) as template_size
      FROM biometric_templates
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (results.length === 0) {
      console.log('❌ No hay templates biométricos en la base de datos\n');
    } else {
      console.log(`✅ Se encontraron ${results.length} templates:\n`);
      results.forEach((t, i) => {
        console.log(`${i+1}. Employee: ${t.employee_id}`);
        console.log(`   Modality: ${t.modality}`);
        console.log(`   Algorithm: ${t.algorithm}`);
        console.log(`   Quality: ${t.quality_score}`);
        console.log(`   Size: ${t.template_size} bytes`);
        console.log(`   Created: ${t.created_at}`);
        console.log('');
      });
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTemplates();
