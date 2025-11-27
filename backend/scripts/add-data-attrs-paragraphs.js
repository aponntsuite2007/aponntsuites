const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

console.log('\n🔧 Agregando data-translate a párrafos y descripciones...\n');

// Mapeo de textos a keys (usando inicio del texto para match más flexible)
const textMappings = [
  // Descripciones Plug & Play
  { startsWith: 'Activa nuevos modulos', key: 'desc_conexion_instantanea' },
  { startsWith: 'Cada modulo esta disenado', key: 'desc_compatibilidad_total' },
  { startsWith: 'El sistema detecta tu estructura', key: 'desc_autoconfiguracion' },
  { startsWith: 'Crece a tu ritmo', key: 'desc_escalabilidad_dinamica' },

  // Descripciones IA Predictiva
  { startsWith: 'Calculo de puntuacion 0-100', key: 'desc_scoring_calc' },
  { startsWith: 'Identificacion automatica de patrones', key: 'desc_patron_detection' },
  { startsWith: 'Analisis de tendencias con regresion', key: 'desc_regresion_lineal' },
  { startsWith: 'LLM Llama 3.1 ejecutandose', key: 'desc_asistente_ia' },

  // Descripciones Notificaciones
  { startsWith: '5 tipos de deteccion', key: 'desc_deteccion_automatica' },
  { startsWith: 'Cadenas de aprobacion', key: 'desc_workflows' },
  { startsWith: 'Cada accion registrada', key: 'desc_auditoria_completa' },
  { startsWith: 'Asistente IA intenta resolver', key: 'desc_ia_resuelve' },

  // Descripciones Biometría
  { startsWith: 'Azure Face API con modelo', key: 'desc_face_api' },
  { startsWith: 'Verificacion de ubicacion', key: 'desc_gps_validation' },
  { startsWith: 'Aplicacion Android nativa', key: 'desc_apk_kiosk_desc' },
  { startsWith: 'Nuestro sistema utiliza', key: 'desc_mapeo_facial' },
  { startsWith: 'Cada kiosko tiene un area', key: 'desc_gps_departamento' },
  { startsWith: 'Define el area de cobertura', key: 'desc_area_cobertura' },
  { startsWith: 'Gestion centralizada de kioscos', key: 'desc_gestion_centralizada' },
  { startsWith: 'Sincronizacion automatica cuando', key: 'desc_sincronizacion_auto' },

  // Otros
  { startsWith: '¿Tienes preguntas', key: 'desc_preguntas' },
  { startsWith: 'Sistema Integral de Planificacion', key: 'desc_sistema_integral' },
  { startsWith: 'Software as a Service disenado', key: 'subtitle_saas' },
  { startsWith: 'Activa modulos al instante', key: 'subtitle_plug_play' },
  { startsWith: 'Identifica patrones de comportamiento', key: 'subtitle_ia_predictiva' },
  { startsWith: 'Automatiza procesos criticos', key: 'subtitle_notificaciones' },
  { startsWith: 'Tecnologia de reconocimiento facial enterprise', key: 'subtitle_biometria' },
  { startsWith: 'Todo lo que necesitas para gestionar', key: 'subtitle_modulos' },
  { startsWith: 'Stack tecnologico robusto', key: 'subtitle_tecnologia' },
];

let changes = 0;
const backup = html;

// Función para escapar regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Buscar y reemplazar cada texto
for (const { startsWith, key } of textMappings) {
  // Buscar elementos <p>, <span>, <h3>, etc. que contengan este texto
  const escapedStart = escapeRegex(startsWith);

  // Patrón para encontrar el elemento que comienza con este texto
  const pattern = new RegExp(
    `(<(?:p|span|h[1-6]|div|label)\\s+[^>]*?)>\\s*(${escapedStart}[^<]*)`,
    'gi'
  );

  html = html.replace(pattern, (match, openTag, content) => {
    // Solo agregar si no tiene data-translate ya
    if (!openTag.includes('data-translate') && !openTag.includes('data-no-translate')) {
      changes++;
      // Si el tag ya tiene atributos, agregar data-translate
      if (openTag.includes('class=') || openTag.includes('style=')) {
        return `${openTag} data-translate="index.${key}">${content}`;
      } else {
        // Si es un tag simple, solo agregar el atributo
        const tagName = openTag.match(/<(\w+)/)[1];
        return `<${tagName} data-translate="index.${key}">${content}`;
      }
    }
    return match;
  });

  // También buscar en elementos sin clases o estilos
  const simplePattern = new RegExp(
    `(<(?:p|span|h[1-6])\\s*>)\\s*(${escapedStart}[^<]*)`,
    'gi'
  );

  html = html.replace(simplePattern, (match, openTag, content) => {
    if (!match.includes('data-translate')) {
      changes++;
      const tagName = openTag.match(/<(\w+)/)[1];
      return `<${tagName} data-translate="index.${key}">${content}`;
    }
    return match;
  });
}

if (changes > 0) {
  // Guardar backup
  fs.writeFileSync(indexPath + '.backup-paragraphs-' + Date.now(), backup);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log(`✅ ${changes} atributos data-translate agregados a párrafos y descripciones`);
  console.log('📦 Backup guardado');
} else {
  console.log('⚠️  No se encontraron cambios necesarios');
}

console.log('\n✨ Proceso completado\n');
