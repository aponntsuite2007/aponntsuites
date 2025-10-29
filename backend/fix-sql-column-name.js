const fs = require('fs');
const file = 'src/auditor/collectors/FrontendCollector.js';

let content = fs.readFileSync(file, 'utf8');

// Fix: Cambiar "id" por "company_id" en la query
const oldQuery = `const result = await client.query('SELECT slug FROM companies WHERE id = $1', [company_id]);`;
const newQuery = `const result = await client.query('SELECT slug FROM companies WHERE company_id = $1', [company_id]);`;

content = content.replace(oldQuery, newQuery);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ Fix SQL aplicado: id → company_id');
