#!/usr/bin/env node

/**
 * Translation Validator v1.0.0
 *
 * Detecta traducciones faltantes en todos los idiomas
 * comparando con el idioma base (español)
 *
 * Uso:
 *   node scripts/translation-validator.js
 *   node scripts/translation-validator.js --lang=en
 *   node scripts/translation-validator.js --verbose
 */

const fs = require('fs');
const path = require('path');

// Configuración
const LOCALES_DIR = path.join(__dirname, '../public/locales');
const BASE_LOCALE = 'es';
const SUPPORTED_LOCALES = ['es', 'en', 'pt', 'de', 'it', 'fr'];

// Colores para terminal
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bold: '\x1b[1m'
};

// Parsear argumentos
const args = process.argv.slice(2);
const options = {
    lang: null,
    verbose: args.includes('--verbose') || args.includes('-v'),
    fix: args.includes('--fix'),
    report: args.includes('--report')
};

// Extraer idioma específico
const langArg = args.find(arg => arg.startsWith('--lang='));
if (langArg) {
    options.lang = langArg.split('=')[1];
}

// Función para obtener valor anidado
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
}

// Función para establecer valor anidado
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        if (!current[key]) current[key] = {};
        return current[key];
    }, obj);
    target[lastKey] = value;
}

// Función para obtener todas las keys de un objeto
function getAllKeys(obj, prefix = '') {
    let keys = [];
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            keys = keys.concat(getAllKeys(value, fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

// Cargar archivo de traducción
function loadTranslation(locale) {
    const filePath = path.join(LOCALES_DIR, `${locale}.json`);
    if (!fs.existsSync(filePath)) {
        console.error(`${colors.red}❌ Error: No se encontró el archivo ${locale}.json${colors.reset}`);
        return null;
    }
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`${colors.red}❌ Error leyendo ${locale}.json: ${error.message}${colors.reset}`);
        return null;
    }
}

// Guardar archivo de traducción
function saveTranslation(locale, data) {
    const filePath = path.join(LOCALES_DIR, `${locale}.json`);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`${colors.green}✅ Archivo ${locale}.json actualizado${colors.reset}`);
        return true;
    } catch (error) {
        console.error(`${colors.red}❌ Error guardando ${locale}.json: ${error.message}${colors.reset}`);
        return false;
    }
}

// Validar un idioma específico
function validateLocale(locale, baseTranslation) {
    const translation = loadTranslation(locale);
    if (!translation) return null;

    const baseKeys = getAllKeys(baseTranslation);
    const missingKeys = [];
    const extraKeys = [];

    // Buscar keys faltantes
    for (const key of baseKeys) {
        const value = getNestedValue(translation, key);
        if (!value) {
            missingKeys.push(key);
        }
    }

    // Buscar keys extra (que no están en el base)
    const currentKeys = getAllKeys(translation);
    for (const key of currentKeys) {
        const value = getNestedValue(baseTranslation, key);
        if (!value) {
            extraKeys.push(key);
        }
    }

    const totalKeys = baseKeys.length;
    const translatedKeys = totalKeys - missingKeys.length;
    const percentage = ((translatedKeys / totalKeys) * 100).toFixed(2);

    return {
        locale,
        total: totalKeys,
        translated: translatedKeys,
        missing: missingKeys.length,
        extra: extraKeys.length,
        percentage,
        missingKeys,
        extraKeys
    };
}

