/**
 * Script para generar datos de prueba para Voice Platform
 * Genera sugerencias, problemas y soluciones realistas para testear clustering
 */

const { sequelize } = require('../src/config/database');
const { EmployeeExperience } = sequelize.models;

// Datos realistas para una planta industrial/empresa
const SUGGESTIONS = {
  PRODUCTION: [
    { title: "Mejorar iluminación en línea de ensamblaje", desc: "La iluminación actual es insuficiente, causa fatiga visual y errores. Propongo instalar LED de 5000K." },
    { title: "Optimizar flujo de materiales", desc: "El layout actual genera cuellos de botella. Reordenar estaciones reduciría tiempos de espera." },
    { title: "Automatizar control de calidad", desc: "Implementar cámaras con IA para detectar defectos en tiempo real, reduciendo rechazos." },
    { title: "Reducir tiempos de setup", desc: "Estandarizar herramientas y crear kits predefinidos para cada producto." },
    { title: "Mejorar ergonomía de estaciones", desc: "Las alturas de trabajo no son ajustables, genera dolores de espalda. Instalar mesas regulables." },
    { title: "Sistema de ventilación insuficiente", desc: "El aire acondicionado no llega a todos los sectores, hace mucho calor en verano." },
    { title: "Aire acondicionado no funciona bien", desc: "La temperatura es muy alta en planta, afecta productividad y salud del personal." },
    { title: "Implementar 5S en almacén", desc: "El almacén está desorganizado, perdemos mucho tiempo buscando materiales." },
    { title: "Crear instrucciones visuales", desc: "Muchos operarios nuevos se confunden. Propongo carteles con fotos paso a paso." },
    { title: "Instalar sensores de vibración", desc: "Para mantenimiento predictivo de máquinas, evitar paradas no planificadas." }
  ],
  QUALITY: [
    { title: "Mejorar trazabilidad de lotes", desc: "No podemos rastrear productos defectuosos hasta lote origen. Implementar QR codes." },
    { title: "Calibrar equipos de medición", desc: "Los calibres dan lecturas inconsistentes, genera rechazos innecesarios." },
    { title: "Documentar procesos críticos", desc: "Muchos procesos solo están en cabeza de operarios senior. Necesitamos procedimientos escritos." },
    { title: "Control estadístico de procesos", desc: "Implementar gráficos de control para detectar tendencias antes de producir defectos." },
    { title: "Capacitar en inspección visual", desc: "Los criterios de aceptación/rechazo no están claros, cada uno usa criterio propio." }
  ],
  SAFETY: [
    { title: "Señalización de rutas de evacuación", desc: "Las señales están desgastadas y algunas no son visibles. Reemplazar urgente." },
    { title: "Instalar extintores adicionales", desc: "Hay sectores que están a más de 25 metros del extintor más cercano." },
    { title: "Capacitación en primeros auxilios", desc: "Solo 2 personas saben RCP. Propongo capacitar a todo el turno." },
    { title: "Protección auditiva insuficiente", desc: "Los tapones genéricos no atenúan lo suficiente. Necesitamos orejeras de mayor NRR." },
    { title: "Riesgo de caída en escaleras", desc: "Las escaleras del depósito no tienen antideslizante, son muy resbaladizas." }
  ],
  IT: [
    { title: "Sistema de gestión muy lento", desc: "El ERP tarda 30 segundos en abrir una orden de producción. Optimizar base de datos." },
    { title: "Backup automático de datos", desc: "Actualmente hacemos backup manual 1 vez por semana. Implementar backup diario automático." },
    { title: "WiFi no llega a planta", desc: "Los tablets para registrar producción pierden conexión constantemente." },
    { title: "Actualizar sistema operativo", desc: "Seguimos usando Windows 7, tiene vulnerabilidades de seguridad." },
    { title: "Implementar dashboard en tiempo real", desc: "Poder ver indicadores de producción en pantallas grandes en planta." }
  ],
  LOGISTICS: [
    { title: "Optimizar rutas de reparto", desc: "Podríamos agrupar entregas por zona y reducir 30% de viajes." },
    { title: "Sistema de picking más eficiente", desc: "Actualmente buscamos productos manualmente. Implementar sistema con scanner." },
    { title: "Ampliar zona de carga/descarga", desc: "Cuando llegan 2 camiones simultáneos, uno queda esperando en la calle." },
    { title: "Estandarizar packaging", desc: "Usamos 15 tipos de cajas diferentes. Reducir a 5 estándares ahorraría espacio." },
    { title: "Control de stock en tiempo real", desc: "El inventario físico no coincide con sistema. Implementar RFID." }
  ],
  HR: [
    { title: "Flexibilizar horarios", desc: "Muchos empleados tienen problemas de transporte. Proponer entrada entre 7-9am." },
    { title: "Programa de reconocimiento", desc: "Crear sistema de 'empleado del mes' con premio para motivar al equipo." },
    { title: "Capacitación técnica continua", desc: "Implementar 2 horas semanales de capacitación en nuevas tecnologías." },
    { title: "Mejorar comedor", desc: "El microondas es insuficiente para 50 personas. Comprar 2 más y mejorar ventilación." },
    { title: "Crear programa de mentorías", desc: "Que empleados senior acompañen a nuevos durante primeros 3 meses." }
  ],
  ADMIN: [
    { title: "Digitalizar formularios", desc: "Seguimos usando planillas de papel. Migrar a formularios digitales ahorraría tiempo." },
    { title: "Simplificar proceso de compras", desc: "Aprobación de compras menores a $1000 tarda 1 semana. Dar autonomía a supervisores." },
    { title: "Mejorar comunicación interna", desc: "Los avisos importantes se pierden en emails. Implementar cartelera digital." },
    { title: "Reducir reuniones innecesarias", desc: "Muchas reuniones podrían ser emails. Establecer criterios claros." },
    { title: "Sistema de sugerencias digital", desc: "Actualmente usamos buzón físico que nadie usa. Crear app para enviar ideas." }
  ]
};

