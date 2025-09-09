const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get('/', (req, res) => {
    res.send(`
      <div style="text-align:center; padding:50px; font-family:Arial;">
        <h1>🎉 AponntSuites RRHH</h1>
        <p>✅ Sistema funcionando correctamente</p>
        <p>Puerto: ${PORT}</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      </div>
    `);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
