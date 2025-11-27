/**
 * PayrollExportService - Exportacion Multi-Plataforma Parametrizable
 * Formatos soportados: SAP, Workday, ADP, Oracle HCM, Formatos locales (configurable por pais)
 */

const { sequelize } = require('../config/database');

class PayrollExportService {

    // Formatos de exportacion disponibles (extensible via BD)
    static EXPORT_FORMATS = {
        // ERPs Globales
        SAP_SUCCESSFACTORS: {
            code: 'SAP_SF',
            name: 'SAP SuccessFactors',
            type: 'ERP',
            fileExtension: 'csv',
            delimiter: ';',
            encoding: 'UTF-8',
            dateFormat: 'YYYY-MM-DD',
            decimalSeparator: '.',
            includeHeader: true
        },
        SAP_HCM: {
            code: 'SAP_HCM',
            name: 'SAP HCM (On-Premise)',
            type: 'ERP',
            fileExtension: 'txt',
            delimiter: '|',
            encoding: 'UTF-8',
            dateFormat: 'YYYYMMDD',
            decimalSeparator: '.',
            fixedWidth: true
        },
        WORKDAY: {
            code: 'WORKDAY',
            name: 'Workday HCM',
            type: 'ERP',
            fileExtension: 'csv',
            delimiter: ',',
            encoding: 'UTF-8',
            dateFormat: 'MM/DD/YYYY',
            decimalSeparator: '.',
            includeHeader: true
        },
        ADP_GLOBALVIEW: {
            code: 'ADP_GV',
            name: 'ADP GlobalView',
            type: 'ERP',
            fileExtension: 'csv',
            delimiter: ',',
            encoding: 'UTF-8',
            dateFormat: 'YYYY-MM-DD',
            decimalSeparator: '.',
            includeHeader: true
        },
        ORACLE_HCM: {
            code: 'ORACLE_HCM',
            name: 'Oracle HCM Cloud',
            type: 'ERP',
            fileExtension: 'csv',
            delimiter: ',',
            encoding: 'UTF-8',
            dateFormat: 'YYYY/MM/DD',
            decimalSeparator: '.',
            includeHeader: true
        },

        // Formatos Bancarios Genericos
        BANK_TRANSFER_ISO: {
            code: 'BANK_ISO',
            name: 'Transferencia Bancaria (ISO 20022)',
            type: 'BANK',
            fileExtension: 'xml',
            encoding: 'UTF-8'
        },
        BANK_TRANSFER_CSV: {
            code: 'BANK_CSV',
            name: 'Transferencia Bancaria (CSV)',
            type: 'BANK',
            fileExtension: 'csv',
            delimiter: ',',
            encoding: 'UTF-8'
        },

        // Contabilidad
        ACCOUNTING_JOURNAL: {
            code: 'ACC_JNL',
            name: 'Asiento Contable',
            type: 'ACCOUNTING',
            fileExtension: 'csv',
            delimiter: ';',
            encoding: 'UTF-8'
        },

        // Generico
        EXCEL: {
            code: 'EXCEL',
            name: 'Microsoft Excel',
            type: 'GENERIC',
            fileExtension: 'xlsx',
            encoding: 'UTF-8'
        },
        JSON_API: {
            code: 'JSON',
            name: 'JSON (API Integration)',
            type: 'API',
            fileExtension: 'json',
            encoding: 'UTF-8'
        }
    };

    /**
     * Obtener formatos disponibles para una empresa
     */
    static async getAvailableFormats(companyId) {
        // Obtener formatos custom de la empresa desde BD
        const [customFormats] = await sequelize.query(`
            SELECT * FROM payroll_export_formats
            WHERE company_id = :companyId OR company_id IS NULL
            AND is_active = true
            ORDER BY format_name
        `, { replacements: { companyId } });

        // Combinar con formatos estaticos
        const allFormats = Object.values(this.EXPORT_FORMATS).map(f => ({
            ...f,
            isSystem: true
        }));

        customFormats.forEach(cf => {
            allFormats.push({
                code: cf.format_code,
                name: cf.format_name,
                type: cf.format_type,
                fileExtension: cf.file_extension,
                delimiter: cf.delimiter,
                encoding: cf.encoding || 'UTF-8',
                dateFormat: cf.date_format,
                decimalSeparator: cf.decimal_separator,
                includeHeader: cf.include_header,
                templatePath: cf.template_path,
                isSystem: false,
                customConfig: cf.config
            });
        });

        return allFormats;
    }

