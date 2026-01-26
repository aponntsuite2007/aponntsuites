/**
 * PaymentForecastService
 * Servicio para Cubo OLAP de Previsión Financiera
 * Maneja: Drill-down, Agregaciones, Forecasting
 */

const { Op, QueryTypes } = require('sequelize');

class PaymentForecastService {
    constructor(db) {
        this.db = db;
        this.sequelize = db.sequelize;
    }

    /**
     * Refrescar vista materializada
     */
    async refreshCube() {
        await this.sequelize.query('SELECT refresh_payment_forecast_cube()');
        return { success: true, message: 'Cubo actualizado' };
    }

    /**
     * Obtener resumen de previsión financiera
     */
    async getForecastSummary(companyId, dateFrom = null, dateTo = null) {
        const from = dateFrom || new Date();
        const to = dateTo || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // +90 días

        const result = await this.sequelize.query(
            'SELECT * FROM get_payment_forecast_summary($1, $2, $3)',
            {
                bind: [companyId, from, to],
                type: QueryTypes.SELECT
            }
        );

        // Agrupar por tipo de período
        const grouped = {
            daily: result.filter(r => r.period_type === 'day'),
            weekly: result.filter(r => r.period_type === 'week'),
            monthly: result.filter(r => r.period_type === 'month')
        };

        return grouped;
    }

    /**
     * Obtener datos del cubo con drill-down
     */
    async getCubeData(companyId, options = {}) {
        const {
            groupBy = 'month',      // year, month, week, day
            dateFrom,
            dateTo,
            branchId,
            supplierId,
            costCenterId,
            categoryId,
            purchaseType
        } = options;

        // Construir query dinámico
        let groupByColumn;
        let selectColumns;

        switch (groupBy) {
            case 'year':
                groupByColumn = 'year';
                selectColumns = "year::TEXT as label, year as period";
                break;
            case 'month':
                groupByColumn = 'year_month';
                selectColumns = "year_month as label, TO_DATE(year_month || '-01', 'YYYY-MM-DD') as period";
                break;
            case 'week':
                groupByColumn = 'year_week';
                selectColumns = "year_week as label, MIN(payment_date) as period";
                break;
            case 'day':
                groupByColumn = 'payment_date';
                selectColumns = "TO_CHAR(payment_date, 'DD/MM/YYYY') as label, payment_date as period";
                break;
            case 'supplier':
                groupByColumn = 'supplier_id';
                selectColumns = `
                    supplier_id,
                    (SELECT name FROM procurement_suppliers WHERE id = supplier_id) as label
                `;
                break;
            case 'category':
                groupByColumn = 'category_id';
                selectColumns = `
                    category_id,
                    (SELECT name FROM procurement_categories WHERE id = category_id) as label
                `;
                break;
            case 'purchase_type':
                groupByColumn = 'purchase_type';
                selectColumns = "COALESCE(purchase_type, 'Sin clasificar') as label";
                break;
            case 'branch':
                groupByColumn = 'branch_id';
                selectColumns = `
                    branch_id,
                    (SELECT name FROM branches WHERE id = branch_id) as label
                `;
                break;
            case 'cost_center':
                groupByColumn = 'cost_center_id';
                selectColumns = `
                    cost_center_id,
                    (SELECT name FROM finance_cost_centers WHERE id = cost_center_id) as label
                `;
                break;
            default:
                groupByColumn = 'year_month';
                selectColumns = "year_month as label";
        }

        // Construir WHERE
        const conditions = ['company_id = :company_id'];
        const replacements = { company_id: companyId };

        if (dateFrom) {
            conditions.push('payment_date >= :date_from');
            replacements.date_from = dateFrom;
        }
        if (dateTo) {
            conditions.push('payment_date <= :date_to');
            replacements.date_to = dateTo;
        }
        if (branchId) {
            conditions.push('branch_id = :branch_id');
            replacements.branch_id = branchId;
        }
        if (supplierId) {
            conditions.push('supplier_id = :supplier_id');
            replacements.supplier_id = supplierId;
        }
        if (costCenterId) {
            conditions.push('cost_center_id = :cost_center_id');
            replacements.cost_center_id = costCenterId;
        }
        if (categoryId) {
            conditions.push('category_id = :category_id');
            replacements.category_id = categoryId;
        }
        if (purchaseType) {
            conditions.push('purchase_type = :purchase_type');
            replacements.purchase_type = purchaseType;
        }

        const whereClause = conditions.join(' AND ');

        const query = `
            SELECT
                ${selectColumns},
                SUM(order_count) as order_count,
                SUM(invoice_count) as invoice_count,
                SUM(gross_amount) as gross_amount,
                SUM(total_retentions) as total_retentions,
                SUM(total_discounts) as total_discounts,
                SUM(net_amount) as net_amount
            FROM mv_payment_forecast_cube
            WHERE ${whereClause}
            GROUP BY ${groupByColumn}
            ORDER BY ${groupByColumn === 'payment_date' ? 'payment_date' : 'net_amount DESC'}
            LIMIT 100
        `;

        const result = await this.sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        return {
            groupBy,
            filters: { dateFrom, dateTo, branchId, supplierId, costCenterId, categoryId, purchaseType },
            data: result,
            totals: this.calculateTotals(result)
        };
    }

