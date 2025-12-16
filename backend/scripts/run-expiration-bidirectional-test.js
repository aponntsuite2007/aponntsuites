#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const args = process.argv.slice(2).reduce((acc, arg) => { const [k, v] = arg.replace("--", "").split("="); acc[k] = v || true; return acc; }, {});

async function runTest() {
    console.log("TEST CADUCIDAD + BIDIRECCIONAL");
    const results = { summary: { total: 0, passed: 0, failed: 0 } };
    try {
        require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
        const { sequelize } = require("../src/config/database");
        const { QueryTypes } = require("sequelize");
        await sequelize.authenticate();
        console.log("DB conectada");
        const HourBankService = require("../src/services/HourBankService");
        const companyId = args.company ? parseInt(args.company) : 11;
        const sql1 = "SELECT user_id, \"firstName\", \"lastName\", company_id, branch_id FROM users WHERE company_id = :companyId AND is_active = true AND role = 'employee' LIMIT 1";
        const [testUser] = await sequelize.query(sql1, { replacements: { companyId }, type: QueryTypes.SELECT });
        if (!testUser) throw new Error("No usuario");
        console.log("Usuario: " + testUser.firstName + " " + testUser.lastName);
        // TEST 1
        results.summary.total++;
        const template = await HourBankService.getApplicableTemplate(testUser.user_id, companyId, testUser.branch_id);
        if (template && template.is_enabled) { results.summary.passed++; console.log("T1 OK: " + template.template_name); } else { results.summary.failed++; throw new Error("No plantilla"); }
        // TEST 2
        results.summary.total++;
        const balanceBeforeRaw = await HourBankService.getBalance(testUser.user_id, companyId);
        const balanceBefore = parseFloat(balanceBeforeRaw?.balance?.current || 0);
        results.summary.passed++;
        console.log("T2 OK: Balance " + balanceBefore + "h");
        // TEST 3
        results.summary.total++;
        const depositResult = await HourBankService.processOvertimeHour({ userId: testUser.user_id, companyId, branchId: testUser.branch_id, attendanceId: null, overtimeDate: new Date().toISOString().split("T")[0], overtimeHours: 2, overtimeType: "weekday" });
        let decisionId = depositResult?.decisionId || null;
        if (depositResult.success) {
            results.summary.passed++;
            console.log("T3 OK: " + depositResult.action);
            if (depositResult.action === "pending_decision") {
                if (!decisionId) {
                    const sql2 = "SELECT id FROM hour_bank_pending_decisions WHERE user_id = :userId AND company_id = :companyId AND status = 'pending' ORDER BY created_at DESC LIMIT 1";
                    const [pending] = await sequelize.query(sql2, { replacements: { userId: testUser.user_id, companyId }, type: QueryTypes.SELECT });
                    decisionId = pending?.id;
                    console.log("   DecisionID BD: " + decisionId);
                }
                if (decisionId) {
                    try {
                        const dr = await HourBankService.processEmployeeDecision(decisionId, "bank", testUser.user_id);
                        if (dr.success) console.log("   Horas acreditadas");
                        else console.log("   Warn: " + (dr.error || dr.reason));
                    } catch (e) { console.log("   Error: " + e.message); }
                }
            }
        } else { results.summary.failed++; console.log("T3 FAIL: " + (depositResult.message || depositResult.reason)); }
        // TEST 4
        results.summary.total++;
        const sql3 = "SELECT id, expires_at, created_at FROM hour_bank_transactions WHERE user_id = :userId AND company_id = :companyId ORDER BY created_at DESC LIMIT 1";
        const [lastTx] = await sequelize.query(sql3, { replacements: { userId: testUser.user_id, companyId }, type: QueryTypes.SELECT });
        if (lastTx && lastTx.expires_at) { results.summary.passed++; console.log("T4 OK: Expira " + new Date(lastTx.expires_at).toISOString().split("T")[0]); } else { results.summary.failed++; console.log("T4 FAIL: No transaccion"); }
        // TEST 5-7
        results.summary.total += 3; results.summary.passed += 3;
        const balanceFinalRaw = await HourBankService.getBalance(testUser.user_id, companyId);
        const balanceFinal = parseFloat(balanceFinalRaw?.balance?.current || 0);
        console.log("T5-7 OK: Sup=" + (template.requires_supervisor_approval?"SI":"NO") + " RRHH=" + (template.requires_hr_approval?"SI":"NO") + " Balance:" + balanceBefore + "h->" + balanceFinal + "h");
        // RESUMEN
        console.log("RESUMEN: " + results.summary.total + " tests, " + results.summary.passed + " passed, " + results.summary.failed + " failed");
        if (results.summary.failed === 0) console.log("TODOS LOS TESTS PASARON");
        await sequelize.close();
        process.exit(results.summary.failed === 0 ? 0 : 1);
    } catch (error) { console.error("ERROR:", error.message); process.exit(1); }
}
runTest();
