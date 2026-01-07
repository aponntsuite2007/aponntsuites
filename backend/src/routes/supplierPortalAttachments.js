const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const {
  RfqCompanyAttachment,
  PurchaseOrderAttachment,
  RequestForQuotation,
  PurchaseOrder,
  RfqAttachment,
  SupplierInvoice,
  sequelize
} = require('../config/database');

// ============================================================================
// MULTER CONFIGURATION - File upload handling
// ============================================================================

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadType = req.body.uploadType || 'rfq';
    let uploadPath;

    switch (uploadType) {
      case 'rfq':
        uploadPath = path.join(__dirname, '../../uploads/rfq_attachments');
        break;
      case 'purchase_order':
        uploadPath = path.join(__dirname, '../../uploads/purchase_order_attachments');
        break;
      case 'invoice':
        uploadPath = path.join(__dirname, '../../uploads/supplier_invoices');
        break;
      default:
        uploadPath = path.join(__dirname, '../../uploads/general');
    }

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/dwg',
    'application/dxf',
    'application/step',
    'model/step',
    'application/stp'
  ];

  if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB máximo
  }
});

// ============================================================================
// MIDDLEWARE - Authentication check
// ============================================================================

const authMiddleware = (req, res, next) => {
  if (!req.user || !req.user.company_id) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  next();
};

// ============================================================================
// EMPRESA → PROVEEDOR: Upload adjuntos en RFQ
// ============================================================================

