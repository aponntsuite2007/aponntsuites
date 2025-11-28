const axios = require('axios');

(async () => {
  try {
    const response = await axios.get('http://localhost:9998/api/aponnt/dashboard/companies');
    const companies = response.data.companies;

    console.log('📊 Análisis de Coherencia de Empresas (v2 - campos correctos)\n');
    console.log('='.repeat(90));

    companies.forEach(company => {
      const id = company.id || company.company_id;
      const name = company.name;

      // Obtener módulos del campo correcto
      const modulesSummary = company.modulesSummary || {};
      const contractedModules = modulesSummary.contractedModules || 0;
      const totalSystem = modulesSummary.totalSystemModules || 0;

      // Obtener pricing
      const pricing = company.pricing || {};
      const monthlyTotal = pricing.monthlyTotal || company.monthlyTotal || 0;
      const monthlySubtotal = pricing.monthlySubtotal || 0;

      console.log(`\n🏢 ID: ${id} - ${name}`);
      console.log(`   📦 Módulos Contratados: ${contractedModules}`);
      console.log(`   📦 Módulos Sistema: ${totalSystem}`);
      console.log(`   💰 Total Mensual (con IVA): $${monthlyTotal.toFixed(2)}`);
      console.log(`   💰 Subtotal (sin IVA): $${monthlySubtotal.toFixed(2)}`);
      console.log(`   👥 Empleados: ${company.currentEmployees || 0}`);

      // Detectar incoherencias
      if (monthlyTotal > 5000) {
        console.log(`   ⚠️  SOSPECHOSO: Monthly total muy alto (${monthlyTotal.toFixed(2)})`);
      }

      if (monthlyTotal > 100 && contractedModules === 0) {
        console.log(`   🔴 BUG DETECTADO: Tiene precio pero 0 módulos contratados`);
      }

      if (contractedModules > 0 && monthlyTotal === 0) {
        console.log(`   ⚠️  INCOHERENCIA: Tiene módulos pero total $0`);
      }
    });

    console.log('\n' + '='.repeat(90));
    console.log(`\n✅ Total de empresas analizadas: ${companies.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
