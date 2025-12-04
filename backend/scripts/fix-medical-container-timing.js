const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/panel-empresa.html');
let code = fs.readFileSync(filePath, 'utf8');

const oldPattern = `                        // Initialize medical dashboard
                        if (typeof window.initMedicalDashboard === 'function') {
                            window.initMedicalDashboard();
                        } else {
                            showModuleFallback(moduleId, moduleName, 'medical-dashboard-professional.js no cargado');
                        }`;

const newPattern = `                        // Initialize medical dashboard (con delay para asegurar DOM listo)
                        setTimeout(() => {
                            if (typeof window.initMedicalDashboard === 'function') {
                                window.initMedicalDashboard();
                            } else {
                                showModuleFallback(moduleId, moduleName, 'medical-dashboard-professional.js no cargado');
                            }
                        }, 100);`;

if (code.includes(oldPattern)) {
  code = code.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('✅ Fix aplicado: setTimeout agregado para inicialización del dashboard médico');
} else {
  console.error('❌ Patrón no encontrado - puede que ya esté aplicado el fix');
  process.exit(1);
}
