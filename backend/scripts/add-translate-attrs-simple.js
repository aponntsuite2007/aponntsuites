const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Mapeo manual de textos específicos a keys
const mappings = [
  { text: '>SaaS B2B Multi-Tenant<', key: 'saas_b2b_multitenant' },
  { text: '>Cloud Native<', key: 'cloud_native' },
  { text: '>Multi-Tenant<', key: 'multitenant' },
  { text: '>Pago por Uso<', key: 'pago_por_uso' },
  { text: '>6 Idiomas<', key: '6_idiomas' },
  { text: '>¿Qué es SaaS B2B?<', key: 'que_es_saas_b2b' },
  { text: '>Que es SaaS B2B?<', key: 'que_es_saas_b2b' },
  { text: '>Sistema Plug & Play<', key: 'sistema_plug_play' },
  { text: '>Conexion Instantanea<', key: 'conexion_instantanea' },
  { text: '>Compatibilidad Total<', key: 'compatibilidad_total' },
  { text: '>Auto-Configuracion<', key: 'autoconfiguracion' },
  { text: '>Escalabilidad Dinamica<', key: 'escalabilidad_dinamica' },
  { text: '>Analisis predictivo y scoring determinístico<', key: 'analisis_predictivo_y_scoring_deterministico' },
  { text: '>Scoring Determinístico<', key: 'scoring_deterministico' },
  { text: '>Deteccion de 15+ Patrones<', key: 'deteccion_de_15_patrones' },
  { text: '>Regresion Lineal Predictiva<', key: 'regresion_lineal_predictiva' },
  { text: '>Asistente IA Local (Ollama)<', key: 'asistente_ia_local_ollama' },
  { text: '>Notificaciones Proactivas y Autoescalamiento<', key: 'notificaciones_proactivas_y_autoescalamiento' },
  { text: '>Reglas Proactivas<', key: 'reglas_proactivas' },
  { text: '>Workflows Configurables<', key: 'workflows_configurables' },
  { text: '>Auditoria Inmutable<', key: 'auditoria_inmutable' },
  { text: '>Resolucion con IA<', key: 'resolucion_con_ia' },
  { text: '>7 Fuentes de Datos Consolidadas<', key: '7_fuentes_de_datos_consolidadas' },
  { text: '>Reconocimiento facial de nivel empresarial<', key: 'reconocimiento_facial_de_nivel_empresarial' },
  { text: '>Reconocimiento Facial<', key: 'reconocimiento_facial' },
  { text: '>Validacion GPS<', key: 'validacion_gps' },
  { text: '>APK Kiosk<', key: 'apk_kiosk' },
  { text: '>Sistema de Mapeo Facial Avanzado<', key: 'sistema_de_mapeo_facial_avanzado' },
  { text: '>Hardware Compatible de Alto Rendimiento<', key: 'hardware_compatible_de_alto_rendimiento' },
  { text: '>Gestion Inteligente de Kioscos<', key: 'gestion_inteligente_de_kioscos' },
  { text: '>Patrones detectados por IA<', key: 'patrones_detectados_por_ia' },
  { text: '>22+ modulos integrados<', key: '22_modulos_integrados' },
  { text: '>Tecnologías enterprise de clase mundial<', key: 'tecnologias_enterprise_de_clase_mundial' },
  { text: '>Comienza a optimizar tu gestion de personal<', key: 'comienza_a_optimizar_tu_gestion_de_personal' },
  { text: '>Contactanos<', key: 'contactanos' },
  { text: '>Contáctanos<', key: 'contactanos' },
  { text: '>Email<', key: 'email' },
  { text: '>WhatsApp<', key: 'whatsapp' },
  { text: '>Envia tu consulta<', key: 'envia_tu_consulta' },
  { text: '>Envía tu consulta<', key: 'envia_tu_consulta' },
  { text: '>Producto<', key: 'producto' },
  { text: '>Accesos<', key: 'accesos' },
  { text: '>Soporte<', key: 'soporte' },
  { text: '>Contacto<', key: 'contacto' },
  { text: '>Acceder como Cliente<', key: 'acceder_como_cliente' },
  { text: '>Acceso Staff Aponnt<', key: 'acceso_staff_aponnt' },
  { text: '>Registrarme como Asociado<', key: 'registrarme_como_asociado' },
  { text: '>Nombre completo *<', key: 'nombre_completo_' },
  { text: '>Email *<', key: 'email_' },
  { text: '>Telefono / WhatsApp<', key: 'telefono_whatsapp' },
  { text: '>Teléfono / WhatsApp<', key: 'telefono_whatsapp' },
  { text: '>Empresa<', key: 'empresa' },
  { text: '>Asunto *<', key: 'asunto_' },
  { text: '>Mensaje *<', key: 'mensaje_' },
  { text: '>Modulos integrados<', key: '22_modulos_integrados' },
  { text: '>Modulos<', key: 'modulos' }
];

let changes = 0;
const originalHtml = html;

// Agregar atributos data-translate
for (const { text, key } of mappings) {
  const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/á/g, '[aá]').replace(/é/g, '[eé]').replace(/í/g, '[ií]').replace(/ó/g, '[oó]').replace(/ú/g, '[uú]').replace(/ñ/g, '[nñ]');
  const regex = new RegExp(`(<[^>]*?)(${escapedText})`, 'g');

  html = html.replace(regex, (match, openingTag, content) => {
    // Solo agregar si no tiene data-translate ya
    if (!openingTag.includes('data-translate') && !openingTag.includes('data-no-translate')) {
      changes++;
      return `${openingTag} data-translate="index.${key}">${content.substring(1)}`;
    }
    return match;
  });
}

if (changes > 0) {
  // Guardar backup
  fs.writeFileSync(indexPath + '.backup-' + Date.now(), originalHtml);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log(`✅ ${changes} atributos data-translate agregados a index.html`);
  console.log(`📦 Backup guardado`);
} else {
  console.log('⚠️  No se encontraron cambios necesarios');
}
