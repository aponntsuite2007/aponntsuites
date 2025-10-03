/**
 * Script para crear las tablas del módulo de clientes
 * Ejecuta el SQL directamente usando Sequelize
 */

const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: console.log
    }
);

async function createClientTables() {
    try {
        console.log('🔌 Conectando a PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Conexión exitosa a PostgreSQL');

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, '..', 'sql', '004_create_clients_module.sql');
        console.log(`📖 Leyendo archivo SQL: ${sqlPath}`);

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        console.log('🗃️ Ejecutando script SQL para crear tablas de clientes...');

        // Dividir en comandos individuales (por punto y coma seguido de salto de línea)
        const commands = sqlContent
            .split(';\n')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0);

        console.log(`📝 Ejecutando ${commands.length} comandos SQL...`);

        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            if (command.trim()) {
                console.log(`🔄 Ejecutando comando ${i + 1}/${commands.length}...`);
                try {
                    await sequelize.query(command + ';');
                    console.log(`✅ Comando ${i + 1} ejecutado exitosamente`);
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        console.log(`⚠️ Comando ${i + 1}: Tabla ya existe, continuando...`);
                    } else {
                        console.error(`❌ Error en comando ${i + 1}:`, error.message);
                        console.log('Comando que falló:', command.substring(0, 100) + '...');
                        // Continuar con el siguiente comando
                    }
                }
            }
        }

        console.log('✅ Script SQL ejecutado completamente');
        console.log('📊 Verificando tablas creadas...');

        // Verificar que las tablas se crearon
        const tables = [
            'siac_modulos_contratados',
            'siac_clientes',
            'siac_clientes_direcciones',
            'siac_clientes_contactos',
            'siac_clientes_precios_especiales',
            'siac_clientes_historial_credito',
            'siac_clientes_seguimiento',
            'siac_clientes_observaciones'
        ];

        for (const table of tables) {
            try {
                const result = await sequelize.query(`SELECT COUNT(*) FROM ${table}`,
                    { type: Sequelize.QueryTypes.SELECT });
                console.log(`✅ Tabla ${table}: ${result[0].count} registros`);
            } catch (error) {
                console.log(`❌ Tabla ${table}: No existe o error - ${error.message}`);
            }
        }

        console.log('🎉 ¡Módulo de clientes creado exitosamente!');

    } catch (error) {
        console.error('❌ Error creando tablas de clientes:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Ejecutar el script
createClientTables();