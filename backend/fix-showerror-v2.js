/**
 * Fix showError function call in siac-commercial-dashboard.js (v2)
 * Más robusto - usa regex
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/js/modules/siac-commercial-dashboard.js');

console.log('🔧 Arreglando llamada a showError inexistente (v2)...');

let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar solo la línea problemática
const regex = /this\.showError\(content,\s*['"]Error al cargar clientes['"],\s*error\);/;

if (regex.test(content)) {
    content = content.replace(
        regex,
        `console.error('Error al cargar clientes:', error);
            content.innerHTML = \`
                <div class="siac-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar clientes: \${error.message}</p>
                    <button class="siac-btn" onclick="SiacCommercialDashboard.loadClientes()">Reintentar</button>
                </div>
            \`;`
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Código arreglado correctamente');
    console.log('   Reemplazado: this.showError() → content.innerHTML');
} else {
    console.log('❌ No se encontró la llamada a showError');
}
