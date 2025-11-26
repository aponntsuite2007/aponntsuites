const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function safeRestart() {
  console.log('🔄 Safe restart initiated...');

  try {
    // Find process on port 9999
    const { stdout } = await execPromise('netstat -ano | findstr ":9999" | findstr "LISTENING"');
    const match = stdout.trim().match(/(\d+)$/);

    if (match) {
      const pid = match[1];
      console.log(`🎯 Found PID ${pid} on port 9999`);

      // Kill it
      try {
        await execPromise(`taskkill /F /PID ${pid}`);
        console.log(`✅ Killed PID ${pid}`);
      } catch (e) {
        console.log(`⚠️  Process may already be dead: ${e.message}`);
      }

      // Wait
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.log('✅ Port 9999 is free');
    }

    // Start server
    console.log('🚀 Starting server on port 9999...');
    const server = exec('npm start', {
      cwd: __dirname,
      env: { ...process.env, PORT: 9999 }
    });

    server.stdout.on('data', (data) => process.stdout.write(data));
    server.stderr.on('data', (data) => process.stderr.write(data));

    server.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
      process.exit(code);
    });

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

safeRestart();
