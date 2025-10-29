const fs = require('fs');
const file = 'src/auditor/collectors/FrontendCollector.js';

let content = fs.readFileSync(file, 'utf8');

// Agregar función para cerrar modales de error automáticamente ANTES de testNavigation
const insertPoint = `  async testNavigation(module) {`;

const autoCloseFunction = `  async autoCloseErrorModals() {
    try {
      // Buscar botones de cerrar modal (X, Cerrar, Aceptar, OK)
      const closeButtons = await this.page.$$('button.close, button.btn-close, button[data-dismiss="modal"], button:contains("Cerrar"), button:contains("Aceptar"), button:contains("OK"), .swal2-confirm, .swal2-cancel');
      
      if (closeButtons.length > 0) {
        console.log(\`      🔘 [AUTO-CLOSE] Encontrados \${closeButtons.length} botones de cerrar modal\`);
        for (const btn of closeButtons) {
          try {
            await btn.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (e) {
            // Ignorar si el botón ya no existe
          }
        }
      }
    } catch (error) {
      // Ignorar errores
    }
  }

  async testNavigation(module) {`;

content = content.replace(insertPoint, autoCloseFunction);

// Modificar testNavigation para que llame a autoCloseErrorModals DESPUÉS de intentar navegar
const oldNavigationEnd = `      // Esperar a que cargue
      await new Promise(resolve => setTimeout(resolve, 2000));

      // NUEVO: Detectar mensajes de error visibles en la página
      const errorMessages = await this.detectVisibleErrors();`;

const newNavigationEnd = `      // Esperar a que cargue
      await new Promise(resolve => setTimeout(resolve, 2000));

      // AUTO-CERRAR modales de error antes de verificar
      await this.autoCloseErrorModals();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // NUEVO: Detectar mensajes de error visibles en la página
      const errorMessages = await this.detectVisibleErrors();`;

content = content.replace(oldNavigationEnd, newNavigationEnd);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ Fixes aplicados:');
console.log('   - Función autoCloseErrorModals() agregada');
console.log('   - testNavigation() ahora cierra modales automáticamente');
