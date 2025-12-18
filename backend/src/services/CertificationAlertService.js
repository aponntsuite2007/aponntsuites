/**
 * Certification Alert Service - Stub for Render deployment
 * TODO: Implement full certification alert service
 */

class CertificationAlertService {
    constructor() {
        console.log('📜 [CertAlert] Service stub loaded');
    }

    async start() {
        console.log('📜 [CertAlert] Service start (stub)');
    }

    async checkExpirations() {
        return { checked: 0, alerts: 0 };
    }
}

module.exports = new CertificationAlertService();
