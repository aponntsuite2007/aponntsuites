const express = require('express');
const router = express.Router();

// Placeholder routes for absence management
router.get('/test', (req, res) => {
  res.json({ message: 'Absence routes working' });
});

module.exports = router;