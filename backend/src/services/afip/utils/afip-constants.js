/**
 * ============================================================================
 * AFIP CONSTANTS - Códigos y Constantes de AFIP
 * ============================================================================
 *
 * Códigos oficiales de AFIP para facturación electrónica.
 * Fuente: Manual Desarrollador ARCA COMPG v4.0
 *
 * Created: 2025-01-20
 */

/**
 * Tipos de Comprobante
 */
const TIPOS_COMPROBANTE = {
    FACTURA_A: 1,
    NOTA_DEBITO_A: 2,
    NOTA_CREDITO_A: 3,
    RECIBO_A: 4,
    FACTURA_B: 6,
    NOTA_DEBITO_B: 7,
    NOTA_CREDITO_B: 8,
    RECIBO_B: 9,
    FACTURA_C: 11,
    NOTA_DEBITO_C: 12,
    NOTA_CREDITO_C: 13,
    RECIBO_C: 15,
    FACTURA_M: 51,
    NOTA_DEBITO_M: 52,
    NOTA_CREDITO_M: 53,
    RECIBO_M: 54
};

/**
 * Descripción de Tipos de Comprobante
 */
const TIPOS_COMPROBANTE_DESCRIPCION = {
    1: 'Factura A',
    2: 'Nota de Débito A',
    3: 'Nota de Crédito A',
    4: 'Recibo A',
    6: 'Factura B',
    7: 'Nota de Débito B',
    8: 'Nota de Crédito B',
    9: 'Recibo B',
    11: 'Factura C',
    12: 'Nota de Débito C',
    13: 'Nota de Crédito C',
    15: 'Recibo C',
    51: 'Factura M',
    52: 'Nota de Débito M',
    53: 'Nota de Crédito M',
    54: 'Recibo M'
};

/**
 * Tipos de Documento de Identidad
 */
const TIPOS_DOCUMENTO = {
    CUIT: 80,
    CUIL: 86,
    CDI: 87,
    LE: 89,
    LC: 90,
    CI_EXTRANJERA: 91,
    RUC: 94,
    DNI: 96,
    PASAPORTE: 94,
    CONSUMIDOR_FINAL: 99,
    CEDULA: 92,
    SIN_IDENTIFICAR: 0
};

/**
 * Descripción de Tipos de Documento
 */
const TIPOS_DOCUMENTO_DESCRIPCION = {
    80: 'CUIT',
    86: 'CUIL',
    87: 'CDI',
    89: 'LE',
    90: 'LC',
    91: 'CI Extranjera',
    94: 'RUC',
    96: 'DNI',
    92: 'Cédula',
    99: 'Consumidor Final',
    0: 'Sin Identificar/Documento Extranjero'
};

/**
 * Alícuotas de IVA
 */
const ALICUOTAS_IVA = {
    IVA_0: 3,      // 0%
    IVA_10_5: 4,   // 10.5%
    IVA_21: 5,     // 21%
    IVA_27: 6,     // 27%
    IVA_5: 8,      // 5%
    IVA_2_5: 9     // 2.5%
};

/**
 * Descripción de Alícuotas de IVA
 */
const ALICUOTAS_IVA_DESCRIPCION = {
    3: '0%',
    4: '10.5%',
    5: '21%',
    6: '27%',
    8: '5%',
    9: '2.5%'
};

/**
 * Valores reales de las alícuotas
 */
const ALICUOTAS_IVA_VALORES = {
    3: 0,
    4: 10.5,
    5: 21,
    6: 27,
    8: 5,
    9: 2.5
};

/**
 * Conceptos de Facturación
 */
const CONCEPTOS = {
    PRODUCTOS: 1,
    SERVICIOS: 2,
    PRODUCTOS_Y_SERVICIOS: 3
};

/**
 * Descripción de Conceptos
 */
const CONCEPTOS_DESCRIPCION = {
    1: 'Productos',
    2: 'Servicios',
    3: 'Productos y Servicios'
};

/**
 * Tipos de Moneda
 */
