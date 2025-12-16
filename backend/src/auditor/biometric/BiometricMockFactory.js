/**
 * ============================================================================
 * BIOMETRIC MOCK FACTORY
 * ============================================================================
 *
 * Genera datos mock para testing biométrico:
 * - Usuarios de prueba con embeddings
 * - Turnos y configuraciones
 * - Estados de suspensión
 *
 * @version 1.0.0
 * @date 2024-12-14
 * ============================================================================
 */

const crypto = require('crypto');

class BiometricMockFactory {
    constructor(config = {}) {
        this.config = config;

        // Prefijo para identificar datos de test
        this.testPrefix = 'BIOMETRIC_TEST_';

        // Datos generados para cleanup
        this.createdUsers = [];
        this.createdShifts = [];
        this.createdTemplates = [];

        // Nombres y apellidos para generar datos realistas
        this.firstNames = [
            'Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Diego', 'Sofía',
            'Martín', 'Valentina', 'Lucas', 'Camila', 'Nicolás', 'Paula', 'Matías',
            'Florencia', 'Santiago', 'Julieta', 'Tomás', 'Milagros', 'Agustín',
            'Rocío', 'Facundo', 'Aldana', 'Gonzalo', 'Abril', 'Franco', 'Luciana'
        ];

        this.lastNames = [
            'González', 'Rodríguez', 'García', 'Fernández', 'López', 'Martínez',
            'Pérez', 'Sánchez', 'Romero', 'Díaz', 'Torres', 'Ruiz', 'Álvarez',
            'Flores', 'Acosta', 'Medina', 'Herrera', 'Aguirre', 'Castro', 'Vargas',
            'Ríos', 'Gómez', 'Morales', 'Ortiz', 'Silva', 'Rojas', 'Mendoza'
        ];
    }

    /**
     * Generar usuarios de prueba con embeddings
     */
    async generateTestUsers(count = 100) {
        console.log(`👥 [MOCK-FACTORY] Generando ${count} usuarios de prueba...`);

        const users = [];

        for (let i = 0; i < count; i++) {
            const user = this.createTestUser(i);
            users.push(user);
        }

        this.createdUsers = users;

        // Intentar insertar en BD si está disponible
        try {
            await this.insertTestUsersInDB(users);
        } catch (error) {
            console.log(`⚠️ [MOCK-FACTORY] No se pudo insertar en BD (modo mock): ${error.message}`);
        }

        return users;
    }

    /**
     * Crear un usuario de prueba individual
     */
    createTestUser(index) {
        const firstName = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
        const lastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
        const uniqueId = `${this.testPrefix}${Date.now()}_${index}`;

        // Generar embedding mock (128 floats como face-api.js)
        const embedding = this.generateRealisticEmbedding(uniqueId);

        return {
            id: 10000 + index, // IDs altos para no colisionar
            uniqueId: uniqueId,
            firstName: firstName,
            lastName: lastName,
            fullName: `${firstName} ${lastName}`,
            email: `test_${index}@biometric-test.local`,
            dni: `99${String(index).padStart(6, '0')}`,
            employeeCode: `TEST-${String(index).padStart(4, '0')}`,
            embedding: embedding,
            embeddingHash: crypto.createHash('md5').update(embedding.join(',')).digest('hex'),
            isActive: true,
            isSuspended: false,
            shiftId: null,
            companyId: this.config.companyId || 1,
            createdAt: new Date(),
            testUser: true
        };
    }

