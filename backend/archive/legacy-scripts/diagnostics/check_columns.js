const { sequelize } = require('./src/config/database-postgresql');

sequelize.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'attendances'
  ORDER BY ordinal_position
`).then(([rows]) => {
  console.log('Columnas de la tabla attendances:');
  rows.forEach(r => console.log('  -', r.column_name));
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