const TIPOS_MONEDA = {
    PES: 'PES',  // Peso Argentino
    DOL: 'DOL',  // Dólar Estadounidense
    002: '002',  // Dólar Estadounidense (código numérico)
    014: '014',  // Peso Uruguayo
    032: '032',  // Peso Chileno
    033: '033',  // Real Brasileño
    060: '060'   // Euro
};

/**
 * Descripción de Tipos de Moneda
 */
const TIPOS_MONEDA_DESCRIPCION = {
    'PES': 'Peso Argentino',
    'DOL': 'Dólar Estadounidense',
    '002': 'Dólar Estadounidense',
    '014': 'Peso Uruguayo',
    '032': 'Peso Chileno',
    '033': 'Real Brasileño',
    '060': 'Euro'
};

/**
 * Códigos de Resultado de AFIP
 */
const RESULTADOS_AFIP = {
    APROBADO: 'A',
    PARCIAL: 'P',
    RECHAZADO: 'R'
};

/**
 * Estados de CAE
 */
const ESTADOS_CAE = {
    PENDIENTE: 'PENDIENTE',
    APROBADO: 'APROBADO',
    RECHAZADO: 'RECHAZADO',
    ERROR: 'ERROR'
};

/**
 * Códigos de Tributo
 */
const TRIBUTOS = {
    IVA: 1,
    IMPUESTOS_NACIONALES: 2,
    IMPUESTOS_PROVINCIALES: 3,
    IMPUESTOS_MUNICIPALES: 4,
    IMPUESTOS_INTERNOS: 5,
    PERCEPCION_IIBB: 6,
    PERCEPCION_IVA: 7,
    PERCEPCION_GANANCIAS: 8,
    OTROS: 99
};

/**
 * Condiciones ante IVA
 */
const CONDICIONES_IVA = {
    RI: 'RESPONSABLE_INSCRIPTO',
    RM: 'RESPONSABLE_MONOTRIBUTO',
    EX: 'EXENTO',
    CF: 'CONSUMIDOR_FINAL',
    NR: 'NO_RESPONSABLE',
    MT: 'MONOTRIBUTO'
};

/**
 * Condiciones ante IVA - Descripción
 */
const CONDICIONES_IVA_DESCRIPCION = {
    'RESPONSABLE_INSCRIPTO': 'Responsable Inscripto',
    'RESPONSABLE_MONOTRIBUTO': 'Responsable Monotributo',
    'EXENTO': 'Exento',
    'CONSUMIDOR_FINAL': 'Consumidor Final',
    'NO_RESPONSABLE': 'No Responsable',
    'MONOTRIBUTO': 'Monotributo'
};

/**
 * Endpoints AFIP
 */
const ENDPOINTS = {
    WSAA: {
        TESTING: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl',
        PRODUCTION: 'https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl'
    },
    WSFE: {
        TESTING: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL',
        PRODUCTION: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
    },
    WSFEX: {
        TESTING: 'https://wswhomo.afip.gov.ar/wsfexv1/service.asmx?WSDL',
        PRODUCTION: 'https://servicios1.afip.gov.ar/wsfexv1/service.asmx?WSDL'
    }
};

/**
 * Servicios de WSAA
 */
const SERVICIOS_WSAA = {
    WSFE: 'wsfe',       // Facturación Electrónica v1
    WSFEX: 'wsfexv1',   // Facturación Electrónica Exportación
    WSMTXCA: 'wsmtxca', // Facturación Electrónica con detalle
    WSBFE: 'wsbfe',     // Bono Fiscal Electrónico
    WSCDC: 'wscdc'      // Constatación de Comprobantes
};

/**
 * Códigos de Error Comunes de AFIP
 */
const ERRORES_COMUNES = {
    600: 'Token expirado',
    601: 'CUIT no autorizado',
    602: 'Error de firma',
    10001: 'CUIT inválido',
    10002: 'Punto de venta no habilitado',
    10003: 'Número de comprobante duplicado',
    10004: 'Fecha inválida',
    10005: 'IVA no cuadra',
    10006: 'Tipo de documento inválido',
    10007: 'Número de documento inválido',
    10008: 'Tipo de comprobante no autorizado'
};

/**
 * Helper: Obtener código de alícuota IVA por porcentaje
 */
