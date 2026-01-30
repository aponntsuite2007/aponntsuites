/**
 * Template EULA v2.0 - Argentina
 * Contrato Marco de Suscripcion de Servicios (MSA)
 * Sistema de Gestion de Asistencia Biometrica y RRHH APONNT 360
 *
 * Basado en mejores practicas de SaaS enterprise:
 * - Proteccion de datos biometricos (Ley 25.326)
 * - Deslinde de responsabilidad
 * - Mecanismo detallado de baja (offboarding)
 * - Portabilidad de datos
 */

const CONTRACT_TEMPLATE_ARG_V2 = {
    code: 'MSA-ARG-ES-v2',
    name: 'Contrato Marco de Suscripcion - Argentina v2',
    version: '2.0.0',
    country: 'ARG',
    language: 'es',

    header: {
        title: 'CONTRATO MARCO DE SUSCRIPCION DE SERVICIOS (MSA)',
        subtitle: 'Sistema de Gestion de Asistencia Biometrica y Recursos Humanos APONNT 360',
        version: 'v2.0 - Enero 2026'
    },

    sections: [
        {
            id: 'A',
            title: 'PARTES CONTRATANTES',
            content: `Entre {{APONNT_LEGAL_NAME}}, con domicilio en {{APONNT_ADDRESS}}, CUIT {{APONNT_CUIT}}, en adelante "EL PROVEEDOR", y {{COMPANY_LEGAL_NAME}}, con domicilio en {{COMPANY_ADDRESS}}, CUIT {{COMPANY_CUIT}}, en adelante "EL CLIENTE", se celebra el presente Contrato Marco de Suscripcion de Servicios.

Ambas partes declaran tener capacidad legal suficiente para obligarse en los terminos del presente Contrato y reconocen la validez de las comunicaciones electronicas y la firma digital conforme la Ley 25.506.`
        },
        {
            id: 'B',
            title: 'DEFINICIONES',
            content: `A los efectos del presente Contrato se entendera por:

- Servicio: Acceso al sistema APONNT 360 de gestion de asistencia biometrica y recursos humanos en modalidad SaaS.
- Usuario: Toda persona fisica autorizada por EL CLIENTE para acceder al Servicio.
- Datos del Cliente: Toda informacion ingresada, generada o procesada por EL CLIENTE o sus Usuarios, incluyendo datos personales, datos biometricos, registros de asistencia, informacion medica y documentacion laboral.
- Datos Biometricos: Datos personales sensibles obtenidos a partir del tratamiento tecnico de caracteristicas fisicas, incluyendo huellas dactilares, reconocimiento facial y patrones biometricos.
- APK: Aplicaciones moviles complementarias del Servicio (Kiosk, Medical, Legal, Employee).
- Sucursal: Cada ubicacion fisica de EL CLIENTE donde opera el Servicio.
- Periodo de Gracia: Plazo de SIETE (7) dias habiles otorgado a EL CLIENTE para regularizar pagos pendientes antes de iniciar el proceso de baja.
- Empaquetado de Datos: Proceso mediante el cual EL PROVEEDOR genera un archivo comprimido con la totalidad de los Datos del Cliente para su descarga.
- Order Form (Anexo A): Documento que detalla los modulos contratados, cantidades, precios y condiciones particulares.`
        },
        {
            id: 'C',
            title: 'OBJETO Y ALCANCE',
            content: `EL PROVEEDOR otorga a EL CLIENTE un derecho de acceso no exclusivo, intransferible y revocable al Servicio, incluyendo los modulos y APKs detallados en el Anexo A (Order Form).

El alcance comprende: (a) Acceso a la plataforma web y APIs; (b) Procesamiento y almacenamiento de datos en servidores seguros; (c) Actualizaciones de software y parches de seguridad; (d) Soporte tecnico conforme el SLA; (e) Modulos adicionales segun Anexo A.

Quedan excluidos: (a) Hardware, dispositivos y conectividad; (b) Capacitacion presencial salvo acuerdo expreso; (c) Desarrollos a medida; (d) Integracion con sistemas de terceros no soportados oficialmente.`
        },
        {
            id: 'D',
            title: 'DURACION Y VIGENCIA',
            content: `D.1. El presente Contrato tendra una vigencia de DOCE (12) meses desde la Fecha de Inicio indicada en el Anexo A.

D.2. Se renovara automaticamente por periodos iguales salvo notificacion en contrario con TREINTA (30) dias de anticipacion.

D.3. El periodo de trial previo a la contratacion no se computara a los efectos de la vigencia contractual.

D.4. EL PROVEEDOR notificara a EL CLIENTE con 30 dias de anticipacion al vencimiento, indicando las condiciones de renovacion.`
        },
        {
            id: 'E',
            title: 'PRECIO Y FORMA DE PAGO',
            content: `E.1. EL CLIENTE abonara el monto mensual indicado en el Anexo A. Los precios no incluyen impuestos, los cuales seran a cargo de EL CLIENTE.

E.2. EL PROVEEDOR emitira factura electronica dentro de los primeros CINCO (5) dias de cada periodo mensual.

E.3. EL CLIENTE debera abonar cada factura dentro de los DIEZ (10) dias corridos de emitida.

E.4. Medios de pago: transferencia bancaria o medios electronicos habilitados.

E.5. MORA AUTOMATICA. Transcurrido el plazo de pago, operara la mora de pleno derecho sin necesidad de interpelacion.

E.6. CONSECUENCIAS DE LA MORA:
  a) Factura vencida de 1 a 30 dias: Suspension del acceso al Servicio sin responsabilidad para EL PROVEEDOR.
  b) Factura vencida de 30 a 37 dias: Notificacion de inicio de procedimiento de baja. Periodo de Gracia de SIETE (7) dias habiles.
  c) Factura vencida mas de 37 dias sin regularizacion: Inicio del Empaquetado de Datos y baja definitiva conforme Seccion K.

E.7. EL PROVEEDOR podra ajustar precios al inicio de cada periodo de renovacion, notificando con 30 dias de anticipacion. Si EL CLIENTE no aceptare, podra terminar el Contrato sin penalidad.`
        },
        {
            id: 'F',
            title: 'NIVELES DE SERVICIO (SLA)',
            content: `F.1. DISPONIBILIDAD: 99.5% mensual, excluyendo mantenimientos programados notificados con 48hs de anticipacion.

F.2. No se computa como inactividad: mantenimientos programados, fuerza mayor, fallas en la infraestructura de EL CLIENTE, uso indebido.

F.3. Soporte tecnico: Lunes a Viernes 9:00-18:00 hs (GMT-3). Incidentes criticos: respuesta maxima de 4 horas.

F.4. Backups diarios con retencion de 30 dias.`
        },
        {
            id: 'G',
            title: 'PROTECCION DE DATOS PERSONALES Y BIOMETRICOS',
            content: `G.1. ROLES. EL CLIENTE actua como RESPONSABLE DEL TRATAMIENTO. EL PROVEEDOR actua como ENCARGADO DEL TRATAMIENTO, procesando datos conforme las instrucciones de EL CLIENTE.

G.2. NORMATIVA: Ley 25.326 de Proteccion de Datos Personales y disposiciones de la AAIP.

G.3. DATOS BIOMETRICOS:
  a) EL CLIENTE es exclusivo responsable de obtener el consentimiento informado, previo y expreso de cada persona.
  b) Los datos biometricos se procesan exclusivamente para control de asistencia e identificacion.
  c) Almacenamiento cifrado (AES-256). Templates biometricos almacenados separados de datos personales.
  d) EL PROVEEDOR NO realizara perfilamiento, comparacion masiva ni cesion de datos biometricos a terceros bajo ninguna circunstancia.
  e) A la terminacion del Contrato, los datos biometricos seran incluidos en el Empaquetado de Datos y eliminados conforme Seccion K.

G.4. MEDIDAS DE SEGURIDAD: Cifrado en transito (TLS 1.2+) y reposo (AES-256), control de acceso RBAC, registro de auditoria, segregacion multi-tenant, evaluaciones de vulnerabilidades.

G.5. INCIDENTES DE SEGURIDAD: Notificacion a EL CLIENTE dentro de las 72 horas, con detalle del incidente, datos afectados y medidas correctivas.

G.6. PROHIBICION DE CESION: Los Datos del Cliente NO seran cedidos a terceros salvo: (a) requerimiento judicial; (b) consentimiento expreso de EL CLIENTE; (c) subprocesadores aprobados.`
        },
        {
            id: 'H',
            title: 'PROPIEDAD INTELECTUAL',
            content: `H.1. El Servicio es propiedad exclusiva de EL PROVEEDOR (Ley 11.723). EL CLIENTE obtiene un derecho de uso limitado, no exclusivo, intransferible y revocable.

H.2. Los Datos del Cliente son propiedad exclusiva de EL CLIENTE.

H.3. EL CLIENTE no podra: descompilar el Servicio, sublicenciar, desarrollar productos competidores, ni remover avisos de propiedad intelectual.`
        },
        {
            id: 'I',
            title: 'CONFIDENCIALIDAD',
            content: `Las partes mantendran estricta confidencialidad sobre toda informacion recibida de la otra parte, por CINCO (5) anos desde la terminacion del Contrato. Excepciones: informacion publica, desarrollo independiente, requerimiento legal.`
        },
        {
            id: 'J',
            title: 'LIMITACION DE RESPONSABILIDAD Y DESLINDE',
            content: `J.1. LIMITE MAXIMO: La responsabilidad total de EL PROVEEDOR se limita al monto abonado por EL CLIENTE en los ultimos DOCE (12) meses.

J.2. EXCLUSION DE DANOS. EL PROVEEDOR NO sera responsable por:
  a) Danos indirectos, incidentales, especiales, consecuentes o punitivos.
  b) Lucro cesante, perdida de ingresos o ahorro frustrado.
  c) Perdida de datos por causas ajenas: fallas de hardware, cortes de energia, ataques de terceros, desastres naturales.
  d) Uso indebido o negligente del Servicio por EL CLIENTE o sus Usuarios.
  e) Decisiones empresariales, laborales, medicas o legales basadas en informacion del Servicio.

J.3. DESLINDE POR DATOS BIOMETRICOS. EL CLIENTE es exclusivo responsable de: obtener consentimiento, cumplir normativa laboral, informar a empleados, y garantizar la legitimidad de los datos.

J.4. El Servicio es una herramienta de gestion. EL PROVEEDOR no garantiza resultados especificos.

J.5. FUERZA MAYOR conforme Codigo Civil y Comercial de la Nacion.`
        },
        {
            id: 'K',
            title: 'TERMINACION, BAJA DEL SERVICIO Y PORTABILIDAD DE DATOS',
            content: `K.1. TERMINACION VOLUNTARIA: Cualquiera de las partes podra terminar el Contrato con TREINTA (30) dias de preaviso, sin penalidad.

K.2. TERMINACION POR INCUMPLIMIENTO: Intimacion con 15 dias para subsanar. Si no subsana, resolucion de pleno derecho.

K.3. BAJA POR FALTA DE PAGO - PROCEDIMIENTO DETALLADO:
  a) NOTIFICACION: EL PROVEEDOR notifica inicio del procedimiento de baja, indicando monto adeudado y plazo.
  b) PERIODO DE GRACIA: SIETE (7) dias habiles. El Servicio permanece suspendido pero los datos intactos.
  c) EMPAQUETADO DE DATOS: Exportacion completa en formatos estandar (CSV, JSON, PDF). Archivo ZIP con todos los datos: empleados, asistencia, biometricos, documentacion, registros medicos, capacitaciones, configuraciones.
  d) PLAZO DE DESCARGA: TREINTA (30) dias corridos. URL de descarga segura notificada por email.
  e) CONFIRMACION DE BAJA: Un funcionario gerencial confirma la baja definitiva verificando ultimos 4 digitos del CUIT.
  f) ELIMINACION DEFINITIVA en 9 fases: (1) Datos biometricos, (2) Registros medicos, (3) Datos de empleados, (4) Asistencia, (5) Operaciones, (6) Capacitacion y documentos, (7) Seguridad laboral, (8) Nomina, (9) Configuraciones.
  g) DATOS PRESERVADOS: Registros fiscales (facturas, contratos, presupuestos) se conservan por obligacion legal.

K.4. CANCELACION: Si EL CLIENTE regulariza el pago antes de la confirmacion definitiva, el Servicio se reactiva en 24 horas habiles.

K.5. PORTABILIDAD: EL CLIENTE puede solicitar Empaquetado de Datos en cualquier momento. Recibira datos en formatos abiertos. Puede solicitar certificado de eliminacion definitiva.

K.6. POST-TERMINACION: Cesa todo uso. Licencias revocadas. Subsisten obligaciones de confidencialidad (5 anos) y proteccion de datos.`
        },
        {
            id: 'L',
            title: 'LEY APLICABLE Y JURISDICCION',
            content: `L.1. Ley aplicable: leyes de la Republica Argentina.

L.2. Jurisdiccion: Tribunales Ordinarios en lo Comercial de CABA.

L.3. Mediacion previa obligatoria conforme Ley 26.589, por un plazo no mayor a 30 dias.`
        },
        {
            id: 'M',
            title: 'DISPOSICIONES GENERALES',
            content: `M.1. Acuerdo integro: reemplaza acuerdos previos.
M.2. Modificaciones: por escrito y aceptadas por ambas partes. Actualizaciones de terminos generales con 30 dias de anticipacion.
M.3. EL CLIENTE no podra ceder el Contrato sin consentimiento. EL PROVEEDOR podra cederlo en caso de fusion o adquisicion.
M.4. Nulidad parcial no afecta validez del resto.
M.5. Notificaciones por email, validas a las 24hs de envio.
M.6. La omision en ejercer un derecho no constituye renuncia.`
        }
    ],

    apk_addendums: {
        kiosk: {
            title: 'ADDENDUM: APK KIOSK - Terminal de Fichaje Biometrico',
            content: 'El modulo APK Kiosk permite el fichaje biometrico mediante dispositivos dedicados. EL CLIENTE es responsable de: provision y mantenimiento del hardware, conectividad, obtencion del consentimiento biometrico, y senalizacion visible. Maximo de dispositivos segun Anexo A.'
        },
        medical: {
            title: 'ADDENDUM: APK MEDICAL - Salud Ocupacional',
            content: 'Destinado a profesionales medicos autorizados. Datos procesados conforme normativa de salud, Ley 25.326 y Ley 26.529 de Derechos del Paciente. Solo profesionales matriculados accedan a informacion de salud.'
        },
        legal: {
            title: 'ADDENDUM: APK LEGAL - Gestion de Casos Laborales',
            content: 'Destinado a profesionales legales para gestion de casos laborales y sanciones disciplinarias. Informacion bajo estricta confidencialidad profesional.'
        },
        employee: {
            title: 'ADDENDUM: APK EMPLOYEE - Portal del Empleado',
            content: 'Permite a los empleados consultar informacion, fichar, gestionar vacaciones y acceder a recibos. EL CLIENTE es responsable de informar a sus empleados y establecer politicas de uso.'
        }
    },

    annexes: {
        order_form: {
            title: 'ANEXO A: ORDER FORM',
            fields: [
                'Razon Social del Cliente',
                'CUIT / Identificacion Fiscal',
                'Domicilio Legal',
                'Sucursal Central',
                'Cantidad de Empleados Contratados',
                'Modulos Contratados (detalle y precio unitario)',
                'APKs Contratados',
                'Monto Mensual Total',
                'Moneda de Facturacion',
                'Forma de Pago',
                'Dia de Facturacion',
                'Fecha de Inicio',
                'Fecha de Vencimiento',
                'Incluye Trial: SI/NO',
                'Vendedor Asignado'
            ]
        }
    },

    // EULA Click-Wrap: No hay campos de firma manual
    // La aceptacion se realiza electronicamente desde el email enviado al cliente
    acceptance: {
        type: 'click_wrap',
        method: 'email_link',
        description: 'Al hacer click en "Acepto los Terminos" desde el email recibido, EL CLIENTE manifiesta su conformidad con la totalidad de las clausulas del presente Contrato.',
        legal_basis: 'Ley 25.506 de Firma Digital - Articulo 3: Validez del documento digital',
        recorded_data: [
            'Timestamp UTC de aceptacion',
            'Email del aceptante',
            'Direccion IP',
            'User-Agent del navegador',
            'Hash SHA-256 del documento',
            'UUID unico de aceptacion'
        ]
    }
};