    /**
     * Exportar liquidacion a formato especifico
     */
    static async exportPayrollRun(runId, formatCode, options = {}) {
        const format = this.EXPORT_FORMATS[formatCode] || await this.getCustomFormat(formatCode);

        if (!format) {
            throw new Error(`Formato de exportacion no encontrado: ${formatCode}`);
        }

        // Obtener datos de la liquidacion
        const payrollData = await this.getPayrollRunData(runId);

        // Generar segun tipo de formato
        switch (format.type) {
            case 'ERP':
                return await this.generateERPExport(payrollData, format, options);
            case 'BANK':
                return await this.generateBankExport(payrollData, format, options);
            case 'ACCOUNTING':
                return await this.generateAccountingExport(payrollData, format, options);
            case 'API':
                return await this.generateAPIExport(payrollData, format, options);
            default:
                return await this.generateGenericExport(payrollData, format, options);
        }
    }

    /**
     * Obtener datos completos de una corrida de nomina
     */
    static async getPayrollRunData(runId) {
        const [runData] = await sequelize.query(`
            SELECT
                pr.*,
                c.name as company_name,
                c.tax_id as company_tax_id,
                cb.branch_name,
                cb.country_code,
                pc.currency_code
            FROM payroll_runs pr
            JOIN companies c ON pr.company_id = c.company_id
            LEFT JOIN company_branches cb ON pr.branch_id = cb.id
            LEFT JOIN payroll_countries pc ON cb.country_id = pc.id
            WHERE pr.id = :runId
        `, { replacements: { runId }, type: sequelize.QueryTypes.SELECT });

        if (!runData.length) {
            throw new Error('Corrida de nomina no encontrada');
        }

        // Obtener detalles por empleado
        const [details] = await sequelize.query(`
            SELECT
                prd.*,
                u."firstName", u."lastName", u.dni, u.employee_code,
                u.bank_name, u.bank_account_number, u.bank_account_type,
                d.name as department_name,
                pt.template_name
            FROM payroll_run_details prd
            JOIN users u ON prd.user_id = u.user_id
            LEFT JOIN departments d ON u."departmentId" = d.id
            LEFT JOIN payroll_templates pt ON prd.template_id = pt.id
            WHERE prd.run_id = :runId
            ORDER BY u."lastName", u."firstName"
        `, { replacements: { runId } });

        // Obtener conceptos por empleado
        for (const detail of details) {
            const [concepts] = await sequelize.query(`
                SELECT prcd.*, pct.type_code, pct.is_deduction, pct.is_employer_cost
                FROM payroll_run_concept_details prcd
                LEFT JOIN payroll_concept_types pct ON prcd.concept_type_id = pct.id
                WHERE prcd.run_detail_id = :detailId
                ORDER BY prcd.display_order
            `, { replacements: { detailId: detail.id } });
            detail.concepts = concepts;
        }

        return {
            run: runData[0],
            details
        };
    }

    /**
     * Generar exportacion para ERP (SAP, Workday, ADP, Oracle)
     */
    static async generateERPExport(payrollData, format, options) {
        const { run, details } = payrollData;
        const lines = [];

        // Header si aplica
        if (format.includeHeader) {
            lines.push(this.getERPHeader(format));
        }

        // Lineas por empleado
        for (const detail of details) {
            const line = this.formatERPLine(detail, run, format);
            lines.push(line);
        }

        const content = lines.join('\n');
        const filename = `payroll_${format.code}_${run.period_year}${String(run.period_month).padStart(2, '0')}.${format.fileExtension}`;

        return {
            filename,
            content,
            mimeType: this.getMimeType(format.fileExtension),
            encoding: format.encoding,
            recordCount: details.length,
            format: format.name
        };
    }

