const axios = require('axios');

(async () => {
  try {
    const response = await axios.get('http://localhost:9998/api/aponnt/dashboard/companies');
    const companies = response.data.companies;

    console.log('📊 Análisis de Coherencia de Empresas\n');
    console.log('=' .repeat(80));

    companies.forEach(company => {
      const id = company.id || company.company_id;
      const name = company.name;
      const modulesData = company.modules_data || company.active_modules || [];
      const modulesCount = Array.isArray(modulesData) ? modulesData.length : 0;
      const monthlyTotal = company.monthly_total || company.monthlyTotal || 0;

      console.log(`\n🏢 ID: ${id} - ${name}`);
      console.log(`   📦 Módulos (según data): ${modulesCount}`);
      console.log(`   💰 Total Mensual: $${monthlyTotal}`);

      // Detectar incoherencias
      if (monthlyTotal > 5000) {
        console.log(`   ⚠️  SOSPECHOSO: Monthly total muy alto (${monthlyTotal})`);
      }

      if (monthlyTotal > 1000 && modulesCount === 0) {
        console.log(`   🔴 BUG DETECTADO: Tiene precio pero 0 módulos en data`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Total de empresas analizadas: ${companies.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
