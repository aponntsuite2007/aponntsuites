const fs = require('fs');
const file = 'src/auditor/collectors/FrontendCollector.js';

let content = fs.readFileSync(file, 'utf8');

// Agregar auto-accept de diálogos en initBrowser, DESPUÉS de crear la página
const insertPoint = `    this.page = await this.browser.newPage();

    // ✅ Setear viewport a tamaño de pantalla completo (1920x1080)`;

const dialogHandler = `    this.page = await this.browser.newPage();

    // ✅ AUTO-ACEPTAR TODOS LOS DIÁLOGOS (alert, confirm, prompt)
    this.page.on('dialog', async dialog => {
      console.log(\`      🔔 [AUTO-DIALOG] Tipo: \${dialog.type()} - Mensaje: "\${dialog.message().substring(0, 100)}..."\`);
      await dialog.accept(); // Aceptar automáticamente
      console.log(\`      ✅ [AUTO-DIALOG] Diálogo aceptado automáticamente\`);
    });

    // ✅ Setear viewport a tamaño de pantalla completo (1920x1080)`;

content = content.replace(insertPoint, dialogHandler);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ Fix aplicado: Auto-accept de TODOS los diálogos (alert/confirm/prompt)');
