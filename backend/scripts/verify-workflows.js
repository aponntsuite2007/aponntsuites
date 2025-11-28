const meta = require('../engineering-metadata.js');

console.log('\n📋 WORKFLOWS CON FECHAS:\n');
console.log('Total workflows:', Object.keys(meta.workflows).length);
console.log('Tiene altaEmpresa?', !!meta.workflows.altaEmpresa);
console.log('Tiene modulosPrueba?', !!meta.workflows.modulosPrueba);
console.log('');

Object.keys(meta.workflows).forEach(wf => {
  const w = meta.workflows[wf];
  console.log(`   ${wf}:`);
  console.log(`      Nombre: ${w.name || 'Sin nombre'}`);
  console.log(`      Creado: ${w.createdDate || 'Sin fecha'}`);

  // Contar steps con lastModified
  let stepsConFecha = 0;
  let totalSteps = 0;

  if (w.phases) {
    Object.keys(w.phases).forEach(phase => {
      if (w.phases[phase].steps) {
        w.phases[phase].steps.forEach(step => {
          totalSteps++;
          if (step.lastModified) stepsConFecha++;
        });
      }
    });
  } else if (w.steps) {
    w.steps.forEach(step => {
      totalSteps++;
      if (step.lastModified) stepsConFecha++;
    });
  }

  console.log(`      Steps: ${stepsConFecha}/${totalSteps} con lastModified\n`);
});

console.log(`✅ Total workflows: ${Object.keys(meta.workflows).length}\n`);