// Mostrar reporte
function displayReport(results) {
    console.log(`\n${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}  📊 REPORTE DE TRADUCCIONES${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    for (const result of results) {
        if (!result) continue;

        const icon = result.percentage === '100.00' ? '✅' : result.missing > 0 ? '⚠️' : '✅';
        const color = result.percentage === '100.00' ? colors.green : result.missing > 10 ? colors.red : colors.yellow;

        console.log(`${icon} ${color}${result.locale.toUpperCase()}${colors.reset}: ${result.percentage}% completo`);
        console.log(`   ${colors.white}Total: ${result.total} | Traducidas: ${result.translated} | Faltantes: ${result.missing}${colors.reset}`);

        if (result.extra > 0) {
            console.log(`   ${colors.yellow}⚠️  ${result.extra} keys extra (no están en español)${colors.reset}`);
        }

        if (options.verbose && result.missingKeys.length > 0) {
            console.log(`\n   ${colors.yellow}Keys faltantes:${colors.reset}`);
            result.missingKeys.slice(0, 10).forEach(key => {
                console.log(`     - ${key}`);
            });
            if (result.missingKeys.length > 10) {
                console.log(`     ... y ${result.missingKeys.length - 10} más`);
            }
        }

        if (options.verbose && result.extraKeys.length > 0) {
            console.log(`\n   ${colors.magenta}Keys extra:${colors.reset}`);
            result.extraKeys.slice(0, 5).forEach(key => {
                console.log(`     - ${key}`);
            });
            if (result.extraKeys.length > 5) {
                console.log(`     ... y ${result.extraKeys.length - 5} más`);
            }
        }

        console.log('');
    }

    console.log(`${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

// Auto-fix traducciones faltantes
function autoFixTranslations(results, baseTranslation) {
    console.log(`\n${colors.cyan}🔧 Auto-fix activado: Copiando traducciones del español...${colors.reset}\n`);

    for (const result of results) {
        if (!result || result.locale === BASE_LOCALE || result.missingKeys.length === 0) {
            continue;
        }

        const translation = loadTranslation(result.locale);
        if (!translation) continue;

        let fixed = 0;
        for (const key of result.missingKeys) {
            const baseValue = getNestedValue(baseTranslation, key);
            if (baseValue) {
                setNestedValue(translation, key, baseValue);
                fixed++;
            }
        }

        if (fixed > 0) {
            saveTranslation(result.locale, translation);
            console.log(`${colors.green}✅ ${result.locale.toUpperCase()}: ${fixed} traducciones agregadas (copiadas del español)${colors.reset}`);
        }
    }

    console.log(`\n${colors.yellow}⚠️  Recuerda: Las traducciones copiadas están en español. Debes traducirlas manualmente.${colors.reset}\n`);
}

// Generar reporte JSON
function generateJSONReport(results) {
    const report = {
        timestamp: new Date().toISOString(),
        baseLocale: BASE_LOCALE,
        results: results.filter(r => r !== null)
    };

    const reportPath = path.join(__dirname, '../TRANSLATION-REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n${colors.green}✅ Reporte JSON generado: ${reportPath}${colors.reset}\n`);
}

// Main
async function main() {
    console.log(`${colors.bold}${colors.blue}\n🌍 Translation Validator v1.0.0${colors.reset}\n`);

    // Cargar traducciones base
    const baseTranslation = loadTranslation(BASE_LOCALE);
    if (!baseTranslation) {
        console.error(`${colors.red}❌ No se pudo cargar el idioma base (${BASE_LOCALE})${colors.reset}`);
        process.exit(1);
    }

    const baseKeys = getAllKeys(baseTranslation);
    console.log(`${colors.green}✅ Idioma base (${BASE_LOCALE}): ${baseKeys.length} traducciones${colors.reset}\n`);

    // Validar idiomas
    const localesToValidate = options.lang
        ? [options.lang]
        : SUPPORTED_LOCALES.filter(l => l !== BASE_LOCALE);

    const results = [];
    for (const locale of localesToValidate) {
        const result = validateLocale(locale, baseTranslation);
        if (result) {
            results.push(result);
        }
    }

    // Mostrar reporte
    displayReport(results);

    // Auto-fix si está activado
    if (options.fix) {
        autoFixTranslations(results, baseTranslation);
    }

    // Generar reporte JSON si está activado
    if (options.report) {
        generateJSONReport(results);
    }

    // Resumen final
    const totalMissing = results.reduce((sum, r) => sum + (r?.missing || 0), 0);
    if (totalMissing === 0) {
        console.log(`${colors.green}${colors.bold}🎉 ¡Todas las traducciones están completas!${colors.reset}\n`);
    } else {
        console.log(`${colors.yellow}💡 Total de traducciones faltantes: ${totalMissing}${colors.reset}`);
        console.log(`${colors.cyan}   Usa --fix para auto-completar con el español${colors.reset}`);
        console.log(`${colors.cyan}   Usa --verbose para ver detalles${colors.reset}\n`);
    }
}

// Ejecutar
main().catch(error => {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    process.exit(1);
});
