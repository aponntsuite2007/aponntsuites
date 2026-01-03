const fs = require('fs');
let c = fs.readFileSync('public/panel-empresa.html', 'utf8');

// 1. Remover el event delegation mal ubicado (dentro del template literal)
const badEventListener = /\s*<!-- CSP-SAFE: Event delegation para clicks en módulos -->[\s\S]*?\[CSP-SAFE\] Event delegation activado'\);[\s\S]*?<\/script>\s*\n<\/body>\s*<\/html>\s*`;/;
if (badEventListener.test(c)) {
    c = c.replace(badEventListener, '\n</body>\n        </html>\n        `;');
    console.log('✅ Paso 1: Removido event delegation mal ubicado (dentro de template)');
} else {
    console.log('⚠️ Paso 1: Event delegation mal ubicado no encontrado');
}

// 2. Agregar event delegation en el lugar CORRECTO (antes del REAL </body></html>)
const eventListener = `
    <!-- CSP-SAFE: Event delegation para clicks en módulos -->
    <script>
    (function() {
        document.addEventListener('click', function(e) {
            var card = e.target.closest('.module-card');
            if (!card) return;

            var moduleKey = card.getAttribute('data-module-key');
            var moduleName = card.getAttribute('data-module-name');
            var isClickable = card.getAttribute('data-clickable') === 'true';
            var status = card.getAttribute('data-status');

            if (!moduleKey) return;

            console.log('🖱️ [CSP-SAFE] Click en módulo:', moduleKey);

            if (isClickable) {
                if (typeof showModuleContent === 'function') {
                    showModuleContent(moduleKey, moduleName);
                } else if (typeof showTab === 'function') {
                    showTab(moduleKey, card);
                } else {
                    console.error('❌ No hay función para mostrar módulo:', moduleKey);
                }
            } else {
                if (typeof showModuleBlocked === 'function') {
                    showModuleBlocked(moduleName, status, 'Este módulo no está contratado');
                } else {
                    alert('Módulo no disponible: ' + moduleName);
                }
            }
        });
        console.log('✅ [CSP-SAFE] Event delegation activado');
    })();
    </script>
`;

// Buscar el final REAL del HTML (no dentro de template literals)
// El patrón es: </script>\n</body>\n</html>\n al final del archivo
if (!c.includes('[CSP-SAFE] Event delegation activado')) {
    // Buscar el </body></html> final (sin estar dentro de backticks)
    const finalBodyMatch = c.match(/(<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@5\.3\.2\/dist\/js\/bootstrap\.bundle\.min\.js"><\/script>\s*)\n<\/body>\n<\/html>/);
    if (finalBodyMatch) {
        c = c.replace(
            /(<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@5\.3\.2\/dist\/js\/bootstrap\.bundle\.min\.js"><\/script>\s*)\n<\/body>\n<\/html>/,
            '$1\n' + eventListener + '\n</body>\n</html>'
        );
        console.log('✅ Paso 2: Event delegation agregado ANTES del </body> real');
    } else {
        console.log('❌ Paso 2: No encontré el patrón esperado del final del HTML');
    }
} else {
    console.log('⚠️ Paso 2: Event delegation ya existe');
}

// 3. Remover BYPASS-TOTAL
if (c.includes('BYPASS-TOTAL')) {
    c = c.replace(/console\.log\([`']🚫 \[BYPASS-TOTAL\].*?ISI[`']\);?/g, '// BYPASS-TOTAL REMOVIDO');
    c = c.replace(/console\.log\([`']🚀 \[BYPASS-TOTAL\].*?dashboard[`']\);?/g, '// BYPASS-TOTAL REMOVIDO');
    console.log('✅ Paso 3: BYPASS-TOTAL removidos');
} else {
    console.log('⚠️ Paso 3: No hay BYPASS-TOTAL');
}

// 4. Verificar que data-attributes estén en createSingleModuleCard
if (!c.includes('data-module-key="${systemModule.module_key}"')) {
    console.log('⚠️ Paso 4: data-attributes no encontrados, puede que necesiten agregarse');
} else {
    console.log('✅ Paso 4: data-attributes ya están presentes');
}

fs.writeFileSync('public/panel-empresa.html', c);
console.log('✅ Archivo guardado');
console.log('');
console.log('📋 Resumen:');
console.log('- Event delegation ahora está en el lugar correcto');
console.log('- BYPASS-TOTAL removido');
console.log('- Los clicks en módulos deberían funcionar ahora');
