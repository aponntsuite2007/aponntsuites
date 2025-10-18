/**
 * FIX: Comentar scripts de módulos V2.0 en panel-empresa.html
 * Este script se ejecuta en el servidor después del deploy
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'backend/public/panel-empresa.html');

console.log('🔧 Corrigiendo panel-empresa.html...');
console.log('📍 Ruta:', htmlPath);

// Verificar que el archivo existe
if (!fs.existsSync(htmlPath)) {
    console.error('❌ ERROR: No se encuentra el archivo HTML en:', htmlPath);
    console.log('📂 Directorio actual:', __dirname);
    console.log('📂 Contenido del directorio:', fs.readdirSync(__dirname));
    process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');

// Reemplazar la sección de scripts V2.0
const oldSection = `    <!-- Sistema de Notificaciones Avanzado V2.0 -->
    <script src="js/modules/notifications-inbox.js"></script>
    <script src="js/modules/compliance-dashboard.js"></script>
    <script src="js/modules/sla-tracking.js"></script>
    <script src="js/modules/resource-center.js"></script>
    <script src="js/modules/proactive-notifications.js"></script>
    <script src="js/modules/audit-reports.js"></script>`;

const newSection = `    <!-- Sistema de Notificaciones Avanzado V2.0 - CARGA DINÁMICA -->
    <!-- Scripts cargados bajo demanda por loadModuleContent() -->
    <!--
    <script src="js/modules/notifications-inbox.js"></script>
    <script src="js/modules/compliance-dashboard.js"></script>
    <script src="js/modules/sla-tracking.js"></script>
    <script src="js/modules/resource-center.js"></script>
    <script src="js/modules/proactive-notifications.js"></script>
    <script src="js/modules/audit-reports.js"></script>
    -->`;

if (html.includes(oldSection)) {
    html = html.replace(oldSection, newSection);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log('✅ HTML corregido - Scripts V2.0 comentados');
} else if (html.includes('<!-- Scripts cargados bajo demanda por loadModuleContent()')) {
    console.log('✅ HTML ya está correcto (scripts comentados)');
} else if (html.includes('<script src="js/modules/sla-tracking.js"></script>')) {
    console.warn('⚠️ Scripts presentes pero en formato diferente - Aplicando fix genérico...');
    // Fix más agresivo: buscar y comentar cada script individualmente
    const scriptsToComment = [
        'notifications-inbox.js',
        'compliance-dashboard.js',
        'sla-tracking.js',
        'resource-center.js',
        'proactive-notifications.js',
        'audit-reports.js'
    ];

    scriptsToComment.forEach(scriptName => {
        const regex = new RegExp(`<script src="js/modules/${scriptName}"></script>`, 'g');
        html = html.replace(regex, `<!-- <script src="js/modules/${scriptName}"></script> -->`);
    });

    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log('✅ HTML corregido usando método genérico');
} else {
    console.error('❌ No se encontraron scripts V2.0 en el HTML');
    process.exit(1);
}