router.post('/rfq/:rfqId/company-attachments', authMiddleware, upload.single('file'), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { rfqId } = req.params;
    const {
      attachment_type,
      binding_level,
      legal_notice,
      contract_clause,
      deviation_allowed,
      deviation_tolerance,
      non_compliance_action,
      non_compliance_notice,
      description,
      is_required
    } = req.body;

    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    // Verificar que el RFQ existe y pertenece a la empresa
    const rfq = await RequestForQuotation.findOne({
      where: {
        id: rfqId,
        company_id: req.user.company_id
      }
    });

    if (!rfq) {
      await transaction.rollback();
      // Eliminar archivo subido
      await fs.unlink(req.file.path);
      return res.status(404).json({ error: 'RFQ no encontrado' });
    }

    const attachment = await RfqCompanyAttachment.create({
      rfq_id: rfqId,
      company_id: req.user.company_id,
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      attachment_type: attachment_type || 'informative',
      binding_level: binding_level || 'orientative',
      legal_notice,
      contract_clause,
      deviation_allowed: deviation_allowed === 'true' || deviation_allowed === true,
      deviation_tolerance,
      non_compliance_action: non_compliance_action || 'payment_rejection',
      non_compliance_notice,
      description,
      is_required: is_required === 'true' || is_required === true,
      uploaded_by: req.user.user_id
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      attachment: {
        id: attachment.id,
        file_name: attachment.file_name,
        attachment_type: attachment.attachment_type,
        binding_level: attachment.binding_level,
        is_required: attachment.is_required,
        created_at: attachment.created_at
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error uploading RFQ company attachment:', error);

    // Eliminar archivo si falló la inserción
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({ error: 'Error al subir adjunto', details: error.message });
  }
});

// ============================================================================
// EMPRESA → PROVEEDOR: Listar adjuntos de RFQ
// ============================================================================

router.get('/rfq/:rfqId/company-attachments', authMiddleware, async (req, res) => {
  try {
    const { rfqId } = req.params;

    const attachments = await RfqCompanyAttachment.findAll({
      where: {
        rfq_id: rfqId,
        company_id: req.user.company_id
      },
      attributes: [
        'id',
        'file_name',
        'file_size',
        'mime_type',
        'attachment_type',
        'binding_level',
        'legal_notice',
        'deviation_allowed',
        'deviation_tolerance',
        'non_compliance_action',
        'non_compliance_notice',
        'description',
        'is_required',
        'downloaded_by_supplier',
        'downloaded_at',
        'supplier_acknowledged',
        'acknowledged_at',
        'uploaded_at'
      ],
      order: [['is_required', 'DESC'], ['created_at', 'ASC']]
    });

    res.json({
      success: true,
      attachments
    });
  } catch (error) {
    console.error('❌ Error fetching RFQ company attachments:', error);
    res.status(500).json({ error: 'Error al obtener adjuntos' });
  }
});

// ============================================================================
// PROVEEDOR: Download adjunto de empresa (con tracking)
// ============================================================================

router.get('/rfq/:rfqId/company-attachments/:attachmentId/download', authMiddleware, async (req, res) => {
  try {
    const { rfqId, attachmentId } = req.params;

    const attachment = await RfqCompanyAttachment.findOne({
      where: {
        id: attachmentId,
        rfq_id: rfqId
      }
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Adjunto no encontrado' });
    }

    // Marcar como descargado por proveedor (si aún no estaba)
    if (!attachment.downloaded_by_supplier) {
      await attachment.update({
        downloaded_by_supplier: true,
        downloaded_at: new Date()
      });
    }

    // Enviar archivo
    res.download(attachment.file_path, attachment.file_name);
  } catch (error) {
    console.error('❌ Error downloading attachment:', error);
    res.status(500).json({ error: 'Error al descargar adjunto' });
  }
});

// ============================================================================
// PROVEEDOR: Acknowledge adjunto contractual
// ============================================================================

router.post('/rfq/:rfqId/company-attachments/:attachmentId/acknowledge', authMiddleware, async (req, res) => {
  try {
    const { rfqId, attachmentId } = req.params;

    const attachment = await RfqCompanyAttachment.findOne({
      where: {
        id: attachmentId,
        rfq_id: rfqId,
        attachment_type: 'contractual'
      }
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Adjunto contractual no encontrado' });
    }

    await attachment.update({
      supplier_acknowledged: true,
      acknowledged_at: new Date()
    });

    res.json({
      success: true,
      message: 'Adjunto reconocido exitosamente'
    });
  } catch (error) {
    console.error('❌ Error acknowledging attachment:', error);
    res.status(500).json({ error: 'Error al reconocer adjunto' });
  }
});

// ============================================================================
// EMPRESA → PROVEEDOR: Upload adjuntos en Purchase Order
// ============================================================================

router.post('/purchase-order/:poId/attachments', authMiddleware, upload.single('file'), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { poId } = req.params;
    const {
      attachment_type,
      binding_level,
      legal_notice,
      is_required
    } = req.body;

    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    // Verificar que la PO existe y pertenece a la empresa
    const po = await PurchaseOrder.findOne({
      where: {
        id: poId,
        company_id: req.user.company_id
      }
    });

    if (!po) {
      await transaction.rollback();
      await fs.unlink(req.file.path);
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    const attachment = await PurchaseOrderAttachment.create({
      purchase_order_id: poId,
      company_id: req.user.company_id,
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      attachment_type: attachment_type || 'purchase_order_copy',
      binding_level: binding_level || 'orientative',
      legal_notice,
      is_required: is_required === 'true' || is_required === true,
      uploaded_by: req.user.user_id
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      attachment: {
        id: attachment.id,
        file_name: attachment.file_name,
        attachment_type: attachment.attachment_type,
        binding_level: attachment.binding_level,
        is_required: attachment.is_required,
        created_at: attachment.created_at
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error uploading PO attachment:', error);

    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({ error: 'Error al subir adjunto', details: error.message });
  }
});

// ============================================================================
// EMPRESA/PROVEEDOR: Listar adjuntos de Purchase Order
// ============================================================================

router.get('/purchase-order/:poId/attachments', authMiddleware, async (req, res) => {
  try {
    const { poId } = req.params;

    const attachments = await PurchaseOrderAttachment.findAll({
      where: {
        purchase_order_id: poId
      },
      attributes: [
        'id',
        'file_name',
        'file_size',
        'mime_type',
        'attachment_type',
        'binding_level',
        'legal_notice',
        'is_required',
        'downloaded_by_supplier',
        'downloaded_at',
        'uploaded_at'
      ],
      order: [['is_required', 'DESC'], ['created_at', 'ASC']]
    });

    res.json({
      success: true,
      attachments
    });
  } catch (error) {
    console.error('❌ Error fetching PO attachments:', error);
    res.status(500).json({ error: 'Error al obtener adjuntos' });
  }
});

// ============================================================================
// PROVEEDOR: Download adjunto de Purchase Order (con tracking)
// ============================================================================

router.get('/purchase-order/:poId/attachments/:attachmentId/download', authMiddleware, async (req, res) => {
  try {
    const { poId, attachmentId } = req.params;

    const attachment = await PurchaseOrderAttachment.findOne({
      where: {
        id: attachmentId,
        purchase_order_id: poId
      }
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Adjunto no encontrado' });
    }

    // Marcar como descargado por proveedor
    if (!attachment.downloaded_by_supplier) {
      await attachment.update({
        downloaded_by_supplier: true,
        downloaded_at: new Date()
      });
    }

    res.download(attachment.file_path, attachment.file_name);
  } catch (error) {
    console.error('❌ Error downloading PO attachment:', error);
    res.status(500).json({ error: 'Error al descargar adjunto' });
  }
});

// ============================================================================
// PROVEEDOR: Upload factura
// ============================================================================

router.post('/invoice/upload', authMiddleware, upload.single('file'), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      purchase_order_id,
      invoice_number,
      invoice_date,
      due_date,
      subtotal,
      tax,
      total,
      currency,
      notes
    } = req.body;

    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No se proporcionó archivo de factura' });
    }

    // TODO: Obtener supplier_id del usuario proveedor autenticado
    // Por ahora usamos un valor placeholder
    const supplier_id = req.user.supplier_id || 1;

    const invoice = await SupplierInvoice.create({
      company_id: req.user.company_id,
      supplier_id,
      purchase_order_id: purchase_order_id || null,
      invoice_number,
      invoice_date,
      due_date: due_date || null,
      subtotal: parseFloat(subtotal) || 0,
      tax: parseFloat(tax) || 0,
      total: parseFloat(total) || 0,
      currency: currency || 'USD',
      status: 'pending',
      file_path: req.file.path,
      file_name: req.file.originalname,
      notes,
      uploaded_by: req.user.user_id
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total: invoice.total,
        status: invoice.status,
        uploaded_at: invoice.uploaded_at
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error uploading invoice:', error);

    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({ error: 'Error al subir factura', details: error.message });
  }
});

// ============================================================================
// EMPRESA: Validar factura
// ============================================================================

router.post('/invoice/:invoiceId/validate', authMiddleware, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { validated, validation_notes } = req.body;

    const invoice = await SupplierInvoice.findOne({
      where: {
        id: invoiceId,
        company_id: req.user.company_id
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    await invoice.update({
      invoice_validated: validated === true,
      invoice_validation_notes: validation_notes || null,
      validated_by: req.user.user_id,
      validated_at: new Date(),
      status: validated ? 'validated' : 'rejected'
    });

    res.json({
      success: true,
      message: validated ? 'Factura validada exitosamente' : 'Factura rechazada',
      invoice: {
        id: invoice.id,
        invoice_validated: invoice.invoice_validated,
        status: invoice.status
      }
    });
  } catch (error) {
    console.error('❌ Error validating invoice:', error);
    res.status(500).json({ error: 'Error al validar factura' });
  }
});

// ============================================================================
// UTILIDAD: Verificar si proveedor descargó adjuntos requeridos
// ============================================================================

router.get('/rfq/:rfqId/check-required-downloads', authMiddleware, async (req, res) => {
  try {
    const { rfqId } = req.params;

    const result = await sequelize.query(
      'SELECT check_supplier_downloaded_required_attachments(:rfqId) as all_downloaded',
      {
        replacements: { rfqId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      all_required_downloaded: result[0].all_downloaded
    });
  } catch (error) {
    console.error('❌ Error checking required downloads:', error);
    res.status(500).json({ error: 'Error al verificar descargas requeridas' });
  }
});

// ============================================================================
// SUPPLIER UPLOADS - Proveedor sube adjuntos (NUEVO)
// ============================================================================

/**
 * POST /api/supplier-portal/attachments/rfq/:rfqId/supplier-upload
 * Proveedor sube adjuntos a una RFQ (propuesta, cotización, specs técnicas)
 */
router.post('/rfq/:rfqId/supplier-upload',
    authenticateSupplier,
    upload.array('files', 10),
    async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            const { rfqId } = req.params;
            const { supplierId, supplierEmail } = req.supplier;
            const { attachment_type = 'proposal', description } = req.body;

            // Validar que el proveedor tiene acceso a esta RFQ
            const rfq = await RequestForQuotation.findOne({
                where: { id: rfqId, supplier_id: supplierId }
            });

            if (!rfq) {
                await transaction.rollback();
                return res.status(403).json({ error: 'No tienes acceso a esta RFQ' });
            }

            if (!req.files || req.files.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ error: 'No se recibieron archivos' });
            }

            // Crear adjuntos
            const attachments = await Promise.all(req.files.map(file => {
                return RfqAttachment.create({
                    rfq_id: rfqId,
                    file_name: file.filename,
                    original_name: file.originalname,
                    file_path: file.path,
                    file_size: file.size,
                    mime_type: file.mimetype,
                    attachment_type: attachment_type,  // 'proposal', 'technical_specs', 'certificate'
                    description: description,
                    uploaded_by: 'supplier',
                    uploaded_by_email: supplierEmail,
                    is_supplier_attachment: true
                }, { transaction });
            }));

            await transaction.commit();

            res.status(201).json({
                message: `${attachments.length} archivo(s) subido(s) correctamente`,
                attachments
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error uploading supplier attachments to RFQ:', error);
            res.status(500).json({ error: 'Error al subir archivos' });
        }
    }
);

/**
 * POST /api/supplier-portal/attachments/purchase-order/:poId/supplier-upload
 * Proveedor sube adjuntos a una Purchase Order (remito, certificado, documentación)
 */
router.post('/purchase-order/:poId/supplier-upload',
    authenticateSupplier,
    upload.array('files', 10),
    async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            const { poId } = req.params;
            const { supplierId, supplierEmail } = req.supplier;
            const { attachment_type = 'delivery_note', description } = req.body;

            // Validar que el proveedor tiene acceso a este PO
            const po = await PurchaseOrder.findOne({
                where: { id: poId, supplier_id: supplierId }
            });

            if (!po) {
                await transaction.rollback();
                return res.status(403).json({ error: 'No tienes acceso a esta orden de compra' });
            }

            if (!req.files || req.files.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ error: 'No se recibieron archivos' });
            }

            // Crear adjuntos
            const attachments = await Promise.all(req.files.map(file => {
                return PurchaseOrderAttachment.create({
                    purchase_order_id: poId,
                    file_name: file.filename,
                    original_name: file.originalname,
                    file_path: file.path,
                    file_size: file.size,
                    mime_type: file.mimetype,
                    attachment_type: attachment_type,  // 'delivery_note', 'certificate', 'documentation'
                    description: description,
                    uploaded_by: 'supplier',
                    uploaded_by_email: supplierEmail,
                    is_supplier_attachment: true
                }, { transaction });
            }));

            await transaction.commit();

            res.status(201).json({
                message: `${attachments.length} archivo(s) subido(s) correctamente`,
                attachments
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error uploading supplier attachments to PO:', error);
            res.status(500).json({ error: 'Error al subir archivos' });
        }
    }
);

/**
 * GET /api/supplier-portal/attachments/rfq/:rfqId/my-uploads
 * Obtener adjuntos subidos por el proveedor a una RFQ
 */
router.get('/rfq/:rfqId/my-uploads', authenticateSupplier, async (req, res) => {
    try {
        const { rfqId } = req.params;
        const { supplierId } = req.supplier;

        // Validar acceso
        const rfq = await RequestForQuotation.findOne({
            where: { id: rfqId, supplier_id: supplierId }
        });

        if (!rfq) {
            return res.status(403).json({ error: 'No tienes acceso a esta RFQ' });
        }

        const attachments = await RfqAttachment.findAll({
            where: {
                rfq_id: rfqId,
                is_supplier_attachment: true
            },
            order: [['created_at', 'DESC']]
        });

        res.json({ attachments });
    } catch (error) {
        console.error('Error fetching supplier RFQ uploads:', error);
        res.status(500).json({ error: 'Error al cargar adjuntos' });
    }
});

/**
 * DELETE /api/supplier-portal/attachments/rfq/:rfqId/:attachmentId
 * Proveedor elimina uno de sus adjuntos
 */
router.delete('/rfq/:rfqId/:attachmentId', authenticateSupplier, async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { rfqId, attachmentId } = req.params;
        const { supplierId } = req.supplier;

        // Validar acceso y que el adjunto sea del proveedor
        const attachment = await RfqAttachment.findOne({
            where: {
                id: attachmentId,
                rfq_id: rfqId,
                is_supplier_attachment: true
            },
            include: [{
                model: RequestForQuotation,
                where: { supplier_id: supplierId }
            }]
        });

        if (!attachment) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Adjunto no encontrado o sin acceso' });
        }

        // Eliminar archivo físico
        const fs = require('fs').promises;
        try {
            await fs.unlink(attachment.file_path);
        } catch (err) {
            console.warn('⚠️ No se pudo eliminar archivo físico:', err.message);
        }

        // Eliminar registro
        await attachment.destroy({ transaction });

        await transaction.commit();

        res.json({ message: 'Adjunto eliminado correctamente' });
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting supplier attachment:', error);
        res.status(500).json({ error: 'Error al eliminar adjunto' });
    }
});

module.exports = router;
