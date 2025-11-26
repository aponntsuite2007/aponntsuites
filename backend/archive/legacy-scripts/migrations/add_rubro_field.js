const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'attendance_system',
  password: 'Aedr15150302',
  port: 5432,
});

async function addRubroField() {
  const client = await pool.connect();
  try {
    console.log('🔧 Agregando campo "rubro" a la tabla system_modules...');

    // Agregar la columna rubro
    await client.query(`
      ALTER TABLE system_modules
      ADD COLUMN IF NOT EXISTS rubro VARCHAR(100) DEFAULT 'General'
    `);

    console.log('✅ Campo "rubro" agregado exitosamente');

    // Actualizar valores de rubro según la categoría
    const rubroUpdates = [
      { category: 'core', rubro: 'Sistema Base' },
      { category: 'security', rubro: 'Seguridad' },
      { category: 'medical', rubro: 'Salud Ocupacional' },
      { category: 'legal', rubro: 'Legal y Normativo' },
      { category: 'payroll', rubro: 'Recursos Humanos' },
      { category: 'additional', rubro: 'Funcionalidades Extra' },
      { category: 'siac', rubro: 'Sistema Comercial' }
    ];

    for (const update of rubroUpdates) {
      await client.query(`
        UPDATE system_modules
        SET rubro = $1
        WHERE category = $2
      `, [update.rubro, update.category]);

      console.log(`✅ Actualizado rubro "${update.rubro}" para categoría "${update.category}"`);
    }

    // Verificar los cambios
    const result = await client.query(`
      SELECT module_key, name, category, rubro
      FROM system_modules
      ORDER BY rubro, name
    `);

    console.log('\n📋 Módulos con rubros asignados:');
    result.rows.forEach(row => {
      console.log(`  ${row.module_key} - ${row.name} [${row.rubro}]`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addRubroField();