const fs = require('fs');
const path = require('path');

console.log('\n🔧 CORRIGIENDO FK EN MIGRACIONES\n');

const migrationsDir = path.join(__dirname, '../migrations');
const migrations = [
  '20251127_create_budgets_table.sql',
  '20251127_create_contracts_table.sql',
  '20251127_create_administrative_tasks_table.sql',
  '20251127_create_commission_liquidations_table.sql',
  '20251127_create_commission_payments_table.sql',
  '20251127_add_onboarding_fields_to_companies.sql',
  '20251127_add_core_user_fields_to_users.sql',
  '20251127_add_bank_fields_to_aponnt_staff.sql'
];

let totalChanges = 0;

migrations.forEach(migrationFile => {
  const filePath = path.join(migrationsDir, migrationFile);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  No encontrado: ${migrationFile}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // 1. Corregir FK a companies: INTEGER en vez de UUID
  content = content.replace(/company_id UUID NOT NULL REFERENCES companies\(id\)/g, 'company_id INTEGER NOT NULL REFERENCES companies(company_id)');
  content = content.replace(/company_id UUID REFERENCES companies\(id\)/g, 'company_id INTEGER REFERENCES companies(company_id)');
  content = content.replace(/company_id UUID NOT NULL,/g, 'company_id INTEGER NOT NULL,');
  content = content.replace(/company_id UUID,/g, 'company_id INTEGER,');

  // 2. Corregir FK a aponnt_staff: usar staff_id
  content = content.replace(/REFERENCES aponnt_staff\(id\)/g, 'REFERENCES aponnt_staff(staff_id)');
  content = content.replace(/vendor_id UUID REFERENCES aponnt_staff\(staff_id\)/g, 'vendor_id UUID REFERENCES aponnt_staff(staff_id)');
  content = content.replace(/created_by UUID REFERENCES aponnt_staff\(staff_id\)/g, 'created_by UUID REFERENCES aponnt_staff(staff_id)');

  // 3. Corregir FK a users (ya es UUID, solo cambiar nombre de columna)
  // users usa user_id, no id
  // (Verificar si hay alguna referencia a users)

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    const changes = (content.match(/staff_id|company_id/g) || []).length - (originalContent.match(/staff_id|company_id/g) || []).length;
    console.log(`✅ ${migrationFile} - ${changes} cambios`);
    totalChanges++;
  } else {
    console.log(`➖ ${migrationFile} - sin cambios`);
  }
});

console.log(`\n✅ TOTAL: ${totalChanges} archivos modificados\n`);
