const { User } = require('./src/config/database');

console.log('📋 Atributos registrados en el modelo User:\n');

const attributes = Object.keys(User.rawAttributes).sort();

console.log(`Total atributos: ${attributes.length}\n`);

attributes.forEach(attr => {
  console.log(`  - ${attr}`);
});

console.log('\n🔍 Buscando campos específicos:');
console.log(`  - can_use_mobile_app: ${attributes.includes('can_use_mobile_app') ? '✅' : '❌'}`);
console.log(`  - can_use_kiosk: ${attributes.includes('can_use_kiosk') ? '✅' : '❌'}`);
console.log(`  - can_use_all_kiosks: ${attributes.includes('can_use_all_kiosks') ? '✅' : '❌'}`);
console.log(`  - has_flexible_schedule: ${attributes.includes('has_flexible_schedule') ? '✅' : '❌'}`);
console.log(`  - can_authorize_late_arrivals: ${attributes.includes('can_authorize_late_arrivals') ? '✅' : '❌'}`);

process.exit(0);