    /**
     * Header para formatos ERP
     */
    static getERPHeader(format) {
        const headers = {
            SAP_SF: ['Employee_ID', 'Last_Name', 'First_Name', 'Tax_ID', 'Department', 'Pay_Period', 'Gross_Pay', 'Deductions', 'Net_Pay', 'Currency', 'Pay_Date'],
            SAP_HCM: ['PERNR', 'NACHN', 'VORNA', 'GBDAT', 'KOSTL', 'LGART', 'BETRG', 'WAERS', 'BEGDA', 'ENDDA'],
            WORKDAY: ['Employee_ID', 'Worker_Name', 'Tax_ID', 'Cost_Center', 'Period_Start', 'Period_End', 'Gross_Amount', 'Net_Amount', 'Currency'],
            ADP_GV: ['EmployeeNumber', 'LastName', 'FirstName', 'NationalID', 'DepartmentCode', 'PayPeriod', 'GrossEarnings', 'TotalDeductions', 'NetPay'],
            ORACLE_HCM: ['PERSON_NUMBER', 'LAST_NAME', 'FIRST_NAME', 'NATIONAL_IDENTIFIER', 'DEPARTMENT_NAME', 'PAYROLL_NAME', 'GROSS_PAY', 'NET_PAY', 'PAYMENT_DATE']
        };

        const headerFields = headers[format.code] || headers.SAP_SF;
        return headerFields.join(format.delimiter);
    }

    /**
     * Formatear linea para ERP
     */
    static formatERPLine(detail, run, format) {
        const d = format.delimiter;
        const formatDate = (date) => this.formatDateByPattern(date, format.dateFormat);
        const formatAmount = (amount) => {
            const num = parseFloat(amount || 0).toFixed(2);
            return format.decimalSeparator === ',' ? num.replace('.', ',') : num;
        };

        switch (format.code) {
            case 'SAP_SF':
            case 'SAP_SUCCESSFACTORS':
                return [
                    detail.employee_code || detail.user_id,
                    detail.lastName,
                    detail.firstName,
                    detail.dni,
                    detail.department_name || '',
                    `${run.period_year}-${String(run.period_month).padStart(2, '0')}`,
                    formatAmount(detail.gross_earnings),
                    formatAmount(detail.total_deductions),
                    formatAmount(detail.net_salary),
                    run.currency_code || 'ARS',
                    formatDate(run.payment_date)
                ].join(d);

            case 'SAP_HCM':
                return [
                    (detail.employee_code || '').padStart(8, '0'),
                    detail.lastName.substring(0, 40).padEnd(40),
                    detail.firstName.substring(0, 40).padEnd(40),
                    formatDate(detail.hire_date),
                    (detail.department_code || '').padStart(10, '0'),
                    '1000', // LGART - Wage type
                    formatAmount(detail.net_salary).padStart(15),
                    (run.currency_code || 'ARS').padEnd(5),
                    formatDate(run.period_start),
                    formatDate(run.period_end)
                ].join(d);

            case 'WORKDAY':
                return [
                    detail.employee_code || detail.user_id,
                    `${detail.lastName}, ${detail.firstName}`,
                    detail.dni,
                    detail.department_name || '',
                    formatDate(run.period_start),
                    formatDate(run.period_end),
                    formatAmount(detail.gross_earnings),
                    formatAmount(detail.net_salary),
                    run.currency_code || 'USD'
                ].join(d);

            case 'ADP_GV':
            case 'ADP_GLOBALVIEW':
                return [
                    detail.employee_code || '',
                    detail.lastName,
                    detail.firstName,
                    detail.dni,
                    detail.department_code || '',
                    `${run.period_year}${String(run.period_month).padStart(2, '0')}`,
                    formatAmount(detail.gross_earnings),
                    formatAmount(detail.total_deductions),
                    formatAmount(detail.net_salary)
                ].join(d);

            case 'ORACLE_HCM':
                return [
                    detail.employee_code || detail.user_id,
                    detail.lastName,
                    detail.firstName,
                    detail.dni,
                    detail.department_name || '',
                    run.run_name || 'Monthly Payroll',
                    formatAmount(detail.gross_earnings),
                    formatAmount(detail.net_salary),
                    formatDate(run.payment_date)
                ].join(d);

            default:
                return [
                    detail.employee_code,
                    detail.lastName,
                    detail.firstName,
                    formatAmount(detail.net_salary)
                ].join(d);
        }
    }

