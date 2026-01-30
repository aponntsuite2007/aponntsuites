/**
 * ProcurementPDFService - Servicio de Generación de PDFs para Compras
 *
 * Genera documentos PDF profesionales para todo el ciclo P2P:
 * - Solicitudes de Compra (Requisitions)
 * - Órdenes de Compra (Purchase Orders)
 * - Remitos de Recepción (Receipts)
 * - Facturas de Proveedor (Invoices)
 * - Órdenes de Pago (Payment Orders)
 * - Reportes Estadísticos Parametrizables
 *
 * Usa PDFKit para generación server-side
 * Integra con DocumentHeaderService para encabezados estándar
 */

const PDFDocument = require('pdfkit');
const DocumentHeaderService = require('./DocumentHeaderService');
const { QueryTypes } = require('sequelize');

class ProcurementPDFService {
    constructor(db) {
        this.db = db;
        this.sequelize = db.sequelize;
    }

    // ============================================================================
    // FORMULARIOS IMPRIMIBLES
    // ============================================================================

    /**
     * Genera PDF de Solicitud de Compra
     */
    async generateRequisitionPDF(companyId, requisitionId) {
        const req = await this.getRequisitionData(companyId, requisitionId);
        if (!req) throw new Error('Requisición no encontrada');

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));

        // Header
        let y = await DocumentHeaderService.addPDFHeader(doc, {
            companyId,
            documentType: 'SOLICITUD DE COMPRA',
            documentNumber: req.requisition_number,
            documentDate: req.created_at
        });

        // Info de la solicitud
        y = this.addSectionTitle(doc, 'Información General', y + 10);
        y = this.addKeyValue(doc, 'Solicitante', req.requester_name || 'N/A', 50, y);
        y = this.addKeyValue(doc, 'Departamento', req.department_name || 'N/A', 300, y - 15);
        y = this.addKeyValue(doc, 'Prioridad', this.formatPriority(req.priority), 50, y);
        y = this.addKeyValue(doc, 'Fecha Requerida', this.formatDate(req.required_date), 300, y - 15);
        y = this.addKeyValue(doc, 'Centro de Costo', req.cost_center || 'N/A', 50, y);
        y = this.addKeyValue(doc, 'Estado', this.formatStatus(req.status), 300, y - 15);

        if (req.justification) {
            y += 10;
            y = this.addSectionTitle(doc, 'Justificación', y);
            doc.font('Helvetica').fontSize(10).fillColor('#333');
            doc.text(req.justification, 50, y, { width: 500 });
            y = doc.y + 15;
        }

        // Tabla de items
        y = this.addSectionTitle(doc, 'Items Solicitados', y + 10);
        y = this.addItemsTable(doc, req.items, y, [
            { key: 'line_number', label: '#', width: 30 },
            { key: 'description', label: 'Descripción', width: 220 },
            { key: 'quantity', label: 'Cant.', width: 50, align: 'right' },
            { key: 'unit_of_measure', label: 'Unidad', width: 50 },
            { key: 'estimated_unit_price', label: 'P.Unit.Est.', width: 70, format: 'currency' },
            { key: 'total_price', label: 'Total Est.', width: 80, format: 'currency' }
        ]);

        // Totales
        y += 10;
        this.addTotalBox(doc, 'Total Estimado', req.estimated_total, req.currency || 'ARS', y);

        // Firmas
        y += 80;
        this.addSignatureSection(doc, y, [
            { label: 'Solicitante', name: req.requester_name },
            { label: 'Aprobado por', name: req.approved_by_name }
        ]);

        // Footer
        await DocumentHeaderService.addPDFFooter(doc, { companyId });

        doc.end();

        return new Promise(resolve => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    /**
     * Genera PDF de Orden de Compra
     */
    async generatePurchaseOrderPDF(companyId, orderId) {
        const order = await this.getOrderData(companyId, orderId);
        if (!order) throw new Error('Orden de compra no encontrada');

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));

        // Header con datos del proveedor
        let y = await DocumentHeaderService.addPDFHeader(doc, {
            companyId,
            documentType: 'ORDEN DE COMPRA',
            documentNumber: order.order_number,
            documentDate: order.order_date,
            recipient: {
                name: order.supplier_name,
                taxId: order.supplier_tax_id,
                address: order.supplier_address,
                phone: order.supplier_phone
            }
        });

        // Info de la orden
        y = this.addSectionTitle(doc, 'Detalles de la Orden', y + 10);
        y = this.addKeyValue(doc, 'Fecha Entrega Esperada', this.formatDate(order.expected_delivery_date), 50, y);
        y = this.addKeyValue(doc, 'Condición de Pago', order.payment_terms || `${order.payment_days || 30} días`, 300, y - 15);
        y = this.addKeyValue(doc, 'Moneda', order.currency || 'ARS', 50, y);
        y = this.addKeyValue(doc, 'Requisición Origen', order.requisition_number || 'N/A', 300, y - 15);

        if (order.delivery_address) {
            y = this.addKeyValue(doc, 'Dirección de Entrega', order.delivery_address, 50, y);
        }

        // Tabla de items
        y = this.addSectionTitle(doc, 'Items', y + 15);
        y = this.addItemsTable(doc, order.items, y, [
            { key: 'line_number', label: '#', width: 25 },
            { key: 'supplier_item_code', label: 'Código Prov.', width: 70 },
            { key: 'description', label: 'Descripción', width: 170 },
            { key: 'quantity', label: 'Cant.', width: 45, align: 'right' },
            { key: 'unit_of_measure', label: 'Un.', width: 35 },
            { key: 'unit_price', label: 'P.Unit.', width: 65, format: 'currency' },
            { key: 'total_price', label: 'Total', width: 75, format: 'currency' }
        ]);

        // Totales
        y += 10;
        doc.font('Helvetica').fontSize(10).fillColor('#333');
        doc.text('Subtotal:', 380, y, { width: 80, align: 'right' });
        doc.text(this.formatCurrency(order.subtotal, order.currency), 465, y, { width: 85, align: 'right' });
        y += 15;
        doc.text(`IVA (${order.tax_percent || 21}%):`, 380, y, { width: 80, align: 'right' });
        doc.text(this.formatCurrency(order.tax_amount, order.currency), 465, y, { width: 85, align: 'right' });
        y += 15;
        doc.font('Helvetica-Bold');
        doc.text('TOTAL:', 380, y, { width: 80, align: 'right' });
        doc.text(this.formatCurrency(order.total_amount, order.currency), 465, y, { width: 85, align: 'right' });

        // Condiciones especiales
        if (order.special_conditions) {
            y += 30;
            y = this.addSectionTitle(doc, 'Condiciones Especiales', y);
            doc.font('Helvetica').fontSize(9).fillColor('#333');
            doc.text(order.special_conditions, 50, y, { width: 500 });
            y = doc.y + 10;
        }

        // Términos legales
        y += 20;
        doc.font('Helvetica').fontSize(8).fillColor('#666');
        doc.text('Esta orden de compra representa un compromiso contractual. La entrega de mercadería implica aceptación de los términos.', 50, y, { width: 500 });

        // Firmas
        y += 40;
        this.addSignatureSection(doc, y, [
            { label: 'Autorizado por', name: order.approved_by_name },
            { label: 'Recibido por (Proveedor)', name: '' }
        ]);

        // Footer
        await DocumentHeaderService.addPDFFooter(doc, { companyId });

        doc.end();

        return new Promise(resolve => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    /**
     * Genera PDF de Remito de Recepción
     */
    async generateReceiptPDF(companyId, receiptId) {
        const receipt = await this.getReceiptData(companyId, receiptId);
        if (!receipt) throw new Error('Recepción no encontrada');

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));

        let y = await DocumentHeaderService.addPDFHeader(doc, {
            companyId,
            documentType: 'REMITO DE RECEPCIÓN',
            documentNumber: receipt.receipt_number,
            documentDate: receipt.receipt_date
        });

        // Info
        y = this.addSectionTitle(doc, 'Información de Recepción', y + 10);
        y = this.addKeyValue(doc, 'Orden de Compra', receipt.order_number, 50, y);
        y = this.addKeyValue(doc, 'Proveedor', receipt.supplier_name, 300, y - 15);
        y = this.addKeyValue(doc, 'Remito Proveedor', receipt.delivery_note_number || 'N/A', 50, y);
        y = this.addKeyValue(doc, 'Transportista', receipt.carrier_name || 'N/A', 300, y - 15);
        y = this.addKeyValue(doc, 'Recibido por', receipt.received_by_name, 50, y);
        y = this.addKeyValue(doc, 'Estado QC', this.formatQCStatus(receipt.quality_status), 300, y - 15);

        // Items
        y = this.addSectionTitle(doc, 'Items Recibidos', y + 15);
        y = this.addItemsTable(doc, receipt.items, y, [
            { key: 'description', label: 'Descripción', width: 200 },
            { key: 'quantity_ordered', label: 'Pedido', width: 60, align: 'right' },
            { key: 'quantity_received', label: 'Recibido', width: 60, align: 'right' },
            { key: 'quantity_rejected', label: 'Rechazado', width: 60, align: 'right' },
            { key: 'lot_number', label: 'Lote', width: 80 },
            { key: 'quality_status', label: 'Estado', width: 60 }
        ]);

        // Observaciones
        if (receipt.general_observations) {
            y += 20;
            y = this.addSectionTitle(doc, 'Observaciones', y);
            doc.font('Helvetica').fontSize(10).fillColor('#333');
            doc.text(receipt.general_observations, 50, y, { width: 500 });
        }

        // Firmas
        y = doc.y + 40;
        this.addSignatureSection(doc, y, [
            { label: 'Recibió', name: receipt.received_by_name },
            { label: 'Control de Calidad', name: receipt.quality_checked_by_name || '' }
        ]);

        await DocumentHeaderService.addPDFFooter(doc, { companyId });
        doc.end();

        return new Promise(resolve => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    /**
     * Genera PDF de Orden de Pago
     */
    async generatePaymentOrderPDF(companyId, paymentId) {
        const payment = await this.getPaymentData(companyId, paymentId);
        if (!payment) throw new Error('Orden de pago no encontrada');

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));

        let y = await DocumentHeaderService.addPDFHeader(doc, {
            companyId,
            documentType: 'ORDEN DE PAGO',
            documentNumber: payment.payment_number,
            documentDate: payment.created_at,
            recipient: {
                name: payment.supplier_name,
                taxId: payment.supplier_tax_id
            }
        });

        y = this.addSectionTitle(doc, 'Detalles del Pago', y + 10);
        y = this.addKeyValue(doc, 'Monto Total', this.formatCurrency(payment.total_amount, payment.currency), 50, y);
        y = this.addKeyValue(doc, 'Método de Pago', payment.payment_method || 'Transferencia', 300, y - 15);
        y = this.addKeyValue(doc, 'Fecha Programada', this.formatDate(payment.scheduled_date), 50, y);
        y = this.addKeyValue(doc, 'Estado', this.formatPaymentStatus(payment.status), 300, y - 15);

        if (payment.bank_reference) {
            y = this.addKeyValue(doc, 'Referencia Bancaria', payment.bank_reference, 50, y);
        }

        // Facturas incluidas
        if (payment.invoices && payment.invoices.length > 0) {
            y = this.addSectionTitle(doc, 'Facturas Incluidas', y + 15);
            y = this.addItemsTable(doc, payment.invoices, y, [
                { key: 'invoice_number', label: 'N° Factura', width: 120 },
                { key: 'invoice_date', label: 'Fecha', width: 100 },
                { key: 'total_amount', label: 'Monto', width: 100, format: 'currency' },
                { key: 'order_number', label: 'OC Relacionada', width: 120 }
            ]);
        }

        // Totales
        y += 20;
        this.addTotalBox(doc, 'TOTAL A PAGAR', payment.total_amount, payment.currency, y);

        // Firmas
        y += 80;
        this.addSignatureSection(doc, y, [
            { label: 'Autorizado por', name: payment.approved_by_name || '' },
            { label: 'Ejecutado por', name: payment.executed_by_name || '' }
        ]);

        await DocumentHeaderService.addPDFFooter(doc, { companyId });
        doc.end();

        return new Promise(resolve => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    // ============================================================================
    // REPORTES ESTADÍSTICOS PARAMETRIZABLES
    // ============================================================================

    /**
     * Genera Reporte de Compras por Proveedor
     */
    async generateSupplierReport(companyId, params = {}) {
        const { startDate, endDate, supplierId, minAmount, status } = params;

        const data = await this.getSupplierReportData(companyId, params);

        const doc = new PDFDocument({ size: 'A4', margin: 50, layout: 'landscape' });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));

        let y = await DocumentHeaderService.addPDFHeader(doc, {
            companyId,
            documentType: 'REPORTE DE COMPRAS POR PROVEEDOR',
            documentNumber: '',
            documentDate: new Date()
        });

        // Parámetros del reporte
        y = this.addSectionTitle(doc, 'Parámetros', y + 10);
        doc.font('Helvetica').fontSize(9).fillColor('#555');
        doc.text(`Período: ${this.formatDate(startDate || 'Inicio')} - ${this.formatDate(endDate || 'Hoy')}`, 50, y);
        y += 20;

        // Tabla de datos
        y = this.addItemsTable(doc, data.suppliers, y, [
            { key: 'supplier_name', label: 'Proveedor', width: 150 },
            { key: 'total_orders', label: 'Órdenes', width: 60, align: 'right' },
            { key: 'total_amount', label: 'Monto Total', width: 100, format: 'currency' },
            { key: 'avg_amount', label: 'Promedio', width: 80, format: 'currency' },
            { key: 'on_time_rate', label: '% A Tiempo', width: 70, align: 'right' },
            { key: 'quality_score', label: 'Calidad', width: 60, align: 'right' },
            { key: 'overall_score', label: 'Score', width: 60, align: 'right' }
        ], 'landscape');

        // Resumen
        y += 20;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text(`Total Proveedores: ${data.summary.totalSuppliers}`, 50, y);
        doc.text(`Total Comprado: ${this.formatCurrency(data.summary.totalAmount, 'ARS')}`, 250, y);
        doc.text(`Promedio por Proveedor: ${this.formatCurrency(data.summary.avgPerSupplier, 'ARS')}`, 450, y);

        await DocumentHeaderService.addPDFFooter(doc, { companyId });
        doc.end();

        return new Promise(resolve => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    /**
     * Genera Reporte de Evolución de Precios
     */
    async generatePriceEvolutionReport(companyId, params = {}) {
        const { itemId, supplierId, startDate, endDate } = params;

        const data = await this.getPriceEvolutionData(companyId, params);

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));

        let y = await DocumentHeaderService.addPDFHeader(doc, {
            companyId,
            documentType: 'REPORTE EVOLUCIÓN DE PRECIOS',
            documentDate: new Date()
        });

        // Info del item
        y = this.addSectionTitle(doc, 'Artículo Analizado', y + 10);
        y = this.addKeyValue(doc, 'Código', data.item.item_code, 50, y);
        y = this.addKeyValue(doc, 'Descripción', data.item.description, 200, y - 15);

        // Estadísticas
        y = this.addSectionTitle(doc, 'Estadísticas de Precio', y + 15);
        y = this.addKeyValue(doc, 'Precio Mínimo', this.formatCurrency(data.stats.minPrice), 50, y);
        y = this.addKeyValue(doc, 'Precio Máximo', this.formatCurrency(data.stats.maxPrice), 200, y - 15);
        y = this.addKeyValue(doc, 'Precio Promedio', this.formatCurrency(data.stats.avgPrice), 350, y - 15);
        y = this.addKeyValue(doc, 'Último Precio', this.formatCurrency(data.stats.lastPrice), 50, y);
        y = this.addKeyValue(doc, 'Variación %', `${data.stats.variation > 0 ? '+' : ''}${data.stats.variation.toFixed(1)}%`, 200, y - 15);

        // Historial
        y = this.addSectionTitle(doc, 'Historial de Precios', y + 15);
        y = this.addItemsTable(doc, data.history, y, [
            { key: 'date', label: 'Fecha', width: 100 },
            { key: 'supplier_name', label: 'Proveedor', width: 150 },
            { key: 'quantity', label: 'Cantidad', width: 70, align: 'right' },
            { key: 'unit_price', label: 'Precio Unit.', width: 90, format: 'currency' },
            { key: 'order_number', label: 'OC', width: 100 }
        ]);

        await DocumentHeaderService.addPDFFooter(doc, { companyId });
        doc.end();

        return new Promise(resolve => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    /**
     * Genera Reporte de Ejecución Presupuestaria
     */
    async generateBudgetExecutionReport(companyId, params = {}) {
        const { costCenterId, accountId, year, month } = params;

        const data = await this.getBudgetExecutionData(companyId, params);

        const doc = new PDFDocument({ size: 'A4', margin: 50, layout: 'landscape' });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));

        let y = await DocumentHeaderService.addPDFHeader(doc, {
            companyId,
            documentType: 'REPORTE EJECUCIÓN PRESUPUESTARIA',
            documentDate: new Date()
        });

        // Parámetros
        y = this.addSectionTitle(doc, 'Período', y + 10);
        doc.font('Helvetica').fontSize(10);
        doc.text(`Año: ${year || new Date().getFullYear()} | Mes: ${month || 'Todos'}`, 50, y);
        y += 20;

        // Tabla de ejecución
        y = this.addItemsTable(doc, data.execution, y, [
            { key: 'cost_center_name', label: 'Centro de Costo', width: 120 },
            { key: 'account_name', label: 'Cuenta', width: 120 },
            { key: 'budgeted', label: 'Presupuestado', width: 90, format: 'currency' },
            { key: 'committed', label: 'Comprometido', width: 90, format: 'currency' },
            { key: 'executed', label: 'Ejecutado', width: 90, format: 'currency' },
            { key: 'available', label: 'Disponible', width: 90, format: 'currency' },
            { key: 'execution_pct', label: '% Ejec.', width: 60, align: 'right' }
        ], 'landscape');

        // Totales
        y += 20;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text(`Total Presupuestado: ${this.formatCurrency(data.totals.budgeted)}`, 50, y);
        doc.text(`Total Ejecutado: ${this.formatCurrency(data.totals.executed)}`, 250, y);
        doc.text(`% Ejecución: ${data.totals.executionPct.toFixed(1)}%`, 450, y);

        await DocumentHeaderService.addPDFFooter(doc, { companyId });
        doc.end();

        return new Promise(resolve => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    /**
     * Genera Reporte de Performance de Proveedores
     */
    async generateSupplierPerformanceReport(companyId, params = {}) {
        const data = await this.getSupplierPerformanceData(companyId, params);

        const doc = new PDFDocument({ size: 'A4', margin: 50, layout: 'landscape' });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));

        let y = await DocumentHeaderService.addPDFHeader(doc, {
            companyId,
            documentType: 'REPORTE PERFORMANCE DE PROVEEDORES',
            documentDate: new Date()
        });

        // Tabla de ranking
        y = this.addSectionTitle(doc, 'Ranking de Proveedores (Top 20)', y + 10);
        y = this.addItemsTable(doc, data.suppliers.slice(0, 20), y, [
            { key: 'rank', label: '#', width: 30 },
            { key: 'supplier_name', label: 'Proveedor', width: 150 },
            { key: 'overall_score', label: 'Score', width: 50, align: 'right' },
            { key: 'quality_score', label: 'Calidad', width: 50, align: 'right' },
            { key: 'delivery_score', label: 'Entrega', width: 50, align: 'right' },
            { key: 'price_score', label: 'Precio', width: 50, align: 'right' },
            { key: 'total_orders', label: 'Órdenes', width: 50, align: 'right' },
            { key: 'on_time_rate', label: '% A Tiempo', width: 60, align: 'right' },
            { key: 'rejection_rate', label: '% Rechazo', width: 60, align: 'right' }
        ], 'landscape');

        // Estadísticas generales
        y += 20;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text(`Total Proveedores Activos: ${data.stats.activeSuppliers}`, 50, y);
        doc.text(`Score Promedio: ${data.stats.avgScore.toFixed(2)}`, 250, y);
        doc.text(`% Entregas a Tiempo: ${data.stats.avgOnTime.toFixed(1)}%`, 450, y);

        await DocumentHeaderService.addPDFFooter(doc, { companyId });
        doc.end();

        return new Promise(resolve => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    /**
     * Genera Reporte Mensual Completo
     */
    async generateMonthlyReport(companyId, year, month) {
        const data = await this.getMonthlyReportData(companyId, year, month);

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));

        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        let y = await DocumentHeaderService.addPDFHeader(doc, {
            companyId,
            documentType: `REPORTE MENSUAL DE COMPRAS`,
            documentNumber: `${monthNames[month - 1]} ${year}`,
            documentDate: new Date()
        });

        // KPIs
        y = this.addSectionTitle(doc, 'Indicadores Clave', y + 10);

        // Primera fila de KPIs
        this.addKPIBox(doc, 'Requisiciones', data.kpis.requisitions, 50, y, 120);
        this.addKPIBox(doc, 'Órdenes Emitidas', data.kpis.orders, 180, y, 120);
        this.addKPIBox(doc, 'Recepciones', data.kpis.receipts, 310, y, 120);
        this.addKPIBox(doc, 'Facturas', data.kpis.invoices, 440, y, 110);

        y += 70;
        // Segunda fila
        this.addKPIBox(doc, 'Total Comprado', this.formatCurrency(data.kpis.totalAmount, 'ARS'), 50, y, 150);
        this.addKPIBox(doc, 'Promedio OC', this.formatCurrency(data.kpis.avgOrderAmount, 'ARS'), 210, y, 150);
        this.addKPIBox(doc, '% Ahorro', `${data.kpis.savingsRate.toFixed(1)}%`, 370, y, 100);

        // Top 5 Proveedores
        y += 80;
        y = this.addSectionTitle(doc, 'Top 5 Proveedores del Mes', y);
        y = this.addItemsTable(doc, data.topSuppliers, y, [
            { key: 'rank', label: '#', width: 30 },
            { key: 'supplier_name', label: 'Proveedor', width: 200 },
            { key: 'total_orders', label: 'Órdenes', width: 70, align: 'right' },
            { key: 'total_amount', label: 'Monto', width: 100, format: 'currency' },
            { key: 'percentage', label: '% del Total', width: 80, align: 'right' }
        ]);

        // Top 5 Categorías
        y += 20;
        y = this.addSectionTitle(doc, 'Top 5 Categorías', y);
        y = this.addItemsTable(doc, data.topCategories, y, [
            { key: 'rank', label: '#', width: 30 },
            { key: 'category_name', label: 'Categoría', width: 200 },
            { key: 'total_items', label: 'Items', width: 70, align: 'right' },
            { key: 'total_amount', label: 'Monto', width: 100, format: 'currency' },
            { key: 'percentage', label: '% del Total', width: 80, align: 'right' }
        ]);

        await DocumentHeaderService.addPDFFooter(doc, { companyId });
        doc.end();

        return new Promise(resolve => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    // ============================================================================
    // HELPERS DE DIBUJO PDF
    // ============================================================================

    addSectionTitle(doc, title, y) {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#333');
        doc.text(title, 50, y);
        doc.strokeColor('#0066cc').lineWidth(1);
        doc.moveTo(50, y + 14).lineTo(200, y + 14).stroke();
        return y + 25;
    }

    addKeyValue(doc, key, value, x, y) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#555');
        doc.text(`${key}:`, x, y);
        doc.font('Helvetica').fillColor('#333');
        doc.text(value || 'N/A', x + 5, y + 12);
        return y + 28;
    }

    addItemsTable(doc, items, y, columns, layout = 'portrait') {
        if (!items || items.length === 0) {
            doc.font('Helvetica').fontSize(10).fillColor('#666');
            doc.text('No hay items para mostrar', 50, y);
            return y + 20;
        }

        const startX = 50;
        let currentY = y;

        // Header
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#333');
        doc.rect(startX, currentY, layout === 'landscape' ? 700 : 500, 18).fill('#f5f5f5');
        doc.fillColor('#333');

        let x = startX + 5;
        for (const col of columns) {
            doc.text(col.label, x, currentY + 5, { width: col.width - 5, align: col.align || 'left' });
            x += col.width;
        }
        currentY += 20;

        // Rows
        doc.font('Helvetica').fontSize(8);
        for (let i = 0; i < items.length && i < 30; i++) {
            const item = items[i];

            // Fondo alternado
            if (i % 2 === 1) {
                doc.rect(startX, currentY - 2, layout === 'landscape' ? 700 : 500, 16).fill('#fafafa');
                doc.fillColor('#333');
            }

            x = startX + 5;
            for (const col of columns) {
                let value = item[col.key];
                if (col.format === 'currency') {
                    value = this.formatCurrency(value);
                } else if (col.format === 'date') {
                    value = this.formatDateShort(value);
                }
                doc.text(String(value || ''), x, currentY, { width: col.width - 5, align: col.align || 'left' });
                x += col.width;
            }
            currentY += 16;

            // Nueva página si necesario
            if (currentY > 700) {
                doc.addPage();
                currentY = 50;
            }
        }

        return currentY;
    }

    addTotalBox(doc, label, amount, currency, y) {
        doc.rect(350, y, 200, 50).lineWidth(1).stroke('#333');
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
        doc.text(label, 360, y + 10);
        doc.fontSize(16).fillColor('#0066cc');
        doc.text(this.formatCurrency(amount, currency), 360, y + 28);
    }

    addKPIBox(doc, label, value, x, y, width) {
        doc.rect(x, y, width, 55).lineWidth(1).stroke('#ddd');
        doc.font('Helvetica').fontSize(9).fillColor('#666');
        doc.text(label, x + 10, y + 8, { width: width - 20, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#333');
        doc.text(String(value), x + 10, y + 28, { width: width - 20, align: 'center' });
    }

    addSignatureSection(doc, y, signatures) {
        const width = 200;
        let x = 80;

        for (const sig of signatures) {
            doc.strokeColor('#333').lineWidth(0.5);
            doc.moveTo(x, y).lineTo(x + width, y).stroke();
            doc.font('Helvetica').fontSize(9).fillColor('#333');
            doc.text(sig.label, x, y + 5, { width, align: 'center' });
            if (sig.name) {
                doc.font('Helvetica-Bold');
                doc.text(sig.name, x, y + 18, { width, align: 'center' });
            }
            x += 250;
        }
    }

    // ============================================================================
    // DATA FETCHERS
    // ============================================================================

    async getRequisitionData(companyId, requisitionId) {
        const [req] = await this.sequelize.query(`
            SELECT r.*,
                   u.name as requester_name,
                   d.name as department_name,
                   ua.name as approved_by_name
            FROM procurement_requisitions r
            LEFT JOIN users u ON r.requester_id = u.user_id
            LEFT JOIN departments d ON r.requester_department_id = d.id
            LEFT JOIN users ua ON r.approved_by = ua.user_id
            WHERE r.id = :requisitionId AND r.company_id = :companyId
        `, {
            replacements: { requisitionId, companyId },
            type: QueryTypes.SELECT
        });

        if (!req) return null;

        const items = await this.sequelize.query(`
            SELECT ri.*, pi.item_code
            FROM procurement_requisition_items ri
            LEFT JOIN procurement_items pi ON ri.item_id = pi.id
            WHERE ri.requisition_id = :requisitionId
            ORDER BY ri.line_number
        `, {
            replacements: { requisitionId },
            type: QueryTypes.SELECT
        });

        return { ...req, items };
    }

    async getOrderData(companyId, orderId) {
        const [order] = await this.sequelize.query(`
            SELECT o.*,
                   s.legal_name as supplier_name, s.tax_id as supplier_tax_id,
                   s.address as supplier_address, s.contact_phone as supplier_phone,
                   r.requisition_number,
                   ua.name as approved_by_name
            FROM procurement_orders o
            LEFT JOIN procurement_suppliers s ON o.supplier_id = s.id
            LEFT JOIN procurement_requisitions r ON o.requisition_id = r.id
            LEFT JOIN users ua ON o.approved_by = ua.user_id
            WHERE o.id = :orderId AND o.company_id = :companyId
        `, {
            replacements: { orderId, companyId },
            type: QueryTypes.SELECT
        });

        if (!order) return null;

        const items = await this.sequelize.query(`
            SELECT oi.*,
                   ROW_NUMBER() OVER (ORDER BY oi.id) as line_number
            FROM procurement_order_items oi
            WHERE oi.order_id = :orderId
        `, {
            replacements: { orderId },
            type: QueryTypes.SELECT
        });

        return { ...order, items };
    }

    async getReceiptData(companyId, receiptId) {
        const [receipt] = await this.sequelize.query(`
            SELECT r.*,
                   o.order_number,
                   s.legal_name as supplier_name,
                   ur.name as received_by_name,
                   uq.name as quality_checked_by_name
            FROM procurement_receipts r
            LEFT JOIN procurement_orders o ON r.order_id = o.id
            LEFT JOIN procurement_suppliers s ON o.supplier_id = s.id
            LEFT JOIN users ur ON r.received_by = ur.user_id
            LEFT JOIN users uq ON r.quality_checked_by = uq.user_id
            WHERE r.id = :receiptId AND r.company_id = :companyId
        `, {
            replacements: { receiptId, companyId },
            type: QueryTypes.SELECT
        });

        if (!receipt) return null;

        const items = await this.sequelize.query(`
            SELECT ri.*, oi.description
            FROM procurement_receipt_items ri
            LEFT JOIN procurement_order_items oi ON ri.order_item_id = oi.id
            WHERE ri.receipt_id = :receiptId
        `, {
            replacements: { receiptId },
            type: QueryTypes.SELECT
        });

        return { ...receipt, items };
    }

    async getPaymentData(companyId, paymentId) {
        const [payment] = await this.sequelize.query(`
            SELECT p.*,
                   s.legal_name as supplier_name, s.tax_id as supplier_tax_id,
                   ua.name as approved_by_name,
                   ue.name as executed_by_name
            FROM procurement_payments p
            LEFT JOIN procurement_suppliers s ON p.supplier_id = s.id
            LEFT JOIN users ua ON p.approved_by = ua.user_id
            LEFT JOIN users ue ON p.executed_by = ue.user_id
            WHERE p.id = :paymentId AND p.company_id = :companyId
        `, {
            replacements: { paymentId, companyId },
            type: QueryTypes.SELECT
        });

        if (!payment) return null;

        // Get related invoices
        const invoices = await this.sequelize.query(`
            SELECT i.*, o.order_number
            FROM procurement_invoices i
            LEFT JOIN procurement_orders o ON i.order_id = o.id
            WHERE i.id = ANY(:invoiceIds::int[])
        `, {
            replacements: { invoiceIds: payment.invoice_ids || [] },
            type: QueryTypes.SELECT
        });

        return { ...payment, invoices };
    }

    async getSupplierReportData(companyId, params) {
        const { startDate, endDate } = params;

        const suppliers = await this.sequelize.query(`
            SELECT
                s.id,
                s.legal_name as supplier_name,
                COUNT(o.id) as total_orders,
                COALESCE(SUM(o.total_amount), 0) as total_amount,
                COALESCE(AVG(o.total_amount), 0) as avg_amount,
                COALESCE(s.on_time_delivery_rate, 0) as on_time_rate,
                COALESCE(s.quality_score, 0) as quality_score,
                COALESCE(s.overall_score, 0) as overall_score
            FROM procurement_suppliers s
            LEFT JOIN procurement_orders o ON s.id = o.supplier_id
                AND o.company_id = :companyId
                AND (:startDate IS NULL OR o.order_date >= :startDate)
                AND (:endDate IS NULL OR o.order_date <= :endDate)
            WHERE s.company_id = :companyId AND s.status = 'active'
            GROUP BY s.id
            ORDER BY total_amount DESC
        `, {
            replacements: { companyId, startDate: startDate || null, endDate: endDate || null },
            type: QueryTypes.SELECT
        });

        const totalAmount = suppliers.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);

        return {
            suppliers,
            summary: {
                totalSuppliers: suppliers.length,
                totalAmount,
                avgPerSupplier: suppliers.length > 0 ? totalAmount / suppliers.length : 0
            }
        };
    }

    async getPriceEvolutionData(companyId, params) {
        const { itemId, startDate, endDate } = params;

        // Get item info
        const [item] = await this.sequelize.query(`
            SELECT id, item_code, name as description
            FROM procurement_items
            WHERE id = :itemId AND company_id = :companyId
        `, { replacements: { itemId, companyId }, type: QueryTypes.SELECT });

        // Get price history
        const history = await this.sequelize.query(`
            SELECT
                oi.created_at as date,
                s.legal_name as supplier_name,
                oi.quantity,
                oi.unit_price,
                o.order_number
            FROM procurement_order_items oi
            JOIN procurement_orders o ON oi.order_id = o.id
            JOIN procurement_suppliers s ON o.supplier_id = s.id
            WHERE oi.item_id = :itemId AND o.company_id = :companyId
            ORDER BY oi.created_at DESC
            LIMIT 50
        `, { replacements: { itemId, companyId }, type: QueryTypes.SELECT });

        const prices = history.map(h => parseFloat(h.unit_price) || 0).filter(p => p > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
        const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        const lastPrice = prices[0] || 0;
        const firstPrice = prices[prices.length - 1] || lastPrice;
        const variation = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

        return {
            item: item || { item_code: 'N/A', description: 'Item no encontrado' },
            history,
            stats: { minPrice, maxPrice, avgPrice, lastPrice, variation }
        };
    }

    async getBudgetExecutionData(companyId, params) {
        const { year, month } = params;

        const execution = await this.sequelize.query(`
            SELECT
                cc.name as cost_center_name,
                fa.name as account_name,
                COALESCE(be.budgeted_amount, 0) as budgeted,
                COALESCE(be.committed_amount, 0) as committed,
                COALESCE(be.executed_amount, 0) as executed,
                COALESCE(be.budgeted_amount, 0) - COALESCE(be.executed_amount, 0) as available,
                CASE WHEN COALESCE(be.budgeted_amount, 0) > 0
                    THEN (COALESCE(be.executed_amount, 0) / be.budgeted_amount * 100)
                    ELSE 0 END as execution_pct
            FROM finance_budget_executions be
            LEFT JOIN finance_cost_centers cc ON be.cost_center_id = cc.id
            LEFT JOIN finance_accounts fa ON be.account_id = fa.id
            WHERE be.company_id = :companyId
            AND (:year IS NULL OR be.year = :year)
            AND (:month IS NULL OR be.month = :month)
            ORDER BY cc.name, fa.name
        `, {
            replacements: { companyId, year: year || null, month: month || null },
            type: QueryTypes.SELECT
        });

        const budgeted = execution.reduce((s, e) => s + parseFloat(e.budgeted || 0), 0);
        const executed = execution.reduce((s, e) => s + parseFloat(e.executed || 0), 0);

        return {
            execution,
            totals: {
                budgeted,
                executed,
                executionPct: budgeted > 0 ? (executed / budgeted * 100) : 0
            }
        };
    }

    async getSupplierPerformanceData(companyId, params) {
        const suppliers = await this.sequelize.query(`
            SELECT
                ROW_NUMBER() OVER (ORDER BY overall_score DESC) as rank,
                legal_name as supplier_name,
                COALESCE(overall_score, 0) as overall_score,
                COALESCE(quality_score, 0) as quality_score,
                COALESCE(delivery_score, 0) as delivery_score,
                COALESCE(price_score, 0) as price_score,
                COALESCE(total_orders, 0) as total_orders,
                COALESCE(on_time_delivery_rate, 0) as on_time_rate,
                COALESCE(rejection_rate, 0) as rejection_rate
            FROM procurement_suppliers
            WHERE company_id = :companyId AND status = 'active'
            ORDER BY overall_score DESC
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        const activeSuppliers = suppliers.length;
        const avgScore = activeSuppliers > 0
            ? suppliers.reduce((s, sup) => s + parseFloat(sup.overall_score || 0), 0) / activeSuppliers
            : 0;
        const avgOnTime = activeSuppliers > 0
            ? suppliers.reduce((s, sup) => s + parseFloat(sup.on_time_rate || 0), 0) / activeSuppliers
            : 0;

        return {
            suppliers,
            stats: { activeSuppliers, avgScore, avgOnTime }
        };
    }

    async getMonthlyReportData(companyId, year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // KPIs
        const [kpis] = await this.sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM procurement_requisitions WHERE company_id = :companyId AND created_at BETWEEN :startDate AND :endDate) as requisitions,
                (SELECT COUNT(*) FROM procurement_orders WHERE company_id = :companyId AND order_date BETWEEN :startDate AND :endDate) as orders,
                (SELECT COUNT(*) FROM procurement_receipts WHERE company_id = :companyId AND receipt_date BETWEEN :startDate AND :endDate) as receipts,
                (SELECT COUNT(*) FROM procurement_invoices WHERE company_id = :companyId AND invoice_date BETWEEN :startDate AND :endDate) as invoices,
                (SELECT COALESCE(SUM(total_amount), 0) FROM procurement_orders WHERE company_id = :companyId AND order_date BETWEEN :startDate AND :endDate) as total_amount
        `, {
            replacements: { companyId, startDate, endDate },
            type: QueryTypes.SELECT
        });

        const avgOrderAmount = kpis.orders > 0 ? parseFloat(kpis.total_amount) / parseInt(kpis.orders) : 0;

        // Top suppliers
        const topSuppliers = await this.sequelize.query(`
            SELECT
                ROW_NUMBER() OVER (ORDER BY SUM(o.total_amount) DESC) as rank,
                s.legal_name as supplier_name,
                COUNT(o.id) as total_orders,
                COALESCE(SUM(o.total_amount), 0) as total_amount,
                ROUND(COALESCE(SUM(o.total_amount), 0) / NULLIF(:totalAmount, 0) * 100, 1) as percentage
            FROM procurement_suppliers s
            JOIN procurement_orders o ON s.id = o.supplier_id
            WHERE o.company_id = :companyId AND o.order_date BETWEEN :startDate AND :endDate
            GROUP BY s.id
            ORDER BY total_amount DESC
            LIMIT 5
        `, {
            replacements: { companyId, startDate, endDate, totalAmount: parseFloat(kpis.total_amount) || 1 },
            type: QueryTypes.SELECT
        });

        // Top categories
        const topCategories = await this.sequelize.query(`
            SELECT
                ROW_NUMBER() OVER (ORDER BY SUM(oi.total_price) DESC) as rank,
                COALESCE(c.name, 'Sin categoría') as category_name,
                COUNT(DISTINCT oi.id) as total_items,
                COALESCE(SUM(oi.total_price), 0) as total_amount,
                ROUND(COALESCE(SUM(oi.total_price), 0) / NULLIF(:totalAmount, 0) * 100, 1) as percentage
            FROM procurement_order_items oi
            JOIN procurement_orders o ON oi.order_id = o.id
            LEFT JOIN procurement_items pi ON oi.item_id = pi.id
            LEFT JOIN procurement_categories c ON pi.category_id = c.id
            WHERE o.company_id = :companyId AND o.order_date BETWEEN :startDate AND :endDate
            GROUP BY c.id
            ORDER BY total_amount DESC
            LIMIT 5
        `, {
            replacements: { companyId, startDate, endDate, totalAmount: parseFloat(kpis.total_amount) || 1 },
            type: QueryTypes.SELECT
        });

        return {
            kpis: {
                ...kpis,
                totalAmount: parseFloat(kpis.total_amount) || 0,
                avgOrderAmount,
                savingsRate: 0 // Could calculate from budget vs actual
            },
            topSuppliers,
            topCategories
        };
    }

    // ============================================================================
    // FORMATTERS
    // ============================================================================

    formatCurrency(amount, currency = 'ARS') {
        const num = parseFloat(amount) || 0;
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(num);
    }

    formatDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('es-AR', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    formatDateShort(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('es-AR');
    }

    formatPriority(priority) {
        const map = { low: 'Baja', normal: 'Normal', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
        return map[priority] || priority || 'Normal';
    }

    formatStatus(status) {
        const map = {
            draft: 'Borrador',
            pending_approval: 'Pendiente Aprobación',
            approved: 'Aprobada',
            rejected: 'Rechazada',
            in_quotation: 'En Cotización',
            ordered: 'Ordenada',
            in_purchase: 'En Compra',
            partial_received: 'Recepción Parcial',
            received: 'Recibida',
            closed: 'Cerrada',
            cancelled: 'Cancelada'
        };
        return map[status] || status || 'N/A';
    }

    formatQCStatus(status) {
        const map = {
            pending: 'Pendiente',
            approved: 'Aprobado',
            partial: 'Parcial',
            rejected: 'Rechazado'
        };
        return map[status] || status || 'Pendiente';
    }

    formatPaymentStatus(status) {
        const map = {
            pending: 'Pendiente',
            scheduled: 'Programado',
            approved: 'Aprobado',
            executed: 'Ejecutado',
            cancelled: 'Cancelado'
        };
        return map[status] || status || 'Pendiente';
    }
}

module.exports = ProcurementPDFService;
