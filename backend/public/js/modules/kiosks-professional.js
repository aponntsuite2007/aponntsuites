/**
 * 📟 KIOSKS MODULE - PROFESSIONAL EDITION
 * ========================================
 * Sistema de Gestión de Kioscos Biométricos
 * Diseño de Alto Impacto Profesional
 *
 * @version 2.0.0
 * @author Sistema Biométrico Enterprise
 * @date 2024-10-18
 */

console.log('📟 [KIOSKS-PRO] Módulo profesional de kioscos cargado');

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

if (typeof window.kiosksList === 'undefined') {
    window.kiosksList = [];
}
if (typeof window.editingKiosk === 'undefined') {
    window.editingKiosk = null;
}
if (typeof window.selectedHardwareFacial === 'undefined') {
    window.selectedHardwareFacial = null;
}
if (typeof window.selectedHardwareFingerprint === 'undefined') {
    window.selectedHardwareFingerprint = null;
}

var kiosksList = window.kiosksList;
var editingKiosk = window.editingKiosk;

// ============================================================================
// LOGOS SVG EMBEDIDOS (Alta Resolución)
// ============================================================================

// Evitar redeclaración si el módulo se carga múltiples veces
if (typeof window.KIOSK_LOGOS !== 'undefined') {
    console.log('📟 [KIOSKS-PRO] Módulo ya cargado, usando instancia existente');
}
window.KIOSK_LOGOS = window.KIOSK_LOGOS || {
    apple: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>`,

    samsung: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 4h-15A2.5 2.5 0 0 0 2 6.5v11A2.5 2.5 0 0 0 4.5 20h15a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 19.5 4zm-7.25 11.5c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>`,

    nvidia: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#76B900"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.82 7 12 10.82 4.18 7 12 4.18zM4 8.68l7 3.5v7.64l-7-3.5V8.68zm16 0v7.64l-7 3.5v-7.64l7-3.5z"/></svg>`,

    xiaomi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF6900"><path d="M19.96 20a.08.08 0 0 1-.08.08h-3.8a.08.08 0 0 1-.08-.08V8.96c0-.71-.58-1.29-1.29-1.29H13.5c-.71 0-1.29.58-1.29 1.29V20a.08.08 0 0 1-.08.08h-3.8a.08.08 0 0 1-.08-.08V8.96c0-.71-.58-1.29-1.29-1.29H5.75c-.71 0-1.29.58-1.29 1.29V20a.08.08 0 0 1-.08.08H.58A.08.08 0 0 1 .5 20V8.96C.5 6.23 2.73 4 5.46 4h13.08c2.73 0 4.96 2.23 4.96 4.96V20z"/></svg>`,

    lenovo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E2231A"><path d="M3 6h18v2H3V6zm0 4h18v2H3v-2zm0 4h12v2H3v-2zm14 0h4v2h-4v-2z"/></svg>`,

    motorola: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#5C92FA"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6" fill="#fff"/><circle cx="12" cy="12" r="3"/></svg>`,

    raspberrypi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#C51A4A"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`,

    google: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`,

    suprema: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0066CC"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.82 7 12 10.82 4.18 7 12 4.18zM4 8.68l7 3.5v7.64l-7-3.5V8.68zm16 0v7.64l-7 3.5v-7.64l7-3.5z"/></svg>`,

    zkteco: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E31937"><path d="M3 4h18v3H3V4zm0 5h18v2H3V9zm0 4h18v2H3v-2zm0 4h18v3H3v-3z"/></svg>`,

    hid: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#003DA5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2" fill="#fff"/><circle cx="16" cy="12" r="2" fill="#fff"/></svg>`,

    secugen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1E88E5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="#fff"/></svg>`
};
// Local alias for backward compatibility (use var to allow redeclaration)
var LOGOS = window.KIOSK_LOGOS;

// ============================================================================
// PERFILES DE HARDWARE - RECONOCIMIENTO FACIAL
// ============================================================================

// Evitar redeclaración
if (typeof window.HARDWARE_FACIAL_PROFILES !== 'undefined') {
    console.log('📟 [KIOSKS-PRO] HARDWARE_FACIAL_PROFILES ya existe, saltando');
}
window.HARDWARE_FACIAL_PROFILES = window.HARDWARE_FACIAL_PROFILES || {
    // ========================================================================
    // ENTERPRISE - Hardware Dedicado con IA
    // ========================================================================
    nvidia_jetson_orin_nano: {
        id: 'nvidia_jetson_orin_nano',
        name: 'NVIDIA Jetson Orin Nano',
        brand: 'NVIDIA',
        logo: LOGOS.nvidia,
        category: 'enterprise',
        categoryName: 'Enterprise - IA Dedicada',
        type: 'hardware_dedicado',
        performance: 100,

        specs: {
            processor: 'NVIDIA Ampere (1024 CUDA cores)',
            ai_performance: '40 TOPS',
            memory: '8GB LPDDR5',
            technology: 'TensorFlow Lite + TensorRT (GPU optimizado)',
            fps: '60+',
            latency: '<30ms',
            precision: '97-99%'
        },

        walkthrough: true,
        walkthroughSpeed: 'Velocidad normal de caminata (1-1.5 m/s)',
        liveness: true,
        livenessType: '3D Depth Analysis + Anti-spoofing',
        offline: true,

        price: {
            usd: 499,
            ars: '500.000',
            range: 'USD $499'
        },

        availability: {
            argentina: true,
            sources: ['DigiKey Argentina', 'MercadoLibre', 'Electrocomponentes']
        },

        pros: [
            'Máxima performance del mercado',
            'Walk-through real sin detenerse',
            '40 TOPS de procesamiento IA',
            'Liveness detection nativo por hardware',
            'Modo offline completo',
            'Certificación industrial'
        ],

        cons: [
            'Requiere setup técnico inicial',
            'Mayor consumo energético (10-20W)',
            'Necesita carcasa/mount custom'
        ],

        recommended: true,
        useCase: 'Entornos de alto tráfico con walk-through real',
        certifications: ['Industrial', 'FCC', 'CE']
    },

    nvidia_jetson_nano: {
        id: 'nvidia_jetson_nano',
        name: 'NVIDIA Jetson Nano',
        brand: 'NVIDIA',
        logo: LOGOS.nvidia,
        category: 'enterprise',
        categoryName: 'Enterprise - IA Dedicada',
        type: 'hardware_dedicado',
        performance: 85,

        specs: {
            processor: 'NVIDIA Maxwell (128 CUDA cores)',
            ai_performance: '472 GFLOPS',
            memory: '4GB LPDDR4',
            technology: 'TensorFlow Lite + TensorRT',
            fps: '30-60',
            latency: '<50ms',
            precision: '95-97%'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio (0.5-1 m/s)',
        liveness: true,
        livenessType: 'Heurístico + ML',
        offline: true,

        price: {
            usd: 99,
            ars: '100.000',
            range: 'USD $99'
        },

        availability: {
            argentina: true,
            sources: ['MercadoLibre', 'Electrocomponentes']
        },

        pros: [
            'Excelente relación precio/performance',
            'Comunidad activa y soporte',
            'Consumo energético bajo (5-10W)',
            'Modo offline',
            'Fácil de integrar'
        ],

        cons: [
            'Performance menor que Orin',
            'Walk-through requiere caminar despacio',
            'Liveness no es hardware-based'
        ],

        recommended: true,
        useCase: 'Kiosks estándar con buen presupuesto',
        certifications: ['FCC', 'CE']
    },

    raspberry_pi5_coral: {
        id: 'raspberry_pi5_coral',
        name: 'Raspberry Pi 5 + Google Coral TPU',
        brand: 'Raspberry Pi + Google',
        logo: LOGOS.raspberrypi,
        secondaryLogo: LOGOS.google,
        category: 'enterprise',
        categoryName: 'Enterprise - IA Dedicada',
        type: 'hardware_dedicado',
        performance: 82,

        specs: {
            processor: 'Broadcom BCM2712 (Quad-core ARM)',
            ai_performance: '4 TOPS (Coral TPU)',
            memory: '8GB LPDDR4X',
            technology: 'TensorFlow Lite + Edge TPU',
            fps: '30-60',
            latency: '<80ms',
            precision: '94-96%'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio (0.5-1 m/s)',
        liveness: true,
        livenessType: 'Heurístico ML',
        offline: true,

        price: {
            usd: 150,
            ars: '150.000',
            range: 'USD $150 (Pi 5 + Coral USB)'
        },

        availability: {
            argentina: true,
            sources: ['MercadoLibre', 'Importación directa']
        },

        pros: [
            'Muy económico para IA dedicada',
            'Gran comunidad Raspberry Pi',
            'Fácil de programar (Python)',
            'Bajo consumo (5W)',
            'Modo offline'
        ],

        cons: [
            'Performance limitada vs NVIDIA',
            'Requiere montaje custom',
            'USB Coral puede desconectarse'
        ],

        recommended: false,
        useCase: 'Proyectos DIY o presupuesto ajustado',
        certifications: ['CE', 'FCC']
    },

    // ========================================================================
    // TABLETS iOS - GAMA ALTA
    // ========================================================================
    ipad_pro_11_m2: {
        id: 'ipad_pro_11_m2',
        name: 'iPad Pro 11" (M2 - 2022)',
        brand: 'Apple',
        logo: LOGOS.apple,
        category: 'tablet_ios_high',
        categoryName: 'Tablet iOS - Gama Alta',
        type: 'tablet',
        performance: 95,

        specs: {
            processor: 'Apple M2 (8-core CPU, 10-core GPU)',
            ai_performance: '15.8 TOPS (Neural Engine)',
            memory: '8GB / 16GB RAM',
            technology: 'Core ML + Vision Framework + Face ID',
            fps: '60',
            latency: '<50ms',
            precision: '98-99%',
            display: '11" Liquid Retina (2388x1668)',
            camera: 'TrueDepth 12MP (Face ID)'
        },

        walkthrough: true,
        walkthroughSpeed: 'Velocidad normal de caminata',
        liveness: true,
        livenessType: 'TrueDepth 3D (Face ID nativo)',
        offline: true,

        price: {
            usd: 799,
            ars: '1.200.000 - 1.500.000',
            range: '$1.2M - $1.5M ARS'
        },

        availability: {
            argentina: true,
            sources: ['Apple Store', 'Retailers oficiales', 'MercadoLibre']
        },

        pros: [
            'Face ID TrueDepth (mejor sensor del mercado)',
            'Neural Engine M2 (15.8 TOPS)',
            'Liveness detection nativo por hardware',
            'Walk-through real',
            'Pantalla premium',
            'Soporte long-term de Apple',
            'Modo offline completo'
        ],

        cons: [
            'Precio alto',
            'Ecosystem cerrado Apple',
            'Requiere desarrollo iOS/Flutter'
        ],

        recommended: true,
        useCase: 'Kiosks premium con máxima precisión',
        certifications: ['Apple', 'CE', 'FCC']
    },

    ipad_pro_129_m2: {
        id: 'ipad_pro_129_m2',
        name: 'iPad Pro 12.9" (M2 - 2022)',
        brand: 'Apple',
        logo: LOGOS.apple,
        category: 'tablet_ios_high',
        categoryName: 'Tablet iOS - Gama Alta',
        type: 'tablet',
        performance: 96,

        specs: {
            processor: 'Apple M2 (8-core CPU, 10-core GPU)',
            ai_performance: '15.8 TOPS (Neural Engine)',
            memory: '8GB / 16GB RAM',
            technology: 'Core ML + Vision Framework + Face ID',
            fps: '60',
            latency: '<50ms',
            precision: '98-99%',
            display: '12.9" Liquid Retina XDR (2732x2048)',
            camera: 'TrueDepth 12MP (Face ID)'
        },

        walkthrough: true,
        walkthroughSpeed: 'Velocidad normal de caminata',
        liveness: true,
        livenessType: 'TrueDepth 3D (Face ID nativo)',
        offline: true,

        price: {
            usd: 1099,
            ars: '1.500.000 - 1.800.000',
            range: '$1.5M - $1.8M ARS'
        },

        availability: {
            argentina: true,
            sources: ['Apple Store', 'Retailers oficiales']
        },

        pros: [
            'Pantalla XDR más grande (mejor visibilidad)',
            'Mismo Face ID TrueDepth que 11"',
            'Neural Engine M2',
            'Walk-through real',
            'Display premium para UI/UX'
        ],

        cons: [
            'Precio muy alto',
            'Tamaño grande (puede ser excesivo)',
            'Mayor consumo de batería'
        ],

        recommended: false,
        useCase: 'Kiosks con UI/UX avanzada',
        certifications: ['Apple', 'CE', 'FCC']
    },

    ipad_air_m1: {
        id: 'ipad_air_m1',
        name: 'iPad Air 11" (M1 - 2022)',
        brand: 'Apple',
        logo: LOGOS.apple,
        category: 'tablet_ios_high',
        categoryName: 'Tablet iOS - Gama Alta',
        type: 'tablet',
        performance: 88,

        specs: {
            processor: 'Apple M1 (8-core CPU, 8-core GPU)',
            ai_performance: '11 TOPS (Neural Engine)',
            memory: '8GB RAM',
            technology: 'Core ML + Vision Framework (NO Face ID)',
            fps: '60',
            latency: '<70ms',
            precision: '95-97%',
            display: '10.9" Liquid Retina (2360x1640)',
            camera: '12MP Ultra Wide frontal'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio',
        liveness: true,
        livenessType: 'Heurístico (NO tiene TrueDepth)',
        offline: true,

        price: {
            usd: 599,
            ars: '800.000 - 1.000.000',
            range: '$800k - $1M ARS'
        },

        availability: {
            argentina: true,
            sources: ['Apple Store', 'Retailers', 'MercadoLibre']
        },

        pros: [
            'Neural Engine M1 (potente)',
            'Más económico que Pro',
            'Buen rendimiento general',
            'Modo offline'
        ],

        cons: [
            'NO tiene Face ID TrueDepth',
            'Liveness limitado (solo software)',
            'Cámara frontal básica vs Pro'
        ],

        recommended: false,
        useCase: 'Presupuesto medio con iOS',
        certifications: ['Apple', 'CE', 'FCC']
    },

    ipad_gen10: {
        id: 'ipad_gen10',
        name: 'iPad (10ª generación - 2022)',
        brand: 'Apple',
        logo: LOGOS.apple,
        category: 'tablet_ios_mid',
        categoryName: 'Tablet iOS - Gama Media',
        type: 'tablet',
        performance: 70,

        specs: {
            processor: 'Apple A14 Bionic (6-core)',
            ai_performance: 'Neural Engine Gen 4',
            memory: '4GB RAM',
            technology: 'Core ML + Vision Framework',
            fps: '30-60 (variable)',
            latency: '<150ms',
            precision: '92-95%',
            display: '10.9" Liquid Retina (2360x1640)',
            camera: '12MP Ultra Wide frontal'
        },

        walkthrough: false,
        walkthroughSpeed: 'Requiere detenerse',
        liveness: false,
        livenessType: 'No disponible',
        offline: true,

        price: {
            usd: 449,
            ars: '500.000 - 650.000',
            range: '$500k - $650k ARS'
        },

        availability: {
            argentina: true,
            sources: ['Apple Store', 'Retailers', 'MercadoLibre']
        },

        pros: [
            'Más económico del lineup iPad',
            'Ecosystem Apple',
            'Suficiente para uso básico',
            'Pantalla decente'
        ],

        cons: [
            'NO tiene Face ID ni TrueDepth',
            'Chip A14 (no M1/M2)',
            'Usuarios deben detenerse',
            'Performance limitada',
            'No tiene liveness'
        ],

        recommended: false,
        useCase: 'Solo si presupuesto es muy limitado',
        certifications: ['Apple', 'CE', 'FCC']
    }

,

    // ========================================================================
    // TABLETS ANDROID - GAMA ALTA
    // ========================================================================
    samsung_tab_s9_ultra: {
        id: 'samsung_tab_s9_ultra',
        name: 'Samsung Galaxy Tab S9 Ultra',
        brand: 'Samsung',
        logo: LOGOS.samsung,
        category: 'tablet_android_high',
        categoryName: 'Tablet Android - Gama Alta',
        type: 'tablet',
        performance: 88,

        specs: {
            processor: 'Snapdragon 8 Gen 2 (Octa-core)',
            ai_performance: 'Hexagon NPU',
            memory: '12GB / 16GB RAM',
            technology: 'Google ML Kit Enhanced + TensorFlow Lite',
            fps: '60',
            latency: '<90ms',
            precision: '95-97%',
            display: '14.6" AMOLED (2960x1848)',
            camera: '12MP Ultra Wide frontal'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio (0.5-1 m/s)',
        liveness: true,
        livenessType: 'Heurístico (detección foto vs real)',
        offline: true,

        price: {
            usd: 1199,
            ars: '1.000.000 - 1.200.000',
            range: '$1M - $1.2M ARS'
        },

        availability: {
            argentina: true,
            sources: ['Samsung Store', 'Retailers', 'MercadoLibre']
        },

        pros: [
            'Snapdragon 8 Gen 2 (flagship)',
            'Pantalla AMOLED gigante (14.6")',
            'RAM hasta 16GB',
            'Buen precio vs iPad Pro',
            'S Pen incluido',
            'Modo offline'
        ],

        cons: [
            'Liveness no es hardware-based',
            'Performance menor a iPad Pro M2',
            'Cámara frontal básica vs TrueDepth',
            'One UI puede tener bloatware'
        ],

        recommended: true,
        useCase: 'Kiosks Android premium con pantalla grande',
        certifications: ['Samsung Knox', 'CE', 'FCC']
    },

    samsung_tab_s9_plus: {
        id: 'samsung_tab_s9_plus',
        name: 'Samsung Galaxy Tab S9+',
        brand: 'Samsung',
        logo: LOGOS.samsung,
        category: 'tablet_android_high',
        categoryName: 'Tablet Android - Gama Alta',
        type: 'tablet',
        performance: 85,

        specs: {
            processor: 'Snapdragon 8 Gen 2',
            ai_performance: 'Hexagon NPU',
            memory: '8GB / 12GB RAM',
            technology: 'Google ML Kit Enhanced + TensorFlow Lite',
            fps: '60',
            latency: '<100ms',
            precision: '95-97%',
            display: '12.4" AMOLED (2800x1752)',
            camera: '12MP Ultra Wide frontal'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio',
        liveness: true,
        livenessType: 'Heurístico',
        offline: true,

        price: {
            usd: 999,
            ars: '800.000 - 1.000.000',
            range: '$800k - $1M ARS'
        },

        availability: {
            argentina: true,
            sources: ['Samsung Store', 'Retailers', 'MercadoLibre']
        },

        pros: [
            'Snapdragon 8 Gen 2',
            'Pantalla AMOLED premium',
            'Buen tamaño (12.4")',
            'S Pen incluido',
            'Precio competitivo'
        ],

        cons: [
            'Liveness limitado',
            'No tiene Face ID equivalente',
            'Performance menor a Ultra'
        ],

        recommended: true,
        useCase: 'Balance perfecto precio/tamaño Android',
        certifications: ['Samsung Knox', 'CE']
    },

    samsung_tab_s8_plus: {
        id: 'samsung_tab_s8_plus',
        name: 'Samsung Galaxy Tab S8+',
        brand: 'Samsung',
        logo: LOGOS.samsung,
        category: 'tablet_android_high',
        categoryName: 'Tablet Android - Gama Alta',
        type: 'tablet',
        performance: 82,

        specs: {
            processor: 'Snapdragon 8 Gen 1',
            ai_performance: 'Hexagon NPU Gen 7',
            memory: '8GB / 12GB RAM',
            technology: 'Google ML Kit + TensorFlow Lite',
            fps: '60',
            latency: '<110ms',
            precision: '94-96%',
            display: '12.4" AMOLED (2800x1752)',
            camera: '12MP frontal'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio',
        liveness: true,
        livenessType: 'Heurístico',
        offline: true,

        price: {
            usd: 799,
            ars: '600.000 - 800.000',
            range: '$600k - $800k ARS'
        },

        availability: {
            argentina: true,
            sources: ['MercadoLibre', 'Retailers']
        },

        pros: [
            'Más económico que S9+',
            'Snapdragon 8 Gen 1 (potente)',
            'Pantalla AMOLED excelente',
            'S Pen incluido'
        ],

        cons: [
            'Generación anterior',
            'Liveness básico',
            'Performance menor a S9'
        ],

        recommended: false,
        useCase: 'Presupuesto ajustado con Android',
        certifications: ['Samsung Knox', 'CE']
    },

    lenovo_tab_p12_pro: {
        id: 'lenovo_tab_p12_pro',
        name: 'Lenovo Tab P12 Pro',
        brand: 'Lenovo',
        logo: LOGOS.lenovo,
        category: 'tablet_android_high',
        categoryName: 'Tablet Android - Gama Alta',
        type: 'tablet',
        performance: 80,

        specs: {
            processor: 'Snapdragon 870 (Octa-core)',
            ai_performance: 'Hexagon NPU',
            memory: '6GB / 8GB RAM',
            technology: 'Google ML Kit + TensorFlow Lite',
            fps: '60',
            latency: '<120ms',
            precision: '93-95%',
            display: '12.6" AMOLED (2560x1600)',
            camera: '8MP + IR frontal'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio',
        liveness: false,
        livenessType: 'No disponible',
        offline: true,

        price: {
            usd: 599,
            ars: '500.000 - 700.000',
            range: '$500k - $700k ARS'
        },

        availability: {
            argentina: true,
            sources: ['Lenovo Store', 'MercadoLibre']
        },

        pros: [
            'Precio competitivo',
            'Pantalla AMOLED grande',
            'Snapdragon 870 (mid-flagship)',
            'Cámara IR para reconocimiento facial'
        ],

        cons: [
            'No tiene liveness',
            'Performance menor a Samsung',
            'Menos disponibilidad en Argentina'
        ],

        recommended: false,
        useCase: 'Alternativa económica Android',
        certifications: ['CE', 'FCC']
    },

    // ========================================================================
    // TABLETS ANDROID - GAMA MEDIA
    // ========================================================================
    samsung_tab_a9_plus: {
        id: 'samsung_tab_a9_plus',
        name: 'Samsung Galaxy Tab A9+',
        brand: 'Samsung',
        logo: LOGOS.samsung,
        category: 'tablet_android_mid',
        categoryName: 'Tablet Android - Gama Media',
        type: 'tablet',
        performance: 60,

        specs: {
            processor: 'Snapdragon 695 5G',
            ai_performance: 'NPU básico',
            memory: '4GB / 8GB RAM',
            technology: 'Google ML Kit Standard',
            fps: '30',
            latency: '<200ms',
            precision: '90-93%',
            display: '11" LCD (1920x1200)',
            camera: '5MP frontal'
        },

        walkthrough: false,
        walkthroughSpeed: 'Requiere detenerse',
        liveness: false,
        livenessType: 'No disponible',
        offline: true,

        price: {
            usd: 299,
            ars: '350.000 - 450.000',
            range: '$350k - $450k ARS'
        },

        availability: {
            argentina: true,
            sources: ['Samsung Store', 'Retailers', 'MercadoLibre']
        },

        pros: [
            'Muy económico',
            'Pantalla grande (11")',
            'Batería duradera',
            'Disponibilidad alta'
        ],

        cons: [
            'Snapdragon 695 (gama media)',
            'Usuarios deben detenerse',
            'Cámara frontal básica (5MP)',
            'No tiene liveness',
            'Performance limitada'
        ],

        recommended: false,
        useCase: 'Solo si presupuesto es muy limitado',
        certifications: ['CE']
    },

    lenovo_tab_p11_gen2: {
        id: 'lenovo_tab_p11_gen2',
        name: 'Lenovo Tab P11 Gen 2',
        brand: 'Lenovo',
        logo: LOGOS.lenovo,
        category: 'tablet_android_mid',
        categoryName: 'Tablet Android - Gama Media',
        type: 'tablet',
        performance: 58,

        specs: {
            processor: 'MediaTek Helio G99',
            ai_performance: 'NPU básico',
            memory: '4GB / 6GB RAM',
            technology: 'Google ML Kit Standard',
            fps: '30',
            latency: '<220ms',
            precision: '88-92%',
            display: '11.5" LCD (2000x1200)',
            camera: '8MP frontal'
        },

        walkthrough: false,
        walkthroughSpeed: 'Requiere detenerse',
        liveness: false,
        livenessType: 'No disponible',
        offline: true,

        price: {
            usd: 249,
            ars: '300.000 - 400.000',
            range: '$300k - $400k ARS'
        },

        availability: {
            argentina: true,
            sources: ['Lenovo Store', 'MercadoLibre']
        },

        pros: [
            'Precio muy accesible',
            'Pantalla decente',
            'Batería grande'
        ],

        cons: [
            'MediaTek Helio (gama media-baja)',
            'Performance muy limitada',
            'No apto para walk-through',
            'Sin liveness'
        ],

        recommended: false,
        useCase: 'No recomendado para producción',
        certifications: ['CE']
    },

    // ========================================================================
    // TELÉFONOS iOS - GAMA ALTA
    // ========================================================================
    iphone_15_pro_max: {
        id: 'iphone_15_pro_max',
        name: 'iPhone 15 Pro Max',
        brand: 'Apple',
        logo: LOGOS.apple,
        category: 'phone_ios_high',
        categoryName: 'Teléfono iOS - Gama Alta',
        type: 'phone',
        performance: 93,

        specs: {
            processor: 'Apple A17 Pro (3nm)',
            ai_performance: '35 TOPS (Neural Engine)',
            memory: '8GB RAM',
            technology: 'Core ML + Face ID TrueDepth',
            fps: '60',
            latency: '<45ms',
            precision: '98-99%',
            display: '6.7" Super Retina XDR',
            camera: 'TrueDepth 12MP (Face ID)'
        },

        walkthrough: true,
        walkthroughSpeed: 'Velocidad normal',
        liveness: true,
        livenessType: 'TrueDepth 3D (Face ID)',
        offline: true,

        price: {
            usd: 1199,
            ars: '1.500.000 - 2.000.000',
            range: '$1.5M - $2M ARS'
        },

        availability: {
            argentina: true,
            sources: ['Apple Store', 'Retailers oficiales']
        },

        pros: [
            'A17 Pro (más rápido del mercado)',
            'Face ID TrueDepth premium',
            'Neural Engine 35 TOPS',
            'Walk-through real',
            'Liveness nativo'
        ],

        cons: [
            'Precio muy alto',
            'Pantalla pequeña para kiosk (6.7")',
            'Puede ser overkill como kiosk'
        ],

        recommended: false,
        useCase: 'Solo si ya se tiene el dispositivo',
        certifications: ['Apple', 'CE', 'FCC']
    },

    iphone_15_pro: {
        id: 'iphone_15_pro',
        name: 'iPhone 15 Pro',
        brand: 'Apple',
        logo: LOGOS.apple,
        category: 'phone_ios_high',
        categoryName: 'Teléfono iOS - Gama Alta',
        type: 'phone',
        performance: 92,

        specs: {
            processor: 'Apple A17 Pro',
            ai_performance: '35 TOPS (Neural Engine)',
            memory: '8GB RAM',
            technology: 'Core ML + Face ID',
            fps: '60',
            latency: '<45ms',
            precision: '98-99%',
            display: '6.1" Super Retina XDR',
            camera: 'TrueDepth 12MP'
        },

        walkthrough: true,
        walkthroughSpeed: 'Velocidad normal',
        liveness: true,
        livenessType: 'TrueDepth 3D',
        offline: true,

        price: {
            usd: 999,
            ars: '1.200.000 - 1.500.000',
            range: '$1.2M - $1.5M ARS'
        },

        availability: {
            argentina: true,
            sources: ['Apple Store', 'Retailers']
        },

        pros: [
            'A17 Pro chip',
            'Face ID TrueDepth',
            'Walk-through real',
            'Performance premium'
        ],

        cons: [
            'Precio alto',
            'Pantalla pequeña (6.1")'
        ],

        recommended: false,
        useCase: 'Si ya se tiene disponible',
        certifications: ['Apple', 'CE']
    },

    iphone_14_pro: {
        id: 'iphone_14_pro',
        name: 'iPhone 14 Pro',
        brand: 'Apple',
        logo: LOGOS.apple,
        category: 'phone_ios_high',
        categoryName: 'Teléfono iOS - Gama Alta',
        type: 'phone',
        performance: 90,

        specs: {
            processor: 'Apple A16 Bionic',
            ai_performance: '17 TOPS (Neural Engine)',
            memory: '6GB RAM',
            technology: 'Core ML + Face ID',
            fps: '60',
            latency: '<50ms',
            precision: '98-99%',
            display: '6.1" Super Retina XDR',
            camera: 'TrueDepth 12MP'
        },

        walkthrough: true,
        walkthroughSpeed: 'Velocidad normal',
        liveness: true,
        livenessType: 'TrueDepth 3D',
        offline: true,

        price: {
            usd: 899,
            ars: '1.000.000 - 1.300.000',
            range: '$1M - $1.3M ARS'
        },

        availability: {
            argentina: true,
            sources: ['Apple Store', 'Retailers', 'MercadoLibre']
        },

        pros: [
            'Face ID TrueDepth',
            'A16 Bionic potente',
            'Más económico que 15 Pro',
            'Walk-through real'
        ],

        cons: [
            'Pantalla pequeña para kiosk',
            'Generación anterior'
        ],

        recommended: true,
        useCase: 'iPhone más accesible con Face ID',
        certifications: ['Apple', 'CE']
    },

    iphone_14: {
        id: 'iphone_14',
        name: 'iPhone 14',
        brand: 'Apple',
        logo: LOGOS.apple,
        category: 'phone_ios_mid',
        categoryName: 'Teléfono iOS - Gama Media-Alta',
        type: 'phone',
        performance: 75,

        specs: {
            processor: 'Apple A15 Bionic',
            ai_performance: '15.8 TOPS (Neural Engine)',
            memory: '6GB RAM',
            technology: 'Core ML (sin Face ID)',
            fps: '60',
            latency: '<80ms',
            precision: '94-96%',
            display: '6.1" Super Retina XDR',
            camera: '12MP frontal'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio',
        liveness: false,
        livenessType: 'Heurístico básico',
        offline: true,

        price: {
            usd: 799,
            ars: '800.000 - 1.000.000',
            range: '$800k - $1M ARS'
        },

        availability: {
            argentina: true,
            sources: ['Apple Store', 'Retailers', 'MercadoLibre']
        },

        pros: [
            'A15 Bionic (potente)',
            'Neural Engine',
            'Precio más accesible',
            'Ecosystem Apple'
        ],

        cons: [
            'NO tiene Face ID TrueDepth',
            'Liveness limitado',
            'Pantalla pequeña'
        ],

        recommended: false,
        useCase: 'Solo si presupuesto limitado con iOS',
        certifications: ['Apple', 'CE']
    },

    iphone_13_pro: {
        id: 'iphone_13_pro',
        name: 'iPhone 13 Pro',
        brand: 'Apple',
        logo: LOGOS.apple,
        category: 'phone_ios_high',
        categoryName: 'Teléfono iOS - Gama Alta',
        type: 'phone',
        performance: 88,

        specs: {
            processor: 'Apple A15 Bionic',
            ai_performance: '15.8 TOPS',
            memory: '6GB RAM',
            technology: 'Core ML + Face ID',
            fps: '60',
            latency: '<60ms',
            precision: '97-99%',
            display: '6.1" Super Retina XDR',
            camera: 'TrueDepth 12MP'
        },

        walkthrough: true,
        walkthroughSpeed: 'Velocidad normal',
        liveness: true,
        livenessType: 'TrueDepth 3D',
        offline: true,

        price: {
            usd: 699,
            ars: '700.000 - 900.000',
            range: '$700k - $900k ARS'
        },

        availability: {
            argentina: true,
            sources: ['MercadoLibre', 'Retailers']
        },

        pros: [
            'Face ID TrueDepth',
            'Más económico',
            'Buen performance',
            'Walk-through real'
        ],

        cons: [
            'Generación anterior',
            'Pantalla pequeña'
        ],

        recommended: true,
        useCase: 'Opción económica con Face ID',
        certifications: ['Apple', 'CE']
    },

    // ========================================================================
    // TELÉFONOS ANDROID - GAMA ALTA
    // ========================================================================
    samsung_s24_ultra: {
        id: 'samsung_s24_ultra',
        name: 'Samsung Galaxy S24 Ultra',
        brand: 'Samsung',
        logo: LOGOS.samsung,
        category: 'phone_android_high',
        categoryName: 'Teléfono Android - Gama Alta',
        type: 'phone',
        performance: 87,

        specs: {
            processor: 'Snapdragon 8 Gen 3',
            ai_performance: 'Hexagon NPU Gen 8',
            memory: '12GB RAM',
            technology: 'Google ML Kit Enhanced + Samsung Knox',
            fps: '60',
            latency: '<90ms',
            precision: '95-97%',
            display: '6.8" Dynamic AMOLED 2X',
            camera: '12MP frontal'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio',
        liveness: true,
        livenessType: 'Heurístico ML',
        offline: true,

        price: {
            usd: 1299,
            ars: '1.200.000 - 1.500.000',
            range: '$1.2M - $1.5M ARS'
        },

        availability: {
            argentina: true,
            sources: ['Samsung Store', 'Retailers', 'MercadoLibre']
        },

        pros: [
            'Snapdragon 8 Gen 3 (top tier)',
            'S Pen incluido',
            'Pantalla grande (6.8")',
            'Samsung Knox (seguridad)',
            'Excelente cámara'
        ],

        cons: [
            'Precio alto',
            'Liveness no hardware-based',
            'Pantalla pequeña para kiosk vs tablets'
        ],

        recommended: true,
        useCase: 'Flagship Android como kiosk portátil',
        certifications: ['Samsung Knox', 'CE', 'FCC']
    },

    samsung_s24: {
        id: 'samsung_s24',
        name: 'Samsung Galaxy S24',
        brand: 'Samsung',
        logo: LOGOS.samsung,
        category: 'phone_android_high',
        categoryName: 'Teléfono Android - Gama Alta',
        type: 'phone',
        performance: 85,

        specs: {
            processor: 'Snapdragon 8 Gen 3 / Exynos 2400',
            ai_performance: 'Hexagon NPU / Samsung NPU',
            memory: '8GB RAM',
            technology: 'Google ML Kit Enhanced',
            fps: '60',
            latency: '<100ms',
            precision: '95-97%',
            display: '6.2" Dynamic AMOLED 2X',
            camera: '12MP frontal'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio',
        liveness: true,
        livenessType: 'Heurístico',
        offline: true,

        price: {
            usd: 899,
            ars: '900.000 - 1.200.000',
            range: '$900k - $1.2M ARS'
        },

        availability: {
            argentina: true,
            sources: ['Samsung Store', 'Retailers', 'MercadoLibre']
        },

        pros: [
            'Snapdragon 8 Gen 3 potente',
            'Más compacto que Ultra',
            'Buen precio vs Ultra',
            'Samsung Knox'
        ],

        cons: [
            'Pantalla pequeña (6.2")',
            'Sin S Pen',
            'Liveness limitado'
        ],

        recommended: true,
        useCase: 'Opción compacta Android',
        certifications: ['Samsung Knox', 'CE']
    },

    samsung_s23: {
        id: 'samsung_s23',
        name: 'Samsung Galaxy S23',
        brand: 'Samsung',
        logo: LOGOS.samsung,
        category: 'phone_android_high',
        categoryName: 'Teléfono Android - Gama Alta',
        type: 'phone',
        performance: 82,

        specs: {
            processor: 'Snapdragon 8 Gen 2',
            ai_performance: 'Hexagon NPU Gen 7',
            memory: '8GB RAM',
            technology: 'Google ML Kit Enhanced',
            fps: '60',
            latency: '<100ms',
            precision: '95-97%',
            display: '6.1" Dynamic AMOLED 2X',
            camera: '12MP frontal'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio',
        liveness: true,
        livenessType: 'Heurístico',
        offline: true,

        price: {
            usd: 799,
            ars: '700.000 - 900.000',
            range: '$700k - $900k ARS'
        },

        availability: {
            argentina: true,
            sources: ['Samsung Store', 'Retailers', 'MercadoLibre']
        },

        pros: [
            'Snapdragon 8 Gen 2',
            'Buen precio/performance',
            'Tamaño compacto',
            'Samsung Knox'
        ],

        cons: [
            'Generación anterior',
            'Pantalla pequeña',
            'Sin S Pen'
        ],

        recommended: true,
        useCase: 'Balance precio/performance Android',
        certifications: ['Samsung Knox', 'CE']
    },

    xiaomi_14_pro: {
        id: 'xiaomi_14_pro',
        name: 'Xiaomi 14 Pro',
        brand: 'Xiaomi',
        logo: LOGOS.xiaomi,
        category: 'phone_android_high',
        categoryName: 'Teléfono Android - Gama Alta',
        type: 'phone',
        performance: 83,

        specs: {
            processor: 'Snapdragon 8 Gen 3',
            ai_performance: 'Hexagon NPU Gen 8',
            memory: '12GB / 16GB RAM',
            technology: 'Google ML Kit + Xiaomi HyperOS',
            fps: '60',
            latency: '<100ms',
            precision: '94-96%',
            display: '6.73" AMOLED',
            camera: '32MP frontal'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio',
        liveness: true,
        livenessType: 'Heurístico',
        offline: true,

        price: {
            usd: 999,
            ars: '800.000 - 1.000.000',
            range: '$800k - $1M ARS'
        },

        availability: {
            argentina: true,
            sources: ['MercadoLibre', 'Importadores']
        },

        pros: [
            'Snapdragon 8 Gen 3',
            'Excelente cámara (32MP)',
            'RAM hasta 16GB',
            'Precio competitivo',
            'Carga rápida'
        ],

        cons: [
            'MIUI/HyperOS puede tener bloatware',
            'Menos disponibilidad oficial',
            'Liveness básico'
        ],

        recommended: false,
        useCase: 'Si se consigue a buen precio',
        certifications: ['CE']
    },

    xiaomi_13_pro: {
        id: 'xiaomi_13_pro',
        name: 'Xiaomi 13 Pro',
        brand: 'Xiaomi',
        logo: LOGOS.xiaomi,
        category: 'phone_android_high',
        categoryName: 'Teléfono Android - Gama Alta',
        type: 'phone',
        performance: 80,

        specs: {
            processor: 'Snapdragon 8 Gen 2',
            ai_performance: 'Hexagon NPU',
            memory: '8GB / 12GB RAM',
            technology: 'Google ML Kit',
            fps: '60',
            latency: '<110ms',
            precision: '94-96%',
            display: '6.73" AMOLED',
            camera: '32MP frontal'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio',
        liveness: true,
        livenessType: 'Heurístico',
        offline: true,

        price: {
            usd: 799,
            ars: '600.000 - 800.000',
            range: '$600k - $800k ARS'
        },

        availability: {
            argentina: true,
            sources: ['MercadoLibre']
        },

        pros: [
            'Snapdragon 8 Gen 2',
            'Buena cámara frontal',
            'Precio competitivo',
            'Carga rápida'
        ],

        cons: [
            'MIUI puede ser pesado',
            'Disponibilidad limitada',
            'Liveness básico'
        ],

        recommended: false,
        useCase: 'Alternativa económica',
        certifications: ['CE']
    },

    motorola_edge_40_pro: {
        id: 'motorola_edge_40_pro',
        name: 'Motorola Edge 40 Pro',
        brand: 'Motorola',
        logo: LOGOS.motorola,
        category: 'phone_android_high',
        categoryName: 'Teléfono Android - Gama Alta',
        type: 'phone',
        performance: 78,

        specs: {
            processor: 'Snapdragon 8 Gen 2',
            ai_performance: 'Hexagon NPU',
            memory: '12GB RAM',
            technology: 'Google ML Kit + Android Stock',
            fps: '60',
            latency: '<120ms',
            precision: '93-95%',
            display: '6.67" OLED',
            camera: '60MP frontal'
        },

        walkthrough: true,
        walkthroughSpeed: 'Caminar despacio',
        liveness: false,
        livenessType: 'No disponible',
        offline: true,

        price: {
            usd: 699,
            ars: '500.000 - 700.000',
            range: '$500k - $700k ARS'
        },

        availability: {
            argentina: true,
            sources: ['Motorola Store', 'Retailers', 'MercadoLibre']
        },

        pros: [
            'Android casi stock (limpio)',
            'Excelente cámara (60MP)',
            'Snapdragon 8 Gen 2',
            'Precio competitivo',
            'Buena disponibilidad Argentina'
        ],

        cons: [
            'No tiene liveness',
            'Performance menor a Samsung',
            'Pantalla pequeña'
        ],

        recommended: false,
        useCase: 'Si se prefiere Android stock',
        certifications: ['CE', 'FCC']
    }
};
// Local alias for backward compatibility (use var to allow redeclaration)
var HARDWARE_FACIAL_PROFILES = window.HARDWARE_FACIAL_PROFILES;

// ============================================================================
// PERFILES DE LECTORES DE HUELLAS DIGITALES
// ============================================================================

// Evitar redeclaración
if (typeof window.HARDWARE_FINGERPRINT_PROFILES !== 'undefined') {
    console.log('📟 [KIOSKS-PRO] HARDWARE_FINGERPRINT_PROFILES ya existe, saltando');
}
window.HARDWARE_FINGERPRINT_PROFILES = window.HARDWARE_FINGERPRINT_PROFILES || {
    // ========================================================================
    // PROFESSIONAL TIER - FBI Certified
    // ========================================================================

    suprema_biomini_plus2: {
        id: 'suprema_biomini_plus2',
        name: 'Suprema BioMini Plus 2',
        brand: 'Suprema',
        logo: LOGOS.suprema,
        category: 'fingerprint_professional',
        performance: 95,

        specs: {
            sensor: 'Óptico CMOS',
            resolution: '500 DPI',
            image_area: '16.0 x 18.0 mm',
            far: '< 0.0001%',
            frr: '< 0.01%',
            verification_speed: '< 0.5 segundos',
            enrollment_speed: '< 1 segundo',
            template_size: '384 bytes',
            interface: 'USB 2.0',
            power: 'USB powered (5V DC)'
        },

        features: [
            'FBI PIV/FAP20 Certified',
            'STQC Certified (India)',
            'Live Finger Detection (LFD)',
            'Auto-On sensor',
            'Scratch resistant coating',
            'IP65 dust/water resistant'
        ],

        certifications: ['FBI PIV', 'FAP20', 'STQC', 'CE', 'FCC', 'RoHS'],

        price: {
            usd: 180,
            ars: '280.000 - 350.000',
            range: '$280k - $350k ARS'
        },

        availability: {
            argentina: 'Disponible',
            suppliers: ['Suprema Argentina', 'Distribuidores autorizados'],
            delivery: '2-4 semanas'
        },

        pros: [
            'Certificación FBI (máxima seguridad)',
            'LFD anti-spoofing incluido',
            'Excelente FAR/FRR',
            'Resistente IP65',
            'Soporte técnico Suprema',
            'SDK completo incluido'
        ],

        cons: [
            'Precio alto',
            'Solo USB (no WiFi)',
            'Importación desde Korea'
        ],

        recommended: true,
        useCase: 'Empresas con alta exigencia de seguridad',
        sdkSupport: ['Windows', 'Linux', 'Android', 'iOS'],
        warranty: '2 años'
    },

    zkteco_slk20r: {
        id: 'zkteco_slk20r',
        name: 'ZKTeco SLK20R',
        brand: 'ZKTeco',
        logo: LOGOS.zkteco,
        category: 'fingerprint_professional',
        performance: 92,

        specs: {
            sensor: 'Óptico industrial',
            resolution: '500 DPI',
            image_area: '15.0 x 19.0 mm',
            far: '< 0.001%',
            frr: '< 0.1%',
            verification_speed: '< 0.6 segundos',
            enrollment_speed: '< 1.2 segundos',
            template_size: '512 bytes',
            interface: 'USB 2.0 + RS232/RS485',
            power: 'USB powered o DC 5V'
        },

        features: [
            'Certificación STQC',
            'Algoritmo ZKFinger 10.0',
            'Auto capture',
            'Sensor reforzado',
            'Compatible multi-plataforma'
        ],

        certifications: ['STQC', 'CE', 'FCC'],

        price: {
            usd: 150,
            ars: '220.000 - 280.000',
            range: '$220k - $280k ARS'
        },

        availability: {
            argentina: 'Excelente',
            suppliers: ['ZKTeco Argentina', 'Control de Accesos SA', 'Varios'],
            delivery: '1-2 semanas'
        },

        pros: [
            'Muy buena disponibilidad Argentina',
            'RS232/RS485 incluido',
            'SDK gratuito robusto',
            'Precio competitivo',
            'Soporte local ZKTeco',
            'Sensor reforzado industrial'
        ],

        cons: [
            'FAR ligeramente mayor que Suprema',
            'No tiene LFD nativo',
            'Documentación en inglés/chino'
        ],

        recommended: true,
        useCase: 'Balance precio/calidad para Argentina',
        sdkSupport: ['Windows', 'Linux', 'Android'],
        warranty: '1 año'
    },

    hid_digitalpersona_5160: {
        id: 'hid_digitalpersona_5160',
        name: 'HID DigitalPersona U.are.U 5160',
        brand: 'HID',
        logo: LOGOS.hid,
        category: 'fingerprint_professional',
        performance: 94,

        specs: {
            sensor: 'Óptico TFT',
            resolution: '512 DPI',
            image_area: '15.3 x 19.7 mm',
            far: '< 0.0001%',
            frr: '< 0.01%',
            verification_speed: '< 0.4 segundos',
            enrollment_speed: '< 1 segundo',
            template_size: '400 bytes',
            interface: 'USB 2.0',
            power: 'USB powered'
        },

        features: [
            'FBI PIV/FAP20 Certified',
            'DigitalPersona Engine',
            'Multispectral technology option',
            'Compact design',
            'Windows Hello compatible',
            'Anti-latent fingerprint'
        ],

        certifications: ['FBI PIV', 'FAP20', 'FIPS 201', 'CE', 'FCC'],

        price: {
            usd: 220,
            ars: '350.000 - 450.000',
            range: '$350k - $450k ARS'
        },

        availability: {
            argentina: 'Media',
            suppliers: ['Importadores HID', 'Distribuidores seguridad'],
            delivery: '3-6 semanas'
        },

        pros: [
            'Certificación FBI completa',
            'Excelente precisión',
            'Windows Hello nativo',
            'SDK DigitalPersona potente',
            'Opción multiespectral',
            'Marca reconocida'
        ],

        cons: [
            'Precio más alto',
            'Importación compleja Argentina',
            'Licencias SDK costosas'
        ],

        recommended: false,
        useCase: 'Solo si ya usan ecosistema HID',
        sdkSupport: ['Windows', 'Linux', 'Android (limitado)'],
        warranty: '2 años'
    },

    futronic_fs88h: {
        id: 'futronic_fs88h',
        name: 'Futronic FS88H',
        brand: 'Futronic',
        logo: LOGOS.futronic,
        category: 'fingerprint_professional',
        performance: 90,

        specs: {
            sensor: 'Óptico CMOS',
            resolution: '500 DPI',
            image_area: '18.0 x 24.0 mm',
            far: '< 0.001%',
            frr: '< 0.1%',
            verification_speed: '< 0.7 segundos',
            enrollment_speed: '< 1.5 segundos',
            template_size: '512 bytes',
            interface: 'USB 2.0',
            power: 'USB powered'
        },

        features: [
            'Área de captura grande',
            'FIPS 201 compliant',
            'Auto-capture',
            'SDK gratuito',
            'Compatible MINEX'
        ],

        certifications: ['FIPS 201', 'CE', 'FCC'],

        price: {
            usd: 140,
            ars: '200.000 - 260.000',
            range: '$200k - $260k ARS'
        },

        availability: {
            argentina: 'Buena',
            suppliers: ['Importadores varios'],
            delivery: '2-3 semanas'
        },

        pros: [
            'Área grande (mejor captura)',
            'SDK gratuito sin licencias',
            'Buen precio',
            'Compatible estándares FBI',
            'Robusto'
        ],

        cons: [
            'Marca menos conocida',
            'Soporte técnico limitado',
            'Velocidad menor'
        ],

        recommended: false,
        useCase: 'Presupuestos ajustados con calidad',
        sdkSupport: ['Windows', 'Linux'],
        warranty: '1 año'
    },

    // ========================================================================
    // HIGH-END TIER - Enterprise Grade
    // ========================================================================

    suprema_biomini_slim3: {
        id: 'suprema_biomini_slim3',
        name: 'Suprema BioMini Slim 3',
        brand: 'Suprema',
        logo: LOGOS.suprema,
        category: 'fingerprint_high',
        performance: 93,

        specs: {
            sensor: 'Óptico CMOS compacto',
            resolution: '500 DPI',
            image_area: '12.8 x 18.0 mm',
            far: '< 0.0001%',
            frr: '< 0.1%',
            verification_speed: '< 0.6 segundos',
            enrollment_speed: '< 1 segundo',
            template_size: '384 bytes',
            interface: 'USB 2.0',
            power: 'USB powered (bajo consumo)'
        },

        features: [
            'FBI PIV Certified',
            'Diseño ultra compacto',
            'Live Finger Detection',
            'Auto-On',
            'Scratch resistant',
            'Ideal integración tablets'
        ],

        certifications: ['FBI PIV', 'FAP10', 'CE', 'FCC'],

        price: {
            usd: 160,
            ars: '240.000 - 310.000',
            range: '$240k - $310k ARS'
        },

        availability: {
            argentina: 'Disponible',
            suppliers: ['Suprema Argentina'],
            delivery: '2-4 semanas'
        },

        pros: [
            'Certificación FBI',
            'Diseño compacto (ideal tablets)',
            'LFD incluido',
            'Bajo consumo',
            'Calidad Suprema'
        ],

        cons: [
            'Área sensor pequeña',
            'Precio alto para tamaño',
            'Importación Korea'
        ],

        recommended: true,
        useCase: 'Integración con tablets/kiosks compactos',
        sdkSupport: ['Windows', 'Linux', 'Android', 'iOS'],
        warranty: '2 años'
    },

    zkteco_sl10: {
        id: 'zkteco_sl10',
        name: 'ZKTeco SL10',
        brand: 'ZKTeco',
        logo: LOGOS.zkteco,
        category: 'fingerprint_high',
        performance: 88,

        specs: {
            sensor: 'Óptico',
            resolution: '500 DPI',
            image_area: '14.0 x 18.0 mm',
            far: '< 0.001%',
            frr: '< 0.5%',
            verification_speed: '< 1 segundo',
            enrollment_speed: '< 1.5 segundos',
            template_size: '512 bytes',
            interface: 'USB 2.0',
            power: 'USB powered'
        },

        features: [
            'ZKFinger 10.0',
            'Diseño slim',
            'Auto capture',
            'Plug & Play'
        ],

        certifications: ['CE', 'FCC'],

        price: {
            usd: 85,
            ars: '130.000 - 170.000',
            range: '$130k - $170k ARS'
        },

        availability: {
            argentina: 'Excelente',
            suppliers: ['ZKTeco Argentina', 'Varios distribuidores'],
            delivery: '1 semana'
        },

        pros: [
            'Excelente disponibilidad',
            'Muy buen precio',
            'Soporte local',
            'SDK gratuito',
            'Diseño compacto'
        ],

        cons: [
            'Sin certificación FBI',
            'FRR más alto',
            'Calidad construcción media'
        ],

        recommended: true,
        useCase: 'Mejor relación precio/calidad Argentina',
        sdkSupport: ['Windows', 'Linux', 'Android'],
        warranty: '1 año'
    },

    nitgen_enbsp: {
        id: 'nitgen_enbsp',
        name: 'Nitgen eNBSP',
        brand: 'Nitgen',
        logo: LOGOS.nitgen,
        category: 'fingerprint_high',
        performance: 89,

        specs: {
            sensor: 'Óptico TCM',
            resolution: '500 DPI',
            image_area: '16.0 x 18.0 mm',
            far: '< 0.0001%',
            frr: '< 0.1%',
            verification_speed: '< 0.5 segundos',
            enrollment_speed: '< 1 segundo',
            template_size: '384 bytes',
            interface: 'USB 2.0',
            power: 'USB powered'
        },

        features: [
            'FBI PIV Certified',
            'NFIQ 2.0 support',
            'LFD (Live Finger Detection)',
            'SDK NITGEN completo',
            'Calidad Korea'
        ],

        certifications: ['FBI PIV', 'FAP20', 'CE', 'FCC'],

        price: {
            usd: 170,
            ars: '260.000 - 330.000',
            range: '$260k - $330k ARS'
        },

        availability: {
            argentina: 'Baja',
            suppliers: ['Importadores especializados'],
            delivery: '4-8 semanas'
        },

        pros: [
            'Certificación FBI',
            'Excelente precisión',
            'LFD incluido',
            'Calidad construcción',
            'SDK robusto'
        ],

        cons: [
            'Difícil conseguir Argentina',
            'Sin soporte local',
            'Documentación limitada español'
        ],

        recommended: false,
        useCase: 'Solo si hay importación directa',
        sdkSupport: ['Windows', 'Linux'],
        warranty: '2 años'
    },

    dermalog_zf1: {
        id: 'dermalog_zf1',
        name: 'Dermalog ZF1',
        brand: 'Dermalog',
        logo: LOGOS.dermalog,
        category: 'fingerprint_high',
        performance: 91,

        specs: {
            sensor: 'Óptico multispectral',
            resolution: '500 DPI',
            image_area: '14.6 x 19.5 mm',
            far: '< 0.00001%',
            frr: '< 0.01%',
            verification_speed: '< 0.3 segundos',
            enrollment_speed: '< 0.8 segundos',
            template_size: '256 bytes',
            interface: 'USB 2.0',
            power: 'USB powered'
        },

        features: [
            'FBI PIV/FAP30 Certified',
            'Multispectral imaging',
            'Works on wet/dry fingers',
            'Scratch resistant sapphire',
            'German engineering',
            'AFIS compatible'
        ],

        certifications: ['FBI PIV', 'FAP30', 'BSI', 'CE', 'FCC'],

        price: {
            usd: 280,
            ars: '450.000 - 580.000',
            range: '$450k - $580k ARS'
        },

        availability: {
            argentina: 'Muy baja',
            suppliers: ['Solo importación directa'],
            delivery: '8-12 semanas'
        },

        pros: [
            'Tecnología multispectral única',
            'Funciona con dedos húmedos/secos',
            'Máxima precisión',
            'Cristal zafiro (indestructible)',
            'Rapidez extrema',
            'Calidad alemana'
        ],

        cons: [
            'Precio muy alto',
            'Imposible conseguir Argentina',
            'Licencias SDK costosas',
            'Solo para grandes proyectos'
        ],

        recommended: false,
        useCase: 'Solo proyectos gubernamentales/bancarios',
        sdkSupport: ['Windows', 'Linux'],
        warranty: '3 años'
    },

    // ========================================================================
    // MID-RANGE TIER - Good Value
    // ========================================================================

    zkteco_zk4500: {
        id: 'zkteco_zk4500',
        name: 'ZKTeco ZK4500',
        brand: 'ZKTeco',
        logo: LOGOS.zkteco,
        category: 'fingerprint_mid',
        performance: 82,

        specs: {
            sensor: 'Óptico',
            resolution: '500 DPI',
            image_area: '12.8 x 18.0 mm',
            far: '< 0.01%',
            frr: '< 1%',
            verification_speed: '< 1.2 segundos',
            enrollment_speed: '< 2 segundos',
            template_size: '512 bytes',
            interface: 'USB 2.0',
            power: 'USB powered'
        },

        features: [
            'ZKFinger 10.0',
            'Auto capture',
            'Plug & Play',
            'SDK incluido'
        ],

        certifications: ['CE', 'FCC'],

        price: {
            usd: 55,
            ars: '80.000 - 110.000',
            range: '$80k - $110k ARS'
        },

        availability: {
            argentina: 'Excelente',
            suppliers: ['ZKTeco Argentina', 'MercadoLibre', 'Distribuidores'],
            delivery: 'Inmediato - 1 semana'
        },

        pros: [
            'Precio accesible',
            'Disponibilidad inmediata',
            'Soporte local',
            'SDK gratuito',
            'Repuestos disponibles',
            'Ideal testing/desarrollo'
        ],

        cons: [
            'Sin certificación FBI',
            'FRR alto (1%)',
            'Construcción plástica',
            'Velocidad lenta',
            'No apto producción alta'
        ],

        recommended: true,
        useCase: 'Testing, desarrollo, empresas pequeñas',
        sdkSupport: ['Windows', 'Linux', 'Android'],
        warranty: '1 año'
    },

    secugen_hamster_pro20: {
        id: 'secugen_hamster_pro20',
        name: 'Secugen Hamster Pro 20',
        brand: 'Secugen',
        logo: LOGOS.secugen,
        category: 'fingerprint_mid',
        performance: 85,

        specs: {
            sensor: 'Óptico SEIR',
            resolution: '500 DPI',
            image_area: '13.0 x 19.0 mm',
            far: '< 0.001%',
            frr: '< 0.5%',
            verification_speed: '< 1 segundo',
            enrollment_speed: '< 1.5 segundos',
            template_size: '400 bytes',
            interface: 'USB 2.0',
            power: 'USB powered'
        },

        features: [
            'FIPS 201/PIV compliant',
            'SecuGen SEIR technology',
            'Auto-On',
            'Scratch resistant',
            'SDK completo gratuito'
        ],

        certifications: ['FIPS 201', 'CE', 'FCC'],

        price: {
            usd: 95,
            ars: '140.000 - 180.000',
            range: '$140k - $180k ARS'
        },

        availability: {
            argentina: 'Buena',
            suppliers: ['Importadores varios', 'MercadoLibre'],
            delivery: '1-2 semanas'
        },

        pros: [
            'Buena relación precio/calidad',
            'Certificación FIPS 201',
            'SDK gratuito robusto',
            'Marca reconocida',
            'Buena disponibilidad'
        ],

        cons: [
            'Sin certificación FBI PIV',
            'Soporte técnico limitado',
            'Construcción media'
        ],

        recommended: true,
        useCase: 'Balance calidad/precio para PyMEs',
        sdkSupport: ['Windows', 'Linux', 'Android', 'iOS'],
        warranty: '1 año'
    },

    anviz_fps350: {
        id: 'anviz_fps350',
        name: 'Anviz FPS350',
        brand: 'Anviz',
        logo: LOGOS.anviz,
        category: 'fingerprint_mid',
        performance: 78,

        specs: {
            sensor: 'Óptico',
            resolution: '500 DPI',
            image_area: '12.0 x 16.0 mm',
            far: '< 0.01%',
            frr: '< 1%',
            verification_speed: '< 1.5 segundos',
            enrollment_speed: '< 2 segundos',
            template_size: '512 bytes',
            interface: 'USB 2.0',
            power: 'USB powered'
        },

        features: [
            'Auto capture',
            'Plug & Play',
            'SDK básico incluido'
        ],

        certifications: ['CE', 'FCC'],

        price: {
            usd: 48,
            ars: '70.000 - 95.000',
            range: '$70k - $95k ARS'
        },

        availability: {
            argentina: 'Buena',
            suppliers: ['Importadores', 'MercadoLibre'],
            delivery: '1-2 semanas'
        },

        pros: [
            'Precio económico',
            'Buena disponibilidad',
            'Plug & Play simple',
            'Suficiente para bajo volumen'
        ],

        cons: [
            'Sin certificaciones',
            'Calidad construcción baja',
            'FRR alto',
            'SDK limitado',
            'No apto producción'
        ],

        recommended: false,
        useCase: 'Solo testing o muy bajo volumen',
        sdkSupport: ['Windows'],
        warranty: '6 meses'
    },

    mantra_mfs100: {
        id: 'mantra_mfs100',
        name: 'Mantra MFS100',
        brand: 'Mantra',
        logo: LOGOS.mantra,
        category: 'fingerprint_mid',
        performance: 80,

        specs: {
            sensor: 'Óptico',
            resolution: '500 DPI',
            image_area: '12.7 x 16.5 mm',
            far: '< 0.001%',
            frr: '< 0.5%',
            verification_speed: '< 1 segundo',
            enrollment_speed: '< 1.5 segundos',
            template_size: '384 bytes',
            interface: 'USB 2.0',
            power: 'USB powered'
        },

        features: [
            'STQC Certified (India)',
            'Auto capture',
            'SDK gratuito',
            'RD Service compliant'
        ],

        certifications: ['STQC', 'CE', 'FCC'],

        price: {
            usd: 42,
            ars: '65.000 - 88.000',
            range: '$65k - $88k ARS'
        },

        availability: {
            argentina: 'Media',
            suppliers: ['Importadores India'],
            delivery: '2-4 semanas'
        },

        pros: [
            'Precio muy económico',
            'Certificación STQC India',
            'SDK gratuito',
            'Muy popular India/Asia',
            'Buen FAR/FRR para precio'
        ],

        cons: [
            'Difícil conseguir Argentina',
            'Calidad construcción básica',
            'Soporte técnico nulo',
            'Documentación solo inglés'
        ],

        recommended: false,
        useCase: 'Solo si se importa directamente desde India',
        sdkSupport: ['Windows', 'Linux', 'Android'],
        warranty: '1 año'
    }
};
// Local alias for backward compatibility (use var to allow redeclaration)
var HARDWARE_FINGERPRINT_PROFILES = window.HARDWARE_FINGERPRINT_PROFILES;

// ============================================================================
// ESTILOS CSS PROFESIONALES
// ============================================================================

// Evitar redeclaración
if (typeof window.PROFESSIONAL_STYLES !== 'undefined') {
    console.log('📟 [KIOSKS-PRO] PROFESSIONAL_STYLES ya existe, saltando');
}
window.PROFESSIONAL_STYLES = window.PROFESSIONAL_STYLES || `
<style>
/* ========================================================================
   ESTILOS DARK THEME - MÓDULO KIOSKS ENTERPRISE
   ======================================================================== */

/* Variables CSS - Dark Theme */
:root {
    --kiosk-bg-dark: #0f172a;
    --kiosk-bg-card: #1e293b;
    --kiosk-bg-input: #0f172a;
    --kiosk-border: #334155;
    --kiosk-border-light: #475569;
    --kiosk-text: #e2e8f0;
    --kiosk-text-muted: #94a3b8;
    --kiosk-primary: #3b82f6;
    --kiosk-success: #22c55e;
    --kiosk-warning: #f59e0b;
    --kiosk-danger: #ef4444;
    --kiosk-shadow: 0 4px 20px rgba(0,0,0,0.3);
    --kiosk-radius: 8px;
}

/* Container principal */
#kiosks-container {
    background: var(--kiosk-bg-dark);
    padding: 0;
    margin: 0;
}

