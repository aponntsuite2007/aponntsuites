const db = require('../src/config/database');

const financeModels = [
    'FinanceChartOfAccounts',
    'FinanceCostCenter',
    'FinanceFiscalPeriod',
    'FinanceDimension',
    'FinanceBudget',
    'FinanceBudgetLine',
    'FinanceBudgetInvestment',
    'FinanceInflationRate',
    'FinanceJournalEntry',
    'FinanceJournalEntryLine',
    'FinanceAccountBalance',
    'FinanceBudgetExecution',
    'FinanceBankAccount',
    'FinanceBankTransaction',
    'FinanceCashFlowForecast',
    'FinancePaymentMethod',
    'FinanceCashRegister',
    'FinanceCashRegisterAssignment',
    'FinanceCashRegisterSession',
    'FinanceCashTransfer',
    'FinanceCashCount',
    'FinancePettyCashFund',
    'FinancePettyCashExpense',
    'FinancePettyCashReplenishment',
    'FinanceCashIntegrationConfig',
    'FinanceCashMovement',
    'FinanceCashEgressRequest',
    'FinanceCashAdjustment',
    'FinanceCashSessionBalance',
    'FinanceResponsibleConfig',
    'FinanceCheckBook',
    'FinanceIssuedCheck',
    'FinancePaymentOrder',
    'FinancePaymentOrderItem',
    'FinanceCurrency',
    'FinanceExchangeRate',
    'FinanceCurrencyExchange',
    'FinanceBalanceCarryover',
    'FinanceAuthorizationLog'
];

(async () => {
    try {
        await db.sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL\n');

        console.log(`📊 Sincronizando ${financeModels.length} modelos Finance...\n`);

        for (const modelName of financeModels) {
            if (db[modelName]) {
                try {
                    await db[modelName].sync({ force: true });
                    console.log(`✓ ${modelName}`);
                } catch (err) {
                    console.log(`✗ ${modelName}: ${err.message}`);
                }
            } else {
                console.log(`⚠ ${modelName}: modelo no encontrado`);
            }
        }

        console.log('\n✅ Sincronización completada\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();
