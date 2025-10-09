const { exec } = require('child_process');

console.log('🔄 Matando proceso en puerto 9352...');
exec('taskkill /F /PID 9352', (error, stdout, stderr) => {
  if (error && !error.message.includes('not found')) {
    console.error(`Error al matar proceso: ${error.message}`);
  }

  console.log('⏳ Esperando 2 segundos...');
  setTimeout(() => {
    console.log('🚀 Iniciando nuevo servidor...');
    const server = exec('npm start', {
      cwd: __dirname,
      env: { ...process.env, PORT: 9998 }
    });

    server.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    server.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    server.on('close', (code) => {
      console.log(`Servidor terminó con código ${code}`);
    });
  }, 2000);
});
