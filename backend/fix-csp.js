const fs = require('fs');
let c = fs.readFileSync('public/panel-empresa.html', 'utf8');

// 1. Cambiar onclick por data-attributes en createSingleModuleCard
const oldPattern = /const clickAction = isClickable \?\s*`console\.log\('🔥 ONCLICK: \$\{systemModule\.module_key\}'\); showModuleContent\('\$\{systemModule\.module_key\}', '\$\{systemModule\.name\}'\)` :\s*`showModuleBlocked\('\$\{systemModule\.name\}', '\$\{statusText\}', 'Este módulo no está contratado por su empresa'\)`;\s*return `\s*<div class="module-card" onclick="\$\{clickAction\}" style="/;

const newCode = `// CSP-SAFE: usar data-attributes en lugar de onclick inline
        return \`
            <div class="module-card"
                 data-module-key="\${systemModule.module_key}"
                 data-module-name="\${systemModule.name}"
                 data-clickable="\${isClickable}"
                 data-status="\${statusText}"
                 style="`;

if (oldPattern.test(c)) {
    c = c.replace(oldPattern, newCode);
    console.log('✅ Paso 1: onclick cambiado a data-attributes');
} else {
    console.log('❌ Paso 1: Patrón no encontrado, intentando búsqueda simple...');

    // Búsqueda más simple
    if (c.includes('onclick="${clickAction}"')) {
        c = c.replace(
            /onclick="\$\{clickAction\}"/g,
            'data-module-key="${systemModule.module_key}" data-module-name="${systemModule.name}" data-clickable="${isClickable}" data-status="${statusText}"'
        );
        console.log('✅ Paso 1b: onclick reemplazado con búsqueda simple');
    }
}

// 2. Agregar event listener al final (antes de </body>)
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

if (!c.includes('[CSP-SAFE] Event delegation')) {
    c = c.replace('</body>', eventListener + '\n</body>');
    console.log('✅ Paso 2: Event listener agregado');
} else {
    console.log('⚠️ Paso 2: Event listener ya existe');
}

fs.writeFileSync('public/panel-empresa.html', c);
console.log('✅ Archivo guardado');
