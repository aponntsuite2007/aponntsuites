/**
 * Certification Alert Service - Stub for Render deployment
 * TODO: Implement full certification alert service
 */

class CertificationAlertService {
    constructor(pool) {
        this.pool = pool;
        console.log('📜 [CertAlert] Service stub loaded');
    }

    startCronJob() {
        console.log('📜 [CertAlert] Cron job started (stub)');
    }

    async start() {
        console.log('📜 [CertAlert] Service start (stub)');
    }

    async checkExpirations() {
        return { checked: 0, alerts: 0 };
    }
}

module.exports = CertificationAlertService;
