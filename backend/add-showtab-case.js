const fs = require('fs');
let c = fs.readFileSync('public/panel-empresa.html', 'utf8');

// Buscar si ya existe caso showTab
if (c.includes("Caso 0: showTab")) {
    console.log('⚠️ Ya existe caso showTab');
    process.exit(0);
}

// Agregar caso showTab después del console.log
const pattern = /console\.log\('🖱️ \[CSP-SAFE\] Click en módulo:', moduleKey \|\| moduleName \|\| moduleId\);/;

const replacement = `console.log('🖱️ [CSP-SAFE] Click en módulo:', moduleKey || moduleName || moduleId, 'action:', action);

            // Caso 0: showTab (dashboard quick access)
            if (action === 'showTab' && moduleKey) {
                if (typeof showTab === 'function') {
                    showTab(moduleKey, card);
                } else if (typeof showModuleContent === 'function') {
                    showModuleContent(moduleKey, moduleName);
                }
                return;
            }`;

if (pattern.test(c)) {
    c = c.replace(pattern, replacement);
    fs.writeFileSync('public/panel-empresa.html', c);
    console.log('✅ Agregado caso showTab al event delegation');
} else {
    console.log('❌ No encontré el patrón del console.log');
}