function getAlicuotaIVACode(percentage) {
    const alicuotasMap = {
        0: ALICUOTAS_IVA.IVA_0,
        10.5: ALICUOTAS_IVA.IVA_10_5,
        21: ALICUOTAS_IVA.IVA_21,
        27: ALICUOTAS_IVA.IVA_27,
        5: ALICUOTAS_IVA.IVA_5,
        2.5: ALICUOTAS_IVA.IVA_2_5
    };

    return alicuotasMap[percentage] || ALICUOTAS_IVA.IVA_21; // Default 21%
}

/**
 * Helper: Obtener porcentaje de alícuota IVA por código
 */
function getAlicuotaIVAPercentage(code) {
    return ALICUOTAS_IVA_VALORES[code] || 21;
}

/**
 * Helper: Validar CUIT
 */
function validarCUIT(cuit) {
    // Remover guiones si existen
    const cuitLimpio = cuit.replace(/-/g, '');

    // Verificar longitud
    if (cuitLimpio.length !== 11) {
        return false;
    }

    // Verificar que sean solo números
    if (!/^\d+$/.test(cuitLimpio)) {
        return false;
    }

    // Validar dígito verificador
    const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;

    for (let i = 0; i < 10; i++) {
        suma += parseInt(cuitLimpio[i]) * multiplicadores[i];
    }

    const resto = suma % 11;
    const digitoVerificador = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;

    return digitoVerificador === parseInt(cuitLimpio[10]);
}

/**
 * Helper: Formatear CUIT con guiones
 */
function formatearCUIT(cuit) {
    const cuitLimpio = cuit.replace(/-/g, '');

    if (cuitLimpio.length === 11) {
        return `${cuitLimpio.substring(0, 2)}-${cuitLimpio.substring(2, 10)}-${cuitLimpio.substring(10)}`;
    }

    return cuit;
}

/**
 * Helper: Determinar tipo de comprobante según condiciones IVA
 */
function determinarTipoComprobante(emisorCondicionIVA, receptorCondicionIVA) {
    // Responsable Inscripto → Responsable Inscripto = Factura A
    if (emisorCondicionIVA === 'RESPONSABLE_INSCRIPTO' && receptorCondicionIVA === 'RESPONSABLE_INSCRIPTO') {
        return TIPOS_COMPROBANTE.FACTURA_A;
    }

    // Responsable Inscripto → Consumidor Final/Monotributo = Factura B
    if (emisorCondicionIVA === 'RESPONSABLE_INSCRIPTO' &&
        (receptorCondicionIVA === 'CONSUMIDOR_FINAL' || receptorCondicionIVA === 'RESPONSABLE_MONOTRIBUTO')) {
        return TIPOS_COMPROBANTE.FACTURA_B;
    }

    // Monotributo → Cualquiera = Factura C
    if (emisorCondicionIVA === 'RESPONSABLE_MONOTRIBUTO') {
        return TIPOS_COMPROBANTE.FACTURA_C;
    }

    // Por defecto: Factura B
    return TIPOS_COMPROBANTE.FACTURA_B;
}

module.exports = {
    TIPOS_COMPROBANTE,
    TIPOS_COMPROBANTE_DESCRIPCION,
    TIPOS_DOCUMENTO,
    TIPOS_DOCUMENTO_DESCRIPCION,
    ALICUOTAS_IVA,
    ALICUOTAS_IVA_DESCRIPCION,
    ALICUOTAS_IVA_VALORES,
    CONCEPTOS,
    CONCEPTOS_DESCRIPCION,
    TIPOS_MONEDA,
    TIPOS_MONEDA_DESCRIPCION,
    RESULTADOS_AFIP,
    ESTADOS_CAE,
    TRIBUTOS,
    CONDICIONES_IVA,
    CONDICIONES_IVA_DESCRIPCION,
    ENDPOINTS,
    SERVICIOS_WSAA,
    ERRORES_COMUNES,
    // Helpers
    getAlicuotaIVACode,
    getAlicuotaIVAPercentage,
    validarCUIT,
    formatearCUIT,
    determinarTipoComprobante
};
