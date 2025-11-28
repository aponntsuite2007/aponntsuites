const meta = require('../engineering-metadata.js');

console.log('\n📊 ESTRUCTURA DE ENGINEERING-METADATA.JS\n');

console.log('Claves de nivel raíz:');
Object.keys(meta).forEach(key => {
  const value = meta[key];
  const type = Array.isArray(value) ? 'array' : typeof value;
  const size = type === 'object' && !Array.isArray(value) ? Object.keys(value).length : (Array.isArray(value) ? value.length : '-');
  console.log(`   ${key}: ${type} (${size} items)`);
});

console.log('\n¿Hay workflows en nivel raíz?', !!meta.workflows);
console.log('Tipo:', typeof meta.workflows);
console.log('Cantidad:', meta.workflows ? Object.keys(meta.workflows).length : 0);

if (meta.workflows) {
  console.log('\nWorkflows en nivel raíz:');
  Object.keys(meta.workflows).slice(0, 5).forEach(wf => {
    console.log(`   - ${wf}`);
  });
  if (Object.keys(meta.workflows).length > 5) {
    console.log(`   ... y ${Object.keys(meta.workflows).length - 5} más`);
  }
}

console.log('\n');
