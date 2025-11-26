const http = require('http');
const fs = require('fs');

console.log('🔍 Descargando HTML del servidor en http://localhost:9998/panel-administrativo.html...\n');

http.get('http://localhost:9998/panel-administrativo.html', (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`✅ HTML descargado: ${data.length} bytes\n`);

    // Buscar la ubicación del tab engineering
    const engineeringMatch = data.match(/id="engineering"/g);
    console.log(`📊 Encontradas ${engineeringMatch ? engineeringMatch.length : 0} ocurrencias de id="engineering"\n`);

    // Buscar si está dentro de vendor-modal-content
    const lines = data.split('\n');
    let inVendorModal = false;
    let engineeringLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('class="vendor-modal-content"')) {
        inVendorModal = true;
        console.log(`📍 vendor-modal-content encontrado en línea ${i + 1}`);
      }

      if (line.includes('id="engineering"')) {
        engineeringLine = i + 1;
        console.log(`📍 id="engineering" encontrado en línea ${i + 1}`);

        if (inVendorModal) {
          console.log('\n❌ PROBLEMA: El tab engineering está DENTRO de vendor-modal-content');
          console.log('   Esto significa que el servidor está sirviendo el HTML VIEJO\n');
        } else {
          console.log('\n✅ CORRECTO: El tab engineering está FUERA de vendor-modal-content\n');
        }
        break;
      }

      if (line.includes('</div>') && inVendorModal) {
        // Asumimos que el modal se cerró
        inVendorModal = false;
      }
    }

    // Leer archivo en disco
    console.log('📂 Comparando con archivo en disco...\n');
    const diskFile = fs.readFileSync('./public/panel-administrativo.html', 'utf8');
    console.log(`📊 Archivo en disco: ${diskFile.length} bytes`);
    console.log(`📊 Archivo del servidor: ${data.length} bytes\n`);

    if (diskFile.length === data.length) {
      console.log('✅ Mismo tamaño - archivos probablemente idénticos');
    } else {
      console.log('❌ TAMAÑOS DIFERENTES - El servidor NO está sirviendo el archivo del disco');
      console.log(`   Diferencia: ${Math.abs(diskFile.length - data.length)} bytes\n`);
    }

    // Verificar si engineering está en la misma posición
    const diskEngineering = diskFile.indexOf('id="engineering"');
    const serverEngineering = data.indexOf('id="engineering"');

    console.log(`\n📍 Posición id="engineering":`);
    console.log(`   Disco: byte ${diskEngineering}`);
    console.log(`   Servidor: byte ${serverEngineering}`);

    if (diskEngineering === serverEngineering) {
      console.log('   ✅ Misma posición');
    } else {
      console.log('   ❌ Posiciones diferentes - archivos NO son idénticos');
    }
  });

}).on('error', (err) => {
  console.error('❌ Error descargando HTML:', err.message);
});
