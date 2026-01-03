/**
 * Script para activar Voice Platform para ISI (company_id = 11)
 * 1. Crear módulo en system_modules
 * 2. Asignarlo a ISI
 * 3. Generar datos de prueba
 */

const { sequelize } = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

async function activateVoicePlatformForISI() {
  try {
    console.log('🎯 ACTIVANDO VOICE PLATFORM PARA ISI (company_id = 11)\n');
    console.log('='.repeat(60) + '\n');

    const companyId = 11;

    // 1. Verificar si el módulo ya existe
    console.log('1️⃣ Verificando módulo voice-platform en system_modules...');
    const [existingModule] = await sequelize.query(
      `SELECT id, module_key, name FROM system_modules WHERE module_key = 'voice-platform'`,
      { type: sequelize.QueryTypes.SELECT }
    );

    let moduleId;

    if (existingModule) {
      console.log(`   ✅ Módulo ya existe: ${existingModule.name}`);
      console.log(`   📋 ID: ${existingModule.id}\n`);
      moduleId = existingModule.id;
    } else {
      // Crear módulo
      console.log('   📝 Creando módulo voice-platform...');
      moduleId = uuidv4();

      await sequelize.query(`
        INSERT INTO system_modules (
          id, module_key, name, description, icon, color, category,
          base_price, is_active, is_core, display_order, version,
          features, requirements, rubro, available_in,
          created_at, updated_at
        ) VALUES (
          :id,
          'voice-platform',
          'Voice Platform 🎤',
          'Sistema de Experiencias del Empleado con IA - Captura sugerencias, problemas y soluciones. Clustering semántico, gamificación y analytics.',
          '🎤',
          '#10B981',
          'rrhh',
          29.99,
          true,
          false,
          150,
          '1.0.0',
          :features,
          :requirements,
          'Recursos Humanos',
          'both',
          NOW(),
          NOW()
        )
      `, {
        replacements: {
          id: moduleId,
          features: JSON.stringify([
            'Captura de sugerencias/problemas/soluciones',
            'Clustering semántico con IA (S-BERT)',
            'Sistema de votación (upvote/downvote)',
            'Comentarios y discusiones',
            'Gamificación (puntos, niveles, badges)',
            'Leaderboard de participación',
            'Analytics y métricas',
            'Detección de duplicados',
            'Multi-tenant con privacidad',
            'Workflow de aprobación'
          ]),
          requirements: JSON.stringify([
            'PostgreSQL 12+',
            'Python 3.8+ (NLP service)',
            'Min 50 empleados (recomendado)'
          ])
        }
      });

      console.log(`   ✅ Módulo creado: ${moduleId}\n`);
    }

    // 2. Verificar si ISI ya tiene el módulo
    console.log('2️⃣ Verificando asignación para ISI...');
    const [existingAssignment] = await sequelize.query(
      `SELECT id, activo, is_active FROM company_modules
       WHERE company_id = :companyId AND system_module_id = :moduleId`,
      {
        replacements: { companyId, moduleId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (existingAssignment) {
      if (existingAssignment.activo && existingAssignment.is_active) {
        console.log('   ✅ ISI ya tiene Voice Platform activo\n');
      } else {
        // Activarlo
        await sequelize.query(
          `UPDATE company_modules SET activo = true, is_active = true
           WHERE company_id = :companyId AND system_module_id = :moduleId`,
          { replacements: { companyId, moduleId } }
        );
        console.log('   ✅ Voice Platform activado para ISI\n');
      }
    } else {
      // Crear asignación
      console.log('   📝 Asignando Voice Platform a ISI...');
      await sequelize.query(`
        INSERT INTO company_modules (
          id, company_id, system_module_id, precio_mensual,
          activo, is_active, fecha_asignacion
        ) VALUES (
          :id, :companyId, :moduleId, 29.99,
          true, true, NOW()
        )
      `, {
        replacements: {
          id: uuidv4(),
          companyId,
          moduleId
        }
      });
      console.log('   ✅ Voice Platform asignado y activado\n');
    }

    // 3. Verificar usuario admin de ISI
    console.log('3️⃣ Verificando usuario admin de ISI...');
    const [adminUser] = await sequelize.query(
      `SELECT user_id, usuario, email FROM users
       WHERE company_id = :companyId AND role = 'admin' AND is_active = true
       LIMIT 1`,
      {
        replacements: { companyId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!adminUser) {
      console.log('   ❌ No se encontró usuario admin activo para ISI');
      process.exit(1);
    }

    console.log(`   ✅ Admin ISI: ${adminUser.usuario} (${adminUser.email})`);
    console.log(`   📋 ID: ${adminUser.user_id}\n`);

    // 4. Generar datos de prueba
    console.log('4️⃣ Generando datos de prueba para ISI...');

    const experiencesData = [
      // Sugerencias IT
      { title: 'Migrar a PostgreSQL 16', desc: 'La versión actual es vieja, PostgreSQL 16 tiene mejor performance y nuevas features como MERGE.', type: 'SUGGESTION', area: 'IT', priority: 'HIGH' },
      { title: 'Implementar CI/CD con GitHub Actions', desc: 'Automatizar deploy cada vez que hay push a master. Reducir errores humanos.', type: 'SUGGESTION', area: 'IT', priority: 'MEDIUM' },
      { title: 'Monitoreo con Grafana', desc: 'Dashboards en tiempo real de métricas del sistema: CPU, RAM, requests/s, errores.', type: 'SUGGESTION', area: 'IT', priority: 'MEDIUM' },

      // Problemas IT
      { title: 'Lentitud extrema en reportes', desc: 'Los reportes de asistencia tardan 3 minutos en generarse. La BD tiene 500k registros sin índices.', type: 'PROBLEM', area: 'IT', priority: 'HIGH' },
      { title: 'Backup manual es inseguro', desc: 'El backup se hace manual 1 vez por semana. Si falla el disco, perdemos 7 días de datos.', type: 'PROBLEM', area: 'IT', priority: 'HIGH' },

      // Soluciones IT
      { title: 'Crear índices en attendances(date, company_id)', desc: 'Agregar índice compuesto mejorará queries de reportes 100x más rápido.', type: 'SOLUTION', area: 'IT', priority: 'HIGH' },
      { title: 'Backup automático diario con pg_dump', desc: 'Script cron que ejecuta pg_dump cada noche a las 2am y sube a S3.', type: 'SOLUTION', area: 'IT', priority: 'HIGH' },

      // Sugerencias RRHH
      { title: 'Portal de beneficios online', desc: 'Los empleados pierden tiempo preguntando por vacaciones, ART, etc. Crear portal self-service.', type: 'SUGGESTION', area: 'ADMIN', priority: 'MEDIUM' },
      { title: 'Encuestas de clima laboral', desc: 'Medir satisfacción cada trimestre con encuesta anónima. Detectar problemas antes que exploten.', type: 'SUGGESTION', area: 'ADMIN', priority: 'LOW' },

      // Problemas RRHH
      { title: 'Alta rotación en área ventas', desc: 'En 6 meses se fueron 5 vendedores. Salir a buscar causas: sueldo, jefe, metas irreales?', type: 'PROBLEM', area: 'ADMIN', priority: 'HIGH' },

      // Producción
      { title: 'Línea 3 tiene cuello de botella', desc: 'La estación de pintura es más lenta que las demás. O agregar otra pistola o balancear línea.', type: 'PROBLEM', area: 'PRODUCTION', priority: 'HIGH' },
      { title: 'Implementar TPM (Mantenimiento Productivo Total)', desc: 'Que operarios hagan mantenimiento nivel 1. Reducir paradas no planificadas 30%.', type: 'SUGGESTION', area: 'PRODUCTION', priority: 'MEDIUM' },

      // Calidad
      { title: 'Certificación ISO 9001', desc: 'Muchos clientes grandes piden ISO. Iniciar proceso de certificación para ampliar mercado.', type: 'SUGGESTION', area: 'QUALITY', priority: 'MEDIUM' },
      { title: 'Defectos recurrentes en lote X500', desc: 'Todos los viernes salen piezas con rebabas. Revisar si es fatiga de operario o desgaste de molde.', type: 'PROBLEM', area: 'QUALITY', priority: 'HIGH' },

      // Seguridad
      { title: 'Instalar cámaras en depósito', desc: 'Hubo 3 robos en 2 meses. Cámaras + grabación 30 días.', type: 'SUGGESTION', area: 'SAFETY', priority: 'HIGH' },
      { title: 'Capacitación en uso de extintores', desc: 'Simulacro de incendio anual. Que todos sepan usar extintores.', type: 'SUGGESTION', area: 'SAFETY', priority: 'MEDIUM' },

      // Logística
      { title: 'Software de ruteo para repartos', desc: 'Actualmente choferes eligen ruta a ojo. Con ruteo inteligente ahorraríamos 20% combustible.', type: 'SUGGESTION', area: 'LOGISTICS', priority: 'MEDIUM' },
      { title: 'Retrasos constantes en proveedor Z', desc: 'Proveedor Z entrega 10 días tarde sistemáticamente. Buscar alternativa o penalizarlo.', type: 'PROBLEM', area: 'LOGISTICS', priority: 'MEDIUM' }
    ];

    let created = 0;
    for (const data of experiencesData) {
      await sequelize.query(`
        INSERT INTO employee_experiences (
          id, company_id, employee_id, title, description,
          type, area, priority, visibility, status,
          upvotes, downvotes, views, created_at
        ) VALUES (
          gen_random_uuid(), :companyId, :userId, :title, :description,
          :type, :area, :priority, 'PUBLIC', 'PENDING',
          :upvotes, 0, :views, NOW()
        )
      `, {
        replacements: {
          companyId,
          userId: adminUser.user_id,
          title: data.title,
          description: data.desc,
          type: data.type,
          area: data.area,
          priority: data.priority,
          upvotes: Math.floor(Math.random() * 8),
          views: Math.floor(Math.random() * 30)
        }
      });
      created++;
    }

    console.log(`   ✅ ${created} experiencias creadas para ISI\n`);

    // 5. Resumen
    console.log('='.repeat(60));
    console.log('✅ VOICE PLATFORM ACTIVADO PARA ISI\n');
    console.log('📊 Resumen:');
    console.log(`   - Empresa: ISI (company_id: ${companyId})`);
    console.log(`   - Módulo: voice-platform (${moduleId})`);
    console.log(`   - Usuario admin: ${adminUser.usuario}`);
    console.log(`   - Experiencias: ${created}\n`);

    console.log('🔐 Credenciales para login:');
    console.log('   EMPRESA: isi');
    console.log(`   USUARIO: ${adminUser.usuario}`);
    console.log('   PASSWORD: (usar password actual de ISI)\n');

    console.log('🌐 URL para probar:');
    console.log('   http://localhost:9998/panel-empresa.html\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

activateVoicePlatformForISI();