/* Header del módulo - Dark Theme */
.kiosk-module-header {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    border: 1px solid var(--kiosk-border);
    border-radius: var(--kiosk-radius);
    padding: 20px 24px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.kiosk-module-header h2 {
    color: var(--kiosk-text) !important;
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

.kiosk-module-header p {
    color: var(--kiosk-text-muted);
    margin: 4px 0 0 0;
    font-size: 0.9rem;
}

/* Stats inline */
.kiosk-stats-inline {
    display: flex;
    gap: 16px;
    align-items: center;
}

.kiosk-stat-item {
    background: var(--kiosk-bg-dark);
    border: 1px solid var(--kiosk-border);
    border-radius: 6px;
    padding: 8px 16px;
    text-align: center;
}

.kiosk-stat-value {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--kiosk-primary);
}

.kiosk-stat-label {
    font-size: 0.75rem;
    color: var(--kiosk-text-muted);
    text-transform: uppercase;
}

/* Tabla dark theme */
.kiosk-table-container {
    background: var(--kiosk-bg-card);
    border: 1px solid var(--kiosk-border);
    border-radius: var(--kiosk-radius);
    overflow: hidden;
}

.kiosk-table {
    width: 100%;
    border-collapse: collapse;
    color: var(--kiosk-text);
}

.kiosk-table thead {
    background: var(--kiosk-bg-dark);
}

.kiosk-table th {
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: var(--kiosk-text);
    border-bottom: 2px solid var(--kiosk-border);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.kiosk-table td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--kiosk-border);
    vertical-align: middle;
}