    /**
     * Calcular totales de resultados
     */
    calculateTotals(data) {
        return data.reduce((acc, row) => ({
            order_count: (acc.order_count || 0) + parseInt(row.order_count || 0),
            invoice_count: (acc.invoice_count || 0) + parseInt(row.invoice_count || 0),
            gross_amount: (acc.gross_amount || 0) + parseFloat(row.gross_amount || 0),
            total_retentions: (acc.total_retentions || 0) + parseFloat(row.total_retentions || 0),
            total_discounts: (acc.total_discounts || 0) + parseFloat(row.total_discounts || 0),
            net_amount: (acc.net_amount || 0) + parseFloat(row.net_amount || 0)
        }), {});
    }

    /**
     * Drill-down en el cubo
     * Permite navegar de nivel superior a inferior
     */
    async drillDown(companyId, currentLevel, currentValue, targetLevel, baseFilters = {}) {
        // Definir jerarquía de drill-down
        const hierarchy = {
            year: { next: 'month', filter: 'year' },
            month: { next: 'week', filter: 'year_month' },
            week: { next: 'day', filter: 'year_week' },
            day: { next: 'supplier', filter: 'payment_date' },
            supplier: { next: 'invoice', filter: 'supplier_id' },
            branch: { next: 'cost_center', filter: 'branch_id' },
            cost_center: { next: 'purchase_type', filter: 'cost_center_id' },
            purchase_type: { next: 'supplier', filter: 'purchase_type' },
            category: { next: 'supplier', filter: 'category_id' }
        };

        const nextLevel = targetLevel || hierarchy[currentLevel]?.next || 'supplier';
        const filterField = hierarchy[currentLevel]?.filter;

        const filters = { ...baseFilters };
        if (filterField && currentValue) {
            filters[filterField] = currentValue;
        }

        return this.getCubeData(companyId, {
            groupBy: nextLevel,
            ...filters
        });
    }

    /**
     * Obtener KPIs del dashboard
     */
    async getDashboardKPIs(companyId) {
        const today = new Date();
        const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Query para obtener KPIs
        const kpiQuery = `
            WITH stats AS (
                SELECT
                    SUM(net_amount) FILTER (WHERE payment_date >= CURRENT_DATE) as total_committed,
                    SUM(net_amount) FILTER (
                        WHERE payment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
                    ) as due_this_week,
                    SUM(net_amount) FILTER (
                        WHERE payment_date BETWEEN CURRENT_DATE AND DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'
                    ) as due_this_month,
                    COUNT(DISTINCT CASE WHEN payment_date < CURRENT_DATE THEN supplier_id END) as overdue_count
                FROM mv_payment_forecast_cube
                WHERE company_id = :company_id
            ),
            pending AS (
                SELECT
                    COUNT(*) as pending_approval_count,
                    COALESCE(SUM(net_payment_amount), 0) as pending_approval_amount
                FROM finance_payment_orders
                WHERE company_id = :company_id AND status = 'pending_approval'
            ),
            checks AS (
                SELECT
                    COUNT(*) FILTER (WHERE status IN ('issued', 'delivered')) as checks_portfolio,
                    COALESCE(SUM(amount) FILTER (WHERE status IN ('issued', 'delivered')), 0) as checks_amount
                FROM finance_issued_checks
                WHERE company_id = :company_id
            )
            SELECT
                stats.*,
                pending.*,
                checks.*
            FROM stats, pending, checks
        `;

        const [kpis] = await this.sequelize.query(kpiQuery, {
            replacements: { company_id: companyId },
            type: QueryTypes.SELECT
        });

        return {
            total_committed: parseFloat(kpis?.total_committed || 0),
            due_this_week: parseFloat(kpis?.due_this_week || 0),
            due_this_month: parseFloat(kpis?.due_this_month || 0),
            overdue_suppliers: parseInt(kpis?.overdue_count || 0),
            pending_approval_count: parseInt(kpis?.pending_approval_count || 0),
            pending_approval_amount: parseFloat(kpis?.pending_approval_amount || 0),
            checks_portfolio_count: parseInt(kpis?.checks_portfolio || 0),
            checks_portfolio_amount: parseFloat(kpis?.checks_amount || 0)
        };
    }

