/**
 * Buscar módulos con config E2E pero SIN frontend
 */
const fs = require('fs');
const path = require('path');

const configsDir = path.join(__dirname, 'tests/e2e/configs');
const modulesDir = path.join(__dirname, 'public/js/modules');

// Leer todos los configs
const configs = fs.readdirSync(configsDir)
  .filter(f => f.endsWith('.config.js'))
  .map(f => f.replace('.config.js', ''));

console.log(`\n📊 Analizando ${configs.length} configs E2E...\n`);

const withoutJS = [];
const withoutIntegration = [];
const complete = [];

configs.forEach(moduleKey => {
  const jsPath = path.join(modulesDir, `${moduleKey}.js`);
  const hasJS = fs.existsSync(jsPath);

  if (!hasJS) {
    withoutJS.push(moduleKey);
  } else {
    // Verificar si está integrado en panel-empresa.html
    const panelHTML = fs.readFileSync(path.join(__dirname, 'public/panel-empresa.html'), 'utf8');

    const hasScript = panelHTML.includes(`${moduleKey}.js`);
    const hasFunction = panelHTML.includes(`show${moduleKey.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')}`) ||
                       panelHTML.includes(`'${moduleKey}'`) ||
                       panelHTML.includes(`"${moduleKey}"`);

    if (!hasScript && !hasFunction) {
      withoutIntegration.push(moduleKey);
    } else {
      complete.push(moduleKey);
    }
  }
});

console.log('❌ **SIN ARCHIVO JS** (' + withoutJS.length + '):\n');
withoutJS.forEach(m => console.log(`   - ${m}`));

console.log('\n⚠️  **CON JS PERO SIN INTEGRACIÓN EN PANEL-EMPRESA** (' + withoutIntegration.length + '):\n');
withoutIntegration.forEach(m => console.log(`   - ${m}`));

console.log('\n✅ **COMPLETOS** (JS + Integración) (' + complete.length + '):\n');
console.log(`   ${complete.length} módulos tienen frontend completo\n`);

console.log('\n📋 **RESUMEN**:');
console.log(`   Total configs: ${configs.length}`);
console.log(`   Sin JS: ${withoutJS.length}`);
console.log(`   Sin integración: ${withoutIntegration.length}`);
console.log(`   Completos: ${complete.length}`);
console.log(`   % Sin frontend: ${Math.round(((withoutJS.length + withoutIntegration.length) / configs.length) * 100)}%\n`);