.kiosk-table tbody tr:hover {
    background: rgba(59, 130, 246, 0.1);
}

.kiosk-table tbody tr:last-child td {
    border-bottom: none;
}

/* Badges dark */
.kiosk-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
}

.kiosk-badge-success {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.3);
}

.kiosk-badge-danger {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.kiosk-badge-warning {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
}

.kiosk-badge-info {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.3);
}

/* Botones dark */
.kiosk-btn {
    padding: 6px 12px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.kiosk-btn-primary {
    background: var(--kiosk-primary);
    color: white;
}

.kiosk-btn-primary:hover {
    background: #2563eb;
    transform: translateY(-1px);
}

.kiosk-btn-success {
    background: var(--kiosk-success);
    color: white;
}

.kiosk-btn-danger {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.kiosk-btn-danger:hover {
    background: var(--kiosk-danger);
    color: white;
}

.kiosk-btn-sm {
    padding: 4px 8px;
    font-size: 0.75rem;
}

/* Empty state */
.kiosk-empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--kiosk-text-muted);
}

.kiosk-empty-state i {
    font-size: 4rem;
    margin-bottom: 16px;
    opacity: 0.5;
}

/* Last seen indicator */
.kiosk-last-seen {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
}

.kiosk-last-seen .online {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--kiosk-success);
    animation: pulse 2s infinite;
}

