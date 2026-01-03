/**
 * Fix finance-dashboard.js para aceptar string como container
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/js/modules/finance-dashboard.js');

console.log('🔧 Arreglando finance-dashboard.js...');

let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `    async function init(container) {
        console.log('🏦 Inicializando Finance Dashboard...');

        if (!container) {
            container = document.getElementById('finance-dashboard-container');
        }

        if (!container) {
            console.error('Container no encontrado');
            return;
        }`;

const newCode = `    async function init(container) {
        console.log('🏦 Inicializando Finance Dashboard...');

        // Si es un string (ID), convertirlo a elemento DOM
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        // Si no hay container, buscar el default
        if (!container) {
            container = document.getElementById('finance-dashboard-container');
        }

        if (!container) {
            console.error('Container no encontrado');
            return;
        }`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Código arreglado correctamente');
    console.log('   Ahora acepta tanto string (ID) como elemento DOM');
} else {
    console.log('⚠️ No se encontró el código exacto');
    console.log('Intentando con regex...');

    // Regex más flexible
    const regex = /async function init\(container\) \{\s*console\.log\('🏦 Inicializando Finance Dashboard\.\.\.'\);\s*if \(!container\) \{/;

    if (regex.test(content)) {
        console.log('✅ Encontrado el patrón');

        // Insertar la conversión de string a DOM
        content = content.replace(
            /async function init\(container\) \{\s*console\.log\('🏦 Inicializando Finance Dashboard\.\.\.'\);/,
            `async function init(container) {
        console.log('🏦 Inicializando Finance Dashboard...');

        // Si es un string (ID), convertirlo a elemento DOM
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }`
        );

        fs.writeFileSync(filePath, content, 'utf8');
        console.log('✅ Fix aplicado con regex');
    } else {
        console.log('❌ No se pudo encontrar el patrón');
    }
}
