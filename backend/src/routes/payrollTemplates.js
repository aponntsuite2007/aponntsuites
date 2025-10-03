const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Middleware de autenticación (asume que ya existe)
const authenticate = (req, res, next) => {
    // Implementar autenticación
    next();
};

// GET /api/v1/payroll-templates - Obtener todas las plantillas
router.get('/', authenticate, async (req, res) => {
    try {
        const { applies_to, active_only } = req.query;
        
        let whereClause = '';
        let replacements = [];
        
        if (applies_to) {
            whereClause += ' WHERE applies_to = ?';
            replacements.push(applies_to);
        }
        
        if (active_only === 'true') {
            whereClause += whereClause ? ' AND is_active = 1' : ' WHERE is_active = 1';
        }
        
        const [templates] = await sequelize.query(`
            SELECT t.*, 
                   (SELECT COUNT(*) FROM payroll_template_items pti WHERE pti.template_id = t.id) as items_count,
                   (SELECT COUNT(*) FROM employee_payroll_templates ept WHERE ept.template_id = t.id AND ept.is_active = 1) as employees_count
            FROM payroll_liquidation_templates t
            ${whereClause}
            ORDER BY t.is_default DESC, t.template_name ASC
        `, { replacements });

        res.json({
            success: true,
            data: templates
        });

    } catch (error) {
        console.error('Error obteniendo plantillas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/v1/payroll-templates/:id - Obtener plantilla específica con items
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [templates] = await sequelize.query(`
            SELECT * FROM payroll_liquidation_templates WHERE id = ?
        `, { replacements: [id] });
        
        if (templates.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Plantilla no encontrada'
            });
        }
        
        const [items] = await sequelize.query(`
            SELECT * FROM payroll_template_items 
            WHERE template_id = ? 
            ORDER BY display_order ASC, group_name ASC
        `, { replacements: [id] });
        
        const template = templates[0];
        template.items = items;
        
        res.json({
            success: true,
            data: template
        });

    } catch (error) {
        console.error('Error obteniendo plantilla:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// POST /api/v1/payroll-templates - Crear nueva plantilla
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            template_name,
            description,
            applies_to,
            position_filter,
            sector_filter,
            branch_filter,
            employee_filter,
            is_default,
            auto_apply,
            items
        } = req.body;

        const templateId = `template-${Date.now()}-${uuidv4().substring(0, 8)}`;
        
        // Crear plantilla
        await sequelize.query(`
            INSERT INTO payroll_liquidation_templates 
            (id, template_name, description, applies_to, position_filter, sector_filter, 
             branch_filter, employee_filter, is_default, auto_apply, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, {
            replacements: [
                templateId,
                template_name,
                description,
                applies_to,
                position_filter ? JSON.stringify(position_filter) : null,
                sector_filter ? JSON.stringify(sector_filter) : null,
                branch_filter ? JSON.stringify(branch_filter) : null,
                employee_filter ? JSON.stringify(employee_filter) : null,
                is_default || false,
                auto_apply !== false,
                req.user?.id || 'system'
            ]
        });

        // Crear items si se proporcionan
        if (items && items.length > 0) {
            for (const item of items) {
                const itemId = `${templateId}-${item.concept_code}`;
                await sequelize.query(`
                    INSERT INTO payroll_template_items
                    (id, template_id, concept_code, concept_name, concept_type, calculation_type,
                     fixed_amount, percentage_value, formula, is_mandatory, is_editable, 
                     applies_condition, display_order, group_name, valid_from, valid_to)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, {
                    replacements: [
                        itemId,
                        templateId,
                        item.concept_code,
                        item.concept_name,
                        item.concept_type,
                        item.calculation_type,
                        item.fixed_amount || 0,
                        item.percentage_value || 0,
                        item.formula || null,
                        item.is_mandatory || false,
                        item.is_editable !== false,
                        item.applies_condition || null,
                        item.display_order || 0,
                        item.group_name || null,
                        item.valid_from || null,
                        item.valid_to || null
                    ]
                });
            }
        }

        // Log del cambio
        await sequelize.query(`
            INSERT INTO payroll_template_changes_log
            (id, template_id, change_type, after_values, changed_by, change_reason)
            VALUES (?, ?, 'template_created', ?, ?, ?)
        `, {
            replacements: [
                uuidv4(),
                templateId,
                JSON.stringify({ template_name, applies_to, items_count: items?.length || 0 }),
                req.user?.id || 'system',
                'Plantilla creada via API'
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Plantilla creada exitosamente',
            data: { id: templateId }
        });

    } catch (error) {
        console.error('Error creando plantilla:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// PUT /api/v1/payroll-templates/:id - Actualizar plantilla
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            template_name,
            description,
            applies_to,
            position_filter,
            sector_filter,
            branch_filter,
            employee_filter,
            is_default,
            auto_apply,
            is_active
        } = req.body;

        // Verificar que existe
        const [existing] = await sequelize.query(`
            SELECT * FROM payroll_liquidation_templates WHERE id = ?
        `, { replacements: [id] });

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Plantilla no encontrada'
            });
        }

        await sequelize.query(`
            UPDATE payroll_liquidation_templates SET
                template_name = ?, description = ?, applies_to = ?,
                position_filter = ?, sector_filter = ?, branch_filter = ?, employee_filter = ?,
                is_default = ?, auto_apply = ?, is_active = ?, 
                updated_by = ?, updated_at = NOW()
            WHERE id = ?
        `, {
            replacements: [
                template_name,
                description,
                applies_to,
                position_filter ? JSON.stringify(position_filter) : null,
                sector_filter ? JSON.stringify(sector_filter) : null,
                branch_filter ? JSON.stringify(branch_filter) : null,
                employee_filter ? JSON.stringify(employee_filter) : null,
                is_default || false,
                auto_apply !== false,
                is_active !== false,
                req.user?.id || 'system',
                id
            ]
        });

        // Log del cambio
        await sequelize.query(`
            INSERT INTO payroll_template_changes_log
            (id, template_id, change_type, before_values, after_values, changed_by, change_reason)
            VALUES (?, ?, 'template_updated', ?, ?, ?, ?)
        `, {
            replacements: [
                uuidv4(),
                id,
                JSON.stringify(existing[0]),
                JSON.stringify({ template_name, applies_to, is_active }),
                req.user?.id || 'system',
                'Plantilla actualizada via API'
            ]
        });

        res.json({
            success: true,
            message: 'Plantilla actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando plantilla:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// POST /api/v1/payroll-templates/:id/apply-massive - Aplicar plantilla masivamente
router.post('/:id/apply-massive', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            target_type, // 'all', 'by_position', 'by_sector', 'by_branch', 'specific_employees'
            positions, 
            sectors, 
            branches, 
            employee_ids,
            replace_existing,
            notes 
        } = req.body;

        // Verificar que la plantilla existe
        const [templates] = await sequelize.query(`
            SELECT * FROM payroll_liquidation_templates WHERE id = ? AND is_active = 1
        `, { replacements: [id] });

        if (templates.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Plantilla no encontrada o inactiva'
            });
        }

        let employeeQuery = 'SELECT id, firstName, lastName, position, sector, branch FROM employees WHERE isActive = 1';
        let whereConditions = [];
        let queryReplacements = [];

        // Construir filtros según el tipo de aplicación
        switch (target_type) {
            case 'by_position':
                if (positions && positions.length > 0) {
                    whereConditions.push(`position IN (${positions.map(() => '?').join(',')})`);
                    queryReplacements.push(...positions);
                }
                break;
            case 'by_sector':
                if (sectors && sectors.length > 0) {
                    whereConditions.push(`sector IN (${sectors.map(() => '?').join(',')})`);
                    queryReplacements.push(...sectors);
                }
                break;
            case 'by_branch':
                if (branches && branches.length > 0) {
                    whereConditions.push(`branch IN (${branches.map(() => '?').join(',')})`);
                    queryReplacements.push(...branches);
                }
                break;
            case 'specific_employees':
                if (employee_ids && employee_ids.length > 0) {
                    whereConditions.push(`id IN (${employee_ids.map(() => '?').join(',')})`);
                    queryReplacements.push(...employee_ids);
                }
                break;
            case 'all':
                // Sin filtros adicionales
                break;
        }

        if (whereConditions.length > 0) {
            employeeQuery += ' AND ' + whereConditions.join(' AND ');
        }

        const [employees] = await sequelize.query(employeeQuery, { 
            replacements: queryReplacements 
        });

        let appliedCount = 0;
        let skippedCount = 0;
        const results = [];

        for (const employee of employees) {
            try {
                // Verificar si ya tiene la plantilla
                const [existing] = await sequelize.query(`
                    SELECT id FROM employee_payroll_templates 
                    WHERE employee_id = ? AND template_id = ?
                `, { replacements: [employee.id, id] });

                if (existing.length > 0) {
                    if (replace_existing) {
                        // Actualizar existente
                        await sequelize.query(`
                            UPDATE employee_payroll_templates SET
                                is_active = 1, applied_at = NOW(), applied_by = ?, notes = ?
                            WHERE employee_id = ? AND template_id = ?
                        `, { replacements: [req.user?.id || 'system', notes, employee.id, id] });
                        appliedCount++;
                    } else {
                        skippedCount++;
                        results.push({
                            employee_id: employee.id,
                            employee_name: `${employee.firstName} ${employee.lastName}`,
                            status: 'skipped',
                            reason: 'Ya tiene plantilla asignada'
                        });
                        continue;
                    }
                } else {
                    // Crear nuevo
                    await sequelize.query(`
                        INSERT INTO employee_payroll_templates
                        (id, employee_id, template_id, applied_by, notes)
                        VALUES (?, ?, ?, ?, ?)
                    `, { 
                        replacements: [
                            uuidv4(), 
                            employee.id, 
                            id, 
                            req.user?.id || 'system', 
                            notes
                        ] 
                    });
                    appliedCount++;
                }

                results.push({
                    employee_id: employee.id,
                    employee_name: `${employee.firstName} ${employee.lastName}`,
                    status: 'applied',
                    reason: 'Plantilla aplicada correctamente'
                });

                // Log del cambio
                await sequelize.query(`
                    INSERT INTO payroll_template_changes_log
                    (id, template_id, change_type, affected_employee_id, changed_by, change_reason)
                    VALUES (?, ?, 'applied_to_employee', ?, ?, ?)
                `, {
                    replacements: [
                        uuidv4(),
                        id,
                        employee.id,
                        req.user?.id || 'system',
                        `Aplicación masiva: ${target_type}`
                    ]
                });

            } catch (empError) {
                console.error(`Error aplicando plantilla a empleado ${employee.id}:`, empError);
                results.push({
                    employee_id: employee.id,
                    employee_name: `${employee.firstName} ${employee.lastName}`,
                    status: 'error',
                    reason: empError.message
                });
            }
        }

        res.json({
            success: true,
            message: 'Aplicación masiva completada',
            data: {
                total_employees: employees.length,
                applied_count: appliedCount,
                skipped_count: skippedCount,
                error_count: results.filter(r => r.status === 'error').length,
                results: results
            }
        });

    } catch (error) {
        console.error('Error en aplicación masiva:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/v1/payroll-templates/employee/:employeeId - Obtener plantillas de un empleado
router.get('/employee/:employeeId', authenticate, async (req, res) => {
    try {
        const { employeeId } = req.params;

        const [templates] = await sequelize.query(`
            SELECT 
                t.*,
                ept.applied_at,
                ept.is_active as assigned_active,
                ept.custom_items,
                ept.excluded_items,
                ept.notes as assignment_notes,
                (SELECT COUNT(*) FROM payroll_template_items pti WHERE pti.template_id = t.id) as items_count
            FROM payroll_liquidation_templates t
            JOIN employee_payroll_templates ept ON t.id = ept.template_id
            WHERE ept.employee_id = ? AND ept.is_active = 1
            ORDER BY ept.applied_at DESC
        `, { replacements: [employeeId] });

        res.json({
            success: true,
            data: templates
        });

    } catch (error) {
        console.error('Error obteniendo plantillas del empleado:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// POST /api/v1/payroll-templates/:id/items - Agregar item a plantilla
router.post('/:id/items', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            concept_code,
            concept_name,
            concept_type,
            calculation_type,
            fixed_amount,
            percentage_value,
            formula,
            is_mandatory,
            is_editable,
            applies_condition,
            display_order,
            group_name,
            valid_from,
            valid_to
        } = req.body;

        const itemId = `${id}-${concept_code}`;

        await sequelize.query(`
            INSERT INTO payroll_template_items
            (id, template_id, concept_code, concept_name, concept_type, calculation_type,
             fixed_amount, percentage_value, formula, is_mandatory, is_editable, 
             applies_condition, display_order, group_name, valid_from, valid_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, {
            replacements: [
                itemId,
                id,
                concept_code,
                concept_name,
                concept_type,
                calculation_type,
                fixed_amount || 0,
                percentage_value || 0,
                formula || null,
                is_mandatory || false,
                is_editable !== false,
                applies_condition || null,
                display_order || 0,
                group_name || null,
                valid_from || null,
                valid_to || null
            ]
        });

        // Log del cambio
        await sequelize.query(`
            INSERT INTO payroll_template_changes_log
            (id, template_id, change_type, affected_item_id, after_values, changed_by, change_reason)
            VALUES (?, ?, 'item_added', ?, ?, ?, ?)
        `, {
            replacements: [
                uuidv4(),
                id,
                itemId,
                JSON.stringify({ concept_code, concept_name, concept_type }),
                req.user?.id || 'system',
                'Item agregado via API'
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Item agregado exitosamente',
            data: { id: itemId }
        });

    } catch (error) {
        console.error('Error agregando item:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// PUT /api/v1/payroll-templates/items/:itemId - Actualizar item
router.put('/items/:itemId', authenticate, async (req, res) => {
    try {
        const { itemId } = req.params;
        const updateFields = req.body;

        // Construir query dinámicamente
        const allowedFields = [
            'concept_name', 'concept_type', 'calculation_type', 'fixed_amount', 
            'percentage_value', 'formula', 'is_mandatory', 'is_editable', 
            'applies_condition', 'display_order', 'group_name', 'valid_from', 'valid_to'
        ];

        const fieldsToUpdate = Object.keys(updateFields).filter(key => allowedFields.includes(key));
        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No hay campos válidos para actualizar'
            });
        }

        const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
        const values = fieldsToUpdate.map(field => updateFields[field]);
        values.push(itemId);

        await sequelize.query(`
            UPDATE payroll_template_items SET ${setClause}, updated_at = NOW()
            WHERE id = ?
        `, { replacements: values });

        res.json({
            success: true,
            message: 'Item actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando item:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// DELETE /api/v1/payroll-templates/items/:itemId - Eliminar item
router.delete('/items/:itemId', authenticate, async (req, res) => {
    try {
        const { itemId } = req.params;

        // Obtener info del item antes de eliminarlo
        const [items] = await sequelize.query(`
            SELECT * FROM payroll_template_items WHERE id = ?
        `, { replacements: [itemId] });

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Item no encontrado'
            });
        }

        await sequelize.query(`
            DELETE FROM payroll_template_items WHERE id = ?
        `, { replacements: [itemId] });

        // Log del cambio
        await sequelize.query(`
            INSERT INTO payroll_template_changes_log
            (id, template_id, change_type, affected_item_id, before_values, changed_by, change_reason)
            VALUES (?, ?, 'item_removed', ?, ?, ?, ?)
        `, {
            replacements: [
                uuidv4(),
                items[0].template_id,
                itemId,
                JSON.stringify(items[0]),
                req.user?.id || 'system',
                'Item eliminado via API'
            ]
        });

        res.json({
            success: true,
            message: 'Item eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando item:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

module.exports = router;