.kiosk-last-seen .offline {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--kiosk-text-muted);
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* Animaciones */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

/* Module Header Mejorado */
.module-header-pro {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: var(--radius-lg);
    margin-bottom: 2rem;
    box-shadow: var(--shadow-lg);
    animation: slideUp 0.4s ease-out;
}

.module-header-pro h2 {
    color: white !important;
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.module-header-pro p {
    color: rgba(255,255,255,0.9);
    font-size: 1.1rem;
}

/* Hardware Selector Container */
.hardware-selector-container {
    background: white;
    border-radius: var(--radius-lg);
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: var(--shadow-md);
    animation: fadeIn 0.5s ease-out;
}

/* Select Mejorado */
.hardware-select {
    width: 100%;
    padding: 1rem 1.5rem;
    font-size: 1.05rem;
    border: 2px solid #e0e0e0;
    border-radius: var(--radius);
    background: white;
    transition: all 0.3s ease;
    cursor: pointer;
    max-height: 400px !important;
}

.hardware-select:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-sm);
}

.hardware-select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 4px rgba(0, 102, 255, 0.1);
}

/* Limitar altura del dropdown del select */
.hardware-select option,
.hardware-select optgroup {
    font-size: 0.95rem;
    padding: 0.5rem;
}

/* Hardware Detail Card */
.hardware-detail-card {
    background: white;
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-lg);
    margin-top: 1.5rem;
    animation: scaleIn 0.4s ease-out;
    border: 3px solid transparent;
    transition: all 0.3s ease;
}

