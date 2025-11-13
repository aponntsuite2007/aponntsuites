const fs = require('fs');
const path = require('path');

console.log('\n🔧 Agregando método fillEditUserForm() al Phase4TestOrchestrator...\n');

const filePath = path.join(__dirname, 'src/auditor/core/Phase4TestOrchestrator.js');

// Leer archivo
const content = fs.readFileSync(filePath, 'utf8');

// Verificar si el método ya existe
if (content.includes('fillEditUserForm')) {
    console.log('⚠️  El método fillEditUserForm() ya existe en el archivo');
    process.exit(0);
}

// Nuevo método
const newMethod = `
    /**
     * Llena el formulario REAL de edición de usuario (editUser modal)
     * Este modal SÍ tiene campos editables y GUARDA en BD
     */
    async fillEditUserForm(userId) {
        const result = {
            name: 'Edit User Form (REAL)',
            totalFields: 10,
            filledFields: 0,
            errors: [],
            savedToDB: false
        };

        console.log('\n🎯 [EDIT USER] Llenando formulario REAL de edición');

        try {
            const modalVisible = await this.page.isVisible('#editUserModal').catch(() => false);
            if (!modalVisible) {
                throw new Error('Modal editUser NO visible - debe llamarse editUser(userId) primero');
            }

            console.log('   ✅ Modal editUser visible\n');

            const timestamp = Date.now();
            const testData = {
                firstName: 'Juan Carlos',
                lastName: 'Pérez Test',
                email: \`test.\${timestamp}@example.com\`,
                dni: \`\${timestamp}\`.substring(0, 8),
                phone: '1122334455',
                position: 'QA Automation Tester',
                salary: '75000',
                emergencyContact: 'María Pérez',
                emergencyPhone: '1155667788',
                address: 'Av. Corrientes 1234, CABA'
            };

            console.log('   📝 Llenando Información Personal...');
            
            const fields = [
                { id: '#editFirstName', value: testData.firstName, label: 'Nombre' },
                { id: '#editLastName', value: testData.lastName, label: 'Apellido' },
                { id: '#editEmail', value: testData.email, label: 'Email' },
                { id: '#editDni', value: testData.dni, label: 'DNI' },
                { id: '#editPhone', value: testData.phone, label: 'Teléfono' },
                { id: '#editAddress', value: testData.address, label: 'Dirección' },
                { id: '#editPosition', value: testData.position, label: 'Posición' },
                { id: '#editSalary', value: testData.salary, label: 'Salario' },
                { id: '#editEmergencyContact', value: testData.emergencyContact, label: 'Contacto Emergencia' },
                { id: '#editEmergencyPhone', value: testData.emergencyPhone, label: 'Tel. Emergencia' }
            ];

            for (const field of fields) {
                try {
                    await this.page.fill(field.id, field.value);
                    result.filledFields++;
                    console.log(\`      ✅ \${field.label}: \${field.value}\`);
                } catch (e) {
                    result.errors.push(\`\${field.id}: \${e.message}\`);
                    console.log(\`      ❌ \${field.label}: \${e.message}\`);
                }
            }

            console.log(\`\n   📊 Campos llenados: \${result.filledFields}/\${result.totalFields}\`);
            console.log('\n   💾 Guardando cambios...');

            const saveButtonClicked = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const saveBtn = buttons.find(btn => 
                    btn.textContent.includes('Guardar') || 
                    btn.textContent.includes('💾') || 
                    btn.textContent.includes('Actualizar')
                );
                if (saveBtn) {
                    saveBtn.click();
                    return true;
                }
                return false;
            });

            if (!saveButtonClicked) {
                result.errors.push('Botón Guardar no encontrado');
                console.log('      ❌ Botón Guardar no encontrado');
            } else {
                await this.wait(3000);
                result.savedToDB = true;
                console.log('      ✅ Click en Guardar ejecutado');
            }

            console.log('\n   🔍 Verificando persistencia en BD...');

            const [updated] = await this.database.sequelize.query(\`
                SELECT "firstName", "lastName", email, dni, phone, position,
                       salary, "emergencyContact", "emergencyPhone", address
                FROM users
                WHERE user_id = '\${userId}'
            \`);

            if (!updated || updated.length === 0) {
                result.errors.push('Usuario no encontrado en BD');
                console.log('      ❌ Usuario no encontrado en BD');
            } else {
                const user = updated[0];
                const matches = {
                    firstName: user.firstName === testData.firstName,
                    lastName: user.lastName === testData.lastName,
                    email: user.email === testData.email,
                    dni: user.dni === testData.dni,
                    phone: user.phone === testData.phone,
                    position: user.position === testData.position,
                    salary: user.salary && user.salary.toString() === testData.salary,
                    emergencyContact: user.emergencyContact === testData.emergencyContact,
                    emergencyPhone: user.emergencyPhone === testData.emergencyPhone,
                    address: user.address === testData.address
                };

                const totalMatches = Object.values(matches).filter(Boolean).length;
                result.savedToDB = totalMatches > 0;

                console.log(\`      ✅ Campos guardados en BD: \${totalMatches}/10\`);

                Object.entries(matches).forEach(([field, match]) => {
                    if (!match) {
                        result.errors.push(\`Campo \${field} NO guardado en BD\`);
                    }
                });
            }

            console.log('\n   ✅ fillEditUserForm() completado');

        } catch (error) {
            console.error(\`\n   ❌ Error en fillEditUserForm(): \${error.message}\`);
            result.errors.push(error.message);
        }

        return result;
    }
`;

// Reemplazar el cierre de la clase
const newContent = content.replace(
    /(\s+return result;\s+}\s+)\}\s+module\.exports = Phase4TestOrchestrator;/,
    `$1${newMethod}}\n\nmodule.exports = Phase4TestOrchestrator;`
);

// Verificar que el reemplazo funcionó
if (newContent === content) {
    console.error('❌ No se pudo agregar el método - patrón no encontrado');
    process.exit(1);
}

// Guardar archivo
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✅ Método fillEditUserForm() agregado exitosamente al Phase4TestOrchestrator');
console.log('📂 Archivo modificado: src/auditor/core/Phase4TestOrchestrator.js\n');