    /**
     * Generar exportacion bancaria
     */
    static async generateBankExport(payrollData, format, options) {
        const { run, details } = payrollData;

        if (format.code === 'BANK_ISO' || format.fileExtension === 'xml') {
            return this.generateISO20022(payrollData, options);
        }

        // CSV bancario generico
        const lines = [];
        lines.push(['Cuenta_Origen', 'Cuenta_Destino', 'Tipo_Cuenta', 'Banco', 'Beneficiario', 'DNI', 'Importe', 'Referencia'].join(','));

        for (const detail of details) {
            if (detail.net_salary > 0 && detail.bank_account_number) {
                lines.push([
                    options.sourceAccount || '',
                    detail.bank_account_number,
                    detail.bank_account_type || 'CA',
                    detail.bank_name || '',
                    `${detail.lastName} ${detail.firstName}`,
                    detail.dni,
                    parseFloat(detail.net_salary).toFixed(2),
                    `SUELDO ${run.period_month}/${run.period_year}`
                ].join(','));
            }
        }

        return {
            filename: `bank_transfer_${run.period_year}${String(run.period_month).padStart(2, '0')}.csv`,
            content: lines.join('\n'),
            mimeType: 'text/csv',
            encoding: 'UTF-8',
            recordCount: details.filter(d => d.net_salary > 0 && d.bank_account_number).length
        };
    }

