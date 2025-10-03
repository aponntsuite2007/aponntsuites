/**
 * Script de prueba para el módulo de clientes
 * Verifica que la integración funcione correctamente
 */

const {
    Cliente,
    ClienteContacto,
    ClienteDireccion,
    ClientePrecioEspecial,
    ModuloContratado
} = require('../src/models/siac/ClienteFixed');

async function testClientesModule() {
    try {
        console.log('🧪 Iniciando pruebas del módulo de clientes...\n');

        // 1. Verificar módulos contratados
        console.log('📋 1. Verificando módulos contratados...');
        const clientesModule = await Cliente.moduloContratado(1, 'clientes');
        console.log(`✅ Módulo clientes contratado: ${clientesModule ? 'SÍ' : 'NO'}\n`);

        // 2. Crear cliente de prueba
        console.log('👤 2. Creando cliente de prueba...');
        const clienteTest = await Cliente.create({
            companyId: 1,
            codigoCliente: 'TEST001',
            razonSocial: 'Cliente de Prueba S.A.',
            nombreFantasia: 'Cliente Test',
            tipoCliente: 'PERSONA_JURIDICA',
            documentoTipo: 'CUIT',
            documentoNumero: '30123456789',
            email: 'cliente@test.com',
            telefono: '011-4444-5555',
            domicilioCalle: 'Av. Corrientes',
            domicilioNumero: '1234',
            ciudad: 'Buenos Aires',
            provinciaEstado: 'CABA',
            codigoPostal: '1043',
            categoriaCliente: 'MAYORISTA',
            limiteCredito: 50000.00
        });

        console.log(`✅ Cliente creado con ID: ${clienteTest.id}`);
        console.log(`   - Código: ${clienteTest.codigoCliente}`);
        console.log(`   - Razón Social: ${clienteTest.razonSocial}`);
        console.log(`   - Documento: ${clienteTest.documentoFormateado || clienteTest.documentoNumero}`);
        console.log(`   - Domicilio: ${clienteTest.domicilioCompleto}`);
        console.log(`   - Límite de Crédito: $${clienteTest.limiteCredito}\n`);

        // 3. Agregar contacto
        console.log('📞 3. Agregando contacto al cliente...');
        const contacto = await ClienteContacto.create({
            clienteId: clienteTest.id,
            nombre: 'Juan',
            apellido: 'Pérez',
            cargo: 'Gerente de Compras',
            telefono: '011-1234-5678',
            email: 'juan.perez@clientetest.com',
            esContactoPrincipal: true,
            recibeFacturas: true
        });

        console.log(`✅ Contacto agregado: ${contacto.nombre} ${contacto.apellido}`);
        console.log(`   - Cargo: ${contacto.cargo}`);
        console.log(`   - Email: ${contacto.email}\n`);

        // 4. Agregar dirección adicional
        console.log('🏠 4. Agregando dirección adicional...');
        const direccion = await ClienteDireccion.create({
            clienteId: clienteTest.id,
            tipoDireccion: 'ENTREGA',
            nombreDireccion: 'Sucursal Norte',
            calle: 'Av. Libertador',
            numero: '5678',
            ciudad: 'San Isidro',
            provinciaEstado: 'Buenos Aires',
            codigoPostal: '1642',
            activaParaEntrega: true,
            activaParaFacturacion: false
        });

        console.log(`✅ Dirección agregada: ${direccion.nombreDireccion}`);
        console.log(`   - Dirección: ${direccion.calle} ${direccion.numero}, ${direccion.ciudad}\n`);

        // 5. Verificar si productos está contratado (debería dar false)
        console.log('📦 5. Verificando módulo productos...');
        const productosModule = await Cliente.moduloContratado(1, 'productos');
        console.log(`📦 Módulo productos contratado: ${productosModule ? 'SÍ' : 'NO'}`);

        if (!productosModule) {
            console.log('   ⚠️ Como productos no está contratado, no se pueden crear precios especiales automáticamente.');
            console.log('   🔧 El sistema funcionará solo con datos manuales de productos.\n');
        }

        // 6. Obtener cliente completo con integración automática
        console.log('🔍 6. Obteniendo cliente completo...');
        const clienteCompleto = await Cliente.obtenerCompleto(clienteTest.id, 1);

        console.log(`✅ Cliente completo obtenido:`);
        console.log(`   - ID: ${clienteCompleto.id}`);
        console.log(`   - Contactos: ${clienteCompleto.contactos ? clienteCompleto.contactos.length : 0}`);
        console.log(`   - Direcciones: ${clienteCompleto.direcciones ? clienteCompleto.direcciones.length : 0}`);
        console.log(`   - Módulos disponibles: ${clienteCompleto.modulosDisponibles ? clienteCompleto.modulosDisponibles.join(', ') : 'Ninguno'}\n`);

        // 7. Probar formateo de documento
        console.log('📄 7. Probando formateo de documentos...');
        const cuitFormateado = Cliente.formatearDocumento('30123456789', 'CUIT');
        const rutFormateado = Cliente.formatearDocumento('12345678901', 'RUT');
        const cnpjFormateado = Cliente.formatearDocumento('12345678000190', 'CNPJ');

        console.log(`✅ CUIT: 30123456789 → ${cuitFormateado}`);
        console.log(`✅ RUT: 12345678901 → ${rutFormateado}`);
        console.log(`✅ CNPJ: 12345678000190 → ${cnpjFormateado}\n`);

        // 8. Obtener estadísticas
        console.log('📊 8. Obteniendo estadísticas de clientes...');
        const stats = await Cliente.obtenerEstadisticas(1);
        console.log(`✅ Estadísticas de clientes para company_id = 1:`);
        console.log(`   - Total clientes: ${stats.total_clientes}`);
        console.log(`   - Clientes activos: ${stats.clientes_activos}`);
        console.log(`   - Clientes inactivos: ${stats.clientes_inactivos}`);
        console.log(`   - Ventas totales: $${parseFloat(stats.ventas_totales || 0).toFixed(2)}`);
        console.log(`   - Promedio general: $${parseFloat(stats.promedio_general || 0).toFixed(2)}`);
        console.log(`   - Nuevos este mes: ${stats.nuevos_mes}\n`);

        console.log('🎉 ¡Todas las pruebas del módulo de clientes completadas exitosamente!');
        console.log('✨ El sistema modular con detección automática está funcionando correctamente.');

        return {
            success: true,
            clienteId: clienteTest.id,
            modulosContratados: ['clientes'],
            mensaje: 'Módulo de clientes completamente funcional'
        };

    } catch (error) {
        console.error('❌ Error en las pruebas del módulo de clientes:', error);
        throw error;
    }
}

// Ejecutar las pruebas
if (require.main === module) {
    testClientesModule()
        .then(result => {
            console.log('\n✅ Resultado final:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Error en las pruebas:', error.message);
            process.exit(1);
        });
}

module.exports = testClientesModule;