/**
 * DMS Routes - Stub for Render deployment
 * TODO: Implement full DMS routes
 */

const express = require('express');

module.exports = function({ services }) {
    const router = express.Router();

    router.get('/health', (req, res) => {
        res.json({ status: 'stub', message: 'DMS routes stub' });
    });

    console.log('📁 [DMS] Routes stub loaded');
    return router;
};