    /**
     * Generar XML ISO 20022 para transferencias bancarias
     */
    static generateISO20022(payrollData, options) {
        const { run, details } = payrollData;
        const msgId = `PAY${run.company_id}${run.id}${Date.now()}`;
        const creationDate = new Date().toISOString();

        const validPayments = details.filter(d => d.net_salary > 0 && d.bank_account_number);
        const totalAmount = validPayments.reduce((sum, d) => sum + parseFloat(d.net_salary || 0), 0);

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${creationDate}</CreDtTm>
      <NbOfTxs>${validPayments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${run.company_name}</Nm>
        <Id><OrgId><Othr><Id>${run.company_tax_id}</Id></Othr></OrgId></Id>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${msgId}_001</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${validPayments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <ReqdExctnDt>${run.payment_date || new Date().toISOString().split('T')[0]}</ReqdExctnDt>
      <Dbtr>
        <Nm>${run.company_name}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>${options.sourceIBAN || ''}</IBAN></Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId><BIC>${options.sourceBIC || ''}</BIC></FinInstnId>
      </DbtrAgt>
`;

        for (const detail of validPayments) {
            xml += `      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${detail.employee_code || detail.user_id}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="${run.currency_code || 'ARS'}">${parseFloat(detail.net_salary).toFixed(2)}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId><Nm>${detail.bank_name || ''}</Nm></FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${detail.lastName} ${detail.firstName}</Nm>
          <Id><PrvtId><Othr><Id>${detail.dni}</Id></Othr></PrvtId></Id>
        </Cdtr>
        <CdtrAcct>
          <Id><Othr><Id>${detail.bank_account_number}</Id></Othr></Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>SUELDO ${run.period_month}/${run.period_year}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>
`;
        }

        xml += `    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

        return {
            filename: `ISO20022_payment_${run.period_year}${String(run.period_month).padStart(2, '0')}.xml`,
            content: xml,
            mimeType: 'application/xml',
            encoding: 'UTF-8',
            recordCount: validPayments.length,
            totalAmount
        };
    }

    /**
     * Generar asiento contable
     */
    static async generateAccountingExport(payrollData, format, options) {
        const { run, details } = payrollData;
        const lines = [];

        // Header
        lines.push(['Fecha', 'Cuenta', 'Descripcion', 'Debe', 'Haber', 'Centro_Costo', 'Referencia'].join(';'));

        // Totales para asiento
        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;
        let totalEmployer = 0;

        const conceptTotals = {};

        for (const detail of details) {
            totalGross += parseFloat(detail.gross_earnings || 0);
            totalDeductions += parseFloat(detail.total_deductions || 0);
            totalNet += parseFloat(detail.net_salary || 0);
            totalEmployer += parseFloat(detail.employer_contributions || 0);

            // Agrupar por concepto
            for (const concept of (detail.concepts || [])) {
                const key = concept.concept_code;
                if (!conceptTotals[key]) {
                    conceptTotals[key] = {
                        code: concept.concept_code,
                        name: concept.concept_name,
                        amount: 0,
                        isDeduction: concept.is_deduction,
                        isEmployer: concept.is_employer_cost
                    };
                }
                conceptTotals[key].amount += parseFloat(concept.calculated_amount || 0);
            }
        }

        const paymentDate = run.payment_date || new Date().toISOString().split('T')[0];
        const reference = `NOM-${run.period_year}${String(run.period_month).padStart(2, '0')}`;

        // Asiento: Gasto de sueldos (Debe)
        lines.push([paymentDate, options.salaryExpenseAccount || '6200', 'Sueldos y Jornales', totalGross.toFixed(2), '', '', reference].join(';'));

        // Asiento: Cargas sociales empleador (Debe)
        if (totalEmployer > 0) {
            lines.push([paymentDate, options.employerContribAccount || '6210', 'Cargas Sociales Empleador', totalEmployer.toFixed(2), '', '', reference].join(';'));
        }

        // Asientos por concepto de deduccion (Haber)
        for (const [code, concept] of Object.entries(conceptTotals)) {
            if (concept.isDeduction && concept.amount > 0) {
                lines.push([paymentDate, options.deductionAccounts?.[code] || '2100', concept.name, '', concept.amount.toFixed(2), '', reference].join(';'));
            }
        }

        // Asiento: Sueldos a pagar (Haber)
        lines.push([paymentDate, options.salaryPayableAccount || '2110', 'Sueldos a Pagar', '', totalNet.toFixed(2), '', reference].join(';'));

        return {
            filename: `accounting_journal_${run.period_year}${String(run.period_month).padStart(2, '0')}.csv`,
            content: lines.join('\n'),
            mimeType: 'text/csv',
            encoding: 'UTF-8',
            recordCount: lines.length - 1,
            summary: { totalGross, totalDeductions, totalNet, totalEmployer }
        };
    }

    /**
     * Generar exportacion JSON para API
     */
    static async generateAPIExport(payrollData, format, options) {
        const { run, details } = payrollData;

        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                format: 'JSON_API',
                version: '1.0'
            },
            payrollRun: {
                id: run.id,
                company: run.company_name,
                companyTaxId: run.company_tax_id,
                branch: run.branch_name,
                country: run.country_code,
                period: {
                    year: run.period_year,
                    month: run.period_month,
                    start: run.period_start,
                    end: run.period_end
                },
                paymentDate: run.payment_date,
                currency: run.currency_code,
                status: run.status
            },
            summary: {
                totalEmployees: details.length,
                totalGross: details.reduce((s, d) => s + parseFloat(d.gross_earnings || 0), 0),
                totalDeductions: details.reduce((s, d) => s + parseFloat(d.total_deductions || 0), 0),
                totalNet: details.reduce((s, d) => s + parseFloat(d.net_salary || 0), 0),
                totalEmployerCost: details.reduce((s, d) => s + parseFloat(d.employer_contributions || 0), 0)
            },
            employees: details.map(d => ({
                employeeId: d.employee_code || d.user_id,
                name: `${d.firstName} ${d.lastName}`,
                taxId: d.dni,
                department: d.department_name,
                template: d.template_name,
                earnings: {
                    gross: parseFloat(d.gross_earnings || 0),
                    nonRemunerative: parseFloat(d.non_remunerative || 0)
                },
                deductions: parseFloat(d.total_deductions || 0),
                netPay: parseFloat(d.net_salary || 0),
                employerCost: parseFloat(d.employer_contributions || 0),
                bankDetails: d.bank_account_number ? {
                    bankName: d.bank_name,
                    accountNumber: d.bank_account_number,
                    accountType: d.bank_account_type
                } : null,
                concepts: (d.concepts || []).map(c => ({
                    code: c.concept_code,
                    name: c.concept_name,
                    type: c.type_code,
                    amount: parseFloat(c.calculated_amount || 0),
                    isDeduction: c.is_deduction,
                    isEmployerCost: c.is_employer_cost
                }))
            }))
        };

        return {
            filename: `payroll_api_${run.period_year}${String(run.period_month).padStart(2, '0')}.json`,
            content: JSON.stringify(exportData, null, 2),
            mimeType: 'application/json',
            encoding: 'UTF-8',
            recordCount: details.length,
            data: exportData
        };
    }

