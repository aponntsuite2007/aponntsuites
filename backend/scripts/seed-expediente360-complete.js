/**
 * SEED COMPLETO PARA EXPEDIENTE 360°
 *
 * Este script puebla TODOS los datos necesarios para que el módulo
 * Expediente 360° muestre información completa al 100%
 *
 * Uso: node scripts/seed-expediente360-complete.js
 */

require('dotenv').config();
const { Sequelize, Op } = require('sequelize');
const { faker } = require('@faker-js/faker/locale/es');

// Conexión a la base de datos - Configuración local
const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: false,
        timezone: '+00:00'
    }
);

// ============================================================================
// DATOS DE REFERENCIA
// ============================================================================

const POSITIONS = [
    'Operario', 'Técnico', 'Analista', 'Supervisor', 'Coordinador',
    'Jefe de Área', 'Gerente', 'Director', 'Asistente', 'Especialista'
];

const CONTRACT_TYPES = ['Indefinido', 'Temporal', 'Por obra', 'Pasantía', 'Freelance'];
const WORK_MODALITIES = ['Presencial', 'Remoto', 'Híbrido'];
const SHIFTS = ['Mañana', 'Tarde', 'Noche', 'Rotativo', 'Flexible'];
const EDUCATION_LEVELS = ['primaria', 'secundaria', 'terciaria', 'universitaria', 'posgrado'];
const MARITAL_STATUSES = ['soltero', 'casado', 'divorciado', 'viudo', 'union_libre'];
const RELATIONSHIPS = ['Cónyuge', 'Padre', 'Madre', 'Hijo/a', 'Hermano/a', 'Otro'];
const GENDERS = ['masculino', 'femenino'];
const DOCUMENT_TYPES = ['dni', 'pasaporte', 'licencia_conducir', 'certificado_antecedentes'];
const EXAM_TYPES = ['preocupacional', 'periodico', 'reingreso'];
const EXAM_RESULTS = ['apto', 'apto_con_observaciones'];
const CONVENIOS = ['UOCRA', 'Comercio', 'Metalúrgico', 'Gastronómico', 'Bancario', 'Sin convenio'];
const OBRAS_SOCIALES = ['OSDE', 'Swiss Medical', 'Galeno', 'OSECAC', 'OSPERYH', 'IOMA'];
const PROVINCES = ['Buenos Aires', 'CABA', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán'];
const CITIES = ['La Plata', 'Mar del Plata', 'Córdoba', 'Rosario', 'Mendoza', 'San Miguel de Tucumán'];
const INSTITUTIONS = [
    'Universidad de Buenos Aires', 'Universidad Nacional de Córdoba',
    'Universidad Tecnológica Nacional', 'Instituto Tecnológico',
    'Colegio Nacional', 'Escuela Técnica'
];
const DEGREES = [
    'Ingeniería Industrial', 'Licenciatura en Administración',
    'Técnico en Sistemas', 'Contador Público', 'Abogacía',
    'Medicina', 'Arquitectura', 'Bachiller'
];

// ============================================================================
// FUNCIONES HELPER
// ============================================================================

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateDNI() {
    return Math.floor(20000000 + Math.random() * 30000000).toString();
}

function generateCUIL(dni) {
    const prefix = Math.random() > 0.5 ? '20' : '27';
    return `${prefix}-${dni}-${Math.floor(Math.random() * 10)}`;
}

function generatePhone() {
    return `+54 11 ${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function generateSalary() {
    return Math.floor(150000 + Math.random() * 850000);
}

// ============================================================================
// CHECK TABLE EXISTS
// ============================================================================

async function tableExists(tableName) {
    try {
        const [results] = await sequelize.query(
            `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = :tableName)`,
            { replacements: { tableName }, type: Sequelize.QueryTypes.SELECT }
        );
        return results.exists;
    } catch (e) {
        return false;
    }
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedUserPersonalData(userId, companyId) {
    const dni = generateDNI();
    const cuil = generateCUIL(dni);
    const birthDate = randomDate(new Date(1970, 0, 1), new Date(2000, 0, 1));
    const hireDate = randomDate(new Date(2018, 0, 1), new Date(2024, 0, 1));
    const province = randomElement(PROVINCES);
    const city = randomElement(CITIES);

    const emergencyContact = JSON.stringify({
        name: faker.person.fullName(),
        phone: generatePhone(),
        relationship: randomElement(['Cónyuge', 'Padre', 'Madre', 'Hermano/a'])
    });

    const phone = generatePhone();
    const postalCode = Math.floor(1000 + Math.random() * 9000).toString();
    const address = `${faker.location.street()} ${Math.floor(100 + Math.random() * 9000)}, ${city}, ${province}`;
    const salary = generateSalary();
    const position = randomElement(POSITIONS);
    const emergencyContactName = faker.person.fullName();
    const emergencyPhone = generatePhone();
    const convenio = randomElement(CONVENIOS);
    const obraSocial = randomElement(OBRAS_SOCIALES);

    // Update using actual column names (mixed case - check actual DB columns)
    await sequelize.query(`
        UPDATE users SET
            dni = :dni,
            cuil = :cuil,
            "birthDate" = :birthDate,
            birth_date = :birthDate,
            phone = :phone,
            address = :address,
            city = :city,
            province = :province,
            postal_code = :postalCode,
            "hireDate" = :hireDate,
            salary = :salary,
            position = :position,
            "emergencyContact" = :emergencyContact,
            "emergencyPhone" = :emergencyPhone,
            emergency_contact = :emergencyContactJson,
            "convenioColectivo" = :convenio,
            health_insurance_provider = :obraSocial,
            "updatedAt" = NOW()
        WHERE user_id = :userId
    `, {
        replacements: {
            userId,
            dni,
            cuil,
            birthDate: birthDate.toISOString().split('T')[0],
            phone,
            city,
            province,
            postalCode,
            address,
            hireDate: hireDate.toISOString().split('T')[0],
            salary,
            position,
            emergencyContact: emergencyContactName,
            emergencyPhone,
            emergencyContactJson: JSON.stringify({ name: emergencyContactName, phone: emergencyPhone }),
            convenio,
            obraSocial
        },
        type: Sequelize.QueryTypes.UPDATE
    });

    return { dni, cuil, birthDate, hireDate };
}

async function seedMaritalStatus(userId, companyId) {
    if (!(await tableExists('user_marital_status'))) {
        console.log('   ⏭️ Tabla user_marital_status no existe, saltando...');
        return;
    }

    const status = randomElement(MARITAL_STATUSES);
    const hasConyuge = ['casado', 'union_libre'].includes(status);

    // Check if record exists
    const [existing] = await sequelize.query(
        `SELECT id FROM user_marital_status WHERE user_id = :userId`,
        { replacements: { userId }, type: Sequelize.QueryTypes.SELECT }
    );

    const data = {
        userId,
        companyId,
        status,
        spouseName: hasConyuge ? faker.person.fullName() : null,
        spouseDni: hasConyuge ? generateDNI() : null,
        spousePhone: hasConyuge ? generatePhone() : null,
        spouseOccupation: hasConyuge ? randomElement(POSITIONS) : null,
        marriageDate: hasConyuge ? randomDate(new Date(2010, 0, 1), new Date(2023, 0, 1)).toISOString().split('T')[0] : null
    };

    if (existing) {
        await sequelize.query(`
            UPDATE user_marital_status SET
                marital_status = :status,
                spouse_name = :spouseName,
                spouse_dni = :spouseDni,
                spouse_phone = :spousePhone,
                spouse_occupation = :spouseOccupation,
                marriage_date = :marriageDate,
                updated_at = NOW()
            WHERE user_id = :userId
        `, { replacements: data, type: Sequelize.QueryTypes.UPDATE });
    } else {
        await sequelize.query(`
            INSERT INTO user_marital_status
            (user_id, company_id, marital_status, spouse_name, spouse_dni, spouse_phone, spouse_occupation, marriage_date, created_at, updated_at)
            VALUES (:userId, :companyId, :status, :spouseName, :spouseDni, :spousePhone, :spouseOccupation, :marriageDate, NOW(), NOW())
        `, { replacements: data, type: Sequelize.QueryTypes.INSERT });
    }
}

async function seedFamilyMembers(userId, companyId) {
    if (!(await tableExists('user_family_members'))) {
        console.log('   ⏭️ Tabla user_family_members no existe, saltando...');
        return;
    }

    // Delete existing family members
    await sequelize.query(
        `DELETE FROM user_family_members WHERE user_id = :userId`,
        { replacements: { userId }, type: Sequelize.QueryTypes.DELETE }
    );

    // Add 2-4 family members
    const numMembers = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numMembers; i++) {
        const relationship = randomElement(RELATIONSHIPS);
        await sequelize.query(`
            INSERT INTO user_family_members
            (user_id, company_id, full_name, relationship, dni, birth_date, phone, lives_with_employee, is_dependent, is_emergency_contact, created_at, updated_at)
            VALUES (:userId, :companyId, :fullName, :relationship, :dni, :birthDate, :phone, :livesWithEmployee, :isDependent, :isEmergencyContact, NOW(), NOW())
        `, {
            replacements: {
                userId,
                companyId,
                fullName: faker.person.fullName(),
                relationship,
                dni: generateDNI(),
                birthDate: randomDate(new Date(1950, 0, 1), new Date(2020, 0, 1)).toISOString().split('T')[0],
                phone: generatePhone(),
                livesWithEmployee: Math.random() > 0.3,
                isDependent: relationship === 'Hijo/a' || Math.random() > 0.7,
                isEmergencyContact: i === 0
            },
            type: Sequelize.QueryTypes.INSERT
        });
    }
}

async function seedChildren(userId, companyId) {
    if (!(await tableExists('user_children'))) {
        console.log('   ⏭️ Tabla user_children no existe, saltando...');
        return;
    }

    // Delete existing children
    await sequelize.query(
        `DELETE FROM user_children WHERE user_id = :userId`,
        { replacements: { userId }, type: Sequelize.QueryTypes.DELETE }
    );

    // 50% chance to have children
    if (Math.random() > 0.5) {
        const numChildren = 1 + Math.floor(Math.random() * 3);

        for (let i = 0; i < numChildren; i++) {
            const birthDate = randomDate(new Date(2005, 0, 1), new Date(2022, 0, 1));
            const age = new Date().getFullYear() - birthDate.getFullYear();

            await sequelize.query(`
                INSERT INTO user_children
                (user_id, company_id, full_name, dni, birth_date, gender, lives_with_employee, is_dependent, health_insurance_coverage, school_name, grade_level, created_at, updated_at)
                VALUES (:userId, :companyId, :fullName, :dni, :birthDate, :gender, :livesWithEmployee, true, true, :schoolName, :gradeLevel, NOW(), NOW())
            `, {
                replacements: {
                    userId,
                    companyId,
                    fullName: faker.person.fullName(),
                    dni: age >= 14 ? generateDNI() : null,
                    birthDate: birthDate.toISOString().split('T')[0],
                    gender: randomElement(GENDERS),
                    livesWithEmployee: Math.random() > 0.2,
                    schoolName: age >= 5 ? `Escuela ${faker.location.city()}` : null,
                    gradeLevel: age >= 5 ? `${Math.min(age - 5, 12)}° grado` : null
                },
                type: Sequelize.QueryTypes.INSERT
            });
        }
    }
}

async function seedEducation(userId, companyId) {
    if (!(await tableExists('user_education'))) {
        console.log('   ⏭️ Tabla user_education no existe, saltando...');
        return;
    }

    // Delete existing education records
    await sequelize.query(
        `DELETE FROM user_education WHERE user_id = :userId`,
        { replacements: { userId }, type: Sequelize.QueryTypes.DELETE }
    );

    // Add 1-3 education records
    const numRecords = 1 + Math.floor(Math.random() * 3);
    const levels = ['secundaria', 'terciaria', 'universitaria'];

    for (let i = 0; i < numRecords; i++) {
        const level = levels[Math.min(i, levels.length - 1)];
        const startYear = 2000 + i * 5;
        const endYear = startYear + (level === 'universitaria' ? 5 : 3);

        await sequelize.query(`
            INSERT INTO user_education
            (user_id, company_id, education_level, institution_name, degree_title, field_of_study, start_date, end_date, graduated, created_at, updated_at)
            VALUES (:userId, :companyId, :level, :institution, :degree, :field, :startDate, :endDate, :graduated, NOW(), NOW())
        `, {
            replacements: {
                userId,
                companyId,
                level,
                institution: randomElement(INSTITUTIONS),
                degree: randomElement(DEGREES),
                field: faker.person.jobArea(),
                startDate: `${startYear}-03-01`,
                endDate: `${endYear}-12-15`,
                graduated: Math.random() > 0.2
            },
            type: Sequelize.QueryTypes.INSERT
        });
    }
}

async function seedWorkHistory(userId, companyId) {
    if (!(await tableExists('user_work_history'))) {
        console.log('   ⏭️ Tabla user_work_history no existe, saltando...');
        return;
    }

    // Delete existing work history
    await sequelize.query(
        `DELETE FROM user_work_history WHERE user_id = :userId`,
        { replacements: { userId }, type: Sequelize.QueryTypes.DELETE }
    );

    // Add 1-3 previous jobs
    const numJobs = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numJobs; i++) {
        const startYear = 2010 + i * 3;
        const endYear = startYear + 2 + Math.floor(Math.random() * 3);

        await sequelize.query(`
            INSERT INTO user_work_history
            (user_id, company_id, company_name, position, start_date, end_date, currently_working, reason_for_leaving, responsibilities, supervisor_name, created_at, updated_at)
            VALUES (:userId, :companyId, :companyName, :position, :startDate, :endDate, false, :reasonForLeaving, :responsibilities, :supervisorName, NOW(), NOW())
        `, {
            replacements: {
                userId,
                companyId,
                companyName: faker.company.name(),
                position: randomElement(POSITIONS),
                startDate: `${startYear}-01-15`,
                endDate: `${endYear}-06-30`,
                reasonForLeaving: randomElement(['Mejor oportunidad', 'Desarrollo profesional', 'Cambio de carrera', 'Reubicación']),
                responsibilities: faker.lorem.sentence(),
                supervisorName: faker.person.fullName()
            },
            type: Sequelize.QueryTypes.INSERT
        });
    }
}

async function seedMedicalExams(userId, companyId) {
    if (!(await tableExists('user_medical_exams'))) {
        console.log('   ⏭️ Tabla user_medical_exams no existe, saltando...');
        return;
    }

    // Delete existing medical exams
    await sequelize.query(
        `DELETE FROM user_medical_exams WHERE user_id = :userId`,
        { replacements: { userId }, type: Sequelize.QueryTypes.DELETE }
    );

    // Add preocupacional + 1-2 periodicos
    const examTypes = ['preocupacional', 'periodico'];

    for (let i = 0; i < examTypes.length; i++) {
        const examDate = randomDate(new Date(2022, 0, 1), new Date(2024, 11, 31));
        const nextExamDate = new Date(examDate);
        nextExamDate.setFullYear(nextExamDate.getFullYear() + 1);

        await sequelize.query(`
            INSERT INTO user_medical_exams
            (user_id, company_id, exam_type, exam_date, result, observations, next_exam_date, medical_center, examining_doctor, created_at, updated_at)
            VALUES (:userId, :companyId, :examType, :examDate, :result, :observations, :nextExamDate, :medicalCenter, :examiningDoctor, NOW(), NOW())
        `, {
            replacements: {
                userId,
                companyId,
                examType: examTypes[i],
                examDate: examDate.toISOString().split('T')[0],
                result: randomElement(EXAM_RESULTS),
                observations: Math.random() > 0.7 ? 'Sin observaciones relevantes' : 'Apto para tareas habituales',
                nextExamDate: nextExamDate.toISOString().split('T')[0],
                medicalCenter: `Centro Médico ${faker.location.city()}`,
                examiningDoctor: `Dr. ${faker.person.lastName()}`
            },
            type: Sequelize.QueryTypes.INSERT
        });
    }
}

async function seedDocuments(userId, companyId) {
    if (!(await tableExists('user_documents'))) {
        console.log('   ⏭️ Tabla user_documents no existe, saltando...');
        return;
    }

    // Delete existing documents
    await sequelize.query(
        `DELETE FROM user_documents WHERE user_id = :userId`,
        { replacements: { userId }, type: Sequelize.QueryTypes.DELETE }
    );

    // Add DNI + Licencia de conducir + Certificado
    for (const docType of DOCUMENT_TYPES) {
        const issueDate = randomDate(new Date(2020, 0, 1), new Date(2023, 0, 1));
        const expirationDate = new Date(issueDate);
        expirationDate.setFullYear(expirationDate.getFullYear() + (docType === 'dni' ? 15 : 5));

        await sequelize.query(`
            INSERT INTO user_documents
            (user_id, company_id, document_type, document_number, issue_date, expiration_date, issuing_authority, is_verified, created_at, updated_at)
            VALUES (:userId, :companyId, :docType, :docNumber, :issueDate, :expirationDate, :issuingAuthority, true, NOW(), NOW())
        `, {
            replacements: {
                userId,
                companyId,
                docType,
                docNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
                issueDate: issueDate.toISOString().split('T')[0],
                expirationDate: expirationDate.toISOString().split('T')[0],
                issuingAuthority: docType === 'dni' ? 'RENAPER' :
                                  docType === 'licencia_conducir' ? 'Municipalidad' :
                                  'Registro Civil'
            },
            type: Sequelize.QueryTypes.INSERT
        });
    }
}

async function seedPrimaryPhysician(userId, companyId) {
    if (!(await tableExists('user_primary_physician'))) {
        console.log('   ⏭️ Tabla user_primary_physician no existe, saltando...');
        return;
    }

    // Check if record exists
    const [existing] = await sequelize.query(
        `SELECT id FROM user_primary_physician WHERE user_id = :userId`,
        { replacements: { userId }, type: Sequelize.QueryTypes.SELECT }
    );

    const data = {
        userId,
        companyId,
        physicianName: `Dr. ${faker.person.fullName()}`,
        specialty: randomElement(['Medicina General', 'Clínica Médica', 'Medicina Laboral']),
        phone: generatePhone(),
        email: faker.internet.email(),
        clinicName: `Clínica ${faker.location.city()}`,
        clinicAddress: `${faker.location.street()} ${Math.floor(100 + Math.random() * 9000)}`
    };

    if (existing) {
        await sequelize.query(`
            UPDATE user_primary_physician SET
                physician_name = :physicianName,
                specialty = :specialty,
                phone = :phone,
                email = :email,
                clinic_name = :clinicName,
                clinic_address = :clinicAddress,
                updated_at = NOW()
            WHERE user_id = :userId
        `, { replacements: data, type: Sequelize.QueryTypes.UPDATE });
    } else {
        await sequelize.query(`
            INSERT INTO user_primary_physician
            (user_id, company_id, physician_name, specialty, phone, email, clinic_name, clinic_address, created_at, updated_at)
            VALUES (:userId, :companyId, :physicianName, :specialty, :phone, :email, :clinicName, :clinicAddress, NOW(), NOW())
        `, { replacements: data, type: Sequelize.QueryTypes.INSERT });
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  SEED EXPEDIENTE 360° - DATOS COMPLETOS                      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a base de datos establecida\n');

        // Get ISI company ID - using company_id
        const [companies] = await sequelize.query(
            `SELECT company_id FROM companies WHERE slug = 'isi' LIMIT 1`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (!companies) {
            console.log('❌ No se encontró la empresa ISI');
            return;
        }

        const companyId = companies.company_id;
        console.log(`📊 Empresa ISI encontrada (ID: ${companyId})\n`);

        // Get all users for ISI - using correct column names
        const users = await sequelize.query(
            `SELECT user_id, "firstName", "lastName", "employeeId" FROM users WHERE company_id = :companyId AND "isActive" = true LIMIT 50`,
            { replacements: { companyId }, type: Sequelize.QueryTypes.SELECT }
        );

        console.log(`👥 Encontrados ${users.length} usuarios activos\n`);
        console.log('═'.repeat(60));

        let processed = 0;
        let errors = 0;

        for (const user of users) {
            try {
                process.stdout.write(`\r🔄 Procesando: ${user.firstName} ${user.lastName} (${user.employeeId})...`);

                // Seed all data for this user
                await seedUserPersonalData(user.user_id, companyId);
                await seedMaritalStatus(user.user_id, companyId);
                await seedFamilyMembers(user.user_id, companyId);
                await seedChildren(user.user_id, companyId);
                await seedEducation(user.user_id, companyId);
                await seedWorkHistory(user.user_id, companyId);
                await seedMedicalExams(user.user_id, companyId);
                await seedDocuments(user.user_id, companyId);
                await seedPrimaryPhysician(user.user_id, companyId);

                processed++;
            } catch (err) {
                errors++;
                console.log(`\n⚠️ Error con ${user.employeeId}: ${err.message}`);
            }
        }

        console.log('\n\n' + '═'.repeat(60));
        console.log('\n📊 RESUMEN DE SEED:');
        console.log(`   ✅ Usuarios procesados: ${processed}`);
        console.log(`   ❌ Errores: ${errors}`);
        console.log('\n📋 DATOS POBLADOS POR USUARIO:');
        console.log('   • Datos personales (DNI, CUIL, teléfono, dirección)');
        console.log('   • Estado civil y cónyuge');
        console.log('   • Grupo familiar (2-4 miembros)');
        console.log('   • Hijos (0-3)');
        console.log('   • Formación académica (1-3 registros)');
        console.log('   • Historial laboral (1-3 trabajos previos)');
        console.log('   • Exámenes médicos (preocupacional + periódico)');
        console.log('   • Documentos (DNI, licencia, certificados)');
        console.log('   • Médico de cabecera');
        console.log('   • Contacto de emergencia');
        console.log('\n✅ SEED COMPLETADO - El módulo Expediente 360° ahora tiene datos completos!\n');

    } catch (error) {
        console.error('❌ Error durante el seed:', error);
    } finally {
        await sequelize.close();
    }
}

main();
