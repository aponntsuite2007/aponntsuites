import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../providers/medical_absence_provider.dart';
import '../../providers/enhanced_auth_provider.dart';
import '../../models/medical_certificate.dart';
import '../../widgets/common/loading_overlay.dart';
import '../../widgets/common/error_banner.dart';

class MedicalCertificatesListScreen extends StatefulWidget {
  @override
  _MedicalCertificatesListScreenState createState() => _MedicalCertificatesListScreenState();
}

class _MedicalCertificatesListScreenState extends State<MedicalCertificatesListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCertificates();
    });
  }

  Future<void> _loadCertificates() async {
    final provider = Provider.of<MedicalAbsenceProvider>(context, listen: false);
    await provider.loadUserCertificates();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MedicalAbsenceProvider>(
      builder: (context, provider, child) {
        return LoadingOverlay(
          isLoading: provider.isLoading,
          child: Column(
            children: [
              if (provider.error != null)
                ErrorBanner(
                  message: provider.error!,
                  onDismiss: () => provider._clearError(),
                  onRetry: _loadCertificates,
                ),
              
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadCertificates,
                  child: provider.certificates.isEmpty
                      ? _buildEmptyState()
                      : _buildCertificatesList(provider.certificates),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.medical_services_outlined,
            size: 80,
            color: Colors.grey[400],
          ),
          SizedBox(height: 16),
          Text(
            'No hay certificados médicos',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Sus solicitudes de ausencia médica aparecerán aquí',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildCertificatesList(List<MedicalCertificate> certificates) {
    return ListView.builder(
      padding: EdgeInsets.all(16),
      itemCount: certificates.length,
      itemBuilder: (context, index) {
        final certificate = certificates[index];
        return Card(
          margin: EdgeInsets.only(bottom: 12),
          child: InkWell(
            onTap: () => _showCertificateDetails(certificate),
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: _getStatusColor(certificate.status),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          certificate.statusText,
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      Spacer(),
                      Text(
                        DateFormat('dd/MM/yyyy').format(certificate.createdAt),
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  
                  Row(
                    children: [
                      Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                      SizedBox(width: 8),
                      Text(
                        'Desde ${DateFormat('dd/MM/yyyy').format(certificate.startDate)}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(width: 16),
                      Icon(Icons.access_time, size: 16, color: Colors.grey[600]),
                      SizedBox(width: 4),
                      Text(
                        '${certificate.requestedDays} día${certificate.requestedDays > 1 ? 's' : ''}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  
                  if (certificate.symptoms != null) ...[
                    SizedBox(height: 8),
                    Text(
                      certificate.symptoms!,
                      style: TextStyle(
                        color: Colors.grey[700],
                        fontSize: 13,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  
                  if (certificate.auditorResponse != null) ...[
                    SizedBox(height: 12),
                    Container(
                      padding: EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey[200]!),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.person, size: 16, color: Colors.blue[600]),
                              SizedBox(width: 4),
                              Text(
                                'Respuesta médica:',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.blue[600],
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 4),
                          Text(
                            certificate.auditorResponse!,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[700],
                            ),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (certificate.approvedDays != null) ...[
                            SizedBox(height: 4),
                            Text(
                              'Días aprobados: ${certificate.approvedDays}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: Colors.green[700],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                  
                  SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => _showCertificateDetails(certificate),
                        child: Text('Ver detalles'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange[600]!;
      case 'under_review':
        return Colors.blue[600]!;
      case 'approved':
        return Colors.green[600]!;
      case 'rejected':
        return Colors.red[600]!;
      case 'needs_audit':
        return Colors.purple[600]!;
      default:
        return Colors.grey[600]!;
    }
  }

  void _showCertificateDetails(MedicalCertificate certificate) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => CertificateDetailsSheet(certificate: certificate),
    );
  }
}

class CertificateDetailsSheet extends StatelessWidget {
  final MedicalCertificate certificate;
  
  CertificateDetailsSheet({required this.certificate});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(24),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.8,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(Icons.medical_services, color: Colors.red[700]),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Detalle del Certificado',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _getStatusColor(certificate.status),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  certificate.statusText,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: 16),
          
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildDetailRow('Fecha de solicitud', 
                    DateFormat('dd/MM/yyyy HH:mm').format(certificate.createdAt)),
                  _buildDetailRow('Fecha de inicio', 
                    DateFormat('dd/MM/yyyy').format(certificate.startDate)),
                  _buildDetailRow('Fecha de fin', 
                    DateFormat('dd/MM/yyyy').format(certificate.endDate)),
                  _buildDetailRow('Días solicitados', 
                    '${certificate.requestedDays} día${certificate.requestedDays > 1 ? 's' : ''}'),
                  
                  if (certificate.symptoms != null) ...[
                    SizedBox(height: 16),
                    Text(
                      'Síntomas:',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 8),
                    Container(
                      padding: EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        certificate.symptoms!,
                        style: TextStyle(fontSize: 14),
                      ),
                    ),
                  ],
                  
                  if (certificate.hasVisitedDoctor) ...[
                    SizedBox(height: 16),
                    Text(
                      'Atención Médica:',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 8),
                    if (certificate.medicalCenter != null)
                      _buildDetailRow('Centro médico', certificate.medicalCenter!),
                    if (certificate.attendingPhysician != null)
                      _buildDetailRow('Médico tratante', certificate.attendingPhysician!),
                    if (certificate.diagnosis != null)
                      _buildDetailRow('Diagnóstico', certificate.diagnosis!),
                  ],
                  
                  if (certificate.auditorResponse != null) ...[
                    SizedBox(height: 16),
                    Text(
                      'Respuesta del Auditor Médico:',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 8),
                    Container(
                      padding: EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: certificate.isJustified == true 
                          ? Colors.green[50] 
                          : Colors.red[50],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: certificate.isJustified == true 
                            ? Colors.green[200]! 
                            : Colors.red[200]!
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            certificate.auditorResponse!,
                            style: TextStyle(fontSize: 14),
                          ),
                          if (certificate.approvedDays != null) ...[
                            SizedBox(height: 8),
                            Text(
                              'Días aprobados: ${certificate.approvedDays}',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Colors.green[700],
                              ),
                            ),
                          ],
                          if (certificate.auditDate != null) ...[
                            SizedBox(height: 4),
                            Text(
                              'Fecha de respuesta: ${DateFormat('dd/MM/yyyy HH:mm').format(certificate.auditDate!)}',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                  
                  if (certificate.attachments != null && certificate.attachments!.isNotEmpty) ...[
                    SizedBox(height: 16),
                    Text(
                      'Archivos adjuntos:',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 8),
                    ...certificate.attachments!.map((attachment) => 
                      ListTile(
                        leading: Icon(Icons.attach_file),
                        title: Text(attachment.split('/').last),
                        trailing: Icon(Icons.open_in_new),
                        onTap: () {
                          // TODO: Abrir archivo
                        },
                      )
                    ).toList(),
                  ],
                ],
              ),
            ),
          ),
          
          SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cerrar'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.grey[700],
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange[600]!;
      case 'under_review':
        return Colors.blue[600]!;
      case 'approved':
        return Colors.green[600]!;
      case 'rejected':
        return Colors.red[600]!;
      case 'needs_audit':
        return Colors.purple[600]!;
      default:
        return Colors.grey[600]!;
    }
  }
}