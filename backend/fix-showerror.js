/**
 * Fix showError function call in siac-commercial-dashboard.js
 * Reemplaza this.showError() que no existe con el patrón correcto
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/js/modules/siac-commercial-dashboard.js');

console.log('🔧 Arreglando llamada a showError inexistente...');

let content = fs.readFileSync(filePath, 'utf8');

// Buscar y reemplazar el bloque problemático
const oldCode = `        } catch (error) {
            this.showError(content, 'Error al cargar clientes', error);
        }`;

const newCode = `        } catch (error) {
            console.error('Error al cargar clientes:', error);
            content.innerHTML = \`
                <div class="siac-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar clientes: \${error.message}</p>
                    <button class="siac-btn" onclick="SiacCommercialDashboard.loadClientes()">Reintentar</button>
                </div>
            \`;
        }`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Código arreglado correctamente');
    console.log('   Reemplazado: this.showError() → content.innerHTML con mensaje de error');
} else {
    console.log('⚠️ No se encontró el código exacto a reemplazar');
    console.log('Buscando variaciones...');

    // Intentar encontrar la línea problemática
    if (content.includes('this.showError(content')) {
        console.log('✅ Encontrada llamada a showError');
        console.log('Mostrando contexto:');
        const lines = content.split('\n');
        lines.forEach((line, i) => {
            if (line.includes('this.showError(content')) {
                console.log(`Línea ${i + 1}: ${line}`);
                console.log(`Línea ${i}: ${lines[i - 1]}`);
                console.log(`Línea ${i + 2}: ${lines[i + 1]}`);
            }
        });
    }
}
