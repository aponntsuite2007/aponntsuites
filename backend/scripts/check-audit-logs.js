const database = require('../src/config/database');

(async () => {
  const { AuditLog } = database;
  const executionId = '1264d1bc-53e9-4e8e-b21d-e4f9bec99863';

  const logs = await AuditLog.findAll({
    where: { execution_id: executionId },
    order: [['created_at', 'DESC']],
    limit: 20
  });

  console.log(`🔍 Audit logs for execution ${executionId}:\n`);
  logs.forEach((log, i) => {
    console.log(`${i+1}. [${log.status}] ${log.test_name}`);
    console.log(`   company_id: ${log.company_id}`);
    console.log(`   duration: ${log.duration_ms}ms`);
    console.log(`   error: ${log.error_message || 'none'}\n`);
  });

  console.log(`✅ Total logs saved: ${logs.length}`);

  // Summary
  const passed = logs.filter(l => l.status === 'passed').length;
  const failed = logs.filter(l => l.status === 'fail').length;

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Success rate: ${Math.round(passed / logs.length * 100)}%`);

  process.exit(0);
})();
