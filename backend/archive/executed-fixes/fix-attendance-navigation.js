const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'auditor', 'collectors', 'AttendanceModuleCollector.js');

// Leer contenido actual
let content = fs.readFileSync(filePath, 'utf8');

// El método antiguo que necesita ser reemplazado
const oldMethod = `    /**
     * Navegación inicial al módulo de asistencias
     */
    async navigateToAttendanceModule() {
        console.log('\\n📂 Navegando al módulo de Asistencias...\\n');

        // Esperar que cargue el panel con módulos
        await this.page.waitForSelector('.module-item', { timeout: 10000 });

        // Click en módulo de asistencias
        await this.clickElement('button[onclick*="loadModule(\\'attendance\\')"]', 'módulo Asistencias');

        // Esperar que cargue el contenido del módulo
        await this.page.waitForSelector('#attendance-content', { timeout: 10000 });

        console.log('✅ Módulo de Asistencias cargado\\n');
    }`;

// El nuevo método (igual al de users)
const newMethod = `    /**
     * Navegación inicial al módulo de asistencias
     */
    async navigateToAttendanceModule() {
        console.log('\\n📂 Navegando al módulo de Asistencias...\\n');

        // Navegar directamente con JavaScript (más confiable que buscar botón)
        await this.page.evaluate(() => {
            if (typeof window.showModuleContent === 'function') {
                window.showModuleContent('attendance', 'Control de Asistencias');
            } else {
                throw new Error('Función showModuleContent no encontrada');
            }
        });

        // Esperar que cargue el contenido del módulo
        await this.page.waitForSelector('#attendance', { state: 'visible', timeout: 10000 });

        console.log('✅ Módulo de Asistencias cargado\\n');
    }`;

// Reemplazar
content = content.replace(oldMethod, newMethod);

// Escribir el archivo actualizado
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Método navigateToAttendanceModule() actualizado exitosamente');
console.log('   Ahora usa window.showModuleContent() como UsersModuleCollector');
