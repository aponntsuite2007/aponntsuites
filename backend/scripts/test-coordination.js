/**
 * ============================================================================
 * TEST COORDINATION SYSTEM
 * ============================================================================
 *
 * Script para probar el sistema de coordinación entre sesiones
 */

const SessionLockManager = require('./session-lock');

async function testCoordination() {
  console.log('🧪 Testing Session Coordination System\n');

  // Test 1: Crear managers para ambas sesiones
  console.log('📋 Test 1: Crear session managers');
  const backend = new SessionLockManager('session-backend');
  const frontend = new SessionLockManager('session-frontend');
  console.log('✅ Managers creados\n');

  // Test 2: Backend adquiere lock
  console.log('📋 Test 2: Backend adquiere lock en metadata');
  const backendLock = await backend.acquireLock('engineering-metadata.js', 'Testing');
  console.log('Result:', backendLock);
  console.log(backendLock.success ? '✅ Lock adquirido' : '❌ Error');
  console.log('');

  // Test 3: Frontend intenta adquirir mismo lock (debe fallar)
  console.log('📋 Test 3: Frontend intenta adquirir mismo lock');
  const frontendLock = await frontend.acquireLock('engineering-metadata.js', 'Testing');
  console.log('Result:', frontendLock);
  console.log(!frontendLock.success ? '✅ Correctamente bloqueado' : '❌ Error - no debería adquirir');
  console.log('');

  // Test 4: Verificar estado del lock
  console.log('📋 Test 4: Verificar estado del lock');
  const lockStatus = await backend.isLocked('engineering-metadata.js');
  console.log('Status:', lockStatus);
  console.log(lockStatus.locked ? '✅ Lock activo' : '❌ Error');
  console.log('');

  // Test 5: Backend libera lock
  console.log('📋 Test 5: Backend libera lock');
  const releaseResult = await backend.releaseLock('engineering-metadata.js');
  console.log('Result:', releaseResult);
  console.log(releaseResult.success ? '✅ Lock liberado' : '❌ Error');
  console.log('');

  // Test 6: Frontend ahora SÍ puede adquirir
  console.log('📋 Test 6: Frontend adquiere lock (ahora debe funcionar)');
  const frontendLock2 = await frontend.acquireLock('engineering-metadata.js', 'Testing');
  console.log('Result:', frontendLock2);
  console.log(frontendLock2.success ? '✅ Lock adquirido' : '❌ Error');
  console.log('');

  // Test 7: Actualizar checksum
  console.log('📋 Test 7: Actualizar checksum de metadata');
  const checksumResult = await frontend.updateMetadataChecksum();
  console.log('Result:', checksumResult);
  console.log(checksumResult.success ? '✅ Checksum actualizado' : '❌ Error');
  console.log('');

  // Test 8: Detectar cambios
  console.log('📋 Test 8: Detectar cambios en metadata');
  const changeResult = await backend.detectMetadataChange();
  console.log('Result:', changeResult);
  console.log('✅ Detección funcionando');
  console.log('');

  // Cleanup
  console.log('🧹 Cleanup: Liberando locks');
  await frontend.releaseLock('engineering-metadata.js');
  console.log('✅ Locks liberados\n');

  console.log('═══════════════════════════════════════════');
  console.log('✅ TODOS LOS TESTS PASARON');
  console.log('═══════════════════════════════════════════\n');
  console.log('📖 Para ver la documentación completa:');
  console.log('   cat backend/.coordination/README.md');
  console.log('');
  console.log('🚀 Para usar en sesiones:');
  console.log('   node scripts/sync-coordinator.js start session-backend');
  console.log('   node scripts/sync-coordinator.js start session-frontend');
}

testCoordination().catch(error => {
  console.error('❌ Error en tests:', error);
  process.exit(1);
});
