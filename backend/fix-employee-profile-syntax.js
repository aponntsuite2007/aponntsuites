/**
 * FIX: Corregir errores de sintaxis en EmployeeProfileCollector
 *
 * Problema: Las comillas dentro de los selectores CSS están mal escapadas
 * Solución: Usar template literals o doble escape
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'auditor', 'collectors', 'EmployeeProfileCollector.js');

console.log('🔧 Corrigiendo errores de sintaxis en EmployeeProfileCollector...\n');

let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar todos los selectores problemáticos
const fixes = [
    // showSection('users')
    {
        from: /await this\.page\.click\('a\[onclick\*="showSection\(\\'users\\'\)"\]'\);/g,
        to: `await this.page.click('a[onclick*="showSection"]');`
    },
    // showUserTab('work-history')
    {
        from: /await this\.page\.click\('button\[onclick\*="showUserTab\(\\'work-history\\'\)"'\);/g,
        to: `await this.page.click('button[onclick*="showUserTab"][onclick*="work-history"]');`
    },
    // showUserTab('family')
    {
        from: /await this\.page\.click\('button\[onclick\*="showUserTab\(\\'family\\'\)"\]'\);/g,
        to: `await this.page.click('button[onclick*="showUserTab"][onclick*="family"]');`
    },
    // showUserTab('education')
    {
        from: /await this\.page\.click\('button\[onclick\*="showUserTab\(\\'education\\'\)"\]'\);/g,
        to: `await this.page.click('button[onclick*="showUserTab"][onclick*="education"]');`
    },
    // showUserTab('health')
    {
        from: /await this\.page\.click\('button\[onclick\*="showUserTab\(\\'health\\'\)"\]'\);/g,
        to: `await this.page.click('button[onclick*="showUserTab"][onclick*="health"]');`
    },
    // showHealthSubTab('chronic')
    {
        from: /await this\.page\.click\('button\[onclick\*="showHealthSubTab\(\\'chronic\\'\)"\]'\);/g,
        to: `await this.page.click('button[onclick*="showHealthSubTab"][onclick*="chronic"]');`
    },
    // showHealthSubTab('medications')
    {
        from: /await this\.page\.click\('button\[onclick\*="showHealthSubTab\(\\'medications\\'\)"\]'\);/g,
        to: `await this.page.click('button[onclick*="showHealthSubTab"][onclick*="medications"]');`
    },
    // showHealthSubTab('allergies')
    {
        from: /await this\.page\.click\('button\[onclick\*="showHealthSubTab\(\\'allergies\\'\)"\]'\);/g,
        to: `await this.page.click('button[onclick*="showHealthSubTab"][onclick*="allergies"]');`
    },
    // showUserTab('restrictions')
    {
        from: /await this\.page\.click\('button\[onclick\*="showUserTab\(\\'restrictions\\'\)"\]'\);/g,
        to: `await this.page.click('button[onclick*="showUserTab"][onclick*="restrictions"]');`
    },
    // showRestrictionsSubTab('activity')
    {
        from: /await this\.page\.click\('button\[onclick\*="showRestrictionsSubTab\(\\'activity\\'\)"\]'\);/g,
        to: `await this.page.click('button[onclick*="showRestrictionsSubTab"][onclick*="activity"]');`
    },
    // showRestrictionsSubTab('work')
    {
        from: /await this\.page\.click\('button\[onclick\*="showRestrictionsSubTab\(\\'work\\'\)"\]'\);/g,
        to: `await this.page.click('button[onclick*="showRestrictionsSubTab"][onclick*="work"]');`
    },
    // showHealthSubTab('vaccinations')
    {
        from: /await this\.page\.click\('button\[onclick\*="showHealthSubTab\(\\'vaccinations\\'\)"\]'\);/g,
        to: `await this.page.click('button[onclick*="showHealthSubTab"][onclick*="vaccinations"]');`
    },
    // showHealthSubTab('exams')
    {
        from: /await this\.page\.click\('button\[onclick\*="showHealthSubTab\(\\'exams\\'\)"\]'\);/g,
        to: `await this.page.click('button[onclick*="showHealthSubTab"][onclick*="exams"]');`
    }
];

let fixesApplied = 0;

fixes.forEach(fix => {
    const matches = content.match(fix.from);
    if (matches) {
        content = content.replace(fix.from, fix.to);
        fixesApplied += matches.length;
    }
});

// Guardar archivo
fs.writeFileSync(filePath, content, 'utf8');

console.log(`✅ ${fixesApplied} fixes aplicados\n`);
console.log('✅ COMPLETADO: Errores de sintaxis corregidos\n');
