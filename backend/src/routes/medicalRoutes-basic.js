const express = require('express');
const router = express.Router();

// Ruta de prueba básica para verificar funcionamiento
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Módulo médico funcionando correctamente',
    timestamp: new Date(),
    features: [
      'Certificados médicos',
      'Prescripciones',
      'Cuestionarios',
      'Estadísticas médicas'
    ]
  });
});

// Endpoint de estado
router.get('/status', (req, res) => {
  res.json({
    success: true,
    module: 'medical',
    status: 'active',
    version: '1.0.0'
  });
});

module.exports = router;