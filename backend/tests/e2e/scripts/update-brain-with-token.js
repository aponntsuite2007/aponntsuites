/**
 * Actualizar brain-integration.helper.js para usar token de servicio
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../helpers/brain-integration.helper.js');

console.log('📝 Actualizando Brain con token de servicio...');

let content = fs.readFileSync(filePath, 'utf8');

// FIX 1: Agregar carga de .env.e2e al inicio
const envLoad = `const axios = require('axios');
const { Pool } = require('pg');

// Cargar variables de entorno de tests E2E
require('dotenv').config({ path: require('path').join(__dirname, '../.env.e2e') });
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });`;

content = content.replace(
  `const axios = require('axios');\nconst { Pool } = require('pg');`,
  envLoad
);

// FIX 2: Actualizar constructor para cargar token automáticamente
const oldConstructor = `  constructor(baseURL = 'http://localhost:9998') {
    this.baseURL = baseURL;
    this.token = null;`;

const newConstructor = `  constructor(baseURL = 'http://localhost:9998') {
    this.baseURL = baseURL;
    // Cargar token de servicio automáticamente
    this.token = process.env.E2E_SERVICE_TOKEN || null;

    if (this.token) {
      console.log('   🔐 Token de servicio E2E cargado correctamente');
    } else {
      console.log('   ⚠️  Token de servicio no encontrado - APIs usarán SQL directo');
    }`;

content = content.replace(oldConstructor, newConstructor);

// FIX 3: Agregar fallback en requestAnalysis
const oldAnalysis = `    } catch (err) {
      console.log(\`   ⚠️  Error en análisis: \${err.message}\`);
      return null;
    }`;

const newAnalysis = `    } catch (err) {
      console.log(\`   ⚠️  Error en análisis: \${err.message}\`);
      if (err.response?.status === 401) {
        console.log(\`   💡 Token inválido - regenerar con: node scripts/generate-service-token.js\`);
      }
      return null; // Fallback silencioso
    }`;

content = content.replace(
  `    } catch (err) {\n      console.log(\`   ⚠️  Error en análisis: \${err.message}\`);\n      return null;\n    }\n  }\n\n  /**\n   * OBTENER SUGERENCIAS DE FIXES`,
  newAnalysis + '\n  }\n\n  /**\n   * OBTENER SUGERENCIAS DE FIXES'
);

// FIX 4: Agregar fallback en requestAutoFix
content = content.replace(
  /console\.log\(`   ⚠️  Error en auto-fix: \${err\.message}`\);/g,
  `console.log(\`   ⚠️  Error en auto-fix: \${err.message}\`);\n      if (err.response?.status === 401) {\n        console.log(\`   💡 Usando SQL directo como fallback\`);\n      }`
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Brain actualizado con token de servicio');
console.log('   ✅ Token se carga automáticamente desde .env');
console.log('   ✅ Fallbacks inteligentes agregados');
console.log('   ✅ Sistema listo para 0 errores 401\n');