.hardware-detail-card.recommended {
    border-color: var(--color-success);
}

.hardware-detail-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.2);
}

/* Card Header con Gradiente */
.hw-card-header {
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.hw-card-header.enterprise {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.hw-card-header.ios {
    background: linear-gradient(135deg, #434343 0%, #000000 100%);
}

.hw-card-header.android {
    background: linear-gradient(135deg, #3DDC84 0%, #00C853 100%);
}

.hw-logo-container {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.hw-logo {
    width: 60px;
    height: 60px;
    background: white;
    border-radius: 12px;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.hw-logo svg {
    width: 40px;
    height: 40px;
}

.hw-name h3 {
    font-size: 1.8rem;
    font-weight: 700;
    margin: 0;
    color: white;
}

.hw-name p {
    font-size: 1rem;
    margin: 0.25rem 0 0 0;
    opacity: 0.9;
}

/* Badges Profesionales */
.hw-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.hw-badge {
    padding: 0.4rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
}

.hw-badge.recommended {
    background: #FFD700;
    color: #000;
}

.hw-badge.walkthrough {
    background: var(--color-success);
    color: white;
}

.hw-badge.liveness {
    background: var(--color-primary);
    color: white;
}

.hw-badge.offline {
    background: var(--color-warning);
    color: white;
}

.hw-badge.price {
    background: rgba(255,255,255,0.2);
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
}

/* Card Body */
.hw-card-body {
    padding: 2rem;
}

/* Performance Score */
.performance-section {
    margin-bottom: 2rem;
}

.performance-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: #666;
    margin-bottom: 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.performance-value {
    font-size: 1.5rem;
    font-weight: 700;
}

.performance-bar {
    height: 32px;
    background: #f0f0f0;
    border-radius: 16px;
    overflow: hidden;
    position: relative;
}

.performance-fill {
    height: 100%;
    background: linear-gradient(90deg, #00C853 0%, #00E676 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 1rem;
    color: white;
    font-weight: 700;
    font-size: 1rem;
    transition: width 1s ease-out;
}

.performance-fill.high {
    background: linear-gradient(90deg, #00C853 0%, #00E676 100%);
}

.performance-fill.medium {
    background: linear-gradient(90deg, #FFA000 0%, #FFB300 100%);
}

.performance-fill.low {
    background: linear-gradient(90deg, #E53935 0%, #EF5350 100%);
}

/* Specs Grid */
.specs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.spec-item {
    background: #f8f9fa;
    padding: 1.25rem;
    border-radius: var(--radius);
    border-left: 4px solid var(--color-primary);
}

.spec-label {
    font-size: 0.85rem;
    color: #666;
    font-weight: 600;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.spec-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: #333;
}

/* Pros/Cons */
.pros-cons-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 2rem;
}

.pros-list, .cons-list {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: var(--radius);
}

.pros-list {
    border-left: 4px solid var(--color-success);
}

.cons-list {
    border-left: 4px solid var(--color-warning);
}

.pros-list h4, .cons-list h4 {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.pros-list ul, .cons-list ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.pros-list li, .cons-list li {
    padding: 0.75rem 0;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
}

.pros-list li:last-child, .cons-list li:last-child {
    border-bottom: none;
}

.pros-list li:before {
    content: "✓";
    color: var(--color-success);
    font-weight: bold;
    font-size: 1.2rem;
    flex-shrink: 0;
}

.cons-list li:before {
    content: "⚠";
    color: var(--color-warning);
    font-size: 1.2rem;
    flex-shrink: 0;
}

/* Alert Boxes */
.alert-walkthrough {
    background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
    border-left: 4px solid var(--color-success);
    padding: 1.5rem;
    border-radius: var(--radius);
    margin-top: 2rem;
}

.alert-warning-box {
    background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
    border-left: 4px solid var(--color-warning);
    padding: 1.5rem;
    border-radius: var(--radius);
    margin-top: 2rem;
}

/* Responsive */
@media (max-width: 768px) {
    .hw-card-header {
        flex-direction: column;
        text-align: center;
    }

    .hw-badges {
        justify-content: center;
    }

    .pros-cons-grid {
        grid-template-columns: 1fr;
    }

    .specs-grid {
        grid-template-columns: 1fr;
    }
}

/* Modal Fullscreen en Tablets */
@media (min-width: 768px) {
    .modal-xl {
        max-width: 90%;
    }
}

</style>
`;
// Local alias for backward compatibility (use var to allow redeclaration)
var PROFESSIONAL_STYLES = window.PROFESSIONAL_STYLES;

// ============================================================================
// FUNCIONES UI - MÓDULO KIOSKS PROFESIONAL
// ============================================================================

/**
 * Muestra el contenido principal del módulo Kiosks
 */
async function showKiosksContent() {
    try {
        console.log('📱 [KIOSKS-PRO] Cargando módulo...');

        // Inyectar estilos profesionales SOLO UNA VEZ
        if (!document.getElementById('kiosks-pro-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'kiosks-pro-styles';
            styleEl.textContent = PROFESSIONAL_STYLES.replace(/<\/?style>/g, '');
            document.head.appendChild(styleEl);
        }

        const content = `
            <div id="kiosks-container">
                <!-- Header con stats inline -->
                <div class="kiosk-module-header">
                    <div>
                        <h2><i class="fas fa-tablet-alt"></i> Gestión de Kioscos</h2>
                        <p>Dispositivos biométricos para control de asistencia</p>
                    </div>
                    <div class="kiosk-stats-inline">
                        <div class="kiosk-stat-item">
                            <div class="kiosk-stat-value" id="total-kiosks">-</div>
                            <div class="kiosk-stat-label">Total</div>
                        </div>
                        <div class="kiosk-stat-item">
                            <div class="kiosk-stat-value" id="active-kiosks" style="color: #22c55e;">-</div>
                            <div class="kiosk-stat-label">Activos</div>
                        </div>
                        <button class="kiosk-btn kiosk-btn-primary" onclick="showAddKioskModal()">
                            <i class="fas fa-plus"></i> Nuevo Kiosco
                        </button>
                    </div>
                </div>

                <!-- Tabla de Kioscos -->
                <div class="kiosk-table-container">
                    <table class="kiosk-table" id="kiosks-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre / Ubicación</th>
                                <th>Device ID</th>
                                <th>IP / Puerto</th>
                                <th>GPS</th>
                                <th>Última Conexión</th>
                                <th>APK</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="kiosks-tbody">
                            <tr>
                                <td colspan="9" style="text-align: center; padding: 40px;">
                                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #3b82f6;"></i>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = content;

        // Cargar kiosks desde la base de datos
        await loadKiosks();

        console.log('✅ [KIOSKS-PRO] Módulo cargado exitosamente');
    } catch (error) {
        console.error('❌ [KIOSKS-PRO] Error cargando módulo:', error);
        showToast('Error cargando módulo de Kiosks', 'error');
    }
}

/**
 * Carga los kiosks desde la API
 */
async function loadKiosks() {
    try {
        const response = await fetch('/api/kiosks', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) throw new Error('Error al cargar kiosks');

        const kiosks = await response.json();
        renderKiosksTable(kiosks);

    } catch (error) {
        console.error('❌ Error cargando kiosks:', error);
        document.getElementById('kiosks-tbody').innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error al cargar kiosks. <a href="#" onclick="loadKiosks()">Reintentar</a>
                </td>
            </tr>
        `;
    }
}

/**
 * Renderiza la tabla de kiosks - Dark Theme con campos reales de BD
 */
function renderKiosksTable(kiosks) {
    const tbody = document.getElementById('kiosks-tbody');

    // Actualizar stats
    const totalEl = document.getElementById('total-kiosks');
    const activeEl = document.getElementById('active-kiosks');
    if (totalEl) totalEl.textContent = kiosks?.length || 0;
    if (activeEl) activeEl.textContent = kiosks?.filter(k => k.is_active).length || 0;

    if (!kiosks || kiosks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="kiosk-empty-state">
                    <i class="fas fa-tablet-alt"></i>
                    <p>No hay kioscos registrados</p>
                    <button class="kiosk-btn kiosk-btn-primary" onclick="showAddKioskModal()">
                        <i class="fas fa-plus"></i> Crear primer kiosco
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = kiosks.map(kiosk => {
        // Formatear última conexión
        const lastSeen = kiosk.last_seen ? new Date(kiosk.last_seen) : null;
        const isOnline = lastSeen && (Date.now() - lastSeen.getTime()) < 5 * 60 * 1000; // 5 min
        const lastSeenStr = lastSeen
            ? `${lastSeen.toLocaleDateString()} ${lastSeen.toLocaleTimeString().slice(0,5)}`
            : 'Nunca';

        // Formatear GPS
        const gpsStr = (kiosk.gps_lat && kiosk.gps_lng)
            ? `${parseFloat(kiosk.gps_lat).toFixed(4)}, ${parseFloat(kiosk.gps_lng).toFixed(4)}`
            : '-';

        // Formatear IP/Puerto
        const ipStr = kiosk.ip_address
            ? `${kiosk.ip_address}:${kiosk.port || 9998}`
            : '-';

        return `
            <tr>
                <td><strong style="color: #3b82f6;">#${kiosk.id}</strong></td>
                <td>
                    <strong style="color: #e2e8f0;">${kiosk.name || 'Kiosk ' + kiosk.id}</strong><br>
                    <small style="color: #94a3b8;">${kiosk.location || 'Sin ubicación'}</small>
                </td>
                <td>
                    <code style="background: #0f172a; padding: 2px 6px; border-radius: 3px; font-size: 0.75rem; color: #94a3b8;">
                        ${kiosk.device_id || 'No asignado'}
                    </code>
                </td>
                <td style="font-family: monospace; font-size: 0.8rem; color: #94a3b8;">
                    ${ipStr}
                </td>
                <td>
                    ${(kiosk.gps_lat && kiosk.gps_lng)
                        ? `<span class="kiosk-badge kiosk-badge-success"><i class="fas fa-map-marker-alt"></i> ${gpsStr}</span>`
                        : '<span class="kiosk-badge kiosk-badge-warning">Sin GPS</span>'}
                </td>
                <td>
                    <div class="kiosk-last-seen">
                        <span class="${isOnline ? 'online' : 'offline'}"></span>
                        <span style="color: ${isOnline ? '#22c55e' : '#94a3b8'};">${lastSeenStr}</span>
                    </div>
                </td>
                <td>
                    ${kiosk.apk_version
                        ? `<span class="kiosk-badge kiosk-badge-info">v${kiosk.apk_version}</span>`
                        : '<span style="color: #64748b;">-</span>'}
                </td>
                <td>
                    ${kiosk.is_active
                        ? '<span class="kiosk-badge kiosk-badge-success">Activo</span>'
                        : '<span class="kiosk-badge kiosk-badge-danger">Inactivo</span>'}
                </td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="kiosk-btn kiosk-btn-primary kiosk-btn-sm" onclick="showEditKioskModal(${kiosk.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="kiosk-btn kiosk-btn-danger kiosk-btn-sm" onclick="deleteKiosk(${kiosk.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Muestra modal para crear/editar kiosk
 */
async function showAddKioskModal(kioskId = null) {
    try {
        const isEdit = kioskId !== null;
        let kioskData = null;

        if (isEdit) {
            const response = await fetch(`/api/kiosks/${kioskId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            if (!response.ok) throw new Error('Error al cargar kiosk');
            kioskData = await response.json();
        }

        const modalHTML = `
            <div class="modal fade" id="kioskModal" tabindex="-1" style="z-index: 1056 !important;">
                <div class="modal-dialog modal-xl modal-dialog-scrollable" style="z-index: 1058 !important;">
                    <div class="modal-content" style="position: relative; z-index: 1059 !important; pointer-events: auto !important;">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-desktop"></i>
                                ${isEdit ? 'Editar Kiosco' : 'Crear Nuevo Kiosco'}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="kioskForm">
                                <!-- Información Básica -->
                                <div class="card mb-4">
                                    <div class="card-header bg-light">
                                        <h6 class="mb-0">📋 Información Básica</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Nombre del Kiosco *</label>
                                                <input type="text"
                                                       class="form-control"
                                                       id="kiosk-name"
                                                       value="${kioskData?.name || ''}"
                                                       placeholder="Ej: Kiosco Recepción Principal"
                                                       required>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Ubicación</label>
                                                <input type="text"
                                                       class="form-control"
                                                       id="kiosk-location"
                                                       value="${kioskData?.location || ''}"
                                                       placeholder="Ej: Edificio A - Planta Baja">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Device ID</label>
                                                <input type="text"
                                                       class="form-control"
                                                       id="kiosk-device-id"
                                                       value="${kioskData?.device_id || ''}"
                                                       placeholder="Auto-generado desde la app">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Estado</label>
                                                <select class="form-select" id="kiosk-active">
                                                    <option value="1" ${kioskData?.is_active ? 'selected' : ''}>Activo</option>
                                                    <option value="0" ${!kioskData?.is_active ? 'selected' : ''}>Inactivo</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Ubicación GPS -->
                                <div class="card mb-4">
                                    <div class="card-header bg-light">
                                        <h6 class="mb-0">📍 Ubicación GPS (Geofencing)</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="row g-3">
                                            <div class="col-md-5">
                                                <label class="form-label">Latitud</label>
                                                <input type="number"
                                                       class="form-control"
                                                       id="kiosk-gps-lat"
                                                       value="${kioskData?.gps_lat || ''}"
                                                       placeholder="-34.6037"
                                                       step="0.000001"
                                                       min="-90" max="90">
                                                <small class="text-muted">Entre -90 y 90</small>
                                            </div>
                                            <div class="col-md-5">
                                                <label class="form-label">Longitud</label>
                                                <input type="number"
                                                       class="form-control"
                                                       id="kiosk-gps-lng"
                                                       value="${kioskData?.gps_lng || ''}"
                                                       placeholder="-58.3816"
                                                       step="0.000001"
                                                       min="-180" max="180">
                                                <small class="text-muted">Entre -180 y 180</small>
                                            </div>
                                            <div class="col-md-2 d-flex align-items-end">
                                                <button type="button" class="btn btn-outline-primary w-100" onclick="getMyLocation()">
                                                    <i class="fas fa-location-crosshairs"></i> Mi Ubicación
                                                </button>
                                            </div>
                                            <div class="col-12">
                                                <small class="text-muted">
                                                    <i class="fas fa-info-circle"></i>
                                                    Las coordenadas GPS se usan para validar que los fichajes se realicen dentro del área del kiosco.
                                                    También pueden configurarse desde la APK al momento de la instalación.
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Departamentos Autorizados -->
                                <div class="card mb-4">
                                    <div class="card-header bg-light">
                                        <h6 class="mb-0">🏢 Departamentos Autorizados</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="row g-3">
                                            <div class="col-12">
                                                <label class="form-label">Departamentos que pueden fichar en este kiosco</label>
                                                <select class="form-select" id="kiosk-departments" multiple size="5">
                                                    <option value="">Cargando departamentos...</option>
                                                </select>
                                                <small class="text-muted">
                                                    <i class="fas fa-info-circle"></i>
                                                    Si no selecciona ninguno, todos los departamentos pueden fichar en este kiosco.
                                                    Mantenga Ctrl para seleccionar múltiples.
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Hardware de Reconocimiento Facial -->
                                <div class="card mb-4">
                                    <div class="card-header bg-light">
                                        <h6 class="mb-0">👤 Hardware de Reconocimiento Facial</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="row g-3">
                                            <div class="col-12">
                                                <label class="form-label">Seleccionar Hardware *</label>
                                                <select class="form-select hardware-select"
                                                        id="facial-hardware-select"
                                                        onchange="showHardwareDetails(this.value, 'facial')"
                                                        required>
                                                    <option value="">-- Seleccione el hardware --</option>

                                                    <optgroup label="🏢 Enterprise Hardware">
                                                        ${Object.values(HARDWARE_FACIAL_PROFILES)
                                                            .filter(p => p.category === 'enterprise')
                                                            .map(p => `
                                                                <option value="${p.id}"
                                                                        ${kioskData?.hardware_profile === p.id ? 'selected' : ''}>
                                                                    ${p.name} - Score: ${p.performance}/100
                                                                    ${p.recommended ? '⭐' : ''}
                                                                </option>
                                                            `).join('')}
                                                    </optgroup>

                                                    <optgroup label="📱 Tablets iOS">
                                                        ${Object.values(HARDWARE_FACIAL_PROFILES)
                                                            .filter(p => p.category.includes('tablet_ios'))
                                                            .map(p => `
                                                                <option value="${p.id}"
                                                                        ${kioskData?.hardware_profile === p.id ? 'selected' : ''}>
                                                                    ${p.name} - Score: ${p.performance}/100
                                                                    ${p.recommended ? '⭐' : ''}
                                                                </option>
                                                            `).join('')}
                                                    </optgroup>

                                                    <optgroup label="📱 Tablets Android">
                                                        ${Object.values(HARDWARE_FACIAL_PROFILES)
                                                            .filter(p => p.category.includes('tablet_android'))
                                                            .map(p => `
                                                                <option value="${p.id}"
                                                                        ${kioskData?.hardware_profile === p.id ? 'selected' : ''}>
                                                                    ${p.name} - Score: ${p.performance}/100
                                                                    ${p.recommended ? '⭐' : ''}
                                                                </option>
                                                            `).join('')}
                                                    </optgroup>

                                                    <optgroup label="📱 Teléfonos iOS">
                                                        ${Object.values(HARDWARE_FACIAL_PROFILES)
                                                            .filter(p => p.category.includes('phone_ios'))
                                                            .map(p => `
                                                                <option value="${p.id}"
                                                                        ${kioskData?.hardware_profile === p.id ? 'selected' : ''}>
                                                                    ${p.name} - Score: ${p.performance}/100
                                                                    ${p.recommended ? '⭐' : ''}
                                                                </option>
                                                            `).join('')}
                                                    </optgroup>

                                                    <optgroup label="📱 Teléfonos Android">
                                                        ${Object.values(HARDWARE_FACIAL_PROFILES)
                                                            .filter(p => p.category.includes('phone_android'))
                                                            .map(p => `
                                                                <option value="${p.id}"
                                                                        ${kioskData?.hardware_profile === p.id ? 'selected' : ''}>
                                                                    ${p.name} - Score: ${p.performance}/100
                                                                    ${p.recommended ? '⭐' : ''}
                                                                </option>
                                                            `).join('')}
                                                    </optgroup>
                                                </select>
                                            </div>

                                            <!-- Detalles del hardware facial seleccionado -->
                                            <div class="col-12">
                                                <div id="facial-hardware-details"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Hardware de Huella Digital (Opcional) -->
                                <div class="card mb-4">
                                    <div class="card-header bg-light">
                                        <h6 class="mb-0">👆 Lector de Huella Digital (Opcional)</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="row g-3">
                                            <div class="col-12">
                                                <label class="form-label">Seleccionar Lector</label>
                                                <select class="form-select hardware-select"
                                                        id="fingerprint-hardware-select"
                                                        onchange="showHardwareDetails(this.value, 'fingerprint')">
                                                    <option value="">-- Sin lector de huella --</option>

                                                    <optgroup label="🏆 Professional Tier - FBI Certified">
                                                        ${Object.values(HARDWARE_FINGERPRINT_PROFILES)
                                                            .filter(p => p.category === 'fingerprint_professional')
                                                            .map(p => `
                                                                <option value="${p.id}"
                                                                        ${kioskData?.detection_method_fingerprint === p.id ? 'selected' : ''}>
                                                                    ${p.name} - Score: ${p.performance}/100
                                                                    ${p.recommended ? '⭐' : ''}
                                                                </option>
                                                            `).join('')}
                                                    </optgroup>

                                                    <optgroup label="⭐ High-End Tier">
                                                        ${Object.values(HARDWARE_FINGERPRINT_PROFILES)
                                                            .filter(p => p.category === 'fingerprint_high')
                                                            .map(p => `
                                                                <option value="${p.id}"
                                                                        ${kioskData?.detection_method_fingerprint === p.id ? 'selected' : ''}>
                                                                    ${p.name} - Score: ${p.performance}/100
                                                                    ${p.recommended ? '⭐' : ''}
                                                                </option>
                                                            `).join('')}
                                                    </optgroup>

                                                    <optgroup label="💰 Mid-Range - Good Value">
                                                        ${Object.values(HARDWARE_FINGERPRINT_PROFILES)
                                                            .filter(p => p.category === 'fingerprint_mid')
                                                            .map(p => `
                                                                <option value="${p.id}"
                                                                        ${kioskData?.detection_method_fingerprint === p.id ? 'selected' : ''}>
                                                                    ${p.name} - Score: ${p.performance}/100
                                                                    ${p.recommended ? '⭐' : ''}
                                                                </option>
                                                            `).join('')}
                                                    </optgroup>
                                                </select>
                                            </div>

                                            <!-- Detalles del lector de huella seleccionado -->
                                            <div class="col-12">
                                                <div id="fingerprint-hardware-details"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button type="button" class="btn btn-primary" onclick="saveKiosk(${kioskId})">
                                <i class="fas fa-save"></i> ${isEdit ? 'Guardar Cambios' : 'Crear Kiosco'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Eliminar modal existente si hay uno
        const existingModal = document.getElementById('kioskModal');
        if (existingModal) existingModal.remove();

        // Agregar nuevo modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Mostrar modal SIN backdrop que bloquee todo
        const modalElement = document.getElementById('kioskModal');
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: false,  // NO crear backdrop que bloquea todo
            keyboard: true,   // Permitir ESC para cerrar
            focus: true       // Auto-focus en el modal
        });
        modal.show();

        // Agregar listener para limpiar al cerrar
        modalElement.addEventListener('hidden.bs.modal', function () {
            this.remove();
        }, { once: true });

        // Si es edición, mostrar detalles del hardware seleccionado
        if (isEdit && kioskData?.hardware_profile) {
            showHardwareDetails(kioskData.hardware_profile, 'facial');
        }
        if (isEdit && kioskData?.detection_method_fingerprint) {
            showHardwareDetails(kioskData.detection_method_fingerprint, 'fingerprint');
        }

        // Cargar departamentos para el multi-select
        await loadDepartmentsForKioskModal(kioskData?.authorized_departments || []);

    } catch (error) {
        console.error('❌ Error mostrando modal:', error);
        showToast('Error al abrir el modal', 'error');
    }
}

/**
 * Carga los departamentos para el modal de kiosks
 */
async function loadDepartmentsForKioskModal(selectedDepts = []) {
    try {
        const response = await fetch('/api/departments', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) throw new Error('Error al cargar departamentos');

        const data = await response.json();
        const departments = data.departments || data.data || data || [];

        const select = document.getElementById('kiosk-departments');
        if (!select) return;

        select.innerHTML = departments.map(dept => {
            const deptId = dept.id || dept.department_id;
            const deptName = dept.name || dept.nombre;
            const isSelected = selectedDepts.includes(deptId);
            return `<option value="${deptId}" ${isSelected ? 'selected' : ''}>${deptName}</option>`;
        }).join('');

        if (departments.length === 0) {
            select.innerHTML = '<option value="">No hay departamentos disponibles</option>';
        }

    } catch (error) {
        console.error('❌ Error cargando departamentos:', error);
        const select = document.getElementById('kiosk-departments');
        if (select) {
            select.innerHTML = '<option value="">Error al cargar departamentos</option>';
        }
    }
}

/**
 * Obtiene la ubicación GPS actual del navegador
 */
function getMyLocation() {
    if (!navigator.geolocation) {
        showToast('Tu navegador no soporta geolocalización', 'error');
        return;
    }

    showToast('Obteniendo ubicación...', 'info');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const latInput = document.getElementById('kiosk-gps-lat');
            const lngInput = document.getElementById('kiosk-gps-lng');

            if (latInput) latInput.value = position.coords.latitude.toFixed(6);
            if (lngInput) lngInput.value = position.coords.longitude.toFixed(6);

            showToast('Ubicación obtenida correctamente', 'success');
        },
        (error) => {
            let msg = 'Error obteniendo ubicación';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    msg = 'Permiso de ubicación denegado';
                    break;
                case error.POSITION_UNAVAILABLE:
                    msg = 'Ubicación no disponible';
                    break;
                case error.TIMEOUT:
                    msg = 'Tiempo de espera agotado';
                    break;
            }
            showToast(msg, 'error');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

/**
 * Muestra los detalles del hardware seleccionado
 */
function showHardwareDetails(hardwareId, type) {
    if (!hardwareId) {
        document.getElementById(`${type}-hardware-details`).innerHTML = '';
        return;
    }

    const profile = type === 'facial'
        ? HARDWARE_FACIAL_PROFILES[hardwareId]
        : HARDWARE_FINGERPRINT_PROFILES[hardwareId];

    if (!profile) {
        console.error(`Hardware profile not found: ${hardwareId}`);
        return;
    }

    const detailsHTML = `
        <div class="hardware-detail-card ${profile.recommended ? 'recommended' : ''}"
             style="animation: scaleIn 0.3s ease-out;">

            <!-- Header con Logo y Nombre -->
            <div class="hw-card-header">
                <div class="d-flex align-items-center flex-grow-1">
                    <div class="hw-logo-container me-3">
                        ${profile.logo}
                    </div>
                    <div>
                        <h5 class="mb-1">${profile.name}</h5>
                        <p class="text-muted mb-0">${profile.brand} - ${profile.category}</p>
                    </div>
                </div>
                ${profile.recommended ? '<span class="badge bg-success fs-6">⭐ Recomendado</span>' : ''}
            </div>

            <!-- Performance Score -->
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong>Performance Score</strong>
                    <span class="badge bg-${profile.performance >= 90 ? 'success' : profile.performance >= 75 ? 'warning' : 'danger'}">
                        ${profile.performance}/100
                    </span>
                </div>
                <div class="progress" style="height: 12px;">
                    <div class="progress-bar performance-fill bg-${profile.performance >= 90 ? 'success' : profile.performance >= 75 ? 'warning' : 'danger'}"
                         role="progressbar"
                         style="width: ${profile.performance}%"
                         aria-valuenow="${profile.performance}">
                    </div>
                </div>
            </div>

            <!-- Badges de Características -->
            <div class="hw-badges mb-4">
                ${profile.walkthrough ? '<span class="badge bg-success">🚶 Walk-through</span>' : ''}
                ${profile.liveness ? '<span class="badge bg-info">✓ Liveness</span>' : ''}
                ${profile.offline ? '<span class="badge bg-warning">📱 Offline</span>' : ''}
                ${profile.price ? `<span class="badge bg-secondary">💰 ${profile.price.range}</span>` : ''}
            </div>

            <!-- Especificaciones Técnicas -->
            <div class="mb-4">
                <h6 class="text-primary mb-3">⚙️ Especificaciones Técnicas</h6>
                <div class="specs-grid">
                    ${Object.entries(profile.specs).map(([key, value]) => `
                        <div class="spec-item">
                            <small class="text-muted">${key.replace(/_/g, ' ').toUpperCase()}</small>
                            <div><strong>${value}</strong></div>
                        </div>
                    `).join('')}
                </div>
            </div>

            ${profile.features ? `
                <div class="mb-4">
                    <h6 class="text-primary mb-3">✨ Características</h6>
                    <ul class="list-unstyled">
                        ${profile.features.map(f => `<li>✓ ${f}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <!-- Pros y Contras -->
            <div class="pros-cons-grid mb-4">
                <div>
                    <h6 class="text-success mb-3">👍 Ventajas</h6>
                    <ul class="pros-list">
                        ${profile.pros.map(pro => `<li>${pro}</li>`).join('')}
                    </ul>
                </div>
                <div>
                    <h6 class="text-danger mb-3">👎 Desventajas</h6>
                    <ul class="cons-list">
                        ${profile.cons.map(con => `<li>${con}</li>`).join('')}
                    </ul>
                </div>
            </div>

            ${profile.availability ? `
                <div class="mb-4">
                    <h6 class="text-primary mb-3">📦 Disponibilidad Argentina</h6>
                    <div class="alert alert-${profile.availability.argentina === 'Excelente' || profile.availability.argentina === 'Disponible' ? 'success' : 'warning'} mb-0">
                        <strong>Estado:</strong> ${profile.availability.argentina}<br>
                        <strong>Proveedores:</strong> ${profile.availability.suppliers.join(', ')}<br>
                        <strong>Entrega estimada:</strong> ${profile.availability.delivery}
                    </div>
                </div>
            ` : ''}

            <!-- Caso de Uso -->
            <div class="use-case-box">
                <strong>💡 Caso de Uso Ideal:</strong> ${profile.useCase}
            </div>
        </div>
    `;

    document.getElementById(`${type}-hardware-details`).innerHTML = detailsHTML;
}

/**
 * Guarda el kiosk (crear o editar)
 */
async function saveKiosk(kioskId = null) {
    try {
        const isEdit = kioskId !== null;

        // Recopilar datos del formulario
        const gpsLatVal = document.getElementById('kiosk-gps-lat').value;
        const gpsLngVal = document.getElementById('kiosk-gps-lng').value;
        const deptSelect = document.getElementById('kiosk-departments');
        const selectedDepts = Array.from(deptSelect.selectedOptions).map(opt => parseInt(opt.value)).filter(v => !isNaN(v));

        const formData = {
            name: document.getElementById('kiosk-name').value.trim(),
            location: document.getElementById('kiosk-location').value.trim(),
            device_id: document.getElementById('kiosk-device-id').value.trim(),
            is_active: document.getElementById('kiosk-active').value === '1',

            // GPS (Geofencing)
            gps_lat: gpsLatVal ? parseFloat(gpsLatVal) : null,
            gps_lng: gpsLngVal ? parseFloat(gpsLngVal) : null,

            // Departamentos autorizados
            authorized_departments: selectedDepts,

            // Hardware Facial
            hardware_profile: document.getElementById('facial-hardware-select').value,

            // Hardware Huella
            detection_method_fingerprint: document.getElementById('fingerprint-hardware-select').value || null
        };

        // Validaciones
        if (!formData.name) {
            showToast('El nombre del kiosk es obligatorio', 'error');
            return;
        }

        if (!formData.hardware_profile) {
            showToast('Debe seleccionar un hardware de reconocimiento facial', 'error');
            return;
        }

        // Obtener datos del perfil seleccionado
        const facialProfile = HARDWARE_FACIAL_PROFILES[formData.hardware_profile];
        if (facialProfile) {
            formData.hardware_category = facialProfile.category;
            formData.detection_method_facial = facialProfile.specs.technology;
            formData.performance_score = facialProfile.performance;
            formData.supports_walkthrough = facialProfile.walkthrough || false;
            formData.supports_liveness = facialProfile.liveness || false;
            formData.biometric_modes = ['facial'];
            formData.hardware_specs = facialProfile.specs;
        }

        // Si hay huella digital, agregar al biometric_modes
        if (formData.detection_method_fingerprint) {
            formData.biometric_modes.push('fingerprint');
        }

        console.log('📤 Guardando kiosk:', formData);

        // Enviar al servidor
        const url = isEdit ? `/api/kiosks/${kioskId}` : '/api/kiosks';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al guardar kiosk');
        }

        const result = await response.json();

        showToast(isEdit ? 'Kiosk actualizado exitosamente' : 'Kiosk creado exitosamente', 'success');

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('kioskModal'));
        modal.hide();

        // Recargar tabla
        await loadKiosks();

    } catch (error) {
        console.error('❌ Error guardando kiosk:', error);
        showToast(error.message || 'Error al guardar kiosk', 'error');
    }
}

/**
 * Elimina un kiosk
 */
async function deleteKiosk(kioskId) {
    if (!confirm('¿Está seguro de eliminar este kiosk?\n\nEsta acción no se puede deshacer.')) {
        return;
    }

    try {
        const response = await fetch(`/api/kiosks/${kioskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) throw new Error('Error al eliminar kiosk');

        showToast('Kiosk eliminado exitosamente', 'success');
        await loadKiosks();

    } catch (error) {
        console.error('❌ Error eliminando kiosk:', error);
        showToast('Error al eliminar kiosk', 'error');
    }
}

/**
 * Muestra detalles completos de un kiosk
 */
async function showKioskDetails(kioskId) {
    try {
        const response = await fetch(`/api/kiosks/${kioskId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) throw new Error('Error al cargar kiosk');

        const kiosk = await response.json();
        const facialProfile = HARDWARE_FACIAL_PROFILES[kiosk.hardware_profile];
        const fingerprintProfile = HARDWARE_FINGERPRINT_PROFILES[kiosk.detection_method_fingerprint];

        const modalHTML = `
            <div class="modal fade" id="kioskDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-info-circle"></i> Detalles del Kiosk
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <h4>${kiosk.name}</h4>
                            <p class="text-muted">${kiosk.location || 'Sin ubicación'}</p>

                            <hr>

                            <h6>Hardware Facial:</h6>
                            ${facialProfile ? `
                                <div class="mb-3">
                                    ${facialProfile.logo}
                                    <strong>${facialProfile.name}</strong>
                                    <p>${facialProfile.useCase}</p>
                                </div>
                            ` : '<p class="text-muted">No configurado</p>'}

                            <hr>

                            <h6>Lector de Huella:</h6>
                            ${fingerprintProfile ? `
                                <div class="mb-3">
                                    ${fingerprintProfile.logo}
                                    <strong>${fingerprintProfile.name}</strong>
                                    <p>${fingerprintProfile.useCase}</p>
                                </div>
                            ` : '<p class="text-muted">No configurado</p>'}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('kioskDetailsModal'));
        modal.show();

        // Limpiar modal al cerrar
        document.getElementById('kioskDetailsModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });

    } catch (error) {
        console.error('❌ Error mostrando detalles:', error);
        showToast('Error al cargar detalles del kiosk', 'error');
    }
}

/**
 * Helper: mostrar toast
 */
function showToast(message, type = 'info') {
    // Si existe una función global de toasts (no la nuestra), usarla
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, type);
        return;
    }

    // Fallback: console log (evitar alert que molesta)
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.HARDWARE_FACIAL_PROFILES = HARDWARE_FACIAL_PROFILES;
window.HARDWARE_FINGERPRINT_PROFILES = HARDWARE_FINGERPRINT_PROFILES;
window.LOGOS = LOGOS;
window.PROFESSIONAL_STYLES = PROFESSIONAL_STYLES;

// Funciones exportadas
window.showKiosksContent = showKiosksContent;
window.showAddKioskModal = showAddKioskModal;
window.showHardwareDetails = showHardwareDetails;
window.saveKiosk = saveKiosk;
window.deleteKiosk = deleteKiosk;
window.showKioskDetails = showKioskDetails;
window.showEditKioskModal = showAddKioskModal; // Alias
window.getMyLocation = getMyLocation;
window.loadDepartmentsForKioskModal = loadDepartmentsForKioskModal;

console.log('✅ [KIOSKS-PRO] Módulo completo cargado:', {
    facial: Object.keys(HARDWARE_FACIAL_PROFILES).length,
    fingerprint: Object.keys(HARDWARE_FINGERPRINT_PROFILES).length
});
