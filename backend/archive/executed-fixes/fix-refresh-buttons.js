const fs = require('fs');

const filePath = 'public/js/modules/users.js';
let content = fs.readFileSync(filePath, 'utf8');

// STATUS FIX: Add button update after statusEl.innerHTML
const statusPattern = /( +)\/\/ 2\. STATUS\n( +)const statusEl = document\.getElementById\('admin-status'\);\n( +)if \(statusEl\) {\n( +)statusEl\.innerHTML = `[\s\S]+?`;\n( +)}/;

const statusReplacement = `$1// 2. STATUS
$2const statusEl = document.getElementById('admin-status');
$3if (statusEl) {
$4statusEl.innerHTML = \`
                <span class="status-badge \${user.isActive ? 'active' : 'inactive'}">
                    \${user.isActive ? '✅ Activo' : '❌ Inactivo'}
                </span>
            \`;
            // UPDATE STATUS BUTTON
            const statusBtn = statusEl.parentElement.querySelector('button[onclick*="toggleUserStatus"]');
            if (statusBtn) {
                statusBtn.setAttribute('onclick', \`toggleUserStatus('\${userId}', \${user.isActive})\`);
                statusBtn.textContent = user.isActive ? '🔒 Desactivar' : '✅ Activar';
            }
$5}`;

content = content.replace(statusPattern, statusReplacement);

// GPS FIX: Add button update after gpsEl.innerHTML
const gpsPattern = /( +)\/\/ 3\. GPS\n( +)const gpsEl = document\.getElementById\('admin-gps'\);\n( +)if \(gpsEl\) {\n( +)gpsEl\.innerHTML = `[\s\S]+?`;\n( +)}/;

const gpsReplacement = `$1// 3. GPS
$2const gpsEl = document.getElementById('admin-gps');
$3if (gpsEl) {
$4gpsEl.innerHTML = \`
                <span class="status-badge \${user.allowOutsideRadius ? 'warning' : 'success'}">
                    \${user.allowOutsideRadius ? '🌍 Sin restricción GPS' : '📍 Solo área autorizada'}
                </span>
            \`;
            // UPDATE GPS BUTTON
            const gpsBtn = gpsEl.parentElement.querySelector('button[onclick*="toggleGPSRadius"]');
            if (gpsBtn) {
                gpsBtn.setAttribute('onclick', \`toggleGPSRadius('\${userId}', \${user.allowOutsideRadius})\`);
                gpsBtn.textContent = user.allowOutsideRadius ? '📍 Restringir GPS' : '🌍 Permitir fuera de área';
            }
$5}`;

content = content.replace(gpsPattern, gpsReplacement);

fs.writeFileSync(filePath, content);
console.log('✅ FIX APLICADO: Botones ahora se actualizan después de cambios');