const PROBLEMS = {
  PRODUCTION: [
    { title: "Máquina CNC se detiene frecuentemente", desc: "La CNC principal se detiene 3-4 veces por turno por error E402. Pierde 2 horas/día." },
    { title: "Desperdicio de material elevado", desc: "Estamos en 8% de scrap, el estándar es 3%. Revisar calibración y capacitación." },
    { title: "Falta de herramientas", desc: "Solo hay 2 llaves de 19mm y siempre están ocupadas. Perdemos tiempo buscándolas." },
    { title: "Mantenimiento preventivo atrasado", desc: "La prensa hidráulica no se manteniene hace 6 meses, podría fallar pronto." },
    { title: "Exceso de inventario en proceso", desc: "WIP acumulado porque proceso siguiente es cuello botella. Necesita balanceo de línea." }
  ],
  QUALITY: [
    { title: "Defectos recurrentes en pintura", desc: "El 15% de piezas pintadas tienen burbujas. Problema con cabina o presión de aire." },
    { title: "Cliente reclama por empaques dañados", desc: "Última semana 5 reclamos por producto llegó golpeado. Revisar manejo en despacho." },
    { title: "Falta calibración de instrumentos", desc: "Los calibres no tienen sticker de calibración vigente. Puede invalidar certificaciones." }
  ],
  SAFETY: [
    { title: "Accidente con montacargas", desc: "Montacargas chocó pallet porque no se veía desde cabina. Faltan espejos." },
    { title: "Piso resbaladizo por derrames", desc: "Hay derrames de aceite que no se limpian inmediatamente. Riesgo de caídas alto." },
    { title: "EPP insuficiente", desc: "Se acabaron los guantes de nitrilo, empleados usando guantes inadecuados." }
  ],
  IT: [
    { title: "Sistema caído 3 veces esta semana", desc: "El servidor se reinicia solo, nadie sabe por qué. Perdemos datos de producción." },
    { title: "Lentitud extrema en red", desc: "Internet está a 1 Mbps cuando deberíamos tener 100 Mbps. Revisar router." },
    { title: "Impresora no funciona", desc: "La impresora de etiquetas no imprime hace 2 días, no podemos despachar productos." }
  ]
};

