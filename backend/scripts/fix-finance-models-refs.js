const fs = require('fs');
const path = require('path');
const glob = require('glob');

const modelsDir = path.join(__dirname, '..', 'src', 'models');
const files = glob.sync(path.join(modelsDir, 'Finance*.js'));

let fixed = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Reemplazar references: { model: 'companies', key: 'id' }
    content = content.replace(
        /references:\s*\{\s*model:\s*['"]companies['"]\s*,\s*key:\s*['"]id['"]\s*\}/g,
        "references: { model: 'companies', key: 'company_id' }"
    );

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`✅ ${path.basename(file)}`);
        fixed++;
    }
}

console.log(`\n✅ Corregidos ${fixed} archivos de modelos Finance`);
