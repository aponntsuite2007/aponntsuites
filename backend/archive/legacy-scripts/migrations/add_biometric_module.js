/**
 * Script para agregar el módulo biometric a la base de datos
 */

const { Sequelize, DataTypes } = require('sequelize');

// Configuración de conexión a PostgreSQL
const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: console.log
});

// Definir modelos
const SystemModule = sequelize.define('SystemModule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT
    },
    icon: DataTypes.STRING,
    category: DataTypes.STRING,
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'system_modules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

const CompanyModule = sequelize.define('CompanyModule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    system_module_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    is_contracted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_operational: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'company_modules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

async function addBiometricModule() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL establecida');

        // Verificar si el módulo biometric ya existe
        const existingModule = await SystemModule.findOne({
            where: { slug: 'biometric' }
        });

        if (existingModule) {
            console.log('⚠️ Módulo biometric ya existe:', existingModule.toJSON());

            // Asignar a todas las empresas que tienen módulos
            const companies = await sequelize.query(`
                SELECT DISTINCT company_id FROM company_modules
            `, { type: Sequelize.QueryTypes.SELECT });

            console.log(`📋 Encontradas ${companies.length} empresas para asignar biometric`);

            for (const company of companies) {
                const existingAssignment = await CompanyModule.findOne({
                    where: {
                        company_id: company.company_id,
                        system_module_id: existingModule.id
                    }
                });

                if (!existingAssignment) {
                    await CompanyModule.create({
                        company_id: company.company_id,
                        system_module_id: existingModule.id,
                        is_contracted: true,
                        is_active: true,
                        is_operational: true
                    });
                    console.log(`✅ Módulo biometric asignado a empresa ${company.company_id}`);
                } else {
                    console.log(`✅ Módulo biometric ya asignado a empresa ${company.company_id}`);
                }
            }

        } else {
            // Crear el módulo biometric
            const biometricModule = await SystemModule.create({
                name: 'Centro de Comando Biométrico',
                slug: 'biometric',
                description: 'Centro de Comando Biométrico con conexiones a Harvard, Stanford y MIT. Análisis avanzado de biometría, templates faciales, detección de fatiga y análisis emocional.',
                icon: '🎭',
                category: 'SEGURIDAD',
                is_active: true
            });

            console.log('✅ Módulo biometric creado:', biometricModule.toJSON());

            // Asignar a todas las empresas
            const companies = await sequelize.query(`
                SELECT DISTINCT company_id FROM company_modules
            `, { type: Sequelize.QueryTypes.SELECT });

            console.log(`📋 Asignando a ${companies.length} empresas`);

            for (const company of companies) {
                await CompanyModule.create({
                    company_id: company.company_id,
                    system_module_id: biometricModule.id,
                    is_contracted: true,
                    is_active: true,
                    is_operational: true
                });
                console.log(`✅ Módulo biometric asignado a empresa ${company.company_id}`);
            }
        }

        console.log('🎉 ¡Módulo biometric configurado exitosamente!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

addBiometricModule();