// Script para limpiar el localStorage y forzar login normal

console.log('🔧 Iniciando limpieza de localStorage...');

// Limpiar todos los tokens y datos de autenticación hardcodeados
localStorage.removeItem('companyAuthToken');
localStorage.removeItem('isAuthenticated');
localStorage.removeItem('selectedCompany');
localStorage.removeItem('token');
localStorage.removeItem('userRole');
localStorage.removeItem('currentUser');

console.log('✅ localStorage limpiado');
console.log('🔄 Recarga la página para ver el login normal');

alert('✅ Login hardcodeado limpiado. Recarga la página para ver el login normal.');