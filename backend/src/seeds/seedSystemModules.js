const { SystemModule, sequelize } = require('../config/database');

const modulesData = [
  {
    moduleKey: 'users',
    name: 'Usuarios',
    description: 'Gestión de empleados y perfiles de usuario',
    icon: '👥',
    color: '#4CAF50',
    category: 'core',
    basePrice: 15.00,
    isActive: true,
    isCore: true,
    displayOrder: 1,
    features: [
      'Registro y gestión de empleados',
      'Perfiles de usuario personalizables',
      'Control de roles y permisos',
      'Información de contacto',
      'Historial de empleados'
    ],
    requirements: [],
    version: '1.0.0'
  },
  {
    moduleKey: 'departments',
    name: 'Departamentos',
    description: 'Configuración y gestión de departamentos y ubicaciones',
    icon: '🏢',
    color: '#2196F3',
    category: 'core',
    basePrice: 5.00,
    isActive: true,
    isCore: false,
    displayOrder: 2,
    features: [
      'Creación de departamentos',
      'Jerarquía organizacional',
      'Asignación de empleados',
      'Configuración por ubicación'
    ],
    requirements: ['users'],
    version: '1.0.0'
  },
  {
    moduleKey: 'shifts',
    name: 'Turnos',
    description: 'Gestión de horarios y jornadas laborales',
    icon: '🕐',
    color: '#FF9800',
    category: 'core',
    basePrice: 8.00,
    isActive: true,
    isCore: false,
    displayOrder: 3,
    features: [
      'Configuración de turnos flexibles',
      'Horarios rotativos',
      'Excepciones y feriados',
      'Turnos por departamento'
    ],
    requirements: ['users'],
    version: '1.0.0'
  },
  {
    moduleKey: 'attendance',
    name: 'Asistencia',
    description: 'Control de ingresos, salidas y asistencia',
    icon: '📋',
    color: '#9C27B0',
    category: 'core',
    basePrice: 12.00,
    isActive: true,
    isCore: true,
    displayOrder: 4,
    features: [
      'Registro de entrada y salida',
      'Cálculo de horas trabajadas',
      'Control de tardanzas',
      'Reportes de asistencia',
      'Integración con turnos'
    ],
    requirements: ['users', 'shifts'],
    version: '1.0.0'
  },
  {
    moduleKey: 'facial-biometric',
    name: 'Biometría Facial',
    description: 'Reconocimiento facial para autenticación',
    icon: '🎭',
    color: '#E91E63',
    category: 'security',
    basePrice: 25.00,
    isActive: true,
    isCore: false,
    displayOrder: 5,
    features: [
      'Reconocimiento facial avanzado',
      'Autenticación segura',
      'Anti-spoofing',
      'Registro facial múltiple',
      'Integración con asistencia'
    ],
    requirements: ['users', 'attendance'],
    version: '1.0.0'
  },
  {
    moduleKey: 'medical-dashboard',
    name: 'Dashboard Médico',
    description: 'Gestión de información médica de empleados',
    icon: '👩‍⚕️',
    color: '#00BCD4',
    category: 'medical',
    basePrice: 20.00,
    isActive: true,
    isCore: false,
    displayOrder: 7,
    features: [
      'Historiales médicos',
      'Certificados médicos',
      'Seguimiento de salud',
      'Reportes médicos',
      'Integración con ART'
    ],
    requirements: ['users'],
    version: '1.0.0'
  },
  {
    moduleKey: 'art-management',
    name: 'Gestión ART',
    description: 'Administración de Aseguradoras de Riesgos del Trabajo',
    icon: '🏥',
    color: '#F44336',
    category: 'medical',
    basePrice: 18.00,
    isActive: true,
    isCore: false,
    displayOrder: 8,
    features: [
      'Gestión de ART múltiples',
      'Reportes de accidentes',
      'Seguimiento de casos',
      'Documentación legal',
      'Integración con medicina laboral'
    ],
    requirements: ['users', 'medical-dashboard'],
    version: '1.0.0'
  },
  {
    moduleKey: 'document-management',
    name: 'Gestión Documental',
    description: 'Administración de documentos y archivos',
    icon: '📄',
    color: '#795548',
    category: 'legal',
    basePrice: 10.00,
    isActive: true,
    isCore: false,
    displayOrder: 9,
    features: [
      'Almacenamiento de documentos',
      'Versionado de archivos',
      'Categorización',
      'Búsqueda avanzada',
      'Control de acceso por documento'
    ],
    requirements: ['users'],
    version: '1.0.0'
  },
  {
    moduleKey: 'legal-dashboard',
    name: 'Dashboard Legal',
    description: 'Gestión de aspectos legales y normativos',
    icon: '⚖️',
    color: '#3F51B5',
    category: 'legal',
    basePrice: 15.00,
    isActive: true,
    isCore: false,
    displayOrder: 10,
    features: [
      'Cumplimiento normativo',
      'Gestión de contratos',
      'Documentación legal',
      'Auditorías de cumplimiento',
      'Reportes legales'
    ],
    requirements: ['users', 'document-management'],
    version: '1.0.0'
  },
  {
    moduleKey: 'payroll-liquidation',
    name: 'Liquidación de Sueldos',
    description: 'Cálculo y gestión de nóminas y liquidaciones',
    icon: '💰',
    color: '#4CAF50',
    category: 'payroll',
    basePrice: 22.00,
    isActive: true,
    isCore: false,
    displayOrder: 11,
    features: [
      'Cálculo automático de sueldos',
      'Gestión de conceptos',
      'Liquidaciones finales',
      'Integración con asistencia',
      'Reportes de nómina'
    ],
    requirements: ['users', 'attendance'],
    version: '1.0.0'
  },
  {
    moduleKey: 'employee-map',
    name: 'Mapa de Empleados',
    description: 'Ubicación y seguimiento en tiempo real',
    icon: '🗺️',
    color: '#8BC34A',
    category: 'additional',
    basePrice: 12.00,
    isActive: true,
    isCore: false,
    displayOrder: 12,
    features: [
      'Seguimiento GPS en tiempo real',
      'Historial de ubicaciones',
      'Geofencing',
      'Rutas de trabajo',
      'Reportes de movilidad'
    ],
    requirements: ['users'],
    version: '1.0.0'
  },
  {
    moduleKey: 'training-management',
    name: 'Gestión de Capacitaciones',
    description: 'Administración de cursos y entrenamientos',
    icon: '📚',
    color: '#FF5722',
    category: 'additional',
    basePrice: 14.00,
    isActive: true,
    isCore: false,
    displayOrder: 13,
    features: [
      'Catálogo de cursos',
      'Seguimiento de progreso',
      'Certificaciones',
      'Evaluaciones',
      'Reportes de capacitación'
    ],
    requirements: ['users'],
    version: '1.0.0'
  },
  {
    moduleKey: 'notifications',
    name: 'Sistema de Notificaciones',
    description: 'Mensajería y comunicaciones internas',
    icon: '📱',
    color: '#FF6B6B',
    category: 'additional',
    basePrice: 7.00,
    isActive: true,
    isCore: false,
    displayOrder: 14,
    features: [
      'Notificaciones push',
      'Mensajería interna',
      'Alertas automáticas',
      'Comunicados masivos',
      'Historial de mensajes'
    ],
    requirements: ['users'],
    version: '1.0.0'
  },
  {
    moduleKey: 'job-postings',
    name: 'Postulaciones Laborales',
    description: 'Gestión de ofertas de trabajo y candidatos',
    icon: '💼',
    color: '#6f42c1',
    category: 'additional',
    basePrice: 9.00,
    isActive: true,
    isCore: false,
    displayOrder: 15,
    features: [
      'Publicación de ofertas',
      'Gestión de candidatos',
      'Proceso de selección',
      'Evaluaciones',
      'Reportes de reclutamiento'
    ],
    requirements: ['users'],
    version: '1.0.0'
  },
  {
    moduleKey: 'settings',
    name: 'Configuración del Sistema',
    description: 'Ajustes generales y configuraciones',
    icon: '⚙️',
    color: '#9E9E9E',
    category: 'core',
    basePrice: 3.00,
    isActive: true,
    isCore: true,
    displayOrder: 16,
    features: [
      'Configuraciones generales',
      'Personalización de interfaz',
      'Parámetros del sistema',
      'Backup y restauración',
      'Logs del sistema'
    ],
    requirements: [],
    version: '1.0.0'
  },
  // ==================== MÓDULOS SIAC ====================
  {
    moduleKey: 'siac-admin-panel',
    name: 'Panel Administrativo SIAC',
    description: 'Administración y configuración del sistema SIAC',
    icon: '⚙️',
    color: '#6c757d',
    category: 'siac',
    basePrice: 20.00,
    isActive: true,
    isCore: false,
    displayOrder: 17,
    features: [
      'Configuración de empresa',
      'Gestión de usuarios SIAC',
      'Configuración de módulos',
      'Dashboard administrativo SIAC',
      'Plantillas fiscales internacionales'
    ],
    requirements: ['users'],
    version: '1.0.0'
  },
  {
    moduleKey: 'siac-clients',
    name: 'Gestión de Clientes SIAC',
    description: 'Administración completa de clientes y contactos',
    icon: '👥',
    color: '#17a2b8',
    category: 'siac',
    basePrice: 25.00,
    isActive: true,
    isCore: false,
    displayOrder: 18,
    features: [
      'Registro de clientes con datos completos',
      'Gestión de contactos múltiples',
      'Direcciones de facturación y entrega',
      'Precios especiales por cliente',
      'Formateo automático de documentos fiscales',
      'Integración con módulo productos',
      'Historial completo de interacciones'
    ],
    requirements: ['users', 'siac-admin-panel'],
    version: '1.0.0'
  },
  {
    moduleKey: 'siac-products',
    name: 'Gestión de Productos SIAC',
    description: 'Catálogo y administración de productos y servicios',
    icon: '📦',
    color: '#28a745',
    category: 'siac',
    basePrice: 30.00,
    isActive: true,
    isCore: false,
    displayOrder: 19,
    features: [
      'Catálogo completo de productos',
      'Control de inventario y stock',
      'Gestión de categorías jerárquicas',
      'Múltiples listas de precios',
      'Productos combo y componentes',
      'Cálculo automático de precios',
      'Integración con clientes y facturación'
    ],
    requirements: ['users', 'siac-admin-panel'],
    version: '1.0.0'
  },
  {
    moduleKey: 'siac-billing',
    name: 'Facturación SIAC',
    description: 'Sistema completo de facturación y gestión fiscal',
    icon: '🧾',
    color: '#dc3545',
    category: 'siac',
    basePrice: 40.00,
    isActive: true,
    isCore: false,
    displayOrder: 20,
    features: [
      'Emisión de comprobantes fiscales',
      'Triple aislación empresa/punto_venta/caja',
      'Numeración automática de comprobantes',
      'Integración inteligente con clientes',
      'Integración inteligente con productos',
      'Múltiples formas de pago',
      'Control de stock automático',
      'Gestión fiscal internacional',
      'Reportes contables completos'
    ],
    requirements: ['users', 'siac-admin-panel', 'siac-clients', 'siac-products'],
    version: '1.0.0'
  }
];