    /**
     * Generar exportacion generica (Excel/CSV)
     */
    static async generateGenericExport(payrollData, format, options) {
        const { run, details } = payrollData;
        const lines = [];

        // Header completo
        lines.push([
            'Legajo', 'Apellido', 'Nombre', 'DNI', 'Departamento', 'Plantilla',
            'Bruto_Remunerativo', 'No_Remunerativo', 'Total_Deducciones', 'Neto',
            'Cargas_Patronales', 'Costo_Total', 'Banco', 'Cuenta', 'CBU'
        ].join(','));

        for (const detail of details) {
            lines.push([
                detail.employee_code || '',
                detail.lastName,
                detail.firstName,
                detail.dni,
                detail.department_name || '',
                detail.template_name || '',
                parseFloat(detail.gross_earnings || 0).toFixed(2),
                parseFloat(detail.non_remunerative || 0).toFixed(2),
                parseFloat(detail.total_deductions || 0).toFixed(2),
                parseFloat(detail.net_salary || 0).toFixed(2),
                parseFloat(detail.employer_contributions || 0).toFixed(2),
                parseFloat(detail.total_cost || 0).toFixed(2),
                detail.bank_name || '',
                detail.bank_account_number || '',
                detail.bank_cbu || ''
            ].join(','));
        }

        return {
            filename: `payroll_export_${run.period_year}${String(run.period_month).padStart(2, '0')}.csv`,
            content: lines.join('\n'),
            mimeType: 'text/csv',
            encoding: 'UTF-8',
            recordCount: details.length
        };
    }

    /**
     * Exportar consolidacion por entidad
     */
    static async exportEntitySettlement(settlementId, formatCode, options = {}) {
        const [settlement] = await sequelize.query(`
            SELECT es.*, pe.entity_code, pe.entity_name, pe.entity_type, pe.presentation_format
            FROM payroll_entity_settlements es
            JOIN payroll_entities pe ON es.entity_id = pe.entity_id
            WHERE es.settlement_id = :settlementId
        `, { replacements: { settlementId }, type: sequelize.QueryTypes.SELECT });

        if (!settlement.length) {
            throw new Error('Consolidacion no encontrada');
        }

        const [details] = await sequelize.query(`
            SELECT * FROM payroll_entity_settlement_details
            WHERE settlement_id = :settlementId
            ORDER BY employee_name
        `, { replacements: { settlementId } });

        const data = settlement[0];
        data.details = details;

        // Usar formato de presentacion configurado en la entidad si existe
        const format = formatCode || data.presentation_format || 'EXCEL';

        return this.generateEntityExport(data, format, options);
    }

    /**
     * Generar exportacion para entidad
     */
    static generateEntityExport(settlement, formatCode, options) {
        const lines = [];

        // Header
        lines.push([
            'Empleado', 'DNI/CUIL', 'Legajo', 'Base_Calculo',
            'Aporte_Empleado', 'Aporte_Patronal', 'Total'
        ].join(';'));

        for (const detail of settlement.details) {
            lines.push([
                detail.employee_name,
                detail.employee_tax_id,
                detail.employee_code || '',
                parseFloat(detail.base_amount || 0).toFixed(2),
                parseFloat(detail.employee_amount || 0).toFixed(2),
                parseFloat(detail.employer_amount || 0).toFixed(2),
                parseFloat(detail.total_amount || 0).toFixed(2)
            ].join(';'));
        }

        // Totales
        lines.push('');
        lines.push([
            'TOTALES', '', '',
            settlement.details.reduce((s, d) => s + parseFloat(d.base_amount || 0), 0).toFixed(2),
            parseFloat(settlement.total_employee_contribution || 0).toFixed(2),
            parseFloat(settlement.total_employer_contribution || 0).toFixed(2),
            parseFloat(settlement.grand_total || 0).toFixed(2)
        ].join(';'));

        return {
            filename: `settlement_${settlement.entity_code}_${settlement.period_year}${String(settlement.period_month).padStart(2, '0')}.csv`,
            content: lines.join('\n'),
            mimeType: 'text/csv',
            encoding: 'UTF-8',
            recordCount: settlement.details.length,
            entity: settlement.entity_name,
            period: `${settlement.period_month}/${settlement.period_year}`,
            totalAmount: settlement.grand_total
        };
    }

    // Utilidades
    static formatDateByPattern(date, pattern) {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return pattern
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day);
    }

    static getMimeType(extension) {
        const mimeTypes = {
            'csv': 'text/csv',
            'txt': 'text/plain',
            'xml': 'application/xml',
            'json': 'application/json',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
        return mimeTypes[extension] || 'application/octet-stream';
    }

    static async getCustomFormat(formatCode) {
        const [formats] = await sequelize.query(`
            SELECT * FROM payroll_export_formats WHERE format_code = :formatCode AND is_active = true
        `, { replacements: { formatCode } });
        return formats.length ? formats[0] : null;
    }
}

module.exports = PayrollExportService;
