const meta = require('../engineering-metadata.js');

console.log('\n📊 VERIFICANDO CAMBIOS EN METADATA:\n');
console.log('Total workflows:', Object.keys(meta.workflows).length);
console.log('Tiene altaEmpresa?', !!meta.workflows.altaEmpresa);
console.log('Tiene modulosPrueba?', !!meta.workflows.modulosPrueba);

if (meta.workflows.altaEmpresa) {
  console.log('\n✅ ALTA EMPRESA:');
  console.log('   Nombre:', meta.workflows.altaEmpresa.name);
  console.log('   Fecha creación:', meta.workflows.altaEmpresa.createdDate);
  console.log('   Tiene phases?', !!meta.workflows.altaEmpresa.phases);

  if (meta.workflows.altaEmpresa.phases) {
    const phase1 = meta.workflows.altaEmpresa.phases.phase1;
    console.log('   Phase 1:', phase1.name);
    console.log('   Steps en phase 1:', phase1.steps.length);
    console.log('   Primer step:', phase1.steps[0].name);
    console.log('   lastModified:', phase1.steps[0].lastModified);
  }
}

if (meta.workflows.modulosPrueba) {
  console.log('\n✅ MODULOS PRUEBA:');
  console.log('   Nombre:', meta.workflows.modulosPrueba.name);
  console.log('   Fecha creación:', meta.workflows.modulosPrueba.createdDate);
  console.log('   Steps:', meta.workflows.modulosPrueba.steps.length);
  console.log('   Primer step:', meta.workflows.modulosPrueba.steps[0].name);
  console.log('   lastModified:', meta.workflows.modulosPrueba.steps[0].lastModified);
}

console.log('\n');
