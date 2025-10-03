const { QueryInterface, Sequelize } = require('sequelize');
const database = require('../config/database');

async function runMigrations() {
  try {
    console.log('Iniciando migraciones de base de datos...');
    
    await database.sync();
    console.log('Conexión a base de datos establecida.');

    const queryInterface = database.getQueryInterface();
    
    // Verificar si la columna DNI ya existe
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.dni) {
      console.log('Agregando columna DNI a la tabla users...');
      
      await queryInterface.addColumn('users', 'dni', {
        type: Sequelize.STRING(20),
        allowNull: true, // Temporal para usuarios existentes
        unique: false // Temporal hasta que se llenen los DNI
      });
      
      console.log('✓ Columna DNI agregada exitosamente');
      
      // Agregar índice
      await queryInterface.addIndex('users', ['dni'], {
        name: 'users_dni_index'
      });
      
      console.log('✓ Índice para DNI creado');
      
    } else {
      console.log('La columna DNI ya existe en la tabla users');
    }

    // Verificar tabla facial_biometric_data
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('facial_biometric_data')) {
      console.log('Creando tabla facial_biometric_data...');
      
      await queryInterface.createTable('facial_biometric_data', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          }
        },
        faceEmbedding: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        faceEmbedding2: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        faceEmbedding3: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        qualityScore: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 0.0
        },
        confidenceThreshold: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 0.85
        },
        algorithm: {
          type: Sequelize.ENUM('mlkit', 'opencv_dlib', 'tensorflow_lite', 'facenet'),
          allowNull: false,
          defaultValue: 'mlkit'
        },
        algorithmVersion: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: '1.0'
        },
        imageWidth: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        imageHeight: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        faceBoxX: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        faceBoxY: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        faceBoxWidth: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        faceBoxHeight: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        landmarks: {
          type: Sequelize.JSON,
          allowNull: true
        },
        faceAngle: {
          type: Sequelize.FLOAT,
          allowNull: true
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        isPrimary: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        deviceId: {
          type: Sequelize.STRING,
          allowNull: true
        },
        deviceModel: {
          type: Sequelize.STRING,
          allowNull: true
        },
        appVersion: {
          type: Sequelize.STRING,
          allowNull: true
        },
        successfulMatches: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        failedAttempts: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        lastUsed: {
          type: Sequelize.DATE,
          allowNull: true
        },
        lastMatchScore: {
          type: Sequelize.FLOAT,
          allowNull: true
        },
        isValidated: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        validatedBy: {
          type: Sequelize.UUID,
          allowNull: true
        },
        validatedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
      
      console.log('✓ Tabla facial_biometric_data creada');
      
      // Agregar índices
      await queryInterface.addIndex('facial_biometric_data', ['userId']);
      await queryInterface.addIndex('facial_biometric_data', ['isActive']);
      await queryInterface.addIndex('facial_biometric_data', ['algorithm']);
      
      console.log('✓ Índices para facial_biometric_data creados');
    } else {
      console.log('La tabla facial_biometric_data ya existe');
    }

    console.log('✅ Todas las migraciones completadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    process.exit(1);
  } finally {
    await database.close();
    process.exit(0);
  }
}

// Ejecutar migraciones si este archivo es ejecutado directamente
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };