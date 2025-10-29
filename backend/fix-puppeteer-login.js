const fs = require('fs');
const file = 'src/auditor/collectors/FrontendCollector.js';

let content = fs.readFileSync(file, 'utf8');

// Buscar la línea del goto
const oldGoto = `    await this.page.goto(\`\${this.baseUrl}/panel-empresa.html\`);`;

const newGoto = `    // ✅ waitUntil: 'domcontentloaded' - No espera recursos externos (face-api CDN)
    await this.page.goto(\`\${this.baseUrl}/panel-empresa.html\`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });`;

content = content.replace(oldGoto, newGoto);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ Archivo modificado - ahora usa domcontentloaded');
