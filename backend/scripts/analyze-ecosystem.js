const meta = require('../engineering-metadata.js');

console.log('\n=== ANÁLISIS DEL ECOSISTEMA INTEGRAL ===\n');

// 1. MÓDULOS
console.log('📦 MÓDULOS DEL SISTEMA:');
console.log('Total módulos:', Object.keys(meta.modules).length);

const modules = meta.modules;
console.log('\n--- Listado de Módulos ---');
Object.keys(modules).forEach(key => {
  const mod = modules[key];
  console.log(`\n${key.toUpperCase()}:`);
  console.log(`  Nombre: ${mod.name}`);
  console.log(`  Categoría: ${mod.category || 'N/A'}`);
  console.log(`  Status: ${mod.status} (${mod.progress}%)`);
  console.log(`  Descripción: ${mod.description || 'N/A'}`);
});

// 2. BASE DE DATOS
console.log('\n\n💾 TABLAS DE BASE DE DATOS RELACIONADAS:');
if (meta.database && meta.database.tables) {
  const relevantTables = Object.keys(meta.database.tables).filter(t =>
    t.includes('compan') ||
    t.includes('module') ||
    t.includes('price') ||
    t.includes('pricing') ||
    t.includes('contract') ||
    t.includes('invoice') ||
    t.includes('commission')
  );

  console.log('Tablas encontradas:', relevantTables.length);
  relevantTables.forEach(table => {
    console.log(`  - ${table}`);
  });
}

// 3. WORKFLOWS
console.log('\n\n🔄 WORKFLOWS COMERCIALES:');
if (meta.workflows) {
  console.log('Total workflows:', Object.keys(meta.workflows).length);
  Object.keys(meta.workflows).forEach(wf => {
    console.log(`  - ${wf}`);
  });
}

// 4. ROADMAP
console.log('\n\n🗺️ ROADMAP - FEATURES COMERCIALES:');
if (meta.roadmap) {
  const commercialFeatures = Object.keys(meta.roadmap).filter(r =>
    r.includes('comercial') ||
    r.includes('pricing') ||
    r.includes('billing') ||
    r.includes('commission')
  );

  if (commercialFeatures.length > 0) {
    commercialFeatures.forEach(feature => {
      const f = meta.roadmap[feature];
      console.log(`\n  ${feature.toUpperCase()}: ${f.name}`);
      console.log(`    Status: ${f.status} (${f.progress}%)`);
    });
  } else {
    console.log('  (No hay features comerciales específicas en el roadmap)');
  }
}

console.log('\n\n=== FIN DEL ANÁLISIS ===\n');
