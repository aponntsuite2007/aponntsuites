/**
 * SCRIPT: Ejecutar migraciones del sistema de facturación (siac_productos + siac_presupuestos)
 *
 * Crea las tablas necesarias para el sistema de facturación de 3 modos:
 * - MANUAL: Facturación directa sin presupuesto
 * - OCASIONAL: Presupuesto → Factura 1 vez
 * - RECURRENTE: Presupuesto → Facturas periódicas
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Configuración de base de datos
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'attendance_system',
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT || 5432
});

async function runMigrations() {
  console.log('\n🚀 ========== MIGRACIONES DEL SISTEMA DE FACTURACIÓN ==========\n');

  const client = await pool.connect();

  try {
    // Migración 1: siac_productos
    console.log('📦 MIGRACIÓN 1: Creando tabla siac_productos...');
    const productos_sql = fs.readFileSync(
      path.join(__dirname, '../migrations/20250120_create_siac_productos.sql'),
      'utf8'
    );
    await client.query(productos_sql);
    console.log('   ✅ Tabla siac_productos creada');
    console.log('   ✅ 7 productos iniciales insertados (módulos de Aponnt)');

    // Migración 2: siac_presupuestos
    console.log('\n📋 MIGRACIÓN 2: Creando tabla siac_presupuestos...');
    const presupuestos_sql = fs.readFileSync(
      path.join(__dirname, '../migrations/20250120_create_siac_presupuestos.sql'),
      'utf8'
    );
    await client.query(presupuestos_sql);
    console.log('   ✅ Tabla siac_presupuestos creada');
    console.log('   ✅ Funciones helper creadas:');
    console.log('      - avanzar_proximo_periodo()');
    console.log('      - registrar_factura_generada()');
    console.log('      - get_presupuestos_para_facturar()');

    // Verificar tablas creadas
    console.log('\n🔍 VERIFICACIÓN: Comprobando tablas creadas...');

    const checkProductos = await client.query(`
      SELECT COUNT(*) as count FROM siac_productos
    `);
    console.log(`   ✅ siac_productos: ${checkProductos.rows[0].count} productos registrados`);

    const checkPresupuestos = await client.query(`
      SELECT COUNT(*) as count FROM siac_presupuestos
    `);
    console.log(`   ✅ siac_presupuestos: ${checkPresupuestos.rows[0].count} presupuestos`);

    // Mostrar productos de Aponnt
    console.log('\n📊 PRODUCTOS COMERCIALES DE APONNT (company_id = 1):');
    const productos = await client.query(`
      SELECT codigo, nombre, tipo, precio_unitario, moneda, categoria
      FROM siac_productos
      WHERE company_id = 1
      ORDER BY tipo, codigo
    `);

    productos.rows.forEach(p => {
      console.log(`   • ${p.codigo.padEnd(20)} | ${p.nombre.padEnd(40)} | ${p.tipo.padEnd(10)} | $${p.precio_unitario} ${p.moneda}`);
    });

    console.log('\n✅ ========== MIGRACIONES COMPLETADAS ==========\n');
    console.log('🎯 PRÓXIMOS PASOS:');
    console.log('   1. Crear modelos Sequelize (SiacProducto, SiacPresupuesto)');
    console.log('   2. Implementar servicios (ContractBillingService, RecurringQuoteBillingService, ManualInvoiceService)');
    console.log('   3. Crear API endpoints (/api/productos, /api/presupuestos)');
    console.log('   4. Implementar frontend unificado');
    console.log('   5. Configurar cron job para facturación automática\n');

  } catch (error) {
    console.error('\n❌ ERROR en migración:', error);
    console.error(error.stack);
    throw error;

  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
runMigrations()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
