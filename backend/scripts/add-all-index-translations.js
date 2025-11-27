const fs = require('fs');
const path = require('path');

// Todas las traducciones adicionales que faltan (párrafos, descripciones, etc.)
const additionalTranslations = {
  // Plug & Play descriptions
  desc_conexion_instantanea: "Activa nuevos modulos con un click. Sin instalaciones, sin tiempos de espera, sin interrupciones en tu operacion.",
  desc_compatibilidad_total: "Cada modulo esta disenado para integrarse perfectamente con los demas. Los datos fluyen automaticamente entre componentes.",
  desc_autoconfiguracion: "El sistema detecta tu estructura organizacional y configura automaticamente permisos, flujos y reportes.",
  desc_escalabilidad_dinamica: "Crece a tu ritmo. Agrega modulos cuando los necesites, sin reimplementaciones ni migraciones de datos.",

  // IA Predictiva descriptions
  desc_scoring_calc: "Calculo de puntuacion 0-100 basado en puntualidad (40%), ausencias (30%), llegadas tarde (20%) y salidas anticipadas (10%).",
  desc_patron_detection: "Identificacion automatica de patrones como \"viernes ausente\", \"abuso de tolerancia\", \"tendencia de mejora\" y \"deterioro progresivo\".",
  desc_regresion_lineal: "Analisis de tendencias con regresion lineal para predecir comportamientos futuros y alertar proactivamente.",
  desc_asistente_ia: "LLM Llama 3.1 ejecutandose localmente. 100% privado, sin envío de datos a terceros. RAG integrado.",

  // Notificaciones descriptions
  desc_deteccion_automatica: "5 tipos de deteccion automatica: vacaciones, horas extra, descanso, documentos y certificados medicos a punto de vencer.",
  desc_workflows: "Cadenas de aprobacion con multiples niveles. Define quien aprueba, tiempos limite y acciones de escalamiento.",
  desc_auditoria_completa: "Cada accion registrada con timestamp, IP, usuario y dispositivo. Trazabilidad completa para compliance.",
  desc_ia_resuelve: "Asistente IA intenta resolver antes de escalar. Analiza el problema y sugiere soluciones automaticamente.",

  // Biometría descriptions
  desc_face_api: "Azure Face API con modelo recognition_04. Deteccion de rostros en menos de 500ms con 99.7% de precision.",
  desc_gps_validation: "Verificacion de ubicacion con tolerancia configurable por departamento. Deteccion de anomalias en check-in.",
  desc_apk_kiosk_desc: "Aplicacion Android nativa para dispositivos kiosk. Modo offline con sincronizacion automatica.",
  desc_mapeo_facial: "Nuestro sistema utiliza 68 puntos de referencia facial (face-api.js) para identificacion rapida, y hasta 468 landmarks con MediaPipe Face Mesh para maxima precision en escenarios criticos.",
  desc_gps_departamento: "Cada kiosko tiene un area de cobertura GPS configurable por departamento. El sistema valida automaticamente que el empleado este dentro del radio autorizado antes de permitir el fichaje.",
  desc_area_cobertura: "Define el area de cobertura en metros para cada punto de fichaje",
  desc_gestion_centralizada: "Gestion centralizada de kioscos en multiples ubicaciones",
  desc_sincronizacion_auto: "Sincronizacion automatica cuando se restablece conexion",

  // Footer
  desc_preguntas: "¿Tienes preguntas sobre nuestros servicios? ¿Quieres una demo personalizada?",
  desc_sistema_integral: "Sistema Integral de Planificacion y Administracion de los Recursos Empresariales.",

  // Section labels
  label_modelo_negocio: "Modelo de Negocio",
  label_que_ofrecemos: "¿Qué ofrecemos?",
  label_caracteristicas: "Características",
  subtitle_saas: "Software as a Service disenado para empresas que necesitan gestionar sus recursos humanos de manera eficiente y escalable.",
  subtitle_plug_play: "Activa modulos al instante sin instalaciones ni configuraciones complejas",
  subtitle_ia_predictiva: "Identifica patrones de comportamiento y predice tendencias con machine learning",
  subtitle_notificaciones: "Automatiza procesos criticos con reglas inteligentes y workflows personalizados",
  subtitle_biometria: "Tecnologia de reconocimiento facial enterprise con Azure Face API",
  subtitle_modulos: "Todo lo que necesitas para gestionar tu empresa en un solo lugar",
  subtitle_tecnologia: "Stack tecnologico robusto y escalable para aplicaciones enterprise",

  // Stats labels
  stat_22_modulos: "22+ modulos integrados",
  stat_6_idiomas: "6 idiomas disponibles",
  stat_15_patrones: "15+ patrones IA",
  stat_saas_b2b: "SaaS B2B Multi-tenant",

  // Form labels
  label_demo_personalizada: "¿Quieres una demo personalizada?",
  label_contacto_form: "Formulario de contacto",
};

console.log(`\n📝 Agregando ${Object.keys(additionalTranslations).length} traducciones adicionales...\n`);

// Cargar archivo es.json
const esPath = path.join(__dirname, '../public/locales/es.json');
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

// Agregar nuevas traducciones
let added = 0;
for (const [key, value] of Object.entries(additionalTranslations)) {
  if (!es.index[key]) {
    es.index[key] = value;
    added++;
  }
}

// Guardar
fs.writeFileSync(esPath, JSON.stringify(es, null, 2), 'utf8');
console.log(`✅ es.json actualizado: ${added} traducciones agregadas`);
console.log(`📊 Total traducciones en index: ${Object.keys(es.index).length}`);

console.log('\n✨ Completado\n');
