const fs = require('fs');

let sql = fs.readFileSync('database/migrations/20251016_create_notification_system_tables.sql', 'utf-8');

// Quitar todas las líneas que empiezan con INDEX (incluyendo con coma)
sql = sql.split('\n').filter(line => {
  const trimmed = line.trim();
  return !trimmed.startsWith('INDEX ') && !trimmed.startsWith(',INDEX ');
}).join('\n');

// Quitar UNIQUE constraints inline (agregaremos con ALTER TABLE después)
sql = sql.replace(/,\s*UNIQUE\([^)]+\)/gm, '');

// Arreglar comas antes de paréntesis de cierre
sql = sql.replace(/,\s*\)/gm, ')');

fs.writeFileSync('database/migrations/20251016_create_final.sql', sql);
console.log('✅ SQL final creado correctamente');
