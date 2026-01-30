-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN: Enriquecer Template EULA Argentina (MSA-ARG-ES-v1)
-- Fecha: 2026-01-28
-- Descripción: Cláusulas profesionales de nivel enterprise
-- ═══════════════════════════════════════════════════════════════

UPDATE contract_templates
SET
    version = '2.0.0',
    content_json = '{
        "header": {
            "title": "CONTRATO MARCO DE SUSCRIPCIÓN DE SERVICIOS (MSA)",
            "subtitle": "Sistema de Gestión de Asistencia Biométrica y Recursos Humanos APONNT 360°",
            "version": "2.0 - Enero 2026"
        },
        "sections": [
            {
                "id": "A",
                "title": "PARTES CONTRATANTES",
                "content": "Entre {{APONNT_LEGAL_NAME}}, con domicilio en {{APONNT_ADDRESS}}, CUIT {{APONNT_CUIT}}, en adelante \"EL PROVEEDOR\", y {{COMPANY_LEGAL_NAME}}, con domicilio en {{COMPANY_ADDRESS}}, CUIT {{COMPANY_CUIT}}, en adelante \"EL CLIENTE\", se celebra el presente Contrato Marco de Suscripción de Servicios (en adelante, el \"Contrato\").\n\nAmbas partes declaran tener capacidad legal suficiente para obligarse en los términos del presente Contrato y reconocen la validez de las comunicaciones electrónicas y la firma digital conforme la Ley 25.506 de Firma Digital de la República Argentina."
            },
            {
                "id": "B",
                "title": "DEFINICIONES",
                "content": "A los efectos del presente Contrato se entenderá por:\n\n- **Servicio**: Acceso al sistema APONNT 360° de gestión de asistencia biométrica y recursos humanos en modalidad SaaS (Software como Servicio), incluyendo las funcionalidades, módulos y actualizaciones que EL PROVEEDOR ponga a disposición.\n- **Usuario**: Toda persona física autorizada por EL CLIENTE para acceder al Servicio, identificada mediante credenciales únicas.\n- **Datos del Cliente**: Toda información ingresada, generada o procesada por EL CLIENTE o sus Usuarios a través del Servicio, incluyendo pero no limitado a datos personales, datos biométricos, registros de asistencia, información médica y documentación laboral.\n- **Datos Biométricos**: Datos personales sensibles obtenidos a partir del tratamiento técnico de características físicas o fisiológicas de una persona, incluyendo huellas dactilares, reconocimiento facial, geometría de la mano y patrones de iris.\n- **APK**: Aplicaciones móviles complementarias del Servicio (Kiosk, Medical, Legal, Employee).\n- **Sucursal**: Cada ubicación física de EL CLIENTE donde opera el Servicio.\n- **Período de Gracia**: Plazo de SIETE (7) días hábiles otorgado a EL CLIENTE para regularizar pagos pendientes antes de iniciar el proceso de baja.\n- **Empaquetado de Datos**: Proceso mediante el cual EL PROVEEDOR genera un archivo comprimido con la totalidad de los Datos del Cliente para su descarga.\n- **Order Form (Anexo A)**: Documento que detalla los módulos contratados, cantidades, precios y condiciones particulares aplicables."
            },
            {
                "id": "C",
                "title": "OBJETO Y ALCANCE",
                "content": "EL PROVEEDOR otorga a EL CLIENTE un derecho de acceso no exclusivo, intransferible y revocable al Servicio, incluyendo los módulos y APKs detallados en el Anexo A (Order Form), para uso exclusivo en las operaciones de EL CLIENTE.\n\nEl alcance del Servicio comprende:\n\na) Acceso a la plataforma web y APIs del sistema.\nb) Procesamiento y almacenamiento de datos en servidores seguros.\nc) Actualizaciones de software y parches de seguridad.\nd) Soporte técnico conforme el SLA establecido en la Sección F.\ne) Módulos adicionales según lo detallado en el Anexo A.\n\nQueda expresamente excluido del alcance:\n\na) Hardware, dispositivos y conectividad a internet.\nb) Capacitación presencial (salvo acuerdo expreso).\nc) Desarrollos a medida no contemplados en el Anexo A.\nd) Integración con sistemas de terceros no soportados oficialmente."
            },
            {
                "id": "D",
                "title": "DURACIÓN Y VIGENCIA",
                "content": "D.1. VIGENCIA INICIAL. El presente Contrato tendrá una vigencia de DOCE (12) meses contados desde la Fecha de Inicio indicada en el Anexo A.\n\nD.2. RENOVACIÓN AUTOMÁTICA. Se renovará automáticamente por períodos iguales y sucesivos salvo notificación en contrario por cualquiera de las partes con TREINTA (30) días de anticipación al vencimiento del período vigente.\n\nD.3. PERÍODO DE TRIAL. En caso de que EL CLIENTE haya accedido a un período de prueba (trial) previo a la contratación, dicho período no se computará a los efectos de la vigencia contractual. Los módulos activados durante el trial se desactivarán automáticamente al finalizar dicho período, salvo que EL CLIENTE formalice la contratación.\n\nD.4. ALERTAS DE VENCIMIENTO. EL PROVEEDOR notificará a EL CLIENTE con TREINTA (30) días de anticipación al vencimiento del período vigente, indicando las condiciones de renovación."
            },
            {
                "id": "E",
                "title": "PRECIO Y FORMA DE PAGO",
                "content": "E.1. MONTO. EL CLIENTE abonará el monto mensual indicado en el Anexo A. Los precios se expresan en la moneda especificada en el Anexo A y no incluyen impuestos aplicables, los cuales serán a cargo de EL CLIENTE.\n\nE.2. FACTURACIÓN. EL PROVEEDOR emitirá factura electrónica dentro de los primeros CINCO (5) días de cada período mensual.\n\nE.3. PLAZO DE PAGO. EL CLIENTE deberá abonar cada factura dentro de los DIEZ (10) días corridos de emitida.\n\nE.4. MEDIOS DE PAGO. Los pagos se realizarán mediante transferencia bancaria a la cuenta indicada en la factura, o mediante los medios de pago electrónicos habilitados por EL PROVEEDOR.\n\nE.5. MORA AUTOMÁTICA. Transcurrido el plazo de pago sin que EL CLIENTE hubiere abonado la factura, operará la mora de pleno derecho, sin necesidad de interpelación judicial o extrajudicial alguna.\n\nE.6. CONSECUENCIAS DE LA MORA.\n  a) Factura vencida de 1 a 30 días: EL PROVEEDOR podrá suspender el acceso al Servicio sin responsabilidad.\n  b) Factura vencida de 30 a 37 días: Se notificará a EL CLIENTE el inicio del procedimiento de baja y se otorgará un Período de Gracia de SIETE (7) días hábiles para regularizar la situación.\n  c) Factura vencida más de 37 días sin regularización: Se iniciará el proceso de Empaquetado de Datos y baja definitiva conforme la Sección K.\n\nE.7. AJUSTES DE PRECIO. EL PROVEEDOR podrá ajustar los precios al inicio de cada período de renovación, notificando los nuevos valores con TREINTA (30) días de anticipación. Si EL CLIENTE no aceptare los nuevos precios, podrá dar por terminado el Contrato sin penalidad."
            },
            {
                "id": "F",
                "title": "NIVELES DE SERVICIO (SLA)",
                "content": "F.1. DISPONIBILIDAD. EL PROVEEDOR garantiza una disponibilidad del Servicio del NOVENTA Y NUEVE COMA CINCO POR CIENTO (99.5%) mensual, calculada como el tiempo total del mes menos el tiempo de inactividad no programada, dividido por el tiempo total del mes.\n\nF.2. EXCLUSIONES. No se computarán como tiempo de inactividad:\n  a) Mantenimientos programados notificados con CUARENTA Y OCHO (48) horas de anticipación.\n  b) Incidentes de fuerza mayor o caso fortuito.\n  c) Fallas en la conectividad o infraestructura de EL CLIENTE.\n  d) Uso indebido del Servicio por parte de EL CLIENTE o sus Usuarios.\n\nF.3. SOPORTE TÉCNICO. El soporte técnico estará disponible de Lunes a Viernes de 9:00 a 18:00 hs (GMT-3), a través de los canales habilitados (email, chat, sistema de tickets). Los incidentes críticos (servicio inaccesible) tendrán un tiempo de respuesta máximo de CUATRO (4) horas.\n\nF.4. BACKUPS. EL PROVEEDOR realizará copias de seguridad diarias de los Datos del Cliente, con retención de TREINTA (30) días. Los backups no constituyen un servicio de recuperación ante desastres a cargo del CLIENTE."
            },
            {
                "id": "G",
                "title": "PROTECCIÓN DE DATOS PERSONALES Y BIOMÉTRICOS",
                "content": "G.1. ROLES. A los efectos de la normativa de protección de datos:\n  - EL CLIENTE actúa como RESPONSABLE DEL TRATAMIENTO de los datos personales de sus empleados y usuarios.\n  - EL PROVEEDOR actúa como ENCARGADO DEL TRATAMIENTO, procesando los datos exclusivamente conforme las instrucciones de EL CLIENTE y los fines del presente Contrato.\n\nG.2. NORMATIVA APLICABLE. El tratamiento de datos se regirá por:\n  a) Ley 25.326 de Protección de Datos Personales de Argentina y su decreto reglamentario.\n  b) Disposiciones de la Agencia de Acceso a la Información Pública (AAIP).\n  c) Normativa sectorial aplicable según la jurisdicción de EL CLIENTE.\n\nG.3. DATOS BIOMÉTRICOS. Respecto de los datos biométricos procesados por el Servicio:\n  a) EL CLIENTE es exclusivo responsable de obtener el consentimiento informado, previo y expreso de cada persona cuyos datos biométricos se procesen, conforme la normativa vigente.\n  b) EL PROVEEDOR procesará los datos biométricos exclusivamente para las finalidades de control de asistencia, identificación y las demás funcionalidades contratadas.\n  c) Los datos biométricos se almacenarán cifrados mediante algoritmos de cifrado AES-256 o equivalente.\n  d) Los templates biométricos (representaciones matemáticas) se almacenarán separados de los datos de identificación personal.\n  e) EL PROVEEDOR NO realizará perfilamiento, comparación masiva ni cesión de datos biométricos a terceros bajo ninguna circunstancia.\n  f) A la terminación del Contrato, los datos biométricos serán incluidos en el Empaquetado de Datos y posteriormente eliminados conforme la Sección K.\n\nG.4. MEDIDAS DE SEGURIDAD. EL PROVEEDOR implementará medidas técnicas y organizativas apropiadas, incluyendo:\n  a) Cifrado en tránsito (TLS 1.2 o superior) y en reposo (AES-256).\n  b) Control de acceso basado en roles (RBAC).\n  c) Registro de auditoría de accesos y operaciones.\n  d) Segregación lógica de datos entre clientes (multi-tenancy seguro).\n  e) Evaluaciones periódicas de vulnerabilidades.\n\nG.5. INCIDENTES DE SEGURIDAD. EL PROVEEDOR notificará a EL CLIENTE todo incidente de seguridad que afecte sus datos dentro de las SETENTA Y DOS (72) horas de conocido, proporcionando información sobre la naturaleza del incidente, los datos afectados y las medidas correctivas adoptadas.\n\nG.6. PROHIBICIÓN DE CESIÓN. Los Datos del Cliente, incluyendo datos biométricos, NO serán cedidos, vendidos, transferidos, licenciados ni puestos a disposición de terceros bajo ninguna circunstancia, salvo:\n  a) Requerimiento de autoridad judicial competente.\n  b) Consentimiento expreso y por escrito de EL CLIENTE.\n  c) Subprocesadores aprobados por EL CLIENTE (ej: proveedores de infraestructura cloud)."
            },
            {
                "id": "H",
                "title": "PROPIEDAD INTELECTUAL",
                "content": "H.1. PROPIEDAD DEL SERVICIO. El Servicio, incluyendo su código fuente, algoritmos, diseño, interfaces, documentación, marcas y demás elementos, son propiedad exclusiva de EL PROVEEDOR y están protegidos por la Ley 11.723 de Propiedad Intelectual y tratados internacionales aplicables.\n\nH.2. LICENCIA DE USO. EL CLIENTE no adquiere ningún derecho de propiedad sobre el Servicio. Se le otorga únicamente un derecho de uso limitado, no exclusivo, intransferible y revocable, sujeto a los términos del presente Contrato.\n\nH.3. PROPIEDAD DE LOS DATOS. Los Datos del Cliente son y permanecerán siendo propiedad exclusiva de EL CLIENTE. EL PROVEEDOR no adquiere ningún derecho sobre dichos datos más allá de los necesarios para la prestación del Servicio.\n\nH.4. RESTRICCIONES. EL CLIENTE se obliga a NO:\n  a) Descompilar, desensamblar o realizar ingeniería inversa del Servicio.\n  b) Sublicenciar, alquilar o transferir el acceso al Servicio.\n  c) Utilizar el Servicio para desarrollar un producto o servicio competidor.\n  d) Remover avisos de propiedad intelectual del Servicio."
            },
            {
                "id": "I",
                "title": "CONFIDENCIALIDAD",
                "content": "I.1. OBLIGACIÓN. Las partes se obligan a mantener estricta confidencialidad sobre toda información técnica, comercial, financiera, operativa o de cualquier otra índole que reciban de la otra parte en virtud del presente Contrato.\n\nI.2. DURACIÓN. La obligación de confidencialidad se extenderá por un plazo de CINCO (5) años desde la terminación del Contrato, cualquiera fuere su causa.\n\nI.3. EXCEPCIONES. No se considerará información confidencial aquella que:\n  a) Sea de dominio público sin mediar incumplimiento de esta cláusula.\n  b) Haya sido desarrollada independientemente por la parte receptora.\n  c) Deba ser divulgada por requerimiento legal o judicial."
            },
            {
                "id": "J",
                "title": "LIMITACIÓN DE RESPONSABILIDAD Y DESLINDE",
                "content": "J.1. LÍMITE MÁXIMO. La responsabilidad total y acumulada de EL PROVEEDOR bajo el presente Contrato, por cualquier causa y con independencia de la teoría legal aplicable (contractual, extracontractual, objetiva u otra), se limitará al monto total efectivamente abonado por EL CLIENTE en los DOCE (12) meses inmediatamente anteriores al evento que origina el reclamo.\n\nJ.2. EXCLUSIÓN DE DAÑOS. EL PROVEEDOR NO será responsable, bajo ninguna circunstancia, por:\n  a) Daños indirectos, incidentales, especiales, consecuentes o punitivos.\n  b) Lucro cesante, pérdida de ingresos, pérdida de oportunidades de negocio o ahorro frustrado.\n  c) Pérdida, corrupción o destrucción de datos ocasionada por causas ajenas al control razonable de EL PROVEEDOR, incluyendo pero no limitado a: fallas de hardware, cortes de energía, ataques de terceros (malware, ransomware, DDoS), desastres naturales o actos de gobierno.\n  d) Uso indebido, no autorizado o negligente del Servicio por parte de EL CLIENTE, sus Usuarios o terceros con acceso a las credenciales de EL CLIENTE.\n  e) Decisiones empresariales, laborales, médicas o legales tomadas por EL CLIENTE basándose en la información generada por el Servicio.\n\nJ.3. DESLINDE DE RESPONSABILIDAD POR DATOS BIOMÉTRICOS. EL CLIENTE es exclusivo responsable de:\n  a) Obtener y mantener vigente el consentimiento de cada persona cuyos datos biométricos se procesen.\n  b) Cumplir con la normativa laboral y de protección de datos aplicable en su jurisdicción.\n  c) Informar a sus empleados sobre la existencia y finalidad del tratamiento de datos biométricos.\n  d) Garantizar la exactitud y legitimidad de los datos ingresados al Servicio.\n\nJ.4. DESLINDE POR USO DEL SERVICIO. El Servicio es una herramienta de gestión. EL PROVEEDOR no garantiza resultados específicos derivados de su uso y no será responsable por las consecuencias de las decisiones que EL CLIENTE adopte basándose en los reportes, análisis o información generada por el Servicio.\n\nJ.5. FUERZA MAYOR. Ninguna de las partes será responsable por incumplimientos derivados de causas de fuerza mayor o caso fortuito, conforme las definiciones del Código Civil y Comercial de la Nación Argentina."
            },
            {
                "id": "K",
                "title": "TERMINACIÓN, BAJA DEL SERVICIO Y PORTABILIDAD DE DATOS",
                "content": "K.1. TERMINACIÓN VOLUNTARIA. Cualquiera de las partes podrá dar por terminado el Contrato notificando a la otra parte con TREINTA (30) días corridos de anticipación, sin expresión de causa y sin penalidad.\n\nK.2. TERMINACIÓN POR INCUMPLIMIENTO. En caso de incumplimiento grave de cualquiera de las obligaciones esenciales del presente Contrato, la parte afectada podrá resolver el Contrato de pleno derecho, previa intimación fehaciente otorgando un plazo de QUINCE (15) días para subsanar el incumplimiento.\n\nK.3. TERMINACIÓN POR FALTA DE PAGO - PROCEDIMIENTO DE BAJA. Cuando EL CLIENTE mantuviere una factura impaga por más de TREINTA (30) días corridos desde su vencimiento, se aplicará el siguiente procedimiento:\n\n  a) NOTIFICACIÓN DE BAJA INMINENTE: EL PROVEEDOR notificará a EL CLIENTE por correo electrónico y a través del Servicio que se ha iniciado el procedimiento de baja, indicando el monto adeudado y el plazo para regularizar.\n\n  b) PERÍODO DE GRACIA: EL CLIENTE dispondrá de SIETE (7) días hábiles desde la notificación para regularizar el pago. Durante este período, el acceso al Servicio permanecerá suspendido pero los datos se mantendrán intactos.\n\n  c) EMPAQUETADO DE DATOS: Vencido el Período de Gracia sin regularización, EL PROVEEDOR procederá al Empaquetado de Datos, que consiste en:\n    - Exportación completa de todos los Datos del Cliente en formatos estándar (CSV, JSON, PDF según corresponda).\n    - Generación de un archivo comprimido (ZIP) con la totalidad de los datos.\n    - Puesta a disposición de EL CLIENTE de una URL de descarga segura.\n    - El archivo incluirá: datos de empleados, registros de asistencia, datos biométricos (templates), documentación, registros médicos, historial de capacitaciones, configuraciones y toda información operativa del CLIENTE.\n\n  d) PLAZO DE DESCARGA: EL CLIENTE dispondrá de TREINTA (30) días corridos desde la notificación de disponibilidad del archivo para descargar sus datos. EL PROVEEDOR notificará la disponibilidad por correo electrónico a la dirección registrada.\n\n  e) CONFIRMACIÓN DE BAJA: Transcurridos los 30 días de descarga, un funcionario de EL PROVEEDOR con nivel gerencial o superior confirmará la baja definitiva. Como medida de seguridad, se requerirá la verificación mediante los últimos 4 dígitos del CUIT de EL CLIENTE.\n\n  f) ELIMINACIÓN DEFINITIVA: Una vez confirmada la baja, EL PROVEEDOR procederá a la eliminación irreversible de todos los Datos del Cliente de sus sistemas, en NUEVE (9) fases:\n    - Fase 1: Datos biométricos y de privacidad\n    - Fase 2: Registros médicos\n    - Fase 3: Datos de empleados y dependientes\n    - Fase 4: Registros de asistencia y tiempo\n    - Fase 5: Datos operativos\n    - Fase 6: Capacitación y documentos\n    - Fase 7: Seguridad laboral\n    - Fase 8: Datos de nómina\n    - Fase 9: Configuraciones operativas\n\n  g) DATOS PRESERVADOS: No se eliminarán los registros fiscales (facturas, contratos, presupuestos) que EL PROVEEDOR deba conservar por obligaciones legales y tributarias.\n\nK.4. CANCELACIÓN DEL PROCESO DE BAJA. Si EL CLIENTE regularizare el pago en cualquier momento antes de la confirmación de baja definitiva (K.3.e), EL PROVEEDOR cancelará el proceso de baja y reactivará el Servicio dentro de las VEINTICUATRO (24) horas hábiles siguientes.\n\nK.5. PORTABILIDAD DE DATOS. Independientemente de la causa de terminación, EL CLIENTE tendrá derecho a:\n  a) Solicitar el Empaquetado de Datos en cualquier momento durante la vigencia del Contrato.\n  b) Descargar sus datos dentro de los TREINTA (30) días siguientes a la terminación.\n  c) Recibir los datos en formatos abiertos y estándar que permitan su migración a otros sistemas.\n  d) Solicitar certificado de eliminación definitiva de sus datos una vez completado el proceso.\n\nK.6. OBLIGACIONES POST-TERMINACIÓN. A la terminación del Contrato:\n  a) EL CLIENTE cesará inmediatamente todo uso del Servicio.\n  b) Las licencias de acceso quedarán automáticamente revocadas.\n  c) Subsistirán las obligaciones de confidencialidad (5 años), protección de datos y limitación de responsabilidad."
            },
            {
                "id": "L",
                "title": "LEY APLICABLE Y JURISDICCIÓN",
                "content": "L.1. LEY APLICABLE. El presente Contrato se regirá e interpretará conforme las leyes de la República Argentina.\n\nL.2. JURISDICCIÓN. Para cualquier controversia derivada del presente Contrato, las partes se someten a la jurisdicción exclusiva de los Tribunales Ordinarios en lo Comercial de la Ciudad Autónoma de Buenos Aires, renunciando a cualquier otro fuero o jurisdicción que pudiera corresponderles.\n\nL.3. MEDIACIÓN PREVIA. Previo a iniciar cualquier acción judicial, las partes se comprometen a someter la controversia a un proceso de mediación conforme la Ley 26.589, por un plazo no mayor a TREINTA (30) días."
            },
            {
                "id": "M",
                "title": "DISPOSICIONES GENERALES",
                "content": "M.1. ACUERDO ÍNTEGRO. El presente Contrato, junto con sus Anexos y Addendums, constituye el acuerdo íntegro entre las partes y reemplaza cualquier entendimiento, negociación o acuerdo previo, sea oral o escrito.\n\nM.2. MODIFICACIONES. Ninguna modificación al presente Contrato será válida salvo que conste por escrito y sea aceptada por ambas partes. EL PROVEEDOR podrá actualizar los términos generales del Servicio notificando a EL CLIENTE con TREINTA (30) días de anticipación.\n\nM.3. CESIÓN. EL CLIENTE no podrá ceder ni transferir el presente Contrato sin el consentimiento previo y por escrito de EL PROVEEDOR. EL PROVEEDOR podrá ceder el Contrato en caso de fusión, adquisición o reorganización societaria.\n\nM.4. INDEPENDENCIA DE CLÁUSULAS. La nulidad o inaplicabilidad de cualquier cláusula del presente Contrato no afectará la validez de las restantes, las cuales mantendrán plena vigencia y efecto.\n\nM.5. NOTIFICACIONES. Todas las notificaciones bajo el presente Contrato se realizarán por escrito a las direcciones de correo electrónico registradas por cada parte, considerándose válidamente efectuadas a las 24 horas de su envío.\n\nM.6. NO RENUNCIA. La omisión o demora de cualquiera de las partes en ejercer un derecho bajo el presente Contrato no se interpretará como renuncia al mismo."
            }
        ],
        "apk_addendums": {
            "kiosk": {
                "title": "ADDENDUM: APK KIOSK - Terminal de Fichaje Biométrico",
                "content": "El módulo APK Kiosk permite el fichaje biométrico mediante dispositivos dedicados (tablets, terminales). EL CLIENTE es responsable de:\n  a) Provisión, instalación y mantenimiento del hardware compatible.\n  b) Conectividad a internet en cada punto de fichaje.\n  c) Obtención del consentimiento biométrico de cada empleado previo al registro.\n  d) Señalización visible informando la existencia de dispositivos biométricos conforme normativa local.\n\nMáximo de dispositivos según Anexo A. Los datos biométricos capturados se transmitirán cifrados al servidor y se procesarán conforme la Sección G del presente Contrato."
            },
            "medical": {
                "title": "ADDENDUM: APK MEDICAL - Módulo de Salud Ocupacional",
                "content": "El módulo APK Medical está destinado exclusivamente a profesionales médicos autorizados por EL CLIENTE. Los datos médicos se procesarán conforme:\n  a) La normativa de salud ocupacional vigente.\n  b) La Ley 25.326 de Protección de Datos Personales.\n  c) La Ley 26.529 de Derechos del Paciente.\n\nEL CLIENTE garantiza que solo profesionales médicos matriculados accederán a la información de salud. EL PROVEEDOR no accederá a datos médicos individuales salvo requerimiento expreso de EL CLIENTE para soporte técnico, y en tal caso, bajo estricta confidencialidad."
            },
            "legal": {
                "title": "ADDENDUM: APK LEGAL - Gestión de Casos Laborales",
                "content": "El módulo APK Legal está destinado a profesionales legales para gestión de casos laborales, sanciones disciplinarias y documentación legal. La información legal se manejará con estricta confidencialidad profesional y no será accesible por personal no autorizado de EL CLIENTE ni de EL PROVEEDOR."
            },
            "employee": {
                "title": "ADDENDUM: APK EMPLOYEE - Portal del Empleado",
                "content": "El módulo APK Employee permite a los empleados de EL CLIENTE consultar su información personal, registrar fichajes, gestionar solicitudes de vacaciones y licencias, y acceder a recibos de haberes. EL CLIENTE es responsable de:\n  a) Informar a sus empleados sobre la existencia y funcionalidades de la aplicación.\n  b) Proveer las credenciales de acceso iniciales.\n  c) Establecer las políticas de uso aceptable.\n\nLos datos del empleado serán accesibles únicamente por el propio empleado y por personal autorizado de EL CLIENTE conforme la estructura de permisos configurada."
            }
        },
        "annexes": {
            "order_form": {
                "title": "ANEXO A: ORDER FORM (DETALLE DE CONTRATACIÓN)",
                "fields": [
                    "Razón Social del Cliente",
                    "CUIT / Identificación Fiscal",
                    "Domicilio Legal",
                    "Sucursal Central",
                    "Cantidad de Empleados Contratados",
                    "Módulos Contratados (detalle y precio unitario)",
                    "APKs Contratados",
                    "Monto Mensual Total",
                    "Moneda de Facturación",
                    "Forma de Pago",
                    "Día de Facturación",
                    "Fecha de Inicio del Contrato",
                    "Fecha de Vencimiento del Contrato",
                    "Incluye Período de Trial: SI/NO",
                    "Fecha de Fin de Trial (si aplica)",
                    "Vendedor Asignado"
                ]
            }
        },
        "signatures": {
            "provider": {
                "label": "Por EL PROVEEDOR",
                "fields": ["Nombre y Apellido", "Cargo", "Firma Digital", "Fecha", "Lugar"]
            },
            "client": {
                "label": "Por EL CLIENTE",
                "fields": ["Nombre y Apellido", "DNI", "Cargo", "Firma Digital", "Fecha", "Lugar"]
            }
        }
    }',
    updated_at = CURRENT_TIMESTAMP
WHERE template_code = 'MSA-ARG-ES-v1';
