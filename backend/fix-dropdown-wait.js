const fs = require('fs');
const file = 'src/auditor/collectors/FrontendCollector.js';

let content = fs.readFileSync(file, 'utf8');

const oldCode = `      const companySlug = result.rows[0].slug;
      console.log(\`    ✅ Empresa encontrada: \${companySlug}\`);

      // Esperar a que cargue el formulario de login
      await this.page.waitForSelector('#companySelect', { timeout: 10000 });
      console.log('    ✅ Formulario de login cargado');

      // PASO 1: Seleccionar empresa
      console.log(\`    🏢 Seleccionando empresa: \${companySlug}\`);
      await this.page.select('#companySelect', companySlug);
      await new Promise(resolve => setTimeout(resolve, 2000));`;

const newCode = `      const companySlug = result.rows[0].slug;
      console.log(\`    ✅ Empresa encontrada: \${companySlug}\`);

      // Esperar a que cargue el formulario de login
      await this.page.waitForSelector('#companySelect', { timeout: 10000 });
      console.log('    ✅ Formulario de login cargado');

      // ESPERAR a que el dropdown tenga opciones cargadas
      console.log('    ⏳ Esperando que dropdown tenga opciones cargadas...');
      await this.page.waitForFunction(
        () => {
          const select = document.getElementById('companySelect');
          return select && select.options.length > 1; // Más de 1 (no solo el placeholder)
        },
        { timeout: 10000 }
      );
      console.log('    ✅ Dropdown con opciones cargadas');

      // Esperar 1 segundo adicional para asegurar que el evento onchange está listo
      await new Promise(resolve => setTimeout(resolve, 1000));

      // PASO 1: Seleccionar empresa
      console.log(\`    🏢 Seleccionando empresa: \${companySlug}\`);
      await this.page.select('#companySelect', companySlug);
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 segundos para que se habiliten los campos`;

content = content.replace(oldCode, newCode);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ Fix aplicado - ahora espera opciones del dropdown');