const SOLUTIONS = {
  PRODUCTION: [
    { title: "Usar cinta para paletizar", desc: "En vez de film strech, usar cinta de embalaje es más rápido y económico." },
    { title: "Envolver pallets con film", desc: "Implementar máquina de film stretch para asegurar cargas, reduce tiempo 50%." },
    { title: "Implementar kanban visual", desc: "Tarjetas de colores para señalar cuando pedir reabastecimiento, sin sistemas complejos." },
    { title: "Crear plantillas de setup", desc: "Documentar configuraciones de máquina para cada producto, reduce setup de 2h a 30min." }
  ],
  QUALITY: [
    { title: "Checklist de inspección digital", desc: "En vez de papel, usar tablet con checklist que no deja avanzar si falta algo." },
    { title: "Poka-yoke en ensamblaje", desc: "Diseñar fixtures que físicamente impidan ensamblar mal, elimina defectos humanos." }
  ],
  SAFETY: [
    { title: "Líneas amarillas en piso", desc: "Pintar líneas peatonales y de montacargas, separación clara de zonas." },
    { title: "Alarma de retroceso en montacargas", desc: "Instalar bocinas que suenan al retroceder, como camiones de basura." }
  ]
};

async function generateExperiences(companyId, userId) {
  const experiences = [];

  // Generar sugerencias
  for (const [area, items] of Object.entries(SUGGESTIONS)) {
    for (const item of items) {
      experiences.push({
        company_id: companyId,
        employee_id: userId,
        title: item.title,
        description: item.desc,
        type: 'SUGGESTION',
        area: area,
        priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
        visibility: ['PUBLIC', 'ADMIN_ONLY', 'ANONYMOUS'][Math.floor(Math.random() * 3)],
        status: 'PENDING',
        upvotes: Math.floor(Math.random() * 10),
        downvotes: Math.floor(Math.random() * 3),
        views: Math.floor(Math.random() * 50)
      });
    }
  }

  // Generar problemas
  for (const [area, items] of Object.entries(PROBLEMS)) {
    for (const item of items) {
      experiences.push({
        company_id: companyId,
        employee_id: userId,
        title: item.title,
        description: item.desc,
        type: 'PROBLEM',
        area: area,
        priority: ['MEDIUM', 'HIGH', 'HIGH'][Math.floor(Math.random() * 3)],
        visibility: ['PUBLIC', 'ADMIN_ONLY'][Math.floor(Math.random() * 2)],
        status: 'PENDING',
        upvotes: Math.floor(Math.random() * 8),
        downvotes: Math.floor(Math.random() * 2),
        views: Math.floor(Math.random() * 60)
      });
    }
  }

  // Generar soluciones
  for (const [area, items] of Object.entries(SOLUTIONS)) {
    for (const item of items) {
      experiences.push({
        company_id: companyId,
        employee_id: userId,
        title: item.title,
        description: item.desc,
        type: 'SOLUTION',
        area: area,
        priority: ['LOW', 'MEDIUM'][Math.floor(Math.random() * 2)],
        visibility: 'PUBLIC',
        status: 'PENDING',
        upvotes: Math.floor(Math.random() * 15),
        downvotes: Math.floor(Math.random() * 2),
        views: Math.floor(Math.random() * 40)
      });
    }
  }

  return experiences;
}

async function seed() {
  try {
    console.log('🌱 Iniciando seed de Voice Platform...\n');

    const companyId = 1; // aponnt-empresa-demo
    const userId = 'f3518284-8585-454b-853a-60b689ef03be'; // admin

    console.log(`📊 Generando datos para Company ID: ${companyId}`);
    console.log(`👤 Usuario: ${userId}\n`);

    const experiences = await generateExperiences(companyId, userId);

    console.log(`✅ Generadas ${experiences.length} experiencias\n`);
    console.log('📈 Distribución:');
    console.log(`   - SUGERENCIA: ${experiences.filter(e => e.type === 'SUGERENCIA').length}`);
    console.log(`   - PROBLEMA: ${experiences.filter(e => e.type === 'PROBLEMA').length}`);
    console.log(`   - SOLUCION: ${experiences.filter(e => e.type === 'SOLUCION').length}\n`);

    console.log('💾 Insertando en base de datos...');

    let inserted = 0;
    for (const exp of experiences) {
      try {
        await EmployeeExperience.create(exp);
        inserted++;
        if (inserted % 10 === 0) {
          process.stdout.write(`   Insertadas: ${inserted}/${experiences.length}\r`);
        }
      } catch (error) {
        console.error(`\n❌ Error insertando "${exp.title}":`, error.message);
      }
    }

    console.log(`\n\n✅ Seed completado: ${inserted}/${experiences.length} experiencias insertadas`);

    // Estadísticas finales
    const total = await EmployeeExperience.count({ where: { company_id: companyId } });
    console.log(`\n📊 Total en BD para company ${companyId}: ${total} experiencias`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

// Ejecutar
seed();
