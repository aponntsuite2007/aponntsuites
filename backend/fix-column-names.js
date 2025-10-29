const fs = require('fs');

let content = fs.readFileSync('./server.js', 'utf8');

// Fix GET single user query (líneas 1331-1349)
const fixes = [
    ['u."firstName"', 'u.first_name'],
    ['u."lastName"', 'u.last_name'],
    ['u."hireDate"', 'u.hire_date'],
    ['u."birthDate"', 'u.birth_date'],
    ['u."emergencyContact"', 'u.emergency_contact'],
    ['u."emergencyPhone"', 'u.emergency_phone'],
    ['u."departmentId"', 'u.department_id'],
    ['u."createdAt"', 'u.created_at'],
    ['u."updatedAt"', 'u.updated_at']
];

fixes.forEach(([wrong, correct]) => {
    content = content.replace(new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correct);
});

fs.writeFileSync('./server.js', content);
console.log('✅ Columnas corregidas a snake_case');