    /**
     * Obtener timeline de pagos (para visualización)
     */
    async getPaymentTimeline(companyId, days = 30) {
        const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        const query = `
            SELECT
                payment_date,
                SUM(net_amount) as total,
                SUM(order_count) as orders,
                ARRAY_AGG(DISTINCT supplier_id) as supplier_ids
            FROM mv_payment_forecast_cube
            WHERE company_id = :company_id
              AND payment_date BETWEEN CURRENT_DATE AND :end_date
            GROUP BY payment_date
            ORDER BY payment_date
        `;

        const result = await this.sequelize.query(query, {
            replacements: { company_id: companyId, end_date: endDate },
            type: QueryTypes.SELECT
        });

        // Llenar días sin pagos con 0
        const timeline = [];
        let currentDate = new Date();

        for (let i = 0; i < days; i++) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const existing = result.find(r =>
                new Date(r.payment_date).toISOString().split('T')[0] === dateStr
            );

            timeline.push({
                date: dateStr,
                total: parseFloat(existing?.total || 0),
                orders: parseInt(existing?.orders || 0),
                has_payments: !!existing
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return timeline;
    }

    /**
     * Análisis de concentración por proveedor
     */
    async getSupplierConcentration(companyId, dateFrom = null, dateTo = null) {
        const from = dateFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        const to = dateTo || new Date();

        const query = `
            SELECT
                supplier_id,
                (SELECT name FROM procurement_suppliers WHERE id = supplier_id) as supplier_name,
                SUM(net_amount) as total_amount,
                COUNT(DISTINCT order_count) as order_count,
                ROUND(
                    SUM(net_amount) * 100.0 / NULLIF(SUM(SUM(net_amount)) OVER (), 0),
                    2
                ) as percentage
            FROM mv_payment_forecast_cube
            WHERE company_id = :company_id
              AND payment_date BETWEEN :date_from AND :date_to
            GROUP BY supplier_id
            ORDER BY total_amount DESC
            LIMIT 20
        `;

        const result = await this.sequelize.query(query, {
            replacements: { company_id: companyId, date_from: from, date_to: to },
            type: QueryTypes.SELECT
        });

        return result;
    }

    /**
     * Análisis de estacionalidad
     */
    async getSeasonalityAnalysis(companyId) {
        const query = `
            SELECT
                EXTRACT(MONTH FROM payment_date)::INTEGER as month,
                TO_CHAR(TO_DATE(EXTRACT(MONTH FROM payment_date)::TEXT, 'MM'), 'Mon') as month_name,
                AVG(net_amount) as avg_amount,
                SUM(net_amount) as total_amount,
                COUNT(*) as data_points
            FROM mv_payment_forecast_cube
            WHERE company_id = :company_id
              AND payment_date >= CURRENT_DATE - INTERVAL '2 years'
            GROUP BY EXTRACT(MONTH FROM payment_date)
            ORDER BY month
        `;

        const result = await this.sequelize.query(query, {
            replacements: { company_id: companyId },
            type: QueryTypes.SELECT
        });

        return result;
    }

    /**
     * Comparativa año actual vs anterior
     */
    async getYearOverYearComparison(companyId) {
        const query = `
            WITH current_year AS (
                SELECT
                    EXTRACT(MONTH FROM payment_date)::INTEGER as month,
                    SUM(net_amount) as amount
                FROM mv_payment_forecast_cube
                WHERE company_id = :company_id
                  AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                GROUP BY EXTRACT(MONTH FROM payment_date)
            ),
            previous_year AS (
                SELECT
                    EXTRACT(MONTH FROM payment_date)::INTEGER as month,
                    SUM(net_amount) as amount
                FROM mv_payment_forecast_cube
                WHERE company_id = :company_id
                  AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
                GROUP BY EXTRACT(MONTH FROM payment_date)
            )
            SELECT
                COALESCE(cy.month, py.month) as month,
                TO_CHAR(TO_DATE(COALESCE(cy.month, py.month)::TEXT, 'MM'), 'Mon') as month_name,
                COALESCE(cy.amount, 0) as current_year,
                COALESCE(py.amount, 0) as previous_year,
                CASE
                    WHEN COALESCE(py.amount, 0) > 0
                    THEN ROUND(((COALESCE(cy.amount, 0) - py.amount) / py.amount) * 100, 2)
                    ELSE NULL
                END as yoy_change_percent
            FROM current_year cy
            FULL OUTER JOIN previous_year py ON cy.month = py.month
            ORDER BY COALESCE(cy.month, py.month)
        `;

        const result = await this.sequelize.query(query, {
            replacements: { company_id: companyId },
            type: QueryTypes.SELECT
        });

        return result;
    }
}

module.exports = PaymentForecastService;
