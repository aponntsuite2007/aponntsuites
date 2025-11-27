const fs = require('fs');
const path = require('path');

console.log('\n🔧 Limpiando texto hardcodeado del footer...\n');

const indexPath = path.join(__dirname, '../public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Buscar y vaciar el <p> del footer que tiene desc_sistema_integral
const oldFooterText = /<p data-translate="index\.desc_sistema_integral">Sistema Integral[^<]*\s*Plataforma SaaS[^<]*\s*Disponible en[^<]*\s*<\/p>/s;

const newFooterText = '<p data-translate="index.desc_sistema_integral"></p>';

if (oldFooterText.test(content)) {
  content = content.replace(oldFooterText, newFooterText);
  console.log('✅ Footer limpiado - texto hardcodeado eliminado');
} else {
  console.log('⚠️  No se encontró el patrón exacto, intentando alternativa...');

  // Patrón más flexible
  const flexiblePattern = /<p data-translate="index\.desc_sistema_integral">[^<]*(?:<[^>]*>[^<]*<\/[^>]*>)*[^<]*<\/p>/s;
  content = content.replace(flexiblePattern, newFooterText);
  console.log('✅ Footer limpiado con patrón flexible');
}

fs.writeFileSync(indexPath, content, 'utf8');

console.log('\n✅ COMPLETADO - Footer ahora usará la traducción correcta\n');
console.log('🎯 El sistema de traducción mostrará:');
console.log('   "Ecosistema de Administración y Planificación..."\n');
