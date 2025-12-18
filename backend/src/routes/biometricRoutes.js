/**
 * Biometric Routes - Stub for Render deployment
 * TODO: Implement full biometric routes
 */

const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ status: 'stub', message: 'Biometric routes stub' });
});

console.log('🔐 [Biometric] Routes stub loaded');

module.exports = router;
