const fs = require('fs');
const path = require('path');

const moduleName = process.argv[2] || 'ai-assistant';

console.log(`\n🔍 ANÁLISIS: ${moduleName}\n`);
console.log('='.repeat(70) + '\n');

const files = [
  `src/routes/${moduleName}Routes.js`,
  `src/routes/assistantRoutes.js`,
  `src/services/${moduleName}Service.js`,
  `src/services/AssistantService.js`,
  `src/models/${moduleName}.js`,
  `src/models/AssistantKnowledgeBase.js`,
  `src/models/AssistantConversation.js`,
  `public/js/modules/${moduleName}.js`,
  `public/js/modules/ai-assistant-chat.js`,
  `public/js/modules/${moduleName}-dashboard.js`
];

const found = [];

files.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    const sizeKB = (stats.size / 1024).toFixed(1);

    found.push({
      file,
      date: stats.mtime.toISOString().split('T')[0],
      time: stats.mtime.toTimeString().split(' ')[0],
      lines,
      sizeKB
    });
  }
});

if (found.length === 0) {
  console.log('❌ No se encontraron archivos para este módulo\n');
} else {
  console.log('📁 ARCHIVOS ENCONTRADOS:\n');
  found.forEach((f, i) => {
    console.log(`${i + 1}. ${f.file}`);
    console.log(`   📅 Fecha: ${f.date} ${f.time}`);
    console.log(`   📏 Líneas: ${f.lines}`);
    console.log(`   💾 Tamaño: ${f.sizeKB} KB\n`);
  });

  const totalLines = found.reduce((sum, f) => sum + f.lines, 0);
  const totalSize = found.reduce((sum, f) => sum + parseFloat(f.sizeKB), 0);

  console.log('='.repeat(70));
  console.log(`\n📊 TOTALES:`);
  console.log(`   Archivos: ${found.length}`);
  console.log(`   Líneas totales: ${totalLines}`);
  console.log(`   Tamaño total: ${totalSize.toFixed(1)} KB\n`);
}
