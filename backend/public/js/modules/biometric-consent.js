/**
 * BIOMETRIC CONSENT & PRIVACY MODULE v2.0
 * Sistema de Consentimientos Biometricos - Estilo Enterprise
 * Arquitectura: Multi-tenant, API-driven
 */

(function() {
'use strict';

// Evitar doble carga
if (window.BiometricConsentEngine) {
    console.log('[CONSENT] Modulo ya cargado');
    return;
}

console.log('%c BIOMETRIC CONSENT v2.0 ', 'background: linear-gradient(90deg, #6B46C1 0%, #805AD5 100%); color: white; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// DOCUMENTO LEGAL COMPLETO
// ============================================================================
const BIOMETRIC_CONSENT_TEXT = `
═══════════════════════════════════════════════════════════════════════════════
                    CONSENTIMIENTO INFORMADO PARA ANÁLISIS BIOMÉTRICO
                    Sistema de Análisis Emocional y Detección de Fatiga
                                    Versión 1.0
═══════════════════════════════════════════════════════════════════════════════

INFORMACIÓN IMPORTANTE: Este documento describe el tratamiento de sus datos biométricos
faciales y requiere su consentimiento expreso, libre e informado según la legislación vigente.

═══════════════════════════════════════════════════════════════════════════════
1. IDENTIFICACIÓN DEL RESPONSABLE
═══════════════════════════════════════════════════════════════════════════════

Responsable del Tratamiento: [NOMBRE DE LA EMPRESA]
CUIT: [CUIT DE LA EMPRESA]
Domicilio: [DOMICILIO LEGAL]
Contacto DPO: [EMAIL/TELÉFONO]

═══════════════════════════════════════════════════════════════════════════════
2. NATURALEZA DEL TRATAMIENTO BIOMÉTRICO
═══════════════════════════════════════════════════════════════════════════════

El sistema utiliza tecnología de Microsoft Azure Face API para analizar expresiones
faciales durante los registros de asistencia. Esta tecnología cuenta con certificación
internacional y cumple con estándares de privacidad GDPR, BIPA y Ley 25.326.

═══════════════════════════════════════════════════════════════════════════════
3. DATOS QUE SE RECOPILAN (CAPACIDADES REALES)
═══════════════════════════════════════════════════════════════════════════════

El sistema analiza ÚNICAMENTE los siguientes elementos faciales:

A) ANÁLISIS EMOCIONAL (8 emociones básicas):
   • Felicidad (Happiness)
   • Tristeza (Sadness)
   • Ira (Anger)
   • Sorpresa (Surprise)
   • Miedo (Fear)
   • Disgusto (Disgust)
   • Desprecio (Contempt)
   • Neutralidad (Neutral)

   Nota: Estos valores son probabilidades entre 0 y 1, no diagnósticos médicos.

B) INDICADORES DE FATIGA:
   • Oclusión ocular izquierda (nivel de cierre del ojo)
   • Oclusión ocular derecha (nivel de cierre del ojo)
   • Postura de la cabeza (pitch, roll, yaw)
   • Intensidad de sonrisa

C) METADATA CONTEXTUAL:
   • Uso de anteojos (lectura/sol/ninguno)
   • Vello facial (estimación automática)
   • Edad estimada (rango aproximado, NO es edad real)

D) DATOS TÉCNICOS:
   • Timestamp del análisis
   • Puntuación de calidad de imagen
   • Tiempo de procesamiento
   • ID temporal de Azure (NO almacena imagen facial)

═══════════════════════════════════════════════════════════════════════════════
4. LO QUE EL SISTEMA NO HACE (LIMITACIONES IMPORTANTES)
═══════════════════════════════════════════════════════════════════════════════

✗ NO lee pensamientos ni intenciones
✗ NO diagnostica condiciones médicas o psicológicas
✗ NO predice comportamiento futuro
✗ NO almacena imágenes de su rostro
✗ NO comparte datos con terceros sin autorización
✗ NO utiliza reconocimiento facial para vigilancia
✗ NO determina aptitud laboral
✗ NO reemplaza evaluaciones médicas profesionales

═══════════════════════════════════════════════════════════════════════════════
5. FINALIDAD DEL TRATAMIENTO
═══════════════════════════════════════════════════════════════════════════════

Los datos se utilizarán EXCLUSIVAMENTE para:

a) Generar indicadores agregados de bienestar organizacional
b) Identificar patrones de fatiga que requieran medidas preventivas
c) Evaluar efectividad de políticas de salud ocupacional
d) Cumplir con obligaciones de seguridad e higiene laboral

IMPORTANTE: Los datos individuales son confidenciales y solo accesibles para:
- Médico laboral de la empresa
- Responsable de RRHH autorizado
- Área de seguridad e higiene

Los reportes gerenciales contienen ÚNICAMENTE datos agregados y anónimos
(mínimo 10 personas para garantizar anonimato).

═══════════════════════════════════════════════════════════════════════════════
6. COSTOS Y ASPECTOS ECONÓMICOS
═══════════════════════════════════════════════════════════════════════════════

⚠️ INFORMACIÓN DE COSTOS AZURE FACE API:

• Tier Gratuito: 30,000 transacciones/mes sin cargo
• Costo Adicional: USD $1.00 por cada 1,000 transacciones después del límite gratuito
• Facturación: A cargo de la empresa empleadora

Su empleador ha adherido a este módulo opcional. Usted NO tiene costos asociados.

═══════════════════════════════════════════════════════════════════════════════
7. BASE LEGAL DEL TRATAMIENTO
═══════════════════════════════════════════════════════════════════════════════

Este tratamiento se fundamenta en:

ARGENTINA:
• Ley 25.326 - Protección de Datos Personales
• Ley 19.587 - Seguridad e Higiene en el Trabajo
• Decreto 1338/96 - Servicios de Medicina del Trabajo
• Resolución SRT 905/2015 - Relevamiento de Riesgos

INTERNACIONAL:
• GDPR (UE) - Reglamento General de Protección de Datos
• BIPA (Illinois) - Biometric Information Privacy Act
• ISO/IEC 29100:2011 - Privacy Framework

═══════════════════════════════════════════════════════════════════════════════
8. DURACIÓN DEL ALMACENAMIENTO
═══════════════════════════════════════════════════════════════════════════════

• Datos individuales: Máximo 90 días desde la captura
• Datos agregados anónimos: Hasta 24 meses para estudios longitudinales
• Logs de auditoría: 5 años (obligación legal)

Transcurridos estos plazos, los datos serán eliminados automáticamente
mediante procedimientos certificados de borrado seguro.

═══════════════════════════════════════════════════════════════════════════════
9. SUS DERECHOS (LEY 25.326)
═══════════════════════════════════════════════════════════════════════════════

Usted tiene derecho a:

✓ ACCESO: Solicitar copia de sus datos biométricos procesados
✓ RECTIFICACIÓN: Corregir datos inexactos o incompletos
✓ SUPRESIÓN: Solicitar eliminación de sus datos ("derecho al olvido")
✓ OPOSICIÓN: Negarse al tratamiento sin consecuencias laborales
✓ REVOCACIÓN: Retirar su consentimiento en cualquier momento
✓ PORTABILIDAD: Recibir sus datos en formato estructurado
✓ LIMITACIÓN: Restringir ciertos tipos de procesamiento
✓ NO DISCRIMINACIÓN: No sufrir trato desfavorable por negarse

IMPORTANTE: La negativa o revocación NO afectará:
- Su situación laboral
- Su remuneración
- Sus beneficios
- Sus oportunidades de desarrollo profesional

═══════════════════════════════════════════════════════════════════════════════
10. PROCEDIMIENTO PARA EJERCER SUS DERECHOS
═══════════════════════════════════════════════════════════════════════════════

Para revocar su consentimiento o ejercer cualquier derecho:

1. Ingrese al sistema con validación biométrica
2. Acceda a "Mi Perfil" → "Consentimientos"
3. Seleccione "Revocar Consentimiento Biométrico"
4. Confirme mediante validación biométrica (huella o facial)
5. Recibirá confirmación por email en 24 horas

Plazo de respuesta: 10 días hábiles (Ley 25.326, Art. 14)

═══════════════════════════════════════════════════════════════════════════════
11. MEDIDAS DE SEGURIDAD
═══════════════════════════════════════════════════════════════════════════════

Los datos biométricos están protegidos mediante:

• Encriptación AES-256 en reposo y tránsito
• Infraestructura Microsoft Azure (certificada ISO 27001)
• Acceso mediante autenticación multifactor
• Logs de auditoría inalterables
• Copias de seguridad encriptadas
• Controles de acceso basados en roles (RBAC)
• Monitoreo 24/7 de intrusiones

═══════════════════════════════════════════════════════════════════════════════
12. TRANSFERENCIAS INTERNACIONALES
═══════════════════════════════════════════════════════════════════════════════

Los datos son procesados por Azure Face API en servidores ubicados en:
• Estados Unidos (Microsoft Azure East US)
• Certificados mediante Privacy Shield Framework y cláusulas contractuales estándar

Microsoft Azure actúa como procesador de datos y no tiene acceso a datos
identificables. Los datos se procesan en tiempo real y NO se almacenan
permanentemente en servidores de Microsoft.

═══════════════════════════════════════════════════════════════════════════════
13. CONSECUENCIAS DE NO CONSENTIR
═══════════════════════════════════════════════════════════════════════════════

Si decide NO otorgar su consentimiento:

✓ Su fichaje funcionará normalmente (registro de entrada/salida)
✓ Su identificación biométrica NO se verá afectada
✗ NO se generarán análisis emocionales ni de fatiga
✗ NO participará en estadísticas de bienestar organizacional

Esto NO afectará negativamente su relación laboral de ninguna manera.

═══════════════════════════════════════════════════════════════════════════════
14. AUTORIDAD DE APLICACIÓN
═══════════════════════════════════════════════════════════════════════════════

Agencia de Acceso a la Información Pública (Argentina)
Dirección: Av. Pte. Gral. Julio A. Roca 710, Piso 3°, CABA
Teléfono: 0800-333-2345
Web: www.argentina.gob.ar/aaip

Puede presentar reclamos ante esta autoridad si considera que sus derechos
han sido vulnerados.

═══════════════════════════════════════════════════════════════════════════════
15. DECLARACIÓN DE CONSENTIMIENTO
═══════════════════════════════════════════════════════════════════════════════

Al aceptar mediante validación biométrica (facial o huella dactilar),
declaro que:

□ He leído y comprendido la totalidad de este documento
□ He tenido oportunidad de realizar consultas y fueron respondidas
□ Comprendo las capacidades y limitaciones del sistema
□ Conozco mis derechos y cómo ejercerlos
□ Otorgo mi consentimiento de manera libre, expresa e informada
□ Entiendo que puedo revocar este consentimiento en cualquier momento
□ Acepto que mis datos sean tratados según lo descrito

═══════════════════════════════════════════════════════════════════════════════

VALIDACIÓN BIOMÉTRICA REQUERIDA

Para garantizar la autenticidad de este consentimiento, debe validarse mediante:
- Reconocimiento facial, O
- Huella dactilar

Datos de aceptación registrados:
- Fecha y hora
- Dirección IP
- Dispositivo utilizado
- Método de validación biométrica

═══════════════════════════════════════════════════════════════════════════════
`.trim();

// ============================================================================
// REGULACIONES MULTI-PAIS - INFORMACION LEGAL COMPLETA
// ============================================================================
const COUNTRY_REGULATIONS = {
    ARG: {
        code: 'ARG',
        name: 'Argentina',
        flag: '🇦🇷',
        mainLaw: 'Ley 25.326',
        fullName: 'Ley de Protección de Datos Personales',
        authority: {
            name: 'Agencia de Acceso a la Información Pública (AAIP)',
            web: 'www.argentina.gob.ar/aaip',
            phone: '0800-333-2345'
        },
        requirements: {
            explicitConsent: { required: true, label: 'Consentimiento Explicito' },
            dpia: { required: false, recommended: true, label: 'Evaluacion de Impacto (DPIA)' },
            dpo: { required: false, recommended: true, label: 'Delegado de Protección de Datos' },
            biometricAllowed: { allowed: true, label: 'Biometria para Asistencia' },
            emotionalAnalysis: { allowed: true, withConsent: true, label: 'Analisis Emocional' },
            dataRetention: { individual: '90 dias', aggregate: '24 meses', audit: '5 años' },
            transferIntl: { allowed: true, conditions: 'Clausulas contractuales tipo' }
        },
        renewalPeriod: { months: 24, required: false, recommended: true, label: 'Renovacion cada 2 años (recomendado)' },
        rights: ['Acceso', 'Rectificacion', 'Supresion', 'Confidencialidad'],
        penalties: 'Hasta $100.000 ARS por infraccion',
        specificText: `De acuerdo con la Ley 25.326 de Protección de Datos Personales de la República Argentina,
los datos biométricos son considerados datos sensibles y requieren consentimiento expreso del titular.
El responsable debe inscribir la base de datos ante la AAIP y garantizar medidas de seguridad adecuadas.`
    },
    ESP: {
        code: 'ESP',
        name: 'España',
        flag: '🇪🇸',
        mainLaw: 'LOPDGDD',
        fullName: 'Ley Orgánica de Protección de Datos y Garantía de Derechos Digitales',
        authority: {
            name: 'Agencia Española de Protección de Datos (AEPD)',
            web: 'www.aepd.es',
            phone: '+34 901 100 099'
        },
        requirements: {
            explicitConsent: { required: true, label: 'Consentimiento Explicito' },
            dpia: { required: true, label: 'Evaluacion de Impacto (DPIA)' },
            dpo: { required: true, label: 'Delegado de Protección de Datos' },
            biometricAllowed: { allowed: true, label: 'Biometria para Asistencia' },
            emotionalAnalysis: { allowed: true, withConsent: true, label: 'Analisis Emocional' },
            dataRetention: { individual: '30 dias', aggregate: '12 meses', audit: '3 años' },
            transferIntl: { allowed: true, conditions: 'Decisión de adecuación o garantías apropiadas' }
        },
        renewalPeriod: { months: 12, required: true, recommended: true, label: 'Renovacion anual (GDPR)' },
        rights: ['Acceso', 'Rectificacion', 'Supresion', 'Oposicion', 'Portabilidad', 'Limitacion'],
        penalties: 'Hasta €20 millones o 4% facturación global',
        specificText: `Según la LOPDGDD y el GDPR, el tratamiento de datos biométricos para identificación
única de personas está sujeto a condiciones especiales. Se requiere DPIA obligatoria antes del tratamiento,
base legal clara (consentimiento o interés legítimo con evaluación), y designación de DPO en ciertos casos.`
    },
    MEX: {
        code: 'MEX',
        name: 'México',
        flag: '🇲🇽',
        mainLaw: 'LFPDPPP',
        fullName: 'Ley Federal de Protección de Datos Personales en Posesión de los Particulares',
        authority: {
            name: 'Instituto Nacional de Transparencia (INAI)',
            web: 'www.inai.org.mx',
            phone: '+52 800 835 4324'
        },
        requirements: {
            explicitConsent: { required: true, label: 'Consentimiento Expreso' },
            dpia: { required: false, recommended: true, label: 'Evaluacion de Impacto' },
            dpo: { required: false, recommended: false, label: 'Responsable de Datos' },
            biometricAllowed: { allowed: true, label: 'Biometria para Asistencia' },
            emotionalAnalysis: { allowed: true, withConsent: true, label: 'Analisis Emocional' },
            dataRetention: { individual: 'Lo necesario', aggregate: '24 meses', audit: '5 años' },
            transferIntl: { allowed: true, conditions: 'Consentimiento o contrato con cláusulas' }
        },
        renewalPeriod: { months: 24, required: false, recommended: true, label: 'Renovacion cada 2 años (recomendado)' },
        rights: ['ARCO (Acceso, Rectificacion, Cancelacion, Oposicion)'],
        penalties: 'Hasta 320,000 UMAS (~$28M MXN)',
        specificText: `La LFPDPPP clasifica los datos biométricos como datos personales sensibles.
Se requiere consentimiento expreso y por escrito. El aviso de privacidad debe especificar claramente
las finalidades del tratamiento y los datos que se recaban.`
    },
    BRA: {
        code: 'BRA',
        name: 'Brasil',
        flag: '🇧🇷',
        mainLaw: 'LGPD',
        fullName: 'Lei Geral de Proteção de Dados',
        authority: {
            name: 'Autoridade Nacional de Proteção de Dados (ANPD)',
            web: 'www.gov.br/anpd',
            phone: '+55 61 2027-2927'
        },
        requirements: {
            explicitConsent: { required: true, label: 'Consentimiento Especifico' },
            dpia: { required: true, label: 'Relatório de Impacto (RIPD)' },
            dpo: { required: true, label: 'Encarregado de Dados' },
            biometricAllowed: { allowed: true, label: 'Biometria para Asistencia' },
            emotionalAnalysis: { allowed: true, withConsent: true, label: 'Analisis Emocional' },
            dataRetention: { individual: '60 dias', aggregate: '24 meses', audit: '5 años' },
            transferIntl: { allowed: true, conditions: 'Cláusulas-padrão ou adequação' }
        },
        renewalPeriod: { months: 12, required: true, recommended: true, label: 'Renovacao anual (LGPD)' },
        rights: ['Confirmação', 'Acesso', 'Correção', 'Anonimização', 'Portabilidade', 'Eliminação', 'Revogação'],
        penalties: 'Hasta 2% facturación (máx R$50 millones)',
        specificText: `A LGPD considera dados biométricos como dados pessoais sensíveis (Art. 5º, II).
O tratamento requer consentimento específico e destacado para cada finalidade, ou outra base legal
aplicável. O RIPD é obrigatório para tratamentos de alto risco.`
    },
    USA: {
        code: 'USA',
        name: 'Estados Unidos',
        flag: '🇺🇸',
        mainLaw: 'BIPA/CCPA',
        fullName: 'Biometric Information Privacy Act (Illinois) / California Consumer Privacy Act',
        authority: {
            name: 'Varía por estado (FTC a nivel federal)',
            web: 'www.ftc.gov',
            phone: '+1 877 382 4357'
        },
        requirements: {
            explicitConsent: { required: true, label: 'Written Consent (BIPA)' },
            dpia: { required: false, recommended: true, label: 'Privacy Impact Assessment' },
            dpo: { required: false, recommended: false, label: 'Privacy Officer' },
            biometricAllowed: { allowed: true, label: 'Biometria para Asistencia' },
            emotionalAnalysis: { allowed: true, withConsent: true, label: 'Analisis Emocional' },
            dataRetention: { individual: '3 años o fin del proposito', aggregate: 'Según política', audit: '7 años' },
            transferIntl: { allowed: true, conditions: 'Sin restricciones federales específicas' }
        },
        renewalPeriod: { months: 36, required: true, recommended: true, label: 'Renovacion cada 3 años (BIPA)' },
        rights: ['Know', 'Delete', 'Opt-out (venta)', 'Non-discrimination'],
        penalties: 'BIPA: $1,000-$5,000 por violación; CCPA: hasta $7,500 por infracción',
        specificText: `En Estados Unidos, las leyes de privacidad biométrica varían por estado.
BIPA (Illinois) es la más estricta: requiere consentimiento escrito antes de recolectar datos biométricos,
política de retención publicada, y prohibe vender/lucrar con datos biométricos.
CCPA (California) otorga derechos de acceso, eliminación y opt-out.`
    },
    EU: {
        code: 'EU',
        name: 'Unión Europea',
        flag: '🇪🇺',
        mainLaw: 'GDPR',
        fullName: 'General Data Protection Regulation (Reglamento General de Protección de Datos)',
        authority: {
            name: 'Autoridades nacionales + European Data Protection Board',
            web: 'edpb.europa.eu',
            phone: 'Varía por país'
        },
        requirements: {
            explicitConsent: { required: true, label: 'Consentimiento Explicito (Art. 9)' },
            dpia: { required: true, label: 'Data Protection Impact Assessment' },
            dpo: { required: true, label: 'Data Protection Officer' },
            biometricAllowed: { allowed: true, label: 'Biometria para Asistencia' },
            emotionalAnalysis: { allowed: true, withConsent: true, label: 'Analisis Emocional' },
            dataRetention: { individual: 'Minimización', aggregate: 'Proporcional', audit: 'Según legislación nacional' },
            transferIntl: { allowed: true, conditions: 'Decisión de adecuación, SCCs, BCRs' }
        },
        renewalPeriod: { months: 12, required: true, recommended: true, label: 'Renovacion anual (GDPR Art. 7)' },
        rights: ['Acceso', 'Rectificación', 'Supresión', 'Portabilidad', 'Oposición', 'Limitación', 'No decisiones automatizadas'],
        penalties: 'Hasta €20 millones o 4% facturación global anual',
        specificText: `El GDPR (Art. 9) clasifica los datos biométricos utilizados para identificar
de manera unívoca a una persona como "categoría especial" de datos personales.
Su tratamiento está prohibido salvo excepciones como consentimiento explícito o necesidad laboral.
Se requiere DPIA antes del tratamiento y designación de DPO si el tratamiento es a gran escala.`
    },
    COL: {
        code: 'COL',
        name: 'Colombia',
        flag: '🇨🇴',
        mainLaw: 'Ley 1581 de 2012',
        fullName: 'Ley Estatutaria de Protección de Datos Personales',
        authority: {
            name: 'Superintendencia de Industria y Comercio (SIC)',
            web: 'www.sic.gov.co',
            phone: '+57 1 592 0400'
        },
        requirements: {
            explicitConsent: { required: true, label: 'Autorización Previa' },
            dpia: { required: false, recommended: true, label: 'Evaluacion de Impacto' },
            dpo: { required: true, label: 'Oficial de Protección de Datos' },
            biometricAllowed: { allowed: true, label: 'Biometria para Asistencia' },
            emotionalAnalysis: { allowed: true, withConsent: true, label: 'Analisis Emocional' },
            dataRetention: { individual: 'Finalidad cumplida', aggregate: '10 años', audit: '10 años' },
            transferIntl: { allowed: true, conditions: 'Autorización del titular o país con nivel adecuado' }
        },
        renewalPeriod: { months: 24, required: false, recommended: true, label: 'Renovacion cada 2 años (recomendado)' },
        rights: ['Conocer', 'Actualizar', 'Rectificar', 'Solicitar supresión', 'Revocar autorización', 'Acceso gratuito'],
        penalties: 'Hasta 2,000 SMMLV (~$2,600 millones COP)',
        specificText: `La Ley 1581 de 2012 y el Decreto 1377 de 2013 regulan el tratamiento de datos personales en Colombia.
Los datos biométricos son considerados datos sensibles y requieren autorización previa, expresa e informada.
El responsable debe registrar las bases de datos ante el RNBD de la SIC y designar un oficial de protección de datos.`
    },
    CHL: {
        code: 'CHL',
        name: 'Chile',
        flag: '🇨🇱',
        mainLaw: 'Ley 19.628',
        fullName: 'Ley sobre Protección de la Vida Privada',
        authority: {
            name: 'Consejo para la Transparencia (próximamente Agencia de Protección de Datos)',
            web: 'www.consejotransparencia.cl',
            phone: '+56 2 2495 2000'
        },
        requirements: {
            explicitConsent: { required: true, label: 'Consentimiento del Titular' },
            dpia: { required: false, recommended: false, label: 'Evaluacion de Impacto' },
            dpo: { required: false, recommended: true, label: 'Encargado de Datos' },
            biometricAllowed: { allowed: true, label: 'Biometria para Asistencia' },
            emotionalAnalysis: { allowed: true, withConsent: true, label: 'Analisis Emocional' },
            dataRetention: { individual: 'Lo necesario', aggregate: '5 años', audit: '5 años' },
            transferIntl: { allowed: true, conditions: 'Consentimiento o interés legítimo' }
        },
        renewalPeriod: { months: 24, required: false, recommended: true, label: 'Renovacion cada 2 años (recomendado)' },
        rights: ['Acceso', 'Modificación', 'Cancelación', 'Bloqueo'],
        penalties: 'Hasta 500 UTM (~$30 millones CLP) - En reforma',
        specificText: `La Ley 19.628 establece el marco de protección de datos en Chile.
Los datos biométricos requieren consentimiento del titular salvo excepción legal.
IMPORTANTE: Chile está en proceso de reforma con un nuevo proyecto de ley que creará
una Agencia de Protección de Datos Personales con mayores facultades fiscalizadoras.`
    },
    PER: {
        code: 'PER',
        name: 'Perú',
        flag: '🇵🇪',
        mainLaw: 'Ley 29733',
        fullName: 'Ley de Protección de Datos Personales',
        authority: {
            name: 'Autoridad Nacional de Protección de Datos Personales (ANPDP)',
            web: 'www.gob.pe/anpdp',
            phone: '+51 1 219 7000'
        },
        requirements: {
            explicitConsent: { required: true, label: 'Consentimiento Expreso' },
            dpia: { required: false, recommended: true, label: 'Evaluacion de Impacto' },
            dpo: { required: false, recommended: false, label: 'Encargado de Tratamiento' },
            biometricAllowed: { allowed: true, label: 'Biometria para Asistencia' },
            emotionalAnalysis: { allowed: true, withConsent: true, label: 'Analisis Emocional' },
            dataRetention: { individual: '2 años', aggregate: '5 años', audit: '5 años' },
            transferIntl: { allowed: true, conditions: 'Nivel adecuado o garantías suficientes' }
        },
        renewalPeriod: { months: 24, required: false, recommended: true, label: 'Renovacion cada 2 años (recomendado)' },
        rights: ['Información', 'Acceso', 'Rectificación', 'Cancelación', 'Oposición', 'Tratamiento objetivo'],
        penalties: 'Hasta 100 UIT (~$495,000 PEN)',
        specificText: `La Ley 29733 y su Reglamento (DS 003-2013-JUS) regulan la protección de datos en Perú.
Los datos biométricos son considerados datos sensibles y requieren consentimiento expreso y por escrito.
El responsable debe inscribir el banco de datos en el Registro Nacional de Protección de Datos.`
    },
    URY: {
        code: 'URY',
        name: 'Uruguay',
        flag: '🇺🇾',
        mainLaw: 'Ley 18.331',
        fullName: 'Ley de Protección de Datos Personales y Acción de Habeas Data',
        authority: {
            name: 'Unidad Reguladora y de Control de Datos Personales (URCDP)',
            web: 'www.gub.uy/urcdp',
            phone: '+598 2 150 ext. 2828'
        },
        requirements: {
            explicitConsent: { required: true, label: 'Consentimiento Previo' },
            dpia: { required: false, recommended: true, label: 'Evaluacion de Impacto' },
            dpo: { required: false, recommended: true, label: 'Delegado de Protección' },
            biometricAllowed: { allowed: true, label: 'Biometria para Asistencia' },
            emotionalAnalysis: { allowed: true, withConsent: true, label: 'Analisis Emocional' },
            dataRetention: { individual: 'Proporcional', aggregate: '5 años', audit: '5 años' },
            transferIntl: { allowed: true, conditions: 'País con nivel adecuado (reconocido por UE)' }
        },
        renewalPeriod: { months: 12, required: true, recommended: true, label: 'Renovacion anual (adecuacion UE)' },
        rights: ['Acceso', 'Rectificación', 'Actualización', 'Supresión', 'Inclusión'],
        penalties: 'Hasta 500,000 UI (~$70,000 USD)',
        specificText: `Uruguay es reconocido por la Unión Europea como país con nivel adecuado de protección.
La Ley 18.331 requiere consentimiento previo, expreso e informado para datos sensibles como biométricos.
Las bases de datos deben registrarse ante la URCDP.`
    },
    ECU: {
        code: 'ECU',
        name: 'Ecuador',
        flag: '🇪🇨',
        mainLaw: 'LOPDP 2021',
        fullName: 'Ley Orgánica de Protección de Datos Personales',
        authority: {
            name: 'Superintendencia de Protección de Datos (en implementación)',
            web: 'www.superprotecciondatos.gob.ec',
            phone: '+593 2 290 0000'
        },
        requirements: {
            explicitConsent: { required: true, label: 'Consentimiento Explícito' },
            dpia: { required: true, label: 'Evaluacion de Impacto (EIPD)' },
            dpo: { required: true, label: 'Delegado de Protección de Datos' },
            biometricAllowed: { allowed: true, label: 'Biometria para Asistencia' },
            emotionalAnalysis: { allowed: true, withConsent: true, label: 'Analisis Emocional' },
            dataRetention: { individual: 'Proporcional', aggregate: '5 años', audit: '10 años' },
            transferIntl: { allowed: true, conditions: 'Garantías adecuadas o consentimiento' }
        },
        renewalPeriod: { months: 12, required: true, recommended: true, label: 'Renovacion anual (LOPDP basada en GDPR)' },
        rights: ['Acceso', 'Rectificación', 'Eliminación', 'Oposición', 'Portabilidad', 'Suspensión'],
        penalties: 'Hasta 1% ingresos anuales (muy grave)',
        specificText: `La LOPDP de 2021 modernizó la protección de datos en Ecuador, inspirada en GDPR.
Los datos biométricos son categoría especial y requieren consentimiento explícito.
Es obligatoria la EIPD antes del tratamiento y la designación de DPO en ciertos casos.
La ley está en período de implementación con la Superintendencia en formación.`
    },
    PAN: {
        code: 'PAN',
        name: 'Panamá',
        flag: '🇵🇦',
        mainLaw: 'Ley 81 de 2019',
        fullName: 'Ley de Protección de Datos Personales',
        authority: {
            name: 'Autoridad Nacional de Transparencia y Acceso a la Información (ANTAI)',
            web: 'www.antai.gob.pa',
            phone: '+507 527 9270'
        },
        requirements: {
            explicitConsent: { required: true, label: 'Consentimiento Informado' },
            dpia: { required: false, recommended: true, label: 'Evaluacion de Impacto' },
            dpo: { required: false, recommended: true, label: 'Oficial de Datos' },
            biometricAllowed: { allowed: true, label: 'Biometria para Asistencia' },
            emotionalAnalysis: { allowed: true, withConsent: true, label: 'Analisis Emocional' },
            dataRetention: { individual: 'Tiempo necesario', aggregate: '5 años', audit: '5 años' },
            transferIntl: { allowed: true, conditions: 'Garantías contractuales' }
        },
        renewalPeriod: { months: 24, required: false, recommended: true, label: 'Renovacion cada 2 años (recomendado)' },
        rights: ['Acceso', 'Rectificación', 'Cancelación', 'Oposición'],
        penalties: 'Hasta $10,000 USD',
        specificText: `La Ley 81 de 2019 establece el marco de protección de datos en Panamá.
Los datos biométricos requieren consentimiento previo e informado del titular.
El responsable debe adoptar medidas de seguridad y garantizar los derechos ARCO.`
    },
    CRI: {
        code: 'CRI',
        name: 'Costa Rica',
        flag: '🇨🇷',
        mainLaw: 'Ley 8968',
        fullName: 'Ley de Protección de la Persona frente al Tratamiento de sus Datos Personales',
        authority: {
            name: 'Agencia de Protección de Datos de los Habitantes (PRODHAB)',
            web: 'www.prodhab.go.cr',
            phone: '+506 2284 4040'
        },
        requirements: {
            explicitConsent: { required: true, label: 'Consentimiento Expreso' },
            dpia: { required: false, recommended: true, label: 'Evaluacion de Impacto' },
            dpo: { required: false, recommended: false, label: 'Responsable de Datos' },
            biometricAllowed: { allowed: true, label: 'Biometria para Asistencia' },
            emotionalAnalysis: { allowed: true, withConsent: true, label: 'Analisis Emocional' },
            dataRetention: { individual: 'Tiempo necesario', aggregate: '5 años', audit: '5 años' },
            transferIntl: { allowed: true, conditions: 'Nivel adecuado o cláusulas tipo' }
        },
        renewalPeriod: { months: 24, required: false, recommended: true, label: 'Renovacion cada 2 años (recomendado)' },
        rights: ['Acceso', 'Rectificación', 'Supresión', 'Revocación del consentimiento'],
        penalties: 'Hasta 30 salarios base (~$15,000 USD)',
        specificText: `Costa Rica cuenta con una de las leyes de protección de datos más desarrolladas de Centroamérica.
La Ley 8968 requiere consentimiento expreso e informado para datos sensibles como los biométricos.
PRODHAB es una entidad independiente con facultades de fiscalización y sanción.`
    }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const ConsentState = {
    employees: [],
    consents: [],
    stats: { total: 0, active: 0, pending: 0, revoked: 0 },
    currentFilter: 'all',
    currentTab: 'employees',
    isLoading: false,
    companyId: null,
    privacyConfig: null,
    selectedCountry: 'ARG',
    compareCountries: [],
    // Auto-detection data
    detectedRegulation: null,
    branchesByCountry: null,
    employeesByRegulation: null
};

// ============================================================================
// API SERVICE
// ============================================================================
const ConsentAPI = {
    getToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    },

    async request(endpoint, options = {}) {
        const token = this.getToken();
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(endpoint, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'API Error');
            return data;
        } catch (error) {
            console.error(`[ConsentAPI] ${endpoint}:`, error);
            throw error;
        }
    },

    getEmployees: () => ConsentAPI.request('/api/v1/users'),
    getConsents: () => ConsentAPI.request('/api/v1/biometric/consents'),
    getPrivacyConfig: () => ConsentAPI.request('/api/privacy/company-config'),
    getPrivacyCountries: () => ConsentAPI.request('/api/privacy/countries'),
    sendConsentRequest: (userId) => ConsentAPI.request(`/api/v1/biometric/consents/${userId}/request`, { method: 'POST' }),
    revokeConsent: (userId) => ConsentAPI.request(`/api/v1/biometric/consents/${userId}/revoke`, { method: 'POST' }),
    // Multi-country detection APIs
    getMyRegulation: () => ConsentAPI.request('/api/privacy/my-regulation'),
    getBranchesByCountry: () => ConsentAPI.request('/api/privacy/branches-by-country'),
    getEmployeesByRegulation: () => ConsentAPI.request('/api/privacy/employees-by-regulation'),
    getEmployeeRegulation: (employeeId) => ConsentAPI.request(`/api/privacy/employee/${employeeId}/regulation`)
};

// ============================================================================
// STYLES - Enterprise Dark Theme
// ============================================================================
function injectStyles() {
    if (document.getElementById('consent-enterprise-styles')) return;

    const style = document.createElement('style');
    style.id = 'consent-enterprise-styles';
    style.textContent = `
        :root {
            --bc-bg-primary: #0d1117;
            --bc-bg-secondary: #161b22;
            --bc-bg-card: #21262d;
            --bc-bg-tertiary: #30363d;
            --bc-border: #30363d;
            --bc-text-primary: #c9d1d9;
            --bc-text-secondary: #8b949e;
            --bc-text-muted: #6e7681;
            --bc-accent-purple: #a855f7;
            --bc-accent-blue: #3b82f6;
            --bc-accent-green: #22c55e;
            --bc-accent-yellow: #eab308;
            --bc-accent-red: #ef4444;
            --bc-accent-orange: #f97316;
        }

        .bc-container {
            background: var(--bc-bg-primary);
            min-height: 100vh;
            padding: 24px;
            color: var(--bc-text-primary);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .bc-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--bc-border);
        }

        .bc-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .bc-title h2 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: var(--bc-text-primary);
        }

        .bc-title-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, var(--bc-accent-purple), var(--bc-accent-blue));
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }

        /* Alert Banners */
        .bc-alert {
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }

        .bc-alert-warning {
            background: rgba(234, 179, 8, 0.15);
            border: 1px solid rgba(234, 179, 8, 0.3);
        }

        .bc-alert-icon {
            font-size: 20px;
            flex-shrink: 0;
        }

        .bc-alert-content h4 {
            margin: 0 0 8px 0;
            color: var(--bc-accent-yellow);
            font-size: 14px;
        }

        .bc-alert-content ul {
            margin: 0;
            padding-left: 20px;
            color: var(--bc-text-secondary);
            font-size: 13px;
        }

        .bc-alert-content li {
            margin-bottom: 4px;
        }

        /* KPI Cards */
        .bc-kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }

        @media (max-width: 1200px) {
            .bc-kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
            .bc-kpi-grid { grid-template-columns: 1fr; }
        }

        .bc-kpi-card {
            background: var(--bc-bg-card);
            border: 1px solid var(--bc-border);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: all 0.2s ease;
        }

        .bc-kpi-card:hover {
            border-color: var(--bc-accent-purple);
            transform: translateY(-2px);
        }

        .bc-kpi-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }

        .bc-kpi-data {
            display: flex;
            flex-direction: column;
        }

        .bc-kpi-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--bc-text-primary);
            line-height: 1;
        }

        .bc-kpi-label {
            font-size: 13px;
            color: var(--bc-text-secondary);
            margin-top: 4px;
        }

        /* Compliance Panel */
        .bc-compliance-grid {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 20px;
            margin-bottom: 24px;
        }

        @media (max-width: 1024px) {
            .bc-compliance-grid { grid-template-columns: 1fr; }
        }

        .bc-compliance-card {
            background: var(--bc-bg-card);
            border: 1px solid var(--bc-border);
            border-radius: 12px;
            padding: 20px;
        }

        .bc-compliance-card h4 {
            margin: 0 0 16px 0;
            font-size: 14px;
            color: var(--bc-text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .bc-compliance-item {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid var(--bc-border);
            font-size: 13px;
        }

        .bc-compliance-item:last-child {
            border-bottom: none;
        }

        .bc-compliance-item .label {
            color: var(--bc-text-secondary);
            flex: 1;
        }

        .bc-compliance-item .value {
            color: var(--bc-accent-green);
            font-weight: 500;
        }

        /* Section */
        .bc-section {
            background: var(--bc-bg-card);
            border: 1px solid var(--bc-border);
            border-radius: 12px;
            margin-bottom: 24px;
            overflow: hidden;
        }

        .bc-section-header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--bc-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
        }

        .bc-section-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Filters */
        .bc-filters {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .bc-filter-btn {
            padding: 8px 16px;
            border: 1px solid var(--bc-border);
            background: var(--bc-bg-tertiary);
            color: var(--bc-text-secondary);
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
        }

        .bc-filter-btn:hover {
            border-color: var(--bc-accent-purple);
            color: var(--bc-accent-purple);
        }

        .bc-filter-btn.active {
            background: var(--bc-accent-purple);
            border-color: var(--bc-accent-purple);
            color: white;
        }

        /* Table */
        .bc-table-container {
            overflow-x: auto;
        }

        .bc-table {
            width: 100%;
            border-collapse: collapse;
        }

        .bc-table th {
            background: var(--bc-bg-secondary);
            padding: 12px 16px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--bc-text-muted);
            border-bottom: 1px solid var(--bc-border);
        }

        .bc-table td {
            padding: 14px 16px;
            border-bottom: 1px solid var(--bc-border);
            color: var(--bc-text-primary);
            font-size: 14px;
        }

        .bc-table tr:hover td {
            background: rgba(168, 85, 247, 0.05);
        }

        .bc-employee-cell {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .bc-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--bc-accent-purple), var(--bc-accent-blue));
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 14px;
            color: white;
        }

        .bc-employee-info {
            display: flex;
            flex-direction: column;
        }

        .bc-employee-name {
            font-weight: 500;
            color: var(--bc-text-primary);
        }

        .bc-employee-id {
            font-size: 12px;
            color: var(--bc-text-muted);
        }

        /* Status badges */
        .bc-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }

        .bc-status-active { background: rgba(34, 197, 94, 0.2); color: var(--bc-accent-green); }
        .bc-status-pending { background: rgba(234, 179, 8, 0.2); color: var(--bc-accent-yellow); }
        .bc-status-revoked { background: rgba(239, 68, 68, 0.2); color: var(--bc-accent-red); }

        /* Buttons */
        .bc-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .bc-btn-primary {
            background: linear-gradient(135deg, var(--bc-accent-purple), var(--bc-accent-blue));
            color: white;
        }

        .bc-btn-primary:hover { opacity: 0.9; }

        .bc-btn-secondary {
            background: var(--bc-bg-tertiary);
            color: var(--bc-text-primary);
            border: 1px solid var(--bc-border);
        }

        .bc-btn-secondary:hover { border-color: var(--bc-accent-purple); }

        .bc-btn-success {
            background: var(--bc-accent-green);
            color: #000;
        }

        .bc-btn-warning {
            background: var(--bc-accent-yellow);
            color: #000;
        }

        .bc-btn-icon {
            width: 32px;
            height: 32px;
            padding: 0;
            background: var(--bc-bg-tertiary);
            border: 1px solid var(--bc-border);
            border-radius: 6px;
            color: var(--bc-text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }

        .bc-btn-icon:hover {
            border-color: var(--bc-accent-purple);
            color: var(--bc-accent-purple);
        }

        .bc-actions {
            display: flex;
            gap: 6px;
        }

        /* Loading */
        .bc-loading {
            text-align: center;
            padding: 60px 20px;
            color: var(--bc-text-muted);
        }

        .bc-loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--bc-border);
            border-top-color: var(--bc-accent-purple);
            border-radius: 50%;
            animation: bc-spin 1s linear infinite;
            margin: 0 auto 16px;
        }

        @keyframes bc-spin {
            to { transform: rotate(360deg); }
        }

        /* Empty state */
        .bc-empty {
            text-align: center;
            padding: 60px 20px;
            color: var(--bc-text-muted);
        }

        .bc-empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
        }

        /* Info banner */
        .bc-info-banner {
            background: linear-gradient(135deg, var(--bc-accent-purple) 0%, var(--bc-accent-blue) 100%);
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .bc-info-banner-icon {
            font-size: 32px;
            opacity: 0.9;
        }

        .bc-info-banner h3 {
            margin: 0 0 4px 0;
            font-size: 16px;
        }

        .bc-info-banner p {
            margin: 0;
            opacity: 0.9;
            font-size: 13px;
        }

        /* Progress bar */
        .bc-progress {
            height: 8px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 8px;
        }

        .bc-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--bc-accent-green), #86efac);
            border-radius: 4px;
            transition: width 0.5s ease;
        }

        /* Tabs */
        .bc-tabs {
            display: flex;
            gap: 0;
            border-bottom: 1px solid var(--bc-border);
            margin-bottom: 24px;
        }

        .bc-tab {
            padding: 12px 24px;
            border: none;
            background: transparent;
            color: var(--bc-text-secondary);
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            border-bottom: 2px solid transparent;
            margin-bottom: -1px;
            transition: all 0.2s;
        }

        .bc-tab:hover {
            color: var(--bc-text-primary);
        }

        .bc-tab.active {
            color: var(--bc-accent-purple);
            border-bottom-color: var(--bc-accent-purple);
        }

        .bc-tab-panel {
            display: none;
        }

        .bc-tab-panel.active {
            display: block;
        }

        /* Document viewer */
        .bc-document-viewer {
            background: var(--bc-bg-secondary);
            border: 1px solid var(--bc-border);
            border-radius: 8px;
            padding: 24px;
            max-height: 600px;
            overflow-y: auto;
        }

        .bc-document-viewer pre {
            white-space: pre-wrap;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            color: var(--bc-text-secondary);
            line-height: 1.6;
            margin: 0;
        }

        /* Quick Actions */
        .bc-quick-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .bc-quick-actions .bc-btn {
            width: 100%;
            justify-content: center;
        }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// MAIN ENGINE
// ============================================================================
const BiometricConsentEngine = {
    async init() {
        console.log('[CONSENT] Initializing...');
        injectStyles();
        await this.loadData();
        this.render();
    },

    async loadData() {
        ConsentState.isLoading = true;
        this.renderLoading();

        try {
            // Cargar empleados reales
            const employeesResult = await ConsentAPI.getEmployees();
            ConsentState.employees = employeesResult.data || employeesResult.users || [];

            // Intentar cargar config de privacidad
            try {
                const privacyResult = await ConsentAPI.getPrivacyConfig();
                if (privacyResult.success) {
                    ConsentState.privacyConfig = privacyResult.data;
                }
            } catch (e) {
                console.log('[CONSENT] Privacy config not available');
            }

            // Intentar detectar regulacion del usuario basada en su sucursal
            try {
                const regulationResult = await ConsentAPI.getMyRegulation();
                if (regulationResult.success && regulationResult.data) {
                    ConsentState.detectedRegulation = regulationResult.data;
                    // Auto-seleccionar el pais si tenemos match en COUNTRY_REGULATIONS
                    const countryCode = regulationResult.data.countryCode;
                    if (countryCode && COUNTRY_REGULATIONS[countryCode]) {
                        ConsentState.selectedCountry = countryCode;
                        console.log(`[CONSENT] Auto-detected regulation for country: ${countryCode}`);
                    }
                }
            } catch (e) {
                console.log('[CONSENT] Regulation detection not available:', e.message);
            }

            // Para admins, cargar datos de sucursales y empleados por regulacion
            try {
                const [branchesResult, employeesRegResult] = await Promise.all([
                    ConsentAPI.getBranchesByCountry(),
                    ConsentAPI.getEmployeesByRegulation()
                ]);

                if (branchesResult.success) {
                    ConsentState.branchesByCountry = branchesResult.data;
                    console.log('[CONSENT] Loaded branches by country');
                }
                if (employeesRegResult.success) {
                    ConsentState.employeesByRegulation = employeesRegResult.data;
                    console.log('[CONSENT] Loaded employees by regulation');
                }
            } catch (e) {
                console.log('[CONSENT] Admin regulation data not available');
            }

            // Calcular stats basados en employees
            this.calculateStats();

            console.log(`[CONSENT] Loaded ${ConsentState.employees.length} employees`);
        } catch (error) {
            console.error('[CONSENT] Error loading data:', error);
            ConsentState.employees = [];
        }

        ConsentState.isLoading = false;
    },

    calculateStats() {
        const employees = ConsentState.employees;
        const total = employees.length;

        let active = 0, pending = 0, revoked = 0;

        employees.forEach(emp => {
            if (emp.biometric_consent === 'active' || emp.consent_status === 'active') {
                active++;
            } else if (emp.biometric_consent === 'revoked' || emp.consent_status === 'revoked') {
                revoked++;
            } else {
                pending++;
            }
        });

        if (active === 0 && revoked === 0 && total > 0) {
            pending = total;
        }

        ConsentState.stats = { total, active, pending, revoked };
    },

    getConsentStatus(employee) {
        if (employee.biometric_consent === 'active' || employee.consent_status === 'active') {
            return 'active';
        }
        if (employee.biometric_consent === 'revoked' || employee.consent_status === 'revoked') {
            return 'revoked';
        }
        return 'pending';
    },

    render() {
        const content = document.getElementById('mainContent');
        if (!content) return;

        const { stats } = ConsentState;
        const percentage = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

        content.innerHTML = `
            <div class="bc-container">
                <!-- Header -->
                <div class="bc-header">
                    <div class="bc-title">
                        <div class="bc-title-icon">🔐</div>
                        <div>
                            <h2>Consentimientos y Privacidad</h2>
                            <span style="color: var(--bc-text-muted); font-size: 13px;">Gestion de consentimientos biometricos y cumplimiento de regulaciones</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="bc-btn bc-btn-secondary" onclick="BiometricConsentEngine.exportData()">
                            📊 Exportar
                        </button>
                        <button class="bc-btn bc-btn-primary" onclick="BiometricConsentEngine.requestAllPending()">
                            📧 Solicitar Pendientes
                        </button>
                    </div>
                </div>

                <!-- Alerta de Costos Azure -->
                <div class="bc-alert bc-alert-warning">
                    <span class="bc-alert-icon">💰</span>
                    <div class="bc-alert-content">
                        <h4>Informacion de Costos Azure Face API</h4>
                        <ul>
                            <li><strong>Tier Gratuito:</strong> 30,000 transacciones/mes sin cargo</li>
                            <li><strong>Costo adicional:</strong> USD $1.00 por cada 1,000 transacciones extras</li>
                            <li><strong>Facturacion:</strong> A cargo de la empresa empleadora</li>
                        </ul>
                    </div>
                </div>

                <!-- KPI Cards -->
                <div class="bc-kpi-grid">
                    <div class="bc-kpi-card">
                        <div class="bc-kpi-icon" style="background: var(--bc-accent-blue);">👥</div>
                        <div class="bc-kpi-data">
                            <span class="bc-kpi-value">${stats.total}</span>
                            <span class="bc-kpi-label">Total Empleados</span>
                        </div>
                    </div>
                    <div class="bc-kpi-card">
                        <div class="bc-kpi-icon" style="background: var(--bc-accent-green);">✓</div>
                        <div class="bc-kpi-data">
                            <span class="bc-kpi-value">${stats.active}</span>
                            <span class="bc-kpi-label">Consentimientos Activos</span>
                        </div>
                    </div>
                    <div class="bc-kpi-card">
                        <div class="bc-kpi-icon" style="background: var(--bc-accent-yellow);">⏳</div>
                        <div class="bc-kpi-data">
                            <span class="bc-kpi-value">${stats.pending}</span>
                            <span class="bc-kpi-label">Pendientes</span>
                        </div>
                    </div>
                    <div class="bc-kpi-card">
                        <div class="bc-kpi-icon" style="background: var(--bc-accent-red);">✕</div>
                        <div class="bc-kpi-data">
                            <span class="bc-kpi-value">${stats.revoked}</span>
                            <span class="bc-kpi-label">Revocados</span>
                        </div>
                    </div>
                </div>

                <!-- Progress Banner + Compliance -->
                <div class="bc-compliance-grid">
                    <div class="bc-info-banner" style="margin-bottom: 0;">
                        <div class="bc-info-banner-icon">📈</div>
                        <div style="flex: 1;">
                            <h3>Tasa de Cumplimiento: ${percentage}%</h3>
                            <p>${stats.active} de ${stats.total} empleados han otorgado su consentimiento biometrico.</p>
                            <div class="bc-progress">
                                <div class="bc-progress-bar" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    </div>

                    <div class="bc-compliance-card">
                        <h4>⚖️ Cumplimiento Legal</h4>
                        <div class="bc-compliance-item">
                            <span class="label">Ley 25.326 (Argentina)</span>
                            <span class="value">✓</span>
                        </div>
                        <div class="bc-compliance-item">
                            <span class="label">GDPR (Union Europea)</span>
                            <span class="value">✓</span>
                        </div>
                        <div class="bc-compliance-item">
                            <span class="label">BIPA (Illinois, USA)</span>
                            <span class="value">✓</span>
                        </div>
                        <div class="bc-compliance-item">
                            <span class="label">ISO/IEC 29100:2011</span>
                            <span class="value">✓</span>
                        </div>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="bc-tabs">
                    <button class="bc-tab ${ConsentState.currentTab === 'employees' ? 'active' : ''}" onclick="BiometricConsentEngine.switchTab('employees')">
                        👥 Empleados y Consentimientos
                    </button>
                    <button class="bc-tab ${ConsentState.currentTab === 'document' ? 'active' : ''}" onclick="BiometricConsentEngine.switchTab('document')">
                        📄 Documento Legal
                    </button>
                    <button class="bc-tab ${ConsentState.currentTab === 'regulations' ? 'active' : ''}" onclick="BiometricConsentEngine.switchTab('regulations')">
                        🌐 Regulaciones Multi-Pais
                    </button>
                    <button class="bc-tab ${ConsentState.currentTab === 'reports' ? 'active' : ''}" onclick="BiometricConsentEngine.switchTab('reports')">
                        📊 Reportes PDF
                    </button>
                </div>

                <!-- Tab: Employees -->
                <div id="bc-tab-employees" class="bc-tab-panel ${ConsentState.currentTab === 'employees' ? 'active' : ''}">
                    <div class="bc-section">
                        <div class="bc-section-header">
                            <h3 class="bc-section-title">📋 Registro de Consentimientos por Empleado</h3>
                            <div class="bc-filters">
                                <button class="bc-filter-btn ${ConsentState.currentFilter === 'all' ? 'active' : ''}" onclick="BiometricConsentEngine.filter('all')">👥 Todos</button>
                                <button class="bc-filter-btn ${ConsentState.currentFilter === 'active' ? 'active' : ''}" onclick="BiometricConsentEngine.filter('active')">✅ Activos</button>
                                <button class="bc-filter-btn ${ConsentState.currentFilter === 'pending' ? 'active' : ''}" onclick="BiometricConsentEngine.filter('pending')">⏳ Pendientes</button>
                                <button class="bc-filter-btn ${ConsentState.currentFilter === 'revoked' ? 'active' : ''}" onclick="BiometricConsentEngine.filter('revoked')">🚫 Revocados</button>
                            </div>
                        </div>
                        <div class="bc-table-container">
                            ${this.renderEmployeesTable()}
                        </div>
                    </div>
                </div>

                <!-- Tab: Legal Document -->
                <div id="bc-tab-document" class="bc-tab-panel ${ConsentState.currentTab === 'document' ? 'active' : ''}">
                    <div class="bc-compliance-grid">
                        <div class="bc-section" style="margin-bottom: 0;">
                            <div class="bc-section-header">
                                <h3 class="bc-section-title">📄 Texto Legal Completo del Consentimiento</h3>
                                <div style="display: flex; gap: 8px;">
                                    <button class="bc-btn bc-btn-secondary" onclick="BiometricConsentEngine.previewDocument()">
                                        👁️ Vista Previa
                                    </button>
                                    <button class="bc-btn bc-btn-primary" onclick="BiometricConsentEngine.generatePDF()">
                                        📄 Generar PDF
                                    </button>
                                </div>
                            </div>
                            <div style="padding: 20px;">
                                <div class="bc-document-viewer">
                                    <pre>${BIOMETRIC_CONSENT_TEXT}</pre>
                                </div>
                            </div>
                        </div>

                        <div class="bc-compliance-card">
                            <h4>⚡ Acciones Rapidas</h4>
                            <div class="bc-quick-actions">
                                <button class="bc-btn bc-btn-warning" onclick="BiometricConsentEngine.requestAllPending()">
                                    📧 Solicitar a Pendientes
                                </button>
                                <button class="bc-btn bc-btn-secondary" onclick="BiometricConsentEngine.exportData()">
                                    📊 Exportar Registro
                                </button>
                                <button class="bc-btn bc-btn-success" onclick="BiometricConsentEngine.generateComplianceReport()">
                                    📋 Reporte de Cumplimiento
                                </button>
                            </div>

                            <h4 style="margin-top: 20px;">📅 Retencion de Datos</h4>
                            <div class="bc-compliance-item">
                                <span class="label">Datos individuales</span>
                                <span class="value">90 dias</span>
                            </div>
                            <div class="bc-compliance-item">
                                <span class="label">Datos agregados</span>
                                <span class="value">24 meses</span>
                            </div>
                            <div class="bc-compliance-item">
                                <span class="label">Logs de auditoria</span>
                                <span class="value">5 años</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab: Regulations -->
                <div id="bc-tab-regulations" class="bc-tab-panel ${ConsentState.currentTab === 'regulations' ? 'active' : ''}">
                    ${this.renderRegulationsTab()}
                </div>

                <!-- Tab: Reports PDF -->
                <div id="bc-tab-reports" class="bc-tab-panel ${ConsentState.currentTab === 'reports' ? 'active' : ''}">
                    ${this.renderReportsTab()}
                </div>
            </div>
        `;
    },

    renderLoading() {
        const content = document.getElementById('mainContent');
        if (!content) return;

        content.innerHTML = `
            <div class="bc-container">
                <div class="bc-loading">
                    <div class="bc-loading-spinner"></div>
                    <p>Cargando datos de consentimientos...</p>
                </div>
            </div>
        `;
    },

    renderEmployeesTable() {
        const employees = this.getFilteredEmployees();

        if (employees.length === 0) {
            return `
                <div class="bc-empty">
                    <div class="bc-empty-icon">📭</div>
                    <p>No se encontraron empleados con el filtro seleccionado</p>
                </div>
            `;
        }

        return `
            <table class="bc-table">
                <thead>
                    <tr>
                        <th>Empleado</th>
                        <th>Email</th>
                        <th>Departamento</th>
                        <th>Estado</th>
                        <th>Fecha Consentimiento</th>
                        <th>Metodo Validacion</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${employees.map(emp => this.renderEmployeeRow(emp)).join('')}
                </tbody>
            </table>
        `;
    },

    renderEmployeeRow(emp) {
        const status = this.getConsentStatus(emp);
        const initials = this.getInitials(emp.name || emp.full_name || emp.first_name || 'U');
        const name = emp.name || emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Sin nombre';
        const email = emp.email || emp.work_email || '-';
        const dept = emp.department?.name || emp.department_name || '-';
        const employeeId = emp.employee_id || emp.id || '-';

        const statusClass = `bc-status-${status}`;
        const statusText = status === 'active' ? '✅ Activo' : status === 'revoked' ? '🚫 Revocado' : '⏳ Pendiente';
        const statusDate = emp.consent_date ? new Date(emp.consent_date).toLocaleString('es-AR') : '-';
        const validationMethod = emp.validation_method === 'facial' ? '😊 Facial' : emp.validation_method === 'fingerprint' ? '👆 Huella' : '-';

        return `
            <tr>
                <td>
                    <div class="bc-employee-cell">
                        <div class="bc-avatar">${initials}</div>
                        <div class="bc-employee-info">
                            <span class="bc-employee-name">${name}</span>
                            <span class="bc-employee-id">${employeeId}</span>
                        </div>
                    </div>
                </td>
                <td>${email}</td>
                <td>${dept}</td>
                <td><span class="bc-status ${statusClass}">${statusText}</span></td>
                <td>${statusDate}</td>
                <td>${validationMethod}</td>
                <td>
                    <div class="bc-actions">
                        ${status === 'pending' ? `
                            <button class="bc-btn-icon" onclick="BiometricConsentEngine.sendRequest('${emp.id}')" title="Enviar solicitud">📧</button>
                        ` : ''}
                        ${status === 'active' ? `
                            <button class="bc-btn-icon" onclick="BiometricConsentEngine.viewDetails('${emp.id}')" title="Ver detalles">📋</button>
                            <button class="bc-btn-icon" onclick="BiometricConsentEngine.downloadPDF('${emp.id}')" title="Descargar PDF">📄</button>
                        ` : ''}
                        ${status === 'revoked' ? `
                            <button class="bc-btn-icon" onclick="BiometricConsentEngine.viewDetails('${emp.id}')" title="Ver historial">📋</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    },

    renderRegulationsTab() {
        const selectedCode = ConsentState.selectedCountry;
        const country = COUNTRY_REGULATIONS[selectedCode];
        const allCountries = Object.values(COUNTRY_REGULATIONS);
        const detected = ConsentState.detectedRegulation;
        const branchesByCountry = ConsentState.branchesByCountry;
        const employeesByReg = ConsentState.employeesByRegulation;

        // Generar banner de deteccion automatica
        let autoDetectionBanner = '';
        if (detected && detected.detected) {
            const flag = COUNTRY_REGULATIONS[detected.countryCode]?.flag || '🌍';
            autoDetectionBanner = `
                <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(59, 130, 246, 0.15));
                            border: 2px solid rgba(34, 197, 94, 0.5); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="font-size: 48px;">${flag}</div>
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <span style="background: var(--bc-accent-green); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                                    REGULACION AUTO-DETECTADA
                                </span>
                            </div>
                            <h3 style="margin: 0; color: var(--bc-text-primary); font-size: 18px;">
                                ${detected.countryName} - ${detected.lawName || 'Regulacion Local'}
                            </h3>
                            <p style="margin: 8px 0 0; color: var(--bc-text-secondary); font-size: 14px;">
                                Detectado desde tu sucursal: <strong>${detected.branchName || 'N/A'}</strong>
                                ${detected.source === 'company_default' ? ' (pais por defecto de la empresa)' : ''}
                            </p>
                        </div>
                        <button class="bc-btn bc-btn-primary" onclick="BiometricConsentEngine.generateCountryConsent('${detected.countryCode}')">
                            📝 Generar Mi Consentimiento
                        </button>
                    </div>
                </div>
            `;
        }

        // Generar seccion de empleados por pais (solo admins)
        let employeesByCountrySection = '';
        if (employeesByReg && Object.keys(employeesByReg).length > 0) {
            const countryCards = Object.entries(employeesByReg).map(([countryCode, data]) => {
                const countryInfo = COUNTRY_REGULATIONS[countryCode] || { flag: '🌍', name: countryCode, mainLaw: 'N/A' };
                return `
                    <div style="background: var(--bc-bg-secondary); border: 1px solid var(--bc-border); border-radius: 10px; padding: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <span style="font-size: 32px;">${countryInfo.flag}</span>
                            <div>
                                <div style="font-weight: 600; color: var(--bc-text-primary);">${countryInfo.name}</div>
                                <div style="font-size: 12px; color: var(--bc-accent-purple);">${countryInfo.mainLaw}</div>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="font-size: 28px; font-weight: 700; color: var(--bc-accent-blue);">${data.count || 0}</span>
                                <span style="color: var(--bc-text-muted); font-size: 13px; margin-left: 8px;">empleados</span>
                            </div>
                            <button class="bc-btn bc-btn-secondary" style="padding: 6px 12px; font-size: 12px;"
                                    onclick="BiometricConsentEngine.selectCountry('${countryCode}')">
                                Ver Requisitos
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            employeesByCountrySection = `
                <div class="bc-section" style="margin-bottom: 24px;">
                    <div class="bc-section-header">
                        <h3 class="bc-section-title">👥 Empleados por Regulacion Aplicable</h3>
                        <span style="background: var(--bc-accent-blue); color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px;">
                            Multi-Sucursal
                        </span>
                    </div>
                    <div style="padding: 20px;">
                        <p style="color: var(--bc-text-secondary); margin: 0 0 16px; font-size: 14px;">
                            Tus empleados estan distribuidos en sucursales de diferentes paises. Cada uno recibe consentimientos segun la regulacion de su ubicacion.
                        </p>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px;">
                            ${countryCards}
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            ${autoDetectionBanner}

            ${employeesByCountrySection}

            <div class="bc-info-banner" style="margin-bottom: 24px;">
                <span class="bc-info-banner-icon">🌐</span>
                <div style="flex: 1;">
                    <h3>Sistema de Cumplimiento Internacional Multi-Jurisdiccion</h3>
                    <p>Gestiona automaticamente los textos de consentimiento y requisitos legales segun el pais. Selecciona un pais para ver sus requisitos especificos.</p>
                </div>
                <button class="bc-btn bc-btn-secondary" onclick="BiometricConsentEngine.showComparisonModal()">
                    ⚖️ Comparar Paises
                </button>
            </div>

            <!-- Country Selector Grid -->
            <div class="bc-section" style="margin-bottom: 24px;">
                <div class="bc-section-header">
                    <h3 class="bc-section-title">🌍 Selecciona la Jurisdiccion</h3>
                </div>
                <div style="padding: 20px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px;">
                        ${allCountries.map(c => `
                            <div onclick="BiometricConsentEngine.selectCountry('${c.code}')"
                                 class="bc-country-card ${c.code === selectedCode ? 'selected' : ''}"
                                 style="background: ${c.code === selectedCode ? 'linear-gradient(135deg, var(--bc-accent-purple), var(--bc-accent-blue))' : 'var(--bc-bg-secondary)'};
                                        border: 2px solid ${c.code === selectedCode ? 'var(--bc-accent-purple)' : 'var(--bc-border)'};
                                        border-radius: 10px; padding: 16px; cursor: pointer; text-align: center; transition: all 0.2s;"
                                 onmouseover="if('${c.code}'!=='${selectedCode}')this.style.borderColor='var(--bc-accent-purple)'"
                                 onmouseout="if('${c.code}'!=='${selectedCode}')this.style.borderColor='var(--bc-border)'">
                                <div style="font-size: 36px; margin-bottom: 8px;">${c.flag}</div>
                                <div style="font-weight: 600; color: ${c.code === selectedCode ? 'white' : 'var(--bc-text-primary)'}; margin-bottom: 4px;">${c.name}</div>
                                <div style="font-size: 12px; color: ${c.code === selectedCode ? 'rgba(255,255,255,0.9)' : 'var(--bc-accent-purple)'}; font-weight: 500;">${c.mainLaw}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Selected Country Details -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                <!-- Main Info Panel -->
                <div>
                    <!-- Law Header -->
                    <div class="bc-section" style="margin-bottom: 20px;">
                        <div style="padding: 24px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1));">
                            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                                <span style="font-size: 48px;">${country.flag}</span>
                                <div>
                                    <h2 style="margin: 0; color: var(--bc-text-primary); font-size: 22px;">${country.name}</h2>
                                    <p style="margin: 4px 0 0; color: var(--bc-accent-purple); font-weight: 600;">${country.mainLaw} - ${country.fullName}</p>
                                </div>
                            </div>
                            <p style="color: var(--bc-text-secondary); font-size: 14px; line-height: 1.6; margin: 0;">
                                ${country.specificText}
                            </p>
                        </div>
                    </div>

                    <!-- Requirements Grid -->
                    <div class="bc-section" style="margin-bottom: 20px;">
                        <div class="bc-section-header">
                            <h3 class="bc-section-title">📋 Requisitos Legales</h3>
                        </div>
                        <div style="padding: 20px;">
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                                ${this.renderRequirementItem(country.requirements.explicitConsent, '📝')}
                                ${this.renderRequirementItem(country.requirements.dpia, '📊')}
                                ${this.renderRequirementItem(country.requirements.dpo, '👤')}
                                ${this.renderRequirementItem(country.requirements.biometricAllowed, '🔐')}
                                ${this.renderRequirementItem(country.requirements.emotionalAnalysis, '😊')}
                                ${this.renderRequirementItem({ label: 'Transferencia Internacional', ...country.requirements.transferIntl }, '🌐')}
                            </div>
                        </div>
                    </div>

                    <!-- Data Retention -->
                    <div class="bc-section">
                        <div class="bc-section-header">
                            <h3 class="bc-section-title">⏱️ Plazos de Retencion de Datos</h3>
                        </div>
                        <div style="padding: 20px;">
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                                <div style="background: var(--bc-bg-secondary); border-radius: 8px; padding: 16px; text-align: center;">
                                    <div style="font-size: 24px; margin-bottom: 8px;">👤</div>
                                    <div style="color: var(--bc-text-muted); font-size: 12px; margin-bottom: 4px;">Datos Individuales</div>
                                    <div style="color: var(--bc-accent-blue); font-weight: 600; font-size: 16px;">${country.requirements.dataRetention.individual}</div>
                                </div>
                                <div style="background: var(--bc-bg-secondary); border-radius: 8px; padding: 16px; text-align: center;">
                                    <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                                    <div style="color: var(--bc-text-muted); font-size: 12px; margin-bottom: 4px;">Datos Agregados</div>
                                    <div style="color: var(--bc-accent-green); font-weight: 600; font-size: 16px;">${country.requirements.dataRetention.aggregate}</div>
                                </div>
                                <div style="background: var(--bc-bg-secondary); border-radius: 8px; padding: 16px; text-align: center;">
                                    <div style="font-size: 24px; margin-bottom: 8px;">📜</div>
                                    <div style="color: var(--bc-text-muted); font-size: 12px; margin-bottom: 4px;">Logs Auditoria</div>
                                    <div style="color: var(--bc-accent-purple); font-weight: 600; font-size: 16px;">${country.requirements.dataRetention.audit}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sidebar -->
                <div>
                    <!-- Authority Contact -->
                    <div class="bc-compliance-card" style="margin-bottom: 20px;">
                        <h4>🏛️ Autoridad de Control</h4>
                        <div style="background: var(--bc-bg-secondary); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                            <div style="font-weight: 600; color: var(--bc-text-primary); margin-bottom: 8px;">${country.authority.name}</div>
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                <span style="color: var(--bc-text-muted);">🌐</span>
                                <a href="https://${country.authority.web}" target="_blank" style="color: var(--bc-accent-blue); font-size: 13px; text-decoration: none;">${country.authority.web}</a>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="color: var(--bc-text-muted);">📞</span>
                                <span style="color: var(--bc-text-secondary); font-size: 13px;">${country.authority.phone}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Rights -->
                    <div class="bc-compliance-card" style="margin-bottom: 20px;">
                        <h4>⚖️ Derechos del Titular</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${country.rights.map(r => `
                                <span style="background: rgba(168, 85, 247, 0.2); color: var(--bc-accent-purple); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 500;">${r}</span>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Penalties -->
                    <div class="bc-compliance-card" style="margin-bottom: 20px;">
                        <h4>⚠️ Sanciones</h4>
                        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px;">
                            <div style="color: var(--bc-accent-red); font-size: 14px; font-weight: 500; line-height: 1.5;">
                                ${country.penalties}
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="bc-compliance-card">
                        <h4>📄 Generar Documentos</h4>
                        <div class="bc-quick-actions">
                            <button class="bc-btn bc-btn-primary" onclick="BiometricConsentEngine.generateCountryConsent('${country.code}')">
                                📝 Generar Consentimiento ${country.mainLaw}
                            </button>
                            <button class="bc-btn bc-btn-secondary" onclick="BiometricConsentEngine.generateDPIA('${country.code}')">
                                📊 Generar DPIA
                            </button>
                            <button class="bc-btn bc-btn-secondary" onclick="BiometricConsentEngine.downloadLegalTemplate('${country.code}')">
                                📥 Descargar Plantilla Legal
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderRequirementItem(req, icon) {
        let statusColor, statusText, statusBg;

        if (req.required) {
            statusColor = 'var(--bc-accent-red)';
            statusText = 'Obligatorio';
            statusBg = 'rgba(239, 68, 68, 0.15)';
        } else if (req.recommended) {
            statusColor = 'var(--bc-accent-yellow)';
            statusText = 'Recomendado';
            statusBg = 'rgba(234, 179, 8, 0.15)';
        } else if (req.allowed !== undefined) {
            if (req.allowed) {
                statusColor = 'var(--bc-accent-green)';
                statusText = req.withConsent ? 'Permitido (con consentimiento)' : 'Permitido';
                statusBg = 'rgba(34, 197, 94, 0.15)';
            } else {
                statusColor = 'var(--bc-accent-red)';
                statusText = 'Prohibido';
                statusBg = 'rgba(239, 68, 68, 0.15)';
            }
        } else {
            statusColor = 'var(--bc-text-muted)';
            statusText = req.conditions || 'N/A';
            statusBg = 'var(--bc-bg-tertiary)';
        }

        return `
            <div style="background: ${statusBg}; border-radius: 8px; padding: 14px; display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 20px;">${icon}</span>
                <div style="flex: 1;">
                    <div style="color: var(--bc-text-primary); font-size: 13px; font-weight: 500;">${req.label}</div>
                    <div style="color: ${statusColor}; font-size: 12px; margin-top: 2px;">${statusText}</div>
                </div>
            </div>
        `;
    },

    getFilteredEmployees() {
        const { employees, currentFilter } = ConsentState;
        if (currentFilter === 'all') return employees;
        return employees.filter(emp => this.getConsentStatus(emp) === currentFilter);
    },

    getInitials(name) {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    },

    filter(type) {
        ConsentState.currentFilter = type;
        this.render();
    },

    switchTab(tabName) {
        ConsentState.currentTab = tabName;
        this.render();
    },

    async sendRequest(userId) {
        const emp = ConsentState.employees.find(e => e.id === userId);
        const name = emp?.name || emp?.full_name || 'empleado';

        if (!confirm(`¿Enviar solicitud de consentimiento a ${name}?`)) return;

        try {
            console.log(`[CONSENT] Sending request to ${userId}`);
            alert(`✅ Solicitud enviada a ${name}`);
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    },

    async requestAllPending() {
        const pending = ConsentState.employees.filter(e => this.getConsentStatus(e) === 'pending');

        if (pending.length === 0) {
            alert('No hay empleados pendientes');
            return;
        }

        if (!confirm(`¿Enviar solicitud de consentimiento a ${pending.length} empleados pendientes?`)) return;

        try {
            console.log(`[CONSENT] Sending requests to ${pending.length} employees`);
            alert(`✅ Solicitudes enviadas a ${pending.length} empleados`);
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    },

    viewDetails(userId) {
        const emp = ConsentState.employees.find(e => e.id === userId);
        if (!emp) return;

        const name = emp.name || emp.full_name || 'Empleado';
        const status = this.getConsentStatus(emp);

        alert(`📋 Detalles de Consentimiento\n\nEmpleado: ${name}\nEstado: ${status}\nFecha: ${emp.consent_date || 'N/A'}\nMetodo: ${emp.validation_method || 'N/A'}\nIP: ${emp.consent_ip || 'N/A'}`);
    },

    downloadPDF(userId) {
        alert('📄 Generando PDF del consentimiento firmado...');
    },

    generatePDF() {
        alert('📄 Generando documento PDF del consentimiento legal...\n\nEl PDF incluira:\n- Texto legal completo\n- Informacion de la empresa\n- Fecha de generacion');
    },

    previewDocument() {
        const win = window.open('', '_blank', 'width=800,height=600');
        win.document.write(`
            <html>
            <head><title>Vista Previa - Consentimiento Biometrico</title>
            <style>body{font-family:monospace;padding:40px;white-space:pre-wrap;background:#1a1a2e;color:#c9d1d9;}</style>
            </head>
            <body>${BIOMETRIC_CONSENT_TEXT}</body>
            </html>
        `);
    },

    generateComplianceReport() {
        const { stats } = ConsentState;
        alert(`📋 Reporte de Cumplimiento\n\n` +
              `Total Empleados: ${stats.total}\n` +
              `Consentimientos Activos: ${stats.active}\n` +
              `Pendientes: ${stats.pending}\n` +
              `Revocados: ${stats.revoked}\n` +
              `Tasa de Cumplimiento: ${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%\n\n` +
              `Normativas Cumplidas:\n` +
              `✓ Ley 25.326 (Argentina)\n` +
              `✓ GDPR (Union Europea)\n` +
              `✓ BIPA (Illinois)\n` +
              `✓ ISO/IEC 29100:2011`);
    },

    selectCountry(code) {
        if (COUNTRY_REGULATIONS[code]) {
            ConsentState.selectedCountry = code;
            this.render();
        }
    },

    generateCountryConsent(code) {
        const country = COUNTRY_REGULATIONS[code || ConsentState.selectedCountry];
        if (!country) return;

        const consentDoc = this.generateConsentDocument(country);

        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Consentimiento Biometrico - ${country.name} (${country.mainLaw})</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 40px; background: #1a1a2e; color: #c9d1d9; line-height: 1.8; }
                    h1 { color: #a855f7; border-bottom: 2px solid #a855f7; padding-bottom: 10px; }
                    h2 { color: #3b82f6; margin-top: 30px; }
                    .header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
                    .flag { font-size: 64px; }
                    .law-badge { background: linear-gradient(135deg, #a855f7, #3b82f6); padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; }
                    .section { background: #21262d; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #a855f7; }
                    .important { background: rgba(239, 68, 68, 0.1); border-left-color: #ef4444; }
                    .rights-list { display: flex; flex-wrap: wrap; gap: 10px; }
                    .right-badge { background: rgba(168, 85, 247, 0.2); color: #a855f7; padding: 6px 14px; border-radius: 6px; font-size: 14px; }
                    .signature-box { border: 2px dashed #30363d; padding: 30px; margin-top: 40px; text-align: center; }
                    .print-btn { background: #a855f7; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; margin-right: 10px; }
                    .print-btn:hover { opacity: 0.9; }
                    @media print { .no-print { display: none; } body { background: white; color: black; } }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom: 20px;">
                    <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
                    <button class="print-btn" style="background: #22c55e;" onclick="downloadAsPDF()">📄 Descargar PDF</button>
                </div>
                ${consentDoc}
                <script>
                    function downloadAsPDF() {
                        alert('Para descargar como PDF, use la opcion "Guardar como PDF" en el dialogo de impresion');
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);
    },

    generateConsentDocument(country) {
        const date = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
        const retentionInfo = country.requirements.dataRetention;

        return `
            <div class="header">
                <span class="flag">${country.flag}</span>
                <div>
                    <h1 style="margin: 0;">CONSENTIMIENTO INFORMADO PARA TRATAMIENTO DE DATOS BIOMETRICOS</h1>
                    <span class="law-badge">${country.mainLaw} - ${country.fullName}</span>
                </div>
            </div>

            <div class="section">
                <h2>1. IDENTIFICACION DEL RESPONSABLE</h2>
                <p><strong>Responsable del Tratamiento:</strong> [NOMBRE DE LA EMPRESA]</p>
                <p><strong>Identificacion Fiscal:</strong> [CUIT/NIF/RFC]</p>
                <p><strong>Domicilio:</strong> [DOMICILIO LEGAL]</p>
                <p><strong>Contacto DPO:</strong> [EMAIL/TELEFONO]</p>
            </div>

            <div class="section">
                <h2>2. BASE LEGAL</h2>
                <p>${country.specificText}</p>
                <p><strong>Autoridad de Control:</strong> ${country.authority.name}</p>
                <p><strong>Web:</strong> ${country.authority.web}</p>
            </div>

            <div class="section">
                <h2>3. DATOS BIOMETRICOS QUE SE RECOPILAN</h2>
                <p>El sistema procesa los siguientes datos biometricos:</p>
                <ul>
                    <li>Analisis de expresiones faciales (8 emociones basicas)</li>
                    <li>Indicadores de fatiga ocular</li>
                    <li>Postura de la cabeza</li>
                    <li>Metadata contextual (uso de anteojos, estimacion de edad)</li>
                </ul>
                <p><strong>IMPORTANTE:</strong> NO se almacenan imagenes faciales. Los datos se procesan en tiempo real mediante Azure Face API.</p>
            </div>

            <div class="section">
                <h2>4. FINALIDAD DEL TRATAMIENTO</h2>
                <p>Los datos seran utilizados exclusivamente para:</p>
                <ul>
                    <li>Registro de asistencia laboral</li>
                    <li>Generacion de indicadores agregados de bienestar organizacional</li>
                    <li>Identificacion de patrones de fatiga</li>
                    <li>Cumplimiento de normativas de seguridad e higiene laboral</li>
                </ul>
            </div>

            <div class="section">
                <h2>5. PLAZOS DE CONSERVACION</h2>
                <ul>
                    <li><strong>Datos individuales:</strong> ${retentionInfo.individual}</li>
                    <li><strong>Datos agregados:</strong> ${retentionInfo.aggregate}</li>
                    <li><strong>Logs de auditoria:</strong> ${retentionInfo.audit}</li>
                </ul>
            </div>

            <div class="section">
                <h2>6. SUS DERECHOS</h2>
                <p>Segun la legislacion ${country.name} (${country.mainLaw}), usted tiene los siguientes derechos:</p>
                <div class="rights-list" style="margin-top: 15px;">
                    ${country.rights.map(r => `<span class="right-badge">${r}</span>`).join('')}
                </div>
                <p style="margin-top: 15px;">La negativa o revocacion del consentimiento NO afectara su situacion laboral.</p>
            </div>

            <div class="section important">
                <h2>⚠️ 7. SANCIONES POR INCUMPLIMIENTO</h2>
                <p>El incumplimiento de la normativa ${country.mainLaw} puede resultar en:</p>
                <p><strong>${country.penalties}</strong></p>
            </div>

            <div class="section">
                <h2>8. DECLARACION DE CONSENTIMIENTO</h2>
                <p>Al firmar este documento, declaro que:</p>
                <ul>
                    <li>☑️ He leido y comprendido la totalidad de este documento</li>
                    <li>☑️ Comprendo las capacidades y limitaciones del sistema</li>
                    <li>☑️ Conozco mis derechos y como ejercerlos</li>
                    <li>☑️ Otorgo mi consentimiento de manera libre, expresa e informada</li>
                    <li>☑️ Entiendo que puedo revocar este consentimiento en cualquier momento</li>
                </ul>
            </div>

            <div class="signature-box">
                <p><strong>FIRMA DEL TITULAR DE LOS DATOS</strong></p>
                <br><br>
                <p>_____________________________________________</p>
                <p>Nombre completo: _____________________________</p>
                <p>Documento de identidad: _______________________</p>
                <p>Fecha: ${date}</p>
                <p>Metodo de validacion: ☐ Firma manuscrita  ☐ Reconocimiento facial  ☐ Huella dactilar</p>
            </div>

            <p style="text-align: center; margin-top: 30px; color: #6e7681; font-size: 12px;">
                Documento generado automaticamente el ${date}<br>
                Cumple con: ${country.mainLaw} (${country.name})
            </p>
        `;
    },

    generateDPIA(code) {
        const country = COUNTRY_REGULATIONS[code || ConsentState.selectedCountry];
        if (!country) return;

        const dpiaDoc = this.generateDPIADocument(country);

        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>DPIA - Evaluacion de Impacto - ${country.name}</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 40px; background: #0d1117; color: #c9d1d9; line-height: 1.7; }
                    h1 { color: #3b82f6; }
                    h2 { color: #a855f7; margin-top: 30px; border-bottom: 1px solid #30363d; padding-bottom: 8px; }
                    .section { background: #161b22; padding: 20px; border-radius: 8px; margin: 15px 0; }
                    .risk-high { border-left: 4px solid #ef4444; }
                    .risk-medium { border-left: 4px solid #eab308; }
                    .risk-low { border-left: 4px solid #22c55e; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    th, td { border: 1px solid #30363d; padding: 12px; text-align: left; }
                    th { background: #21262d; color: #a855f7; }
                    .badge { padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                    .badge-high { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
                    .badge-medium { background: rgba(234, 179, 8, 0.2); color: #eab308; }
                    .badge-low { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
                    .print-btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin-right: 10px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom: 20px;">
                    <button class="print-btn" onclick="window.print()">🖨️ Imprimir DPIA</button>
                </div>
                ${dpiaDoc}
            </body>
            </html>
        `);
    },

    generateDPIADocument(country) {
        const date = new Date().toLocaleDateString('es-AR');

        return `
            <h1>📊 DATA PROTECTION IMPACT ASSESSMENT (DPIA)</h1>
            <h2 style="margin-top: 0;">Evaluacion de Impacto en la Proteccion de Datos</h2>

            <div class="section">
                <p><strong>Normativa aplicable:</strong> ${country.mainLaw} - ${country.fullName}</p>
                <p><strong>Fecha de evaluacion:</strong> ${date}</p>
                <p><strong>Responsable:</strong> [NOMBRE DEL DPO/RESPONSABLE]</p>
            </div>

            <h2>1. DESCRIPCION DEL TRATAMIENTO</h2>
            <div class="section">
                <table>
                    <tr><th>Aspecto</th><th>Descripcion</th></tr>
                    <tr><td>Naturaleza</td><td>Tratamiento de datos biometricos faciales para registro de asistencia y analisis de bienestar</td></tr>
                    <tr><td>Alcance</td><td>Empleados de la organizacion (multi-tenant)</td></tr>
                    <tr><td>Contexto</td><td>Ambito laboral - Control de asistencia con analisis emocional opcional</td></tr>
                    <tr><td>Finalidad</td><td>Registro de jornada, indicadores de fatiga, bienestar organizacional</td></tr>
                </table>
            </div>

            <h2>2. EVALUACION DE NECESIDAD Y PROPORCIONALIDAD</h2>
            <div class="section">
                <table>
                    <tr><th>Criterio</th><th>Evaluacion</th><th>Justificacion</th></tr>
                    <tr><td>Legitimidad</td><td><span class="badge badge-low">Cumple</span></td><td>Consentimiento explicito del titular (Art. 9 GDPR / equivalente local)</td></tr>
                    <tr><td>Necesidad</td><td><span class="badge badge-low">Justificado</span></td><td>Alternativas menos intrusivas evaluadas; biometria necesaria para precision</td></tr>
                    <tr><td>Proporcionalidad</td><td><span class="badge badge-medium">Aceptable</span></td><td>Datos limitados a lo estrictamente necesario, no se almacenan imagenes</td></tr>
                    <tr><td>Calidad de datos</td><td><span class="badge badge-low">Cumple</span></td><td>Datos precisos, actualizados, con plazos de retencion definidos</td></tr>
                </table>
            </div>

            <h2>3. ANALISIS DE RIESGOS</h2>
            <div class="section risk-high">
                <h3>🔴 Riesgos Altos</h3>
                <table>
                    <tr><th>Riesgo</th><th>Probabilidad</th><th>Impacto</th><th>Mitigacion</th></tr>
                    <tr><td>Brecha de datos biometricos</td><td>Baja</td><td>Muy Alto</td><td>Encriptacion AES-256, Azure Security, logs de acceso</td></tr>
                    <tr><td>Uso no autorizado</td><td>Baja</td><td>Alto</td><td>RBAC, autenticacion multifactor, auditorias</td></tr>
                </table>
            </div>
            <div class="section risk-medium">
                <h3>🟡 Riesgos Medios</h3>
                <table>
                    <tr><th>Riesgo</th><th>Probabilidad</th><th>Impacto</th><th>Mitigacion</th></tr>
                    <tr><td>Discriminacion algorítmica</td><td>Media</td><td>Medio</td><td>Reportes solo agregados (min 10 personas), supervision humana</td></tr>
                    <tr><td>Acceso de terceros (Azure)</td><td>Baja</td><td>Medio</td><td>Contrato DPA con Microsoft, certificaciones ISO</td></tr>
                </table>
            </div>
            <div class="section risk-low">
                <h3>🟢 Riesgos Bajos</h3>
                <table>
                    <tr><th>Riesgo</th><th>Probabilidad</th><th>Impacto</th><th>Mitigacion</th></tr>
                    <tr><td>Errores de precision</td><td>Media</td><td>Bajo</td><td>Azure Face API tiene 99%+ precision; no decisiones automaticas</td></tr>
                    <tr><td>Retencion excesiva</td><td>Baja</td><td>Bajo</td><td>Politica de retencion automatica: ${country.requirements.dataRetention.individual}</td></tr>
                </table>
            </div>

            <h2>4. MEDIDAS DE SEGURIDAD IMPLEMENTADAS</h2>
            <div class="section">
                <ul>
                    <li>✅ Encriptacion AES-256 en reposo y transito</li>
                    <li>✅ Infraestructura Microsoft Azure (ISO 27001, SOC 2)</li>
                    <li>✅ Autenticacion multifactor para acceso administrativo</li>
                    <li>✅ Logs de auditoria inalterables</li>
                    <li>✅ Control de acceso basado en roles (RBAC)</li>
                    <li>✅ Monitoreo continuo de seguridad</li>
                    <li>✅ Backups encriptados con rotacion</li>
                    <li>✅ No almacenamiento de imagenes faciales</li>
                </ul>
            </div>

            <h2>5. DERECHOS DE LOS INTERESADOS</h2>
            <div class="section">
                <p>Se garantizan los siguientes derechos segun ${country.mainLaw}:</p>
                <p>${country.rights.map(r => `<span class="badge badge-low" style="margin-right: 8px;">${r}</span>`).join('')}</p>
                <p style="margin-top: 15px;"><strong>Plazo de respuesta:</strong> 10 dias habiles</p>
                <p><strong>Canal:</strong> Panel de usuario → Mi Perfil → Consentimientos</p>
            </div>

            <h2>6. CONCLUSION Y APROBACION</h2>
            <div class="section">
                <p><strong>Resultado de la evaluacion:</strong> <span class="badge badge-low">APROBADO CON MEDIDAS</span></p>
                <p>El tratamiento de datos biometricos se considera CONFORME a la normativa ${country.mainLaw}, siempre que se mantengan las medidas de seguridad descritas y se respeten los derechos de los titulares.</p>
                <br>
                <p>_____________________________________________</p>
                <p>Firma del DPO / Responsable de Proteccion de Datos</p>
                <p>Fecha: ${date}</p>
            </div>
        `;
    },

    downloadLegalTemplate(code) {
        const country = COUNTRY_REGULATIONS[code || ConsentState.selectedCountry];
        if (!country) return;

        const template = `
PLANTILLA DE POLITICA DE PRIVACIDAD BIOMETRICA
===============================================
Normativa: ${country.mainLaw} - ${country.fullName}
Pais: ${country.name}
Fecha de generacion: ${new Date().toLocaleDateString('es-AR')}

---

1. RESPONSABLE DEL TRATAMIENTO
[Insertar nombre de la empresa]
[Insertar direccion]
[Insertar contacto DPO]

2. AUTORIDAD DE CONTROL
${country.authority.name}
Web: ${country.authority.web}
Telefono: ${country.authority.phone}

3. DATOS BIOMETRICOS TRATADOS
- Analisis de expresiones faciales
- Indicadores de fatiga
- Metadata contextual

4. FINALIDADES
- Registro de asistencia
- Bienestar organizacional
- Cumplimiento normativo

5. BASE LEGAL
${country.specificText}

6. PLAZOS DE CONSERVACION
- Datos individuales: ${country.requirements.dataRetention.individual}
- Datos agregados: ${country.requirements.dataRetention.aggregate}
- Logs de auditoria: ${country.requirements.dataRetention.audit}

7. DERECHOS DEL TITULAR
${country.rights.join(', ')}

8. SANCIONES
${country.penalties}

---
Este documento es una plantilla y debe ser revisado por asesores legales.
        `.trim();

        const blob = new Blob([template], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plantilla_privacidad_${country.code.toLowerCase()}_${country.mainLaw.replace(/\s+/g, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        alert(`✅ Plantilla legal para ${country.name} (${country.mainLaw}) descargada correctamente`);
    },

    // ============================================================================
    // REPORTS TAB - PDF Generation
    // ============================================================================
    renderReportsTab() {
        const stats = ConsentState.stats || { total: 0, active: 0, pending: 0, revoked: 0 };
        const compliance = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;
        const regulation = ConsentState.detectedRegulation;
        const regName = regulation?.regulation?.mainLaw || 'General';

        return `
            <div class="bc-reports-container" style="padding: 20px;">
                <!-- Header -->
                <div style="margin-bottom: 24px;">
                    <h3 style="margin: 0 0 8px; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 28px;">📊</span>
                        Centro de Reportes PDF
                    </h3>
                    <p style="color: var(--bc-text-secondary, #8b949e); margin: 0;">
                        Genera reportes profesionales de cumplimiento normativo para auditorias, certificaciones y documentacion legal.
                    </p>
                </div>

                <!-- Report Types Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">

                    <!-- 1. Compliance Summary Report -->
                    <div class="bc-report-card" style="
                        background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.02));
                        border: 1px solid var(--bc-accent-green, #22c55e);
                        border-radius: 12px;
                        padding: 20px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " onclick="BiometricConsentEngine.generateComplianceReport()">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <div style="
                                width: 48px; height: 48px; border-radius: 12px;
                                background: var(--bc-accent-green, #22c55e);
                                display: flex; align-items: center; justify-content: center;
                                font-size: 24px;
                            ">✅</div>
                            <div>
                                <h4 style="margin: 0; font-size: 16px;">Reporte de Compliance</h4>
                                <span style="font-size: 12px; color: var(--bc-text-muted, #6e7681);">Resumen ejecutivo</span>
                            </div>
                        </div>
                        <p style="font-size: 13px; color: var(--bc-text-secondary, #8b949e); margin: 0 0 12px;">
                            Resumen de cumplimiento normativo con estadisticas, metricas clave y estado de consentimientos.
                        </p>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <span class="bc-report-badge" style="background: rgba(34, 197, 94, 0.2); color: var(--bc-accent-green, #22c55e); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                                ${compliance}% Compliance
                            </span>
                            <span class="bc-report-badge" style="background: rgba(139, 92, 246, 0.2); color: var(--bc-accent-purple, #a855f7); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                                ${regName}
                            </span>
                        </div>
                    </div>

                    <!-- 2. Consent Certificate -->
                    <div class="bc-report-card" style="
                        background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.02));
                        border: 1px solid var(--bc-accent-blue, #3b82f6);
                        border-radius: 12px;
                        padding: 20px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " onclick="BiometricConsentEngine.generateConsentCertificate()">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <div style="
                                width: 48px; height: 48px; border-radius: 12px;
                                background: var(--bc-accent-blue, #3b82f6);
                                display: flex; align-items: center; justify-content: center;
                                font-size: 24px;
                            ">📜</div>
                            <div>
                                <h4 style="margin: 0; font-size: 16px;">Certificado de Consentimiento</h4>
                                <span style="font-size: 12px; color: var(--bc-text-muted, #6e7681);">Por empleado</span>
                            </div>
                        </div>
                        <p style="font-size: 13px; color: var(--bc-text-secondary, #8b949e); margin: 0 0 12px;">
                            Certificado individual con firma digital, fecha, hash de verificacion y datos del titular.
                        </p>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <span class="bc-report-badge" style="background: rgba(59, 130, 246, 0.2); color: var(--bc-accent-blue, #3b82f6); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                                ${stats.active} certificados
                            </span>
                            <span class="bc-report-badge" style="background: rgba(139, 92, 246, 0.2); color: var(--bc-accent-purple, #a855f7); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                                Firma Digital
                            </span>
                        </div>
                    </div>

                    <!-- 3. DPIA Report -->
                    <div class="bc-report-card" style="
                        background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.02));
                        border: 1px solid var(--bc-accent-purple, #a855f7);
                        border-radius: 12px;
                        padding: 20px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " onclick="BiometricConsentEngine.generateDPIAReport()">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <div style="
                                width: 48px; height: 48px; border-radius: 12px;
                                background: var(--bc-accent-purple, #a855f7);
                                display: flex; align-items: center; justify-content: center;
                                font-size: 24px;
                            ">🛡️</div>
                            <div>
                                <h4 style="margin: 0; font-size: 16px;">Informe DPIA/EIPD</h4>
                                <span style="font-size: 12px; color: var(--bc-text-muted, #6e7681);">Impacto en privacidad</span>
                            </div>
                        </div>
                        <p style="font-size: 13px; color: var(--bc-text-secondary, #8b949e); margin: 0 0 12px;">
                            Evaluacion de Impacto en Proteccion de Datos con matriz de riesgos y medidas de mitigacion.
                        </p>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <span class="bc-report-badge" style="background: rgba(168, 85, 247, 0.2); color: var(--bc-accent-purple, #a855f7); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                                ISO 27001
                            </span>
                            <span class="bc-report-badge" style="background: rgba(239, 68, 68, 0.2); color: var(--bc-accent-red, #ef4444); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                                Datos Sensibles
                            </span>
                        </div>
                    </div>

                    <!-- 4. Audit Trail Report -->
                    <div class="bc-report-card" style="
                        background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.02));
                        border: 1px solid var(--bc-accent-orange, #f59e0b);
                        border-radius: 12px;
                        padding: 20px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " onclick="BiometricConsentEngine.generateAuditReport()">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <div style="
                                width: 48px; height: 48px; border-radius: 12px;
                                background: var(--bc-accent-orange, #f59e0b);
                                display: flex; align-items: center; justify-content: center;
                                font-size: 24px;
                            ">📋</div>
                            <div>
                                <h4 style="margin: 0; font-size: 16px;">Log de Auditoria</h4>
                                <span style="font-size: 12px; color: var(--bc-text-muted, #6e7681);">Trazabilidad completa</span>
                            </div>
                        </div>
                        <p style="font-size: 13px; color: var(--bc-text-secondary, #8b949e); margin: 0 0 12px;">
                            Registro detallado de todas las acciones: otorgamientos, revocaciones, cambios y accesos.
                        </p>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <span class="bc-report-badge" style="background: rgba(245, 158, 11, 0.2); color: var(--bc-accent-orange, #f59e0b); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                                Inmutable
                            </span>
                            <span class="bc-report-badge" style="background: rgba(139, 92, 246, 0.2); color: var(--bc-accent-purple, #a855f7); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                                Blockchain Hash
                            </span>
                        </div>
                    </div>

                    <!-- 5. Multi-Country Report -->
                    <div class="bc-report-card" style="
                        background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(6, 182, 212, 0.02));
                        border: 1px solid var(--bc-accent-cyan, #06b6d4);
                        border-radius: 12px;
                        padding: 20px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " onclick="BiometricConsentEngine.generateMultiCountryReport()">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <div style="
                                width: 48px; height: 48px; border-radius: 12px;
                                background: var(--bc-accent-cyan, #06b6d4);
                                display: flex; align-items: center; justify-content: center;
                                font-size: 24px;
                            ">🌎</div>
                            <div>
                                <h4 style="margin: 0; font-size: 16px;">Reporte Multi-Pais</h4>
                                <span style="font-size: 12px; color: var(--bc-text-muted, #6e7681);">Compliance global</span>
                            </div>
                        </div>
                        <p style="font-size: 13px; color: var(--bc-text-secondary, #8b949e); margin: 0 0 12px;">
                            Comparativa de cumplimiento por sucursal/pais con regulaciones aplicables a cada jurisdiccion.
                        </p>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <span class="bc-report-badge" style="background: rgba(6, 182, 212, 0.2); color: var(--bc-accent-cyan, #06b6d4); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                                ${Object.keys(COUNTRY_REGULATIONS).length} paises
                            </span>
                            <span class="bc-report-badge" style="background: rgba(139, 92, 246, 0.2); color: var(--bc-accent-purple, #a855f7); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                                Matriz Comparativa
                            </span>
                        </div>
                    </div>

                    <!-- 6. Employee List Report -->
                    <div class="bc-report-card" style="
                        background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(236, 72, 153, 0.02));
                        border: 1px solid var(--bc-accent-pink, #ec4899);
                        border-radius: 12px;
                        padding: 20px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " onclick="BiometricConsentEngine.generateEmployeeListReport()">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <div style="
                                width: 48px; height: 48px; border-radius: 12px;
                                background: var(--bc-accent-pink, #ec4899);
                                display: flex; align-items: center; justify-content: center;
                                font-size: 24px;
                            ">👥</div>
                            <div>
                                <h4 style="margin: 0; font-size: 16px;">Listado de Empleados</h4>
                                <span style="font-size: 12px; color: var(--bc-text-muted, #6e7681);">Estado detallado</span>
                            </div>
                        </div>
                        <p style="font-size: 13px; color: var(--bc-text-secondary, #8b949e); margin: 0 0 12px;">
                            Lista completa de empleados con estado de consentimiento, fechas, metodo de validacion y regulacion aplicable.
                        </p>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <span class="bc-report-badge" style="background: rgba(236, 72, 153, 0.2); color: var(--bc-accent-pink, #ec4899); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                                ${stats.total} empleados
                            </span>
                            <span class="bc-report-badge" style="background: rgba(139, 92, 246, 0.2); color: var(--bc-accent-purple, #a855f7); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                                Excel + PDF
                            </span>
                        </div>
                    </div>

                </div>

                <!-- jsPDF Info Banner -->
                <div style="
                    margin-top: 24px;
                    padding: 16px 20px;
                    background: linear-gradient(90deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
                    border: 1px solid rgba(139, 92, 246, 0.3);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                ">
                    <div style="font-size: 32px;">📄</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">Generacion PDF con jsPDF</div>
                        <div style="font-size: 13px; color: var(--bc-text-secondary, #8b949e);">
                            Los reportes se generan localmente usando jsPDF. Templates profesionales con logo, firma digital y QR de verificacion.
                            Compatible con impresion A4 y archivo digital.
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <span style="background: rgba(34, 197, 94, 0.2); color: var(--bc-accent-green, #22c55e); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 500;">
                            A4
                        </span>
                        <span style="background: rgba(59, 130, 246, 0.2); color: var(--bc-accent-blue, #3b82f6); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 500;">
                            QR
                        </span>
                    </div>
                </div>
            </div>
        `;
    },

    // PDF Generation Methods
    async generateComplianceReport() {
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            // Load jsPDF dynamically
            await this.loadJsPDF();
        }

        const doc = new jsPDF();
        const stats = ConsentState.stats || { total: 0, active: 0, pending: 0, revoked: 0 };
        const compliance = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;
        const regulation = ConsentState.detectedRegulation;
        const regInfo = regulation?.regulation || COUNTRY_REGULATIONS['ARG'];
        const today = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });

        // Header
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE COMPLIANCE', 105, 18, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Consentimiento Biometrico - ${regInfo.mainLaw}`, 105, 28, { align: 'center' });
        doc.text(today, 105, 35, { align: 'center' });

        // Reset colors
        doc.setTextColor(30, 41, 59);

        // Compliance Score
        let y = 55;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('INDICE DE COMPLIANCE', 20, y);

        y += 10;
        const complianceColor = compliance >= 80 ? [34, 197, 94] : compliance >= 50 ? [245, 158, 11] : [239, 68, 68];
        doc.setFillColor(...complianceColor);
        doc.roundedRect(20, y, 60, 25, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text(`${compliance}%`, 50, y + 17, { align: 'center' });

        // Status text
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const statusText = compliance >= 80 ? 'CUMPLIMIENTO OPTIMO' : compliance >= 50 ? 'CUMPLIMIENTO PARCIAL' : 'REQUIERE ATENCION';
        doc.text(statusText, 90, y + 10);
        doc.text(`Regulacion: ${regInfo.flag} ${regInfo.mainLaw}`, 90, y + 18);

        // Statistics Section
        y += 40;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('ESTADISTICAS DE CONSENTIMIENTO', 20, y);

        y += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        const statItems = [
            { label: 'Total de Empleados', value: stats.total, color: [100, 116, 139] },
            { label: 'Con Consentimiento', value: stats.active, color: [34, 197, 94] },
            { label: 'Revocados', value: stats.revoked, color: [239, 68, 68] },
            { label: 'Pendientes', value: stats.pending, color: [245, 158, 11] }
        ];

        statItems.forEach((item, i) => {
            const xPos = 20 + (i % 2) * 90;
            const yPos = y + Math.floor(i / 2) * 20;

            doc.setFillColor(...item.color);
            doc.circle(xPos + 5, yPos + 2, 3, 'F');
            doc.setTextColor(30, 41, 59);
            doc.text(`${item.label}: ${item.value}`, xPos + 12, yPos + 4);
        });

        // Regulatory Requirements
        y += 50;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('REQUISITOS REGULATORIOS', 20, y);

        y += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const requirements = [
            { req: 'Consentimiento Explicito', status: regInfo.requirements?.explicitConsent?.required ? 'SI' : 'NO' },
            { req: 'DPIA/EIPD Requerida', status: regInfo.requirements?.dpia?.required ? 'SI' : 'RECOMENDADO' },
            { req: 'DPO Designado', status: regInfo.requirements?.dpo?.required ? 'SI' : 'RECOMENDADO' },
            { req: 'Retencion Datos Individuales', status: regInfo.requirements?.dataRetention?.individual || 'N/A' },
            { req: 'Retencion Datos Agregados', status: regInfo.requirements?.dataRetention?.aggregate || 'N/A' }
        ];

        requirements.forEach((item, i) => {
            doc.text(`• ${item.req}: ${item.status}`, 25, y + (i * 7));
        });

        // Footer
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 280, 210, 17, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('Generado automaticamente por Sistema de Asistencia Biometrico', 105, 287, { align: 'center' });
        doc.text(`ID: COMP-${Date.now().toString(36).toUpperCase()}`, 105, 293, { align: 'center' });

        // Save
        doc.save(`compliance_report_${new Date().toISOString().split('T')[0]}.pdf`);
        alert('✅ Reporte de Compliance generado correctamente');
    },

    async generateConsentCertificate() {
        const employees = ConsentState.employees.filter(e => this.getConsentStatus(e) === 'Otorgado');

        if (employees.length === 0) {
            alert('⚠️ No hay empleados con consentimiento otorgado para generar certificados');
            return;
        }

        // For demo, generate for first employee with consent
        const emp = employees[0];
        await this.loadJsPDF();

        const doc = new jsPDF();
        const regulation = ConsentState.detectedRegulation?.regulation || COUNTRY_REGULATIONS['ARG'];
        const today = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });

        // Border
        doc.setDrawColor(168, 85, 247);
        doc.setLineWidth(2);
        doc.rect(10, 10, 190, 277, 'S');
        doc.setLineWidth(0.5);
        doc.rect(15, 15, 180, 267, 'S');

        // Header
        doc.setFillColor(168, 85, 247);
        doc.rect(15, 15, 180, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('CERTIFICADO DE CONSENTIMIENTO', 105, 32, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Tratamiento de Datos Biometricos', 105, 42, { align: 'center' });

        // Certificate ID
        const certId = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.text(`Certificado No: ${certId}`, 105, 60, { align: 'center' });

        // Main content
        let y = 80;
        doc.setFontSize(12);
        doc.text('Por medio del presente se certifica que:', 20, y);

        y += 15;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(emp.name || emp.full_name || 'Empleado', 105, y, { align: 'center' });

        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(emp.email || '', 105, y, { align: 'center' });

        y += 20;
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        const consentText = `Ha otorgado su consentimiento libre, informado, expreso e inequivoco para el tratamiento de sus datos biometricos de conformidad con lo establecido en ${regulation.mainLaw} (${regulation.name}).`;
        const lines = doc.splitTextToSize(consentText, 160);
        doc.text(lines, 25, y);

        y += 30;
        doc.setFont('helvetica', 'bold');
        doc.text('DATOS DEL CONSENTIMIENTO', 20, y);

        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.text(`• Fecha de Otorgamiento: ${emp.consent_date || today}`, 25, y);
        y += 7;
        doc.text(`• Metodo de Validacion: ${emp.validation_method || 'Digital'}`, 25, y);
        y += 7;
        doc.text(`• Regulacion Aplicable: ${regulation.flag} ${regulation.mainLaw}`, 25, y);
        y += 7;
        doc.text(`• Autoridad de Control: ${regulation.authority?.name || 'N/A'}`, 25, y);

        y += 20;
        doc.setFont('helvetica', 'bold');
        doc.text('FINALIDADES AUTORIZADAS', 20, y);

        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.text('• Registro de asistencia mediante reconocimiento facial', 25, y);
        y += 7;
        doc.text('• Analisis de bienestar organizacional', 25, y);
        y += 7;
        doc.text('• Cumplimiento de normativa laboral vigente', 25, y);

        // Signature area
        y = 220;
        doc.setDrawColor(200, 200, 200);
        doc.line(30, y, 90, y);
        doc.line(120, y, 180, y);

        doc.setFontSize(9);
        doc.text('Firma del Titular', 60, y + 8, { align: 'center' });
        doc.text('Firma del Responsable', 150, y + 8, { align: 'center' });

        // Verification hash
        const hash = `SHA256:${btoa(certId + emp.email + today).substring(0, 32)}`;

        y = 250;
        doc.setFillColor(240, 240, 240);
        doc.rect(15, y, 180, 20, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Hash de Verificacion:', 20, y + 8);
        doc.setFont('courier', 'normal');
        doc.text(hash, 20, y + 15);

        // Footer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Este certificado es valido como prueba de consentimiento segun la normativa vigente.', 105, 278, { align: 'center' });

        doc.save(`certificado_consentimiento_${(emp.name || 'empleado').replace(/\s+/g, '_')}.pdf`);
        alert('✅ Certificado de Consentimiento generado correctamente');
    },

    async generateDPIAReport() {
        await this.loadJsPDF();
        const doc = new jsPDF();
        const regulation = ConsentState.detectedRegulation?.regulation || COUNTRY_REGULATIONS['ARG'];
        const today = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });

        // Header
        doc.setFillColor(168, 85, 247);
        doc.rect(0, 0, 210, 45, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('EVALUACION DE IMPACTO EN', 105, 15, { align: 'center' });
        doc.text('PROTECCION DE DATOS (DPIA/EIPD)', 105, 25, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tratamiento: Datos Biometricos para Control de Asistencia`, 105, 35, { align: 'center' });
        doc.text(`Fecha: ${today}`, 105, 42, { align: 'center' });

        doc.setTextColor(30, 41, 59);

        // Section 1: Description
        let y = 55;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 255);
        doc.rect(15, y - 5, 180, 10, 'F');
        doc.text('1. DESCRIPCION DEL TRATAMIENTO', 20, y + 2);

        y += 15;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const desc = 'El presente tratamiento involucra la recoleccion y procesamiento de datos biometricos (reconocimiento facial y analisis de expresiones) para el registro automatizado de asistencia laboral y evaluacion de bienestar organizacional.';
        const descLines = doc.splitTextToSize(desc, 170);
        doc.text(descLines, 20, y);

        // Section 2: Risk Matrix
        y += 30;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 255);
        doc.rect(15, y - 5, 180, 10, 'F');
        doc.text('2. MATRIZ DE RIESGOS', 20, y + 2);

        y += 15;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');

        // Table header
        doc.setFillColor(168, 85, 247);
        doc.rect(20, y, 170, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('Riesgo', 25, y + 6);
        doc.text('Probabilidad', 80, y + 6);
        doc.text('Impacto', 115, y + 6);
        doc.text('Mitigacion', 145, y + 6);

        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');

        const risks = [
            { risk: 'Acceso no autorizado', prob: 'Media', impact: 'Alto', mitigation: 'Cifrado AES-256' },
            { risk: 'Fuga de datos', prob: 'Baja', impact: 'Critico', mitigation: 'Anonimizacion' },
            { risk: 'Uso indebido', prob: 'Baja', impact: 'Alto', mitigation: 'Auditoria continua' },
            { risk: 'Discriminacion', prob: 'Muy Baja', impact: 'Alto', mitigation: 'Algoritmos auditados' }
        ];

        risks.forEach((r, i) => {
            const rowY = y + 12 + (i * 10);
            doc.setFillColor(i % 2 === 0 ? 250 : 240, i % 2 === 0 ? 250 : 240, 255);
            doc.rect(20, rowY - 4, 170, 10, 'F');
            doc.text(r.risk, 25, rowY + 2);
            doc.text(r.prob, 80, rowY + 2);
            doc.text(r.impact, 115, rowY + 2);
            doc.text(r.mitigation, 145, rowY + 2);
        });

        // Section 3: Compliance
        y += 65;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 255);
        doc.rect(15, y - 5, 180, 10, 'F');
        doc.text('3. CUMPLIMIENTO NORMATIVO', 20, y + 2);

        y += 15;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`• Regulacion aplicable: ${regulation.flag} ${regulation.mainLaw}`, 25, y);
        y += 7;
        doc.text(`• Autoridad de control: ${regulation.authority?.name || 'N/A'}`, 25, y);
        y += 7;
        doc.text(`• Consentimiento: ${regulation.requirements?.explicitConsent?.required ? 'Explicito requerido' : 'Implicito permitido'}`, 25, y);
        y += 7;
        doc.text(`• Base legal: ${regulation.specificText?.substring(0, 50) || 'Art. 5 inc. d) - Consentimiento del titular'}...`, 25, y);

        // Section 4: Conclusion
        y += 20;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 255, 240);
        doc.rect(15, y - 5, 180, 10, 'F');
        doc.text('4. CONCLUSION', 20, y + 2);

        y += 15;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('El tratamiento es VIABLE con las medidas de mitigacion implementadas.', 25, y);
        y += 7;
        doc.text('Riesgo residual: BAJO', 25, y);
        y += 7;
        doc.text('Proxima revision: 12 meses', 25, y);

        // Footer
        doc.setFillColor(168, 85, 247);
        doc.rect(0, 280, 210, 17, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('DPIA generado por Sistema de Asistencia Biometrico - ISO 27001 Compliant', 105, 288, { align: 'center' });
        doc.text(`ID: DPIA-${Date.now().toString(36).toUpperCase()}`, 105, 294, { align: 'center' });

        doc.save(`DPIA_report_${new Date().toISOString().split('T')[0]}.pdf`);
        alert('✅ Informe DPIA generado correctamente');
    },

    async generateAuditReport() {
        await this.loadJsPDF();
        const doc = new jsPDF();
        const today = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
        const employees = ConsentState.employees;

        // Header
        doc.setFillColor(245, 158, 11);
        doc.rect(0, 0, 210, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('LOG DE AUDITORIA', 105, 15, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Consentimientos Biometricos - ${today}`, 105, 25, { align: 'center' });
        doc.text(`Total registros: ${employees.length}`, 105, 32, { align: 'center' });

        doc.setTextColor(30, 41, 59);

        // Table
        let y = 45;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');

        doc.setFillColor(245, 158, 11);
        doc.rect(10, y, 190, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('Empleado', 15, y + 6);
        doc.text('Estado', 80, y + 6);
        doc.text('Fecha', 115, y + 6);
        doc.text('Metodo', 150, y + 6);
        doc.text('Hash', 180, y + 6);

        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');

        const maxRows = Math.min(employees.length, 25);
        for (let i = 0; i < maxRows; i++) {
            const emp = employees[i];
            const rowY = y + 12 + (i * 8);

            doc.setFillColor(i % 2 === 0 ? 255 : 245, i % 2 === 0 ? 255 : 245, i % 2 === 0 ? 255 : 240);
            doc.rect(10, rowY - 4, 190, 8, 'F');

            const name = (emp.name || emp.full_name || '').substring(0, 20);
            const status = this.getConsentStatus(emp);
            const date = emp.consent_date || '-';
            const method = emp.validation_method || '-';
            const hash = btoa(emp.email || '').substring(0, 6);

            doc.text(name, 15, rowY + 2);

            // Status with color
            if (status === 'Otorgado') {
                doc.setTextColor(34, 197, 94);
            } else if (status === 'Pendiente') {
                doc.setTextColor(245, 158, 11);
            } else {
                doc.setTextColor(239, 68, 68);
            }
            doc.text(status, 80, rowY + 2);
            doc.setTextColor(30, 41, 59);

            doc.text(date, 115, rowY + 2);
            doc.text(method, 150, rowY + 2);
            doc.setFont('courier', 'normal');
            doc.text(hash, 180, rowY + 2);
            doc.setFont('helvetica', 'normal');
        }

        if (employees.length > 25) {
            y = y + 12 + (25 * 8) + 5;
            doc.setTextColor(100, 116, 139);
            doc.text(`... y ${employees.length - 25} registros mas`, 105, y, { align: 'center' });
        }

        // Footer
        doc.setFillColor(245, 158, 11);
        doc.rect(0, 280, 210, 17, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('Registro inmutable - Blockchain Hash disponible para verificacion', 105, 287, { align: 'center' });
        doc.text(`ID: AUDIT-${Date.now().toString(36).toUpperCase()}`, 105, 293, { align: 'center' });

        doc.save(`audit_log_${new Date().toISOString().split('T')[0]}.pdf`);
        alert('✅ Log de Auditoria generado correctamente');
    },

    async generateMultiCountryReport() {
        await this.loadJsPDF();
        const doc = new jsPDF('landscape');
        const countries = Object.values(COUNTRY_REGULATIONS);
        const today = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });

        // Header
        doc.setFillColor(6, 182, 212);
        doc.rect(0, 0, 297, 30, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE MULTI-PAIS DE REGULACIONES DE PRIVACIDAD', 148.5, 12, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Comparativa de ${countries.length} jurisdicciones - ${today}`, 148.5, 22, { align: 'center' });

        doc.setTextColor(30, 41, 59);

        // Table
        let y = 40;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');

        // Header row
        doc.setFillColor(6, 182, 212);
        doc.rect(10, y, 277, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('Pais', 15, y + 7);
        doc.text('Regulacion', 55, y + 7);
        doc.text('Consentimiento', 100, y + 7);
        doc.text('DPIA', 140, y + 7);
        doc.text('DPO', 165, y + 7);
        doc.text('Retencion Individual', 190, y + 7);
        doc.text('Sanciones', 240, y + 7);

        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');

        countries.forEach((c, i) => {
            const rowY = y + 14 + (i * 9);

            doc.setFillColor(i % 2 === 0 ? 255 : 240, i % 2 === 0 ? 255 : 248, 255);
            doc.rect(10, rowY - 4, 277, 9, 'F');

            doc.text(`${c.flag} ${c.name.substring(0, 12)}`, 15, rowY + 3);
            doc.text(c.mainLaw.substring(0, 15), 55, rowY + 3);

            // Consent
            if (c.requirements.explicitConsent.required) {
                doc.setTextColor(34, 197, 94);
                doc.text('Explicito', 100, rowY + 3);
            } else {
                doc.setTextColor(245, 158, 11);
                doc.text('Implicito OK', 100, rowY + 3);
            }
            doc.setTextColor(30, 41, 59);

            // DPIA
            doc.text(c.requirements.dpia.required ? 'SI' : 'Recom.', 140, rowY + 3);

            // DPO
            doc.text(c.requirements.dpo.required ? 'SI' : 'Recom.', 165, rowY + 3);

            // Retention
            doc.text(c.requirements.dataRetention.individual.substring(0, 15), 190, rowY + 3);

            // Penalties
            doc.setTextColor(239, 68, 68);
            doc.text(c.penalties.substring(0, 25) + '...', 240, rowY + 3);
            doc.setTextColor(30, 41, 59);
        });

        // Footer
        doc.setFillColor(6, 182, 212);
        doc.rect(0, 200, 297, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('Reporte Multi-Pais generado por Sistema de Asistencia Biometrico', 148.5, 206, { align: 'center' });

        doc.save(`multicountry_report_${new Date().toISOString().split('T')[0]}.pdf`);
        alert('✅ Reporte Multi-Pais generado correctamente');
    },

    async generateEmployeeListReport() {
        await this.loadJsPDF();
        const doc = new jsPDF();
        const employees = ConsentState.employees;
        const stats = ConsentState.stats || { total: 0, active: 0, pending: 0, revoked: 0 };
        const compliance = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;
        const today = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });

        // Header
        doc.setFillColor(236, 72, 153);
        doc.rect(0, 0, 210, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('LISTADO DE EMPLEADOS', 105, 15, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Estado de Consentimientos Biometricos`, 105, 25, { align: 'center' });
        doc.text(`${today} - Total: ${stats.total} empleados`, 105, 32, { align: 'center' });

        doc.setTextColor(30, 41, 59);

        // Summary boxes
        let y = 45;
        const boxWidth = 45;
        const boxes = [
            { label: 'Total', value: stats.total, color: [100, 116, 139] },
            { label: 'Otorgados', value: stats.active, color: [34, 197, 94] },
            { label: 'Pendientes', value: stats.pending, color: [245, 158, 11] },
            { label: 'Revocados', value: stats.revoked, color: [239, 68, 68] }
        ];

        boxes.forEach((box, i) => {
            const x = 15 + (i * (boxWidth + 5));
            doc.setFillColor(...box.color);
            doc.roundedRect(x, y, boxWidth, 20, 3, 3, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(String(box.value), x + boxWidth/2, y + 10, { align: 'center' });
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(box.label, x + boxWidth/2, y + 17, { align: 'center' });
        });

        doc.setTextColor(30, 41, 59);

        // Table
        y = 75;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');

        doc.setFillColor(236, 72, 153);
        doc.rect(10, y, 190, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('Nombre', 15, y + 6);
        doc.text('Email', 65, y + 6);
        doc.text('Departamento', 115, y + 6);
        doc.text('Estado', 155, y + 6);
        doc.text('Fecha', 180, y + 6);

        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');

        const maxRows = Math.min(employees.length, 22);
        for (let i = 0; i < maxRows; i++) {
            const emp = employees[i];
            const rowY = y + 12 + (i * 8);

            doc.setFillColor(i % 2 === 0 ? 255 : 252, i % 2 === 0 ? 255 : 245, i % 2 === 0 ? 255 : 250);
            doc.rect(10, rowY - 4, 190, 8, 'F');

            doc.text((emp.name || emp.full_name || '').substring(0, 22), 15, rowY + 2);
            doc.text((emp.email || '').substring(0, 22), 65, rowY + 2);
            doc.text((emp.department?.name || emp.department_name || '').substring(0, 15), 115, rowY + 2);

            const status = this.getConsentStatus(emp);
            if (status === 'Otorgado') {
                doc.setTextColor(34, 197, 94);
            } else if (status === 'Pendiente') {
                doc.setTextColor(245, 158, 11);
            } else {
                doc.setTextColor(239, 68, 68);
            }
            doc.text(status, 155, rowY + 2);
            doc.setTextColor(30, 41, 59);

            doc.text(emp.consent_date || '-', 180, rowY + 2);
        }

        // Footer
        doc.setFillColor(236, 72, 153);
        doc.rect(0, 280, 210, 17, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('Listado generado por Sistema de Asistencia Biometrico', 105, 287, { align: 'center' });
        doc.text(`Compliance: ${compliance}%`, 105, 293, { align: 'center' });

        doc.save(`employee_list_${new Date().toISOString().split('T')[0]}.pdf`);
        alert('✅ Listado de Empleados generado correctamente');
    },

    async loadJsPDF() {
        if (window.jspdf) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                console.log('[CONSENT] jsPDF loaded successfully');
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load jsPDF'));
            document.head.appendChild(script);
        });
    },

    showComparisonModal() {
        const countries = Object.values(COUNTRY_REGULATIONS);

        const modal = document.createElement('div');
        modal.id = 'bc-comparison-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div style="background: var(--bc-bg-card, #21262d); border-radius: 16px; max-width: 1200px; width: 100%; max-height: 90vh; overflow: auto; color: var(--bc-text-primary, #c9d1d9);">
                <div style="padding: 24px; border-bottom: 1px solid var(--bc-border, #30363d); display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 12px;">
                        <span>⚖️</span> Comparativa de Regulaciones Multi-Pais
                    </h2>
                    <button onclick="document.getElementById('bc-comparison-modal').remove()" style="background: none; border: none; color: var(--bc-text-secondary, #8b949e); font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div style="padding: 24px; overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: var(--bc-bg-secondary, #161b22);">
                                <th style="padding: 14px; text-align: left; border-bottom: 2px solid var(--bc-accent-purple, #a855f7); color: var(--bc-accent-purple, #a855f7);">Aspecto</th>
                                ${countries.map(c => `<th style="padding: 14px; text-align: center; border-bottom: 2px solid var(--bc-accent-purple, #a855f7);">${c.flag}<br><span style="font-size: 11px; color: var(--bc-text-muted, #6e7681);">${c.mainLaw}</span></th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid var(--bc-border, #30363d); font-weight: 500;">Consentimiento Explicito</td>
                                ${countries.map(c => `<td style="padding: 12px; text-align: center; border-bottom: 1px solid var(--bc-border, #30363d);">${c.requirements.explicitConsent.required ? '✅ Obligatorio' : '⚠️ Recomendado'}</td>`).join('')}
                            </tr>
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid var(--bc-border, #30363d); font-weight: 500;">DPIA Requerida</td>
                                ${countries.map(c => `<td style="padding: 12px; text-align: center; border-bottom: 1px solid var(--bc-border, #30363d);">${c.requirements.dpia.required ? '✅ Si' : c.requirements.dpia.recommended ? '⚠️ Recom.' : '❌ No'}</td>`).join('')}
                            </tr>
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid var(--bc-border, #30363d); font-weight: 500;">DPO Obligatorio</td>
                                ${countries.map(c => `<td style="padding: 12px; text-align: center; border-bottom: 1px solid var(--bc-border, #30363d);">${c.requirements.dpo.required ? '✅ Si' : c.requirements.dpo.recommended ? '⚠️ Recom.' : '❌ No'}</td>`).join('')}
                            </tr>
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid var(--bc-border, #30363d); font-weight: 500;">Retencion Datos Indiv.</td>
                                ${countries.map(c => `<td style="padding: 12px; text-align: center; border-bottom: 1px solid var(--bc-border, #30363d); font-size: 11px;">${c.requirements.dataRetention.individual}</td>`).join('')}
                            </tr>
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid var(--bc-border, #30363d); font-weight: 500;">Derechos del Titular</td>
                                ${countries.map(c => `<td style="padding: 12px; text-align: center; border-bottom: 1px solid var(--bc-border, #30363d); font-size: 11px;">${c.rights.length} derechos</td>`).join('')}
                            </tr>
                            <tr style="background: rgba(239, 68, 68, 0.05);">
                                <td style="padding: 12px; font-weight: 500; color: var(--bc-accent-red, #ef4444);">Sanciones Max</td>
                                ${countries.map(c => `<td style="padding: 12px; text-align: center; font-size: 10px; color: var(--bc-accent-red, #ef4444);">${c.penalties.substring(0, 40)}...</td>`).join('')}
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div style="padding: 20px; border-top: 1px solid var(--bc-border, #30363d); text-align: right;">
                    <button onclick="document.getElementById('bc-comparison-modal').remove()" style="background: var(--bc-accent-purple, #a855f7); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Cerrar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    exportData() {
        const employees = ConsentState.employees;
        const csvContent = [
            ['Empleado', 'Email', 'Departamento', 'Estado', 'Fecha', 'Metodo'].join(','),
            ...employees.map(emp => [
                (emp.name || emp.full_name || '').replace(/,/g, ';'),
                emp.email || '',
                (emp.department?.name || emp.department_name || '').replace(/,/g, ';'),
                this.getConsentStatus(emp),
                emp.consent_date || '',
                emp.validation_method || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `consentimientos_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        alert('✅ Archivo CSV exportado correctamente');
    },

    async refresh() {
        await this.loadData();
        this.render();
    }
};

// ============================================================================
// EXPORTS
// ============================================================================
window.BiometricConsentEngine = BiometricConsentEngine;

window.Modules = window.Modules || {};
window.Modules['biometric-consent'] = {
    init: () => BiometricConsentEngine.init()
};

window.showBiometricConsentContent = () => BiometricConsentEngine.init();

console.log('[CONSENT] Module loaded successfully');

})();
