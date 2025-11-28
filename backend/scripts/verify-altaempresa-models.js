/**
 * Script para verificar que los modelos de altaEmpresa se carguen correctamente
 */

const db = require('../src/config/database');

console.log('\n🔍 VERIFICANDO MODELOS DE ALTA EMPRESA\n');

const models = [
  'Budget',
  'ContractOnboarding',
  'AdministrativeTask',
  'CommissionLiquidation',
  'CommissionPayment'
];

let allOk = true;

models.forEach(modelName => {
  if (db[modelName]) {
    console.log(`✅ ${modelName}: OK`);
  } else {
    console.log(`❌ ${modelName}: NOT FOUND`);
    allOk = false;
  }
});

if (allOk) {
  console.log('\n🎉 TODOS LOS MODELOS CARGADOS CORRECTAMENTE\n');
  process.exit(0);
} else {
  console.log('\n❌ ERROR: Algunos modelos no se cargaron\n');
  process.exit(1);
}
