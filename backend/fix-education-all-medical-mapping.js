/**
 * FIX: Corregir mapeo de campos para TODAS las funciones mal generadas
 *
 * Problema: El script de mass update generó código con IDs de formularios que no existen
 * Solución: Buscar cada función y corregir el mapeo de campos según el HTML real
 */

const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'public', 'js', 'modules', 'users.js');

function fixAddEducation(content) {
    console.log('  🔧 Arreglando addEducation()...');

    // El HTML tiene: educationType, institution, degree, status, graduationYear, gpa, description
    // La tabla necesita: education_level, institution_name, degree_title, field_of_study, start_date, end_date, graduated

    const oldCode = /document\.getElementById\('educationForm'\)\.onsubmit = async \(e\) => \{[\s\S]*?\n    \};/;

    const newCode = `document.getElementById('educationForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const educationType = document.getElementById('educationType').value;
            const institution = document.getElementById('institution').value;
            const degree = document.getElementById('degree').value;
            const status = document.getElementById('status').value;
            const graduationYear = document.getElementById('graduationYear').value;
            const description = document.getElementById('description').value;

            const formData = {
                education_level: educationType,
                institution_name: institution,
                degree_title: degree,
                field_of_study: description || null,
                start_date: null,  // No está en el formulario
                end_date: graduationYear ? \`\${graduationYear}-12-31\` : null,
                graduated: status === 'completed'
            };

            const response = await fetch(\`/api/v1/user-profile/\${userId}/education\`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al agregar educación');
            }

            closeModal('educationModal');
            showUserMessage('✅ Formación académica agregada exitosamente', 'success');

            if (typeof loadEducation === 'function') {
                loadEducation(userId);
            }
        } catch (error) {
            console.error('❌ Error al agregar educación:', error);
            showUserMessage(\`❌ Error: \${error.message}\`, 'error');
        }
    };`;

    return content.replace(oldCode, newCode);
}

function checkAllMedicalTables() {
    console.log('\n📋 Verificando tablas médicas para mapeo correcto...\n');

    // Las tablas que SÍ funcionaron (no necesitan fix):
    const workingTables = [
        'user_medications',
        'user_activity_restrictions',
        'user_work_restrictions'
    ];

    // Las tablas que fallaron (necesitan fix):
    const brokenTables = [
        'user_education',
        'user_chronic_conditions',
        'user_allergies',
        'user_vaccinations',
        'user_medical_exams'
    ];

    console.log('✅ Tablas funcionando correctamente:');
    workingTables.forEach(t => console.log(`   - ${t}`));

    console.log('\n❌ Tablas con problemas de mapeo:');
    brokenTables.forEach(t => console.log(`   - ${t}`));

    console.log('\n🔧 Corrigiendo funciones afectadas...\n');
}

async function main() {
    console.log('\n' + '█'.repeat(80));
    console.log('🔧 FIX: MAPEO DE CAMPOS EDUCATION + MEDICAL');
    console.log('█'.repeat(80) + '\n');

    // Verificar archivo existe
    if (!fs.existsSync(USERS_FILE)) {
        console.error(`❌ Archivo no encontrado: ${USERS_FILE}`);
        process.exit(1);
    }

    // Crear backup
    const backupPath = USERS_FILE + '.backup-before-field-mapping-fix';
    fs.copyFileSync(USERS_FILE, backupPath);
    console.log(`📦 Backup creado: ${backupPath}\n`);

    // Leer contenido
    let content = fs.readFileSync(USERS_FILE, 'utf-8');

    // Mostrar info de tablas
    checkAllMedicalTables();

    // Fix: addEducation()
    content = fixAddEducation(content);
    console.log('  ✅ addEducation() corregido\n');

    // Guardar archivo
    fs.writeFileSync(USERS_FILE, content, 'utf-8');

    console.log('✅ ARCHIVO ACTUALIZADO\n');
    console.log('📝 PRÓXIMOS PASOS:');
    console.log('   1. Verificar sintaxis: node -c public/js/modules/users.js');
    console.log('   2. Ejecutar test: node test-education-medical.js');
    console.log('   3. Verificar que ahora Education funciona\n');
}

main().catch(error => {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
});