async function seedSystemModules() {
  try {
    console.log('🌱 Iniciando seed de módulos del sistema...');
    
    // Verificar conexión a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');

    // Sincronizar el modelo (recrear tabla)
    await SystemModule.sync({ force: true });
    console.log('✅ Tabla system_modules sincronizada');

    // Insertar todos los módulos
    await SystemModule.bulkCreate(modulesData);
    console.log(`✅ ${modulesData.length} módulos del sistema creados exitosamente`);

    // Mostrar resumen
    const totalModules = await SystemModule.count();
    const activeModules = await SystemModule.count({ where: { isActive: true } });
    const coreModules = await SystemModule.count({ where: { isCore: true } });

    console.log('\n📊 Resumen de módulos:');
    console.log(`   • Total de módulos: ${totalModules}`);
    console.log(`   • Módulos activos: ${activeModules}`);
    console.log(`   • Módulos core: ${coreModules}`);
    
    // Mostrar módulos por categoría
    const categories = await SystemModule.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category']
    });

    console.log('\n📂 Módulos por categoría:');
    categories.forEach(cat => {
      console.log(`   • ${cat.category}: ${cat.get('count')} módulos`);
    });

    console.log('\n🎉 Seed de módulos completado exitosamente!');
    return true;

  } catch (error) {
    console.error('❌ Error en el seed de módulos:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedSystemModules()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { seedSystemModules, modulesData };