    /**
     * Generar embedding realista
     * Los embeddings de face-api.js son vectores de 128 dimensiones normalizados
     */
    generateRealisticEmbedding(seed) {
        // Usar seed para reproducibilidad
        const hash = crypto.createHash('sha256').update(seed).digest();

        const embedding = [];
        for (let i = 0; i < 128; i++) {
            // Generar valor basado en hash
            const byteIndex = i % 32;
            const value = (hash[byteIndex] / 255) * 2 - 1; // Normalizar a [-1, 1]

            // Agregar algo de variación
            const noise = (Math.random() * 0.1) - 0.05;
            embedding.push(Math.max(-1, Math.min(1, value + noise)));
        }

        // Normalizar el vector (L2 norm)
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => val / norm);
    }

    /**
     * Insertar usuarios de prueba en BD
     */
    async insertTestUsersInDB(users) {
        const { sequelize } = require('../../config/database');

        // Verificar si la tabla existe
        const [tables] = await sequelize.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_name = 'users' AND table_schema = 'public'
        `);

        if (tables.length === 0) {
            throw new Error('Tabla users no existe');
        }

        // Insertar usuarios (en transacción)
        const transaction = await sequelize.transaction();

        try {
            for (const user of users) {
                // Verificar si ya existe
                const [existing] = await sequelize.query(`
                    SELECT id FROM users WHERE email = :email
                `, {
                    replacements: { email: user.email },
                    transaction
                });

                if (existing.length === 0) {
                    await sequelize.query(`
                        INSERT INTO users (
                            first_name, last_name, email, dni, employee_code,
                            company_id, is_active, role, created_at, updated_at
                        ) VALUES (
                            :firstName, :lastName, :email, :dni, :employeeCode,
                            :companyId, true, 'employee', NOW(), NOW()
                        )
                    `, {
                        replacements: {
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email,
                            dni: user.dni,
                            employeeCode: user.employeeCode,
                            companyId: user.companyId
                        },
                        transaction
                    });
                }
            }

            await transaction.commit();
            console.log(`✅ [MOCK-FACTORY] ${users.length} usuarios insertados en BD`);

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Configurar turnos de prueba
     */
    async setupTestShifts(testUsers) {
        console.log(`⏰ [MOCK-FACTORY] Configurando turnos para ${testUsers.length} usuarios...`);

        // Definir turnos de prueba
        const shifts = [
            {
                name: 'Turno Mañana Test',
                startTime: '08:00',
                endTime: '16:00',
                toleranceMinutes: 15,
                earlyEntryMinutes: 30
            },
            {
                name: 'Turno Tarde Test',
                startTime: '14:00',
                endTime: '22:00',
                toleranceMinutes: 10,
                earlyEntryMinutes: 20
            },
            {
                name: 'Turno Noche Test',
                startTime: '22:00',
                endTime: '06:00',
                toleranceMinutes: 15,
                earlyEntryMinutes: 30
            }
        ];

        // Asignar turnos a usuarios de forma aleatoria
        testUsers.forEach((user, index) => {
            const shift = shifts[index % shifts.length];
            user.shift = shift;
            user.shiftName = shift.name;
            user.shiftStart = shift.startTime;
            user.shiftEnd = shift.endTime;
            user.toleranceMinutes = shift.toleranceMinutes;
            user.earlyEntryMinutes = shift.earlyEntryMinutes;
        });

        this.createdShifts = shifts;

        // Intentar insertar en BD
        try {
            await this.insertTestShiftsInDB(shifts);
        } catch (error) {
            console.log(`⚠️ [MOCK-FACTORY] No se pudo insertar turnos en BD: ${error.message}`);
        }

        return shifts;
    }

    /**
     * Insertar turnos de prueba en BD
     */
    async insertTestShiftsInDB(shifts) {
        const { sequelize } = require('../../config/database');

        for (const shift of shifts) {
            const [existing] = await sequelize.query(`
                SELECT id FROM shifts WHERE name = :name AND company_id = :companyId
            `, {
                replacements: {
                    name: shift.name,
                    companyId: this.config.companyId || 1
                }
            });

            if (existing.length === 0) {
                await sequelize.query(`
                    INSERT INTO shifts (
                        name, start_time, end_time, tolerance_minutes,
                        company_id, is_active, created_at, updated_at
                    ) VALUES (
                        :name, :startTime, :endTime, :toleranceMinutes,
                        :companyId, true, NOW(), NOW()
                    )
                `, {
                    replacements: {
                        name: shift.name,
                        startTime: shift.startTime,
                        endTime: shift.endTime,
                        toleranceMinutes: shift.toleranceMinutes,
                        companyId: this.config.companyId || 1
                    }
                });
            }
        }
    }

    /**
     * Configurar usuarios suspendidos
     */
    async setupSuspendedUsers(users) {
        console.log(`🚫 [MOCK-FACTORY] Configurando ${users.length} usuarios como suspendidos...`);

        users.forEach(user => {
            user.isSuspended = true;
            user.suspensionStart = new Date();
            user.suspensionEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
            user.suspensionReason = 'Test - Suspensión de prueba';
        });

        // Intentar marcar en BD
        try {
            await this.markSuspendedUsersInDB(users);
        } catch (error) {
            console.log(`⚠️ [MOCK-FACTORY] No se pudo marcar suspendidos en BD: ${error.message}`);
        }

        return users;
    }

    /**
     * Marcar usuarios como suspendidos en BD
     */
    async markSuspendedUsersInDB(users) {
        const { sequelize } = require('../../config/database');

        // Verificar si existe tabla de sanciones
        const [tables] = await sequelize.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_name = 'sanctions' AND table_schema = 'public'
        `);

        if (tables.length === 0) {
            console.log('⚠️ [MOCK-FACTORY] Tabla sanctions no existe, skip');
            return;
        }

        for (const user of users) {
            // Buscar user_id real
            const [realUser] = await sequelize.query(`
                SELECT id FROM users WHERE email = :email
            `, {
                replacements: { email: user.email }
            });

            if (realUser.length > 0) {
                // Crear sanción de suspensión
                await sequelize.query(`
                    INSERT INTO sanctions (
                        user_id, company_id, type, status, start_date, end_date,
                        reason, created_at, updated_at
                    ) VALUES (
                        :userId, :companyId, 'SUSPENSION', 'ACTIVE', :startDate, :endDate,
                        :reason, NOW(), NOW()
                    ) ON CONFLICT DO NOTHING
                `, {
                    replacements: {
                        userId: realUser[0].id,
                        companyId: this.config.companyId || 1,
                        startDate: user.suspensionStart,
                        endDate: user.suspensionEnd,
                        reason: user.suspensionReason
                    }
                });
            }
        }
    }

    /**
     * Crear templates biométricos mock en BD
     */
    async createBiometricTemplates(users) {
        console.log(`🔐 [MOCK-FACTORY] Creando templates biométricos para ${users.length} usuarios...`);

        const { sequelize } = require('../../config/database');

        // Verificar si existe tabla de templates
        const [tables] = await sequelize.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_name IN ('biometric_templates', 'facial_biometric_data')
            AND table_schema = 'public'
        `);

        if (tables.length === 0) {
            console.log('⚠️ [MOCK-FACTORY] Tablas de biometría no existen, usando mock memory');
            return users;
        }

        const tableName = tables[0].table_name;

        for (const user of users) {
            // Buscar user_id real
            const [realUser] = await sequelize.query(`
                SELECT id FROM users WHERE email = :email
            `, {
                replacements: { email: user.email }
            });

            if (realUser.length > 0) {
                const userId = realUser[0].id;

                // Encriptar embedding
                const encryptedEmbedding = this.encryptEmbedding(user.embedding);

                try {
                    if (tableName === 'biometric_templates') {
                        await sequelize.query(`
                            INSERT INTO biometric_templates (
                                user_id, company_id, template_data, template_hash,
                                quality_score, is_active, created_at, updated_at
                            ) VALUES (
                                :userId, :companyId, :templateData, :templateHash,
                                0.95, true, NOW(), NOW()
                            ) ON CONFLICT (user_id) DO UPDATE SET
                                template_data = :templateData,
                                updated_at = NOW()
                        `, {
                            replacements: {
                                userId: userId,
                                companyId: this.config.companyId || 1,
                                templateData: encryptedEmbedding,
                                templateHash: user.embeddingHash
                            }
                        });
                    } else if (tableName === 'facial_biometric_data') {
                        await sequelize.query(`
                            INSERT INTO facial_biometric_data (
                                user_id, company_id, face_encoding, encoding_hash,
                                quality_score, is_active, created_at, updated_at
                            ) VALUES (
                                :userId, :companyId, :faceEncoding, :encodingHash,
                                0.95, true, NOW(), NOW()
                            ) ON CONFLICT (user_id) DO UPDATE SET
                                face_encoding = :faceEncoding,
                                updated_at = NOW()
                        `, {
                            replacements: {
                                userId: userId,
                                companyId: this.config.companyId || 1,
                                faceEncoding: encryptedEmbedding,
                                encodingHash: user.embeddingHash
                            }
                        });
                    }

                    user.templateCreated = true;
                    this.createdTemplates.push({ userId, hash: user.embeddingHash });

                } catch (error) {
                    console.log(`⚠️ [MOCK-FACTORY] Error creando template para user ${userId}: ${error.message}`);
                }
            }
        }

        return users;
    }

    /**
     * Encriptar embedding para almacenamiento
     */
    encryptEmbedding(embedding) {
        const crypto = require('crypto');
        const key = process.env.BIOMETRIC_ENCRYPTION_KEY || 'test_encryption_key_32_chars!!';
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
        const embeddingStr = JSON.stringify(embedding);

        let encrypted = cipher.update(embeddingStr, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * Generar datos de fichaje mock
     */
    generateMockClockInData(user, scenario) {
        return {
            userId: user.id,
            userEmail: user.email,
            companyId: user.companyId,
            embedding: user.embedding,
            qualityScore: scenario?.qualityScore || 0.95,
            deviceInfo: {
                type: 'kiosk',
                model: 'test-device',
                os: 'android',
                appVersion: '2.1.0'
            },
            location: {
                lat: -34.6037 + (Math.random() * 0.01 - 0.005),
                lng: -58.3816 + (Math.random() * 0.01 - 0.005),
                accuracy: 10 + Math.random() * 5
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Limpiar datos de prueba
     */
    async cleanup() {
        console.log('🧹 [MOCK-FACTORY] Limpiando datos de prueba...');

        try {
            const { sequelize } = require('../../config/database');

            // Eliminar usuarios de prueba
            await sequelize.query(`
                DELETE FROM users WHERE email LIKE '%@biometric-test.local'
            `);

            // Eliminar turnos de prueba
            await sequelize.query(`
                DELETE FROM shifts WHERE name LIKE '%Test%'
            `);

            // Eliminar templates de prueba (si existen)
            try {
                await sequelize.query(`
                    DELETE FROM biometric_templates WHERE user_id IN (
                        SELECT id FROM users WHERE email LIKE '%@biometric-test.local'
                    )
                `);
            } catch (e) { /* tabla puede no existir */ }

            try {
                await sequelize.query(`
                    DELETE FROM facial_biometric_data WHERE user_id IN (
                        SELECT id FROM users WHERE email LIKE '%@biometric-test.local'
                    )
                `);
            } catch (e) { /* tabla puede no existir */ }

            // Eliminar sanciones de prueba
            try {
                await sequelize.query(`
                    DELETE FROM sanctions WHERE reason LIKE '%Test%'
                `);
            } catch (e) { /* tabla puede no existir */ }

            console.log('✅ [MOCK-FACTORY] Limpieza completada');

        } catch (error) {
            console.log(`⚠️ [MOCK-FACTORY] Error en limpieza: ${error.message}`);
        }

        // Limpiar datos en memoria
        this.createdUsers = [];
        this.createdShifts = [];
        this.createdTemplates = [];
    }

    /**
     * Obtener estadísticas de datos generados
     */
    getStats() {
        return {
            usersCreated: this.createdUsers.length,
            shiftsCreated: this.createdShifts.length,
            templatesCreated: this.createdTemplates.length,
            suspendedUsers: this.createdUsers.filter(u => u.isSuspended).length
        };
    }
}

module.exports = BiometricMockFactory;
