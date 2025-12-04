/**
 * Script de prueba para validar la detección híbrida de regiones
 * Muestra cómo funciona el sistema sin precargar todos los países
 */
const ConsentRegionService = require('../src/services/ConsentRegionService');

console.log('=== TEST: DETECCIÓN HÍBRIDA DE REGIONES ===\n');

// Países de prueba de diferentes regiones
const testCountries = [
    // GDPR (12 meses)
    { code: 'DEU', name: 'Alemania' },
    { code: 'FRA', name: 'Francia' },
    { code: 'ESP', name: 'España' },
    { code: 'ITA', name: 'Italia' },
    { code: 'GBR', name: 'Reino Unido' },
    { code: 'CHE', name: 'Suiza' },
    { code: 'POL', name: 'Polonia' },
    { code: 'NLD', name: 'Países Bajos' },

    // LATAM (24 meses)
    { code: 'ARG', name: 'Argentina' },
    { code: 'BRA', name: 'Brasil' },
    { code: 'MEX', name: 'México' },
    { code: 'COL', name: 'Colombia' },
    { code: 'CHL', name: 'Chile' },
    { code: 'PER', name: 'Perú' },

    // USA (36 meses)
    { code: 'USA', name: 'Estados Unidos' },
    { code: 'PRI', name: 'Puerto Rico' },

    // Asia estricta (12 meses)
    { code: 'KOR', name: 'Corea del Sur' },
    { code: 'JPN', name: 'Japón' },

    // Países NO en las listas (usarán default 24 meses)
    { code: 'AUS', name: 'Australia' },
    { code: 'NZL', name: 'Nueva Zelanda' },
    { code: 'ZAF', name: 'Sudáfrica' },
    { code: 'IND', name: 'India' },
    { code: 'THA', name: 'Tailandia' },
    { code: 'EGY', name: 'Egipto' },
    { code: 'MAR', name: 'Marruecos' },
    { code: 'XXX', name: 'País Ficticio' },
];

console.log('Probando detección automática por código ISO-3:\n');
console.log('=' .repeat(90));
console.log(
    'País'.padEnd(20) +
    'Código'.padEnd(8) +
    'Región'.padEnd(15) +
    'Meses'.padEnd(8) +
    'Regulación'
);
console.log('=' .repeat(90));

for (const country of testCountries) {
    const info = ConsentRegionService.getCountryInfo(country.code);

    console.log(
        country.name.padEnd(20) +
        country.code.padEnd(8) +
        info.region.padEnd(15) +
        String(info.defaultMonths).padEnd(8) +
        info.regulation
    );
}

console.log('=' .repeat(90));

// Resumen por región
console.log('\n=== RESUMEN DE REGIONES ===\n');
const regions = ConsentRegionService.getAllRegions();

for (const [regionName, regionInfo] of Object.entries(regions)) {
    console.log(`${regionName}:`);
    console.log(`  Período default: ${regionInfo.defaultMonths} meses`);
    console.log(`  Descripción: ${regionInfo.description}`);
    if (Array.isArray(regionInfo.countries) && regionInfo.countries.length <= 10) {
        console.log(`  Países: ${regionInfo.countries.join(', ')}`);
    } else if (Array.isArray(regionInfo.countries)) {
        console.log(`  Países: ${regionInfo.countries.length} países registrados`);
    }
    console.log('');
}

// Explicación del flujo
console.log('=== FLUJO DE DECISIÓN ===\n');
console.log('1. Si el país tiene consent_renewal_months en BD → Usar ese valor');
console.log('2. Si no, detectar región automáticamente:');
console.log('   - Es país EU/EEA/UK/CH? → 12 meses (GDPR)');
console.log('   - Es país LATAM? → 24 meses');
console.log('   - Es USA/Territorios? → 36 meses');
console.log('   - Es Asia estricta (KOR/JPN/TWN)? → 12 meses');
console.log('   - Cualquier otro? → 24 meses (default conservador)');
console.log('\n');

console.log('=== VENTAJAS DEL SISTEMA HÍBRIDO ===\n');
console.log('- NO necesitas precargar 200 países');
console.log('- Vendes en Alemania? Auto-detecta GDPR → 12 meses');
console.log('- Vendes en Ghana? No está en listas → Default 24 meses');
console.log('- Quieres override? Solo configura consent_renewal_months en BD');
console.log('- Sistema listo para 40+ países SIN configuración adicional');
