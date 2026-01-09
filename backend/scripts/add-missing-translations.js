const fs = require('fs');
const path = require('path');

// Leer archivos
const basePath = path.join(__dirname, '..', 'public', 'locales');
const es = JSON.parse(fs.readFileSync(path.join(basePath, 'es.json'), 'utf8'));
const locales = {
  en: JSON.parse(fs.readFileSync(path.join(basePath, 'en.json'), 'utf8')),
  pt: JSON.parse(fs.readFileSync(path.join(basePath, 'pt.json'), 'utf8')),
  fr: JSON.parse(fs.readFileSync(path.join(basePath, 'fr.json'), 'utf8')),
  de: JSON.parse(fs.readFileSync(path.join(basePath, 'de.json'), 'utf8')),
  it: JSON.parse(fs.readFileSync(path.join(basePath, 'it.json'), 'utf8'))
};

// Función de traducción simple
function translate(text, lang) {
  let result = text;

  if (lang === 'en') {
    const replacements = {
      'Acceso': 'Access',
      'Proveedores': 'Providers',
      '8 TIPOS': '8 TYPES',
      'Médico': 'Medical',
      'Capacitación': 'Training',
      'Financiero': 'Financial',
      'Workflow de Validación': 'Validation Workflow',
      'EN VIVO': 'LIVE',
      'Pendiente': 'Pending',
      'Validación': 'Validation',
      'Por Vencer': 'Expiring',
      'Imágenes': 'Images',
      'RRHH': 'HR',
      'Validar': 'Validate',
      'Ver todos': 'View all',
      'Solo sus docs': 'Own docs only',
      'Subir': 'Upload',
      'Documento': 'Document',
      '5 Módulos Especializados': '5 Specialized Modules',
      'de Gestión Documental': 'Document Management',
      'Explorador': 'Explorer',
      'Workflow de aprobación': 'Approval workflow',
      'Mis Solicitudes': 'My Requests',
      'Documentos solicitados': 'Requested documents',
      'Vencimientos': 'Expirations',
      'Alertas automáticas': 'Automatic alerts',
      'Configuración': 'Configuration',
      'Seguridad': 'Security',
      'HOY': 'TODAY',
      'Mis': 'My',
      'Documentos': 'Documents',
      'Notificaciones': 'Notifications',
      'Acciones Rápidas': 'Quick Actions',
      'Solicitar Vacaciones': 'Request Vacation',
      'ACTUALIZADO': 'UPDATED',
      'Completo': 'Complete',
      'APTO': 'FIT',
      'Documentos Legales': 'Legal Documents',
      '2 pendientes': '2 pending',
      'Hace 2 horas': '2 hours ago',
      'Ayer': 'Yesterday',
      'Examen Médico Próximo': 'Upcoming Medical Exam',
      'En 15 días': 'In 15 days',
      'Vacaciones': 'Vacation',
      '6 Módulos Personales': '6 Personal Modules',
      'Auto-Servicio': 'Self-Service',
      'Dashboard': 'Dashboard',
      'Vista general personal': 'Personal overview',
      'Asistencia': 'Attendance',
      'Historial y reportes': 'History and reports',
      'Solicitudes y saldos': 'Requests and balances',
      'Centro de mensajes': 'Message center',
      'Perfil': 'Profile',
      'Expediente completo': 'Complete record',
      'Móvil': 'Mobile',
      'Optimizado para celular': 'Mobile optimized',
      'Tema Oscuro': 'Dark Theme',
      'Menos fatiga visual': 'Less eye strain',
      'Privacidad Total': 'Total Privacy',
      'Solo sus datos personales': 'Only personal data',
      'Reconocimiento Facial': 'Facial Recognition'
    };

    Object.entries(replacements).forEach(([from, to]) => {
      result = result.replace(new RegExp(from, 'g'), to);
    });
  }

  return result;
}

// Agregar claves faltantes a cada idioma
let totalAdded = 0;

Object.keys(locales).forEach(lang => {
  const missing = {};

  Object.keys(es).forEach(key => {
    if (key.includes('_') && !locales[lang][key] && es[key]) {
      missing[key] = translate(es[key], lang);
    }
  });

  if (Object.keys(missing).length > 0) {
    // Agregar claves al locale
    locales[lang] = { ...locales[lang], ...missing };

    // Guardar archivo
    fs.writeFileSync(
      path.join(basePath, `${lang}.json`),
      JSON.stringify(locales[lang], null, 2),
      'utf8'
    );

    console.log(`✅ ${lang}.json: +${Object.keys(missing).length} claves`);
    totalAdded += Object.keys(missing).length;
  }
});

console.log('');
console.log(`Total agregado: ${totalAdded} claves`);
