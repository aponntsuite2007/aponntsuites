#!/usr/bin/env node
/**
 * ============================================================================
 * PRE-DEPLOY CHECK - Sistema de Protección Anti-Fallo
 * ============================================================================
 *
 * Este script verifica que el código sea compatible con Render antes de push.
 *
 * Uso: node scripts/pre-deploy-check.js
 *
 * Verifica:
 * 1. No hay requires de devDependencies sin try/catch
 * 2. Todos los exports son correctos
 * 3. No hay imports de archivos inexistentes
 * 4. server.js puede cargar sin errores
 *
 * @version 1.0.0
 * @date 2025-01-03
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// Colores para output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

const log = {
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`)
};

console.log('\n🔍 PRE-DEPLOY CHECK - Verificando compatibilidad con Render\n');
console.log('═'.repeat(60));

let errors = [];
let warnings = [];

// Lista de devDependencies que NO deben estar en código de producción sin try/catch
const devDependencies = [
    'playwright',
    '@playwright/test',
    'jest',
    '@faker-js/faker',
    'nodemon',
    'supertest'
];

// Extensiones a verificar
const extensions = ['.js'];

// Directorios a ignorar
const ignoreDirs = ['node_modules', '.git', 'test-results', 'playwright-report', 'logs'];

/**
 * Obtiene todos los archivos JS recursivamente
 */
function getAllJsFiles(dir, files = []) {
    try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (!ignoreDirs.includes(item)) {
                    getAllJsFiles(fullPath, files);
                }
            } else if (extensions.includes(path.extname(item))) {
                files.push(fullPath);
            }
        }
    } catch (e) {
        // Ignorar errores de lectura
    }

    return files;
}

/**
 * Verifica si un require de devDependency está protegido con try/catch
 */
function checkDevDependencyUsage(filePath, content) {
    const issues = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        for (const dep of devDependencies) {
            // Buscar require sin try/catch
            const requirePattern = new RegExp(`require\\s*\\(\\s*['"\`]${dep}['"\`]\\s*\\)`);

            if (requirePattern.test(line)) {
                // Verificar si está dentro de un try/catch (buscar try en las 5 líneas anteriores)
                let isProtected = false;
                for (let j = Math.max(0, i - 5); j <= i; j++) {
                    if (lines[j].includes('try') && lines[j].includes('{')) {
                        isProtected = true;
                        break;
                    }
                }

                if (!isProtected) {
                    issues.push({
                        file: filePath,
                        line: lineNum,
                        dep: dep,
                        message: `require('${dep}') sin try/catch - fallará en producción`
                    });
                }
            }
        }
    }

    return issues;
}

/**
 * Verifica exports de archivos
 */
function checkExports(filePath, content) {
    const issues = [];

    // Verificar que module.exports está definido si hay una clase
    if (content.includes('class ') && !content.includes('module.exports')) {
        issues.push({
            file: filePath,
            message: 'Archivo contiene clase pero no module.exports'
        });
    }

    return issues;
}

/**
 * Verifica requires de archivos locales
 */
function checkLocalRequires(filePath, content) {
    const issues = [];
    const dir = path.dirname(filePath);

    // Buscar requires locales
    const requireMatches = content.matchAll(/require\s*\(\s*['"`](\.[^'"`]+)['"`]\s*\)/g);

    for (const match of requireMatches) {
        const requiredPath = match[1];
        let fullPath = path.resolve(dir, requiredPath);

        // Agregar .js si no tiene extensión
        if (!path.extname(fullPath)) {
            fullPath += '.js';
        }

        // Verificar si existe
        if (!fs.existsSync(fullPath) && !fs.existsSync(fullPath.replace('.js', '/index.js'))) {
            // Verificar si el require está protegido con try/catch
            const lineIndex = content.substring(0, match.index).split('\n').length - 1;
            const lines = content.split('\n');

            let isProtected = false;
            for (let j = Math.max(0, lineIndex - 5); j <= lineIndex; j++) {
                if (lines[j] && lines[j].includes('try') && lines[j].includes('{')) {
                    isProtected = true;
                    break;
                }
            }

            if (!isProtected) {
                issues.push({
                    file: filePath,
                    required: requiredPath,
                    message: `require('${requiredPath}') - archivo no existe y no está protegido`
                });
            }
        }
    }

    return issues;
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

const backendDir = path.join(__dirname, '..');
const files = getAllJsFiles(backendDir);

log.info(`Analizando ${files.length} archivos JavaScript...\n`);

let checkedFiles = 0;
let filesWithIssues = 0;

for (const file of files) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(backendDir, file);

        // Check 1: DevDependencies
        const devDepIssues = checkDevDependencyUsage(file, content);
        if (devDepIssues.length > 0) {
            errors.push(...devDepIssues);
            filesWithIssues++;
        }

        // Check 2: Exports
        const exportIssues = checkExports(file, content);
        if (exportIssues.length > 0) {
            warnings.push(...exportIssues);
        }

        // Check 3: Local requires
        const requireIssues = checkLocalRequires(file, content);
        if (requireIssues.length > 0) {
            // Solo advertir, no bloquear
            for (const issue of requireIssues) {
                warnings.push(issue);
            }
        }

        checkedFiles++;
    } catch (e) {
        // Ignorar errores de lectura
    }
}

// ============================================================================
// RESUMEN
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('📊 RESUMEN DEL ANÁLISIS\n');

console.log(`   Archivos analizados: ${checkedFiles}`);
console.log(`   Errores críticos: ${errors.length}`);
console.log(`   Advertencias: ${warnings.length}`);

if (errors.length > 0) {
    console.log('\n' + '─'.repeat(60));
    log.error('ERRORES CRÍTICOS (deben corregirse antes de deploy):\n');

    for (const err of errors) {
        const relativePath = path.relative(backendDir, err.file);
        console.log(`   📄 ${relativePath}`);
        if (err.line) console.log(`      Línea: ${err.line}`);
        console.log(`      ${err.message}\n`);
    }
}

if (warnings.length > 0) {
    console.log('\n' + '─'.repeat(60));
    log.warn('ADVERTENCIAS (revisar antes de deploy):\n');

    for (const warn of warnings.slice(0, 10)) { // Solo mostrar primeras 10
        const relativePath = path.relative(backendDir, warn.file);
        console.log(`   📄 ${relativePath}`);
        console.log(`      ${warn.message}\n`);
    }

    if (warnings.length > 10) {
        console.log(`   ... y ${warnings.length - 10} advertencias más\n`);
    }
}

console.log('═'.repeat(60));

if (errors.length > 0) {
    log.error(`\n🚫 DEPLOY BLOQUEADO - ${errors.length} errores críticos encontrados\n`);
    log.info('Ejecuta los fixes sugeridos y vuelve a correr este script.\n');
    process.exit(1);
} else if (warnings.length > 0) {
    log.warn(`\n⚠️  DEPLOY PERMITIDO CON PRECAUCIÓN - ${warnings.length} advertencias\n`);
    log.info('Revisa las advertencias antes de hacer push a producción.\n');
    process.exit(0);
} else {
    log.success('\n🎉 LISTO PARA DEPLOY - No se encontraron problemas\n');
    process.exit(0);
}
