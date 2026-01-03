const fs = require('fs');
let c = fs.readFileSync('public/panel-empresa.html', 'utf8');
let changes = 0;

// 1. Fix línea ~393: onclick="window.openModuleDirect..."
c = c.replace(
    /<div onclick="window\.openModuleDirect\('\$\{module\.id\}', '\$\{module\.name\}'\)"/g,
    '<div data-module-id="${module.id}" data-module-name="${module.name}" data-action="openModuleDirect" class="module-card"'
);
if (c.includes('data-action="openModuleDirect"')) changes++;

// 2. Fix líneas 3098-3179: Employee module cards - convertir a data-attributes
const employeeCards = [
    { old: `onclick="showModuleContent('dms-dashboard', 'Mis Documentos')"`, key: 'dms-dashboard', name: 'Mis Documentos' },
    { old: `onclick="showModuleContent('attendance', 'Mi Asistencia')"`, key: 'attendance', name: 'Mi Asistencia' },
    { old: `onclick="showModuleContent('vacation-management', 'Mis Vacaciones')"`, key: 'vacation-management', name: 'Mis Vacaciones' },
    { old: `onclick="showModuleContent('inbox', 'Mis Notificaciones')"`, key: 'inbox', name: 'Mis Notificaciones' },
    { old: `onclick="showModuleContent('employee-360', 'Mi Perfil')"`, key: 'employee-360', name: 'Mi Perfil' },
];

employeeCards.forEach(card => {
    if (c.includes(card.old)) {
        c = c.replace(
            new RegExp(card.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            `data-module-key="${card.key}" data-module-name="${card.name}" data-clickable="true" class="module-card employee-module-card"`
        );
        changes++;
    }
});

// 3. Fix línea ~4350: onclick="alert('Módulo: ${module.name}..."
c = c.replace(
    /<div onclick="alert\('Módulo: \$\{module\.name\}\\\\nEstado: BÁSICO\\\\nCargando configuración\.\.\.'\)"/g,
    '<div data-module-name="${module.name}" data-action="basicModule" class="module-card"'
);

// 4. Fix línea ~5218: onclick="${clickAction}" con alert
c = c.replace(
    /const clickAction = isActive \? `alert\('Módulo: \$\{module\.name\}\\\\nEstado: HABILITADO\\\\nEmpresa: \$\{company\.name\}'\)` : `alert\('Módulo: \$\{module\.name\}\\\\nEstado: NO CONTRATADO\\\\nContacte al administrador para habilitar este módulo'\)`;[\s\S]*?return `\s*<div onclick="\$\{clickAction\}"/,
    `// CSP-SAFE: usar data-attributes
            return \`
                <div data-module-name="\${module.name}" data-company-name="\${company.name}" data-active="\${isActive}" class="module-card"`
);

// 5. Fix botones de acciones rápidas en employee dashboard
c = c.replace(
    /<button onclick="showModuleContent\('dms-dashboard', 'Subir Documento'\)"/g,
    '<button data-module-key="dms-dashboard" data-module-name="Subir Documento" data-clickable="true" class="module-card"'
);
c = c.replace(
    /<button onclick="showModuleContent\('vacation-management', 'Solicitar Vacaciones'\)"/g,
    '<button data-module-key="vacation-management" data-module-name="Solicitar Vacaciones" data-clickable="true" class="module-card"'
);
c = c.replace(
    /<button onclick="showModuleContent\('inbox', 'Ver Notificaciones'\)"/g,
    '<button data-module-key="inbox" data-module-name="Ver Notificaciones" data-clickable="true" class="module-card"'
);

// 6. Fix botón "Gestión de Usuarios" línea 4717
c = c.replace(
    /<button onclick="showModuleContent\('users', 'Gestión de Usuarios'\)"/g,
    '<button data-module-key="users" data-module-name="Gestión de Usuarios" data-clickable="true" class="module-card"'
);

// 7. Actualizar event delegation para manejar todos los casos
const oldEventDelegation = /<!-- CSP-SAFE: Event delegation para clicks en módulos -->[\s\S]*?<\/script>/;
const newEventDelegation = `<!-- CSP-SAFE: Event delegation para clicks en módulos -->
    <script>
    (function() {
        document.addEventListener('click', function(e) {
            var card = e.target.closest('.module-card');
            if (!card) return;

            var moduleKey = card.getAttribute('data-module-key');
            var moduleName = card.getAttribute('data-module-name');
            var isClickable = card.getAttribute('data-clickable') === 'true';
            var isActive = card.getAttribute('data-active');
            var action = card.getAttribute('data-action');
            var moduleId = card.getAttribute('data-module-id');

            console.log('🖱️ [CSP-SAFE] Click en módulo:', moduleKey || moduleName || moduleId);

            // Caso 1: Módulo con key específico
            if (moduleKey && isClickable) {
                if (typeof showModuleContent === 'function') {
                    showModuleContent(moduleKey, moduleName);
                } else {
                    console.error('❌ showModuleContent no disponible');
                }
                return;
            }

            // Caso 2: openModuleDirect
            if (action === 'openModuleDirect' && moduleId) {
                if (typeof window.openModuleDirect === 'function') {
                    window.openModuleDirect(moduleId, moduleName);
                }
                return;
            }

            // Caso 3: Módulo básico (alert info)
            if (action === 'basicModule') {
                alert('Módulo: ' + moduleName + '\\nEstado: BÁSICO\\nCargando configuración...');
                return;
            }

            // Caso 4: Módulo con estado activo/inactivo
            if (isActive !== null) {
                var companyName = card.getAttribute('data-company-name') || '';
                if (isActive === 'true') {
                    alert('Módulo: ' + moduleName + '\\nEstado: HABILITADO\\nEmpresa: ' + companyName);
                } else {
                    alert('Módulo: ' + moduleName + '\\nEstado: NO CONTRATADO\\nContacte al administrador para habilitar este módulo');
                }
                return;
            }

            // Caso 5: Módulo clickeable por defecto
            var clickableAttr = card.getAttribute('data-clickable');
            if (clickableAttr === 'true' || clickableAttr === null) {
                if (typeof showModuleContent === 'function' && (moduleKey || moduleName)) {
                    showModuleContent(moduleKey || moduleName, moduleName || moduleKey);
                }
            }
        });
        console.log('✅ [CSP-SAFE] Event delegation COMPLETO activado');
    })();
    </script>`;

if (oldEventDelegation.test(c)) {
    c = c.replace(oldEventDelegation, newEventDelegation);
    console.log('✅ Event delegation actualizado con todos los casos');
} else {
    console.log('⚠️ Event delegation no encontrado para actualizar');
}

fs.writeFileSync('public/panel-empresa.html', c);
console.log('✅ Archivo guardado');
console.log('');
console.log('📋 Cambios realizados:');
console.log('- Convertidos onclick a data-attributes en múltiples lugares');
console.log('- Event delegation actualizado para manejar todos los casos');
