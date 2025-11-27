const fs = require('fs');
const path = require('path');

console.log('\n🧹 Limpieza agresiva de duplicados...\n');

const localesDir = path.join(__dirname, '../public/locales');
const languages = ['es', 'en', 'pt', 'de', 'it', 'fr'];

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);

  // Leer como texto
  let content = fs.readFileSync(filePath, 'utf8');

  // Patrón para encontrar "desc_sistema_integral" con texto viejo (antes de la actualización)
  const oldPatterns = [
    /"desc_sistema_integral":\s*"Sistema Integral[^"]*",?\n?/g,
    /"desc_sistema_integral":\s*"Comprehensive System[^"]*",?\n?/g,
    /"desc_sistema_integral":\s*"Sistema Integral[^"]*",?\n?/g,
    /"desc_sistema_integral":\s*"Integrales System[^"]*",?\n?/g,
    /"desc_sistema_integral":\s*"Sistema Integrale[^"]*",?\n?/g,
    /"desc_sistema_integral":\s*"Système Intégral[^"]*",?\n?/g
  ];

  // Eliminar todas las ocurrencias viejas
  oldPatterns.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  // Parsear para obtener solo la última versión válida
  const data = JSON.parse(content);

  // Reescribir limpio
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`✅ ${lang}.json limpiado`);
});

console.log('\n✅ Limpieza completa\n');