/**
 * Genera HTML del contrato con datos del presupuesto
 */
function generateContractHTML(quote, company) {
    const replacements = {
        '{{APONNT_LEGAL_NAME}}': 'APONNT S.A.S.',
        '{{APONNT_ADDRESS}}': 'Ciudad Autonoma de Buenos Aires, Argentina',
        '{{APONNT_CUIT}}': '30-XXXXXXXX-X',
        '{{COMPANY_LEGAL_NAME}}': company?.legal_name || company?.name || 'EMPRESA',
        '{{COMPANY_ADDRESS}}': [company?.address, company?.city, company?.province, company?.country].filter(Boolean).join(', ') || '-',
        '{{COMPANY_CUIT}}': company?.tax_id || '-'
    };

    let html = '<div class="contract-document">';
    html += '<div class="contract-header">';
    html += '<h2>' + CONTRACT_TEMPLATE_ARG_V2.header.title + '</h2>';
    html += '<p>' + CONTRACT_TEMPLATE_ARG_V2.header.subtitle + '</p>';
    html += '<p class="contract-version">' + CONTRACT_TEMPLATE_ARG_V2.header.version + '</p>';
    html += '</div>';

    CONTRACT_TEMPLATE_ARG_V2.sections.forEach(function(section) {
        let content = section.content;
        Object.entries(replacements).forEach(function([key, val]) {
            content = content.split(key).join(val);
        });

        html += '<div class="contract-section">';
        html += '<h3>' + section.id + '. ' + section.title + '</h3>';
        html += '<div class="contract-content">' + content.replace(/\n/g, '<br>') + '</div>';
        html += '</div>';
    });

    // Anexo A con datos del quote
    if (quote) {
        html += '<div class="contract-section contract-annex">';
        html += '<h3>ANEXO A: ORDER FORM</h3>';
        html += '<table class="annex-table">';
        html += '<tr><td>Razon Social</td><td>' + (company?.legal_name || company?.name || '-') + '</td></tr>';
        html += '<tr><td>CUIT</td><td>' + (company?.tax_id || '-') + '</td></tr>';
        html += '<tr><td>Domicilio</td><td>' + (replacements['{{COMPANY_ADDRESS}}']) + '</td></tr>';

        const modules = typeof quote.modules_data === 'string' ? JSON.parse(quote.modules_data || '[]') : (quote.modules_data || []);
        html += '<tr><td>Modulos Contratados</td><td>';
        modules.forEach(function(m) {
            html += (m.module_name || m.module_key) + ' - $' + parseFloat(m.price || 0).toLocaleString('es-AR') + '/mes<br>';
        });
        html += '</td></tr>';
        html += '<tr><td><strong>Monto Mensual Total</strong></td><td><strong>$' + parseFloat(quote.total_amount || 0).toLocaleString('es-AR') + '/mes</strong></td></tr>';
        html += '<tr><td>Fecha de Inicio</td><td>' + (quote.accepted_date || quote.created_at || '-') + '</td></tr>';
        html += '</table>';
        html += '</div>';
    }

    html += '</div>';
    return html;
}

module.exports = { CONTRACT_TEMPLATE_ARG_V2, generateContractHTML };
