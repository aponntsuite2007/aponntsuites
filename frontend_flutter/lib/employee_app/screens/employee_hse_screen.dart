/*
 * EMPLOYEE HSE SCREEN
 * =============================
 * Pantalla de Seguridad e Higiene (EPP Compliance) del empleado
 *
 * Funcionalidades:
 * - Ver EPP asignado y su estado
 * - Alertas de vencimiento
 * - Firmar recepcion de EPP
 * - Dashboard de cumplimiento
 *
 * Fecha: 2025-12-08
 * Version: 1.0.0
 */

import 'package:flutter/material.dart';
import '../services/employee_api_service.dart';

/// Modelo de entrega de EPP
class EppDelivery {
  final int id;
  final String eppName;
  final String? eppCategory;
  final String? brand;
  final String? model;
  final String? size;
  final DateTime? deliveryDate;
  final DateTime? expirationDate;
  final String status; // delivered, pending_signature, expired, expiring_soon
  final bool signed;
  final DateTime? signedAt;
  final String? condition; // new, good, fair, poor

  EppDelivery({
    required this.id,
    required this.eppName,
    this.eppCategory,
    this.brand,
    this.model,
    this.size,
    this.deliveryDate,
    this.expirationDate,
    required this.status,
    required this.signed,
    this.signedAt,
    this.condition,
  });

  factory EppDelivery.fromJson(Map<String, dynamic> json) {
    return EppDelivery(
      id: json['id'] ?? 0,
      eppName: json['epp_name'] ?? json['name'] ?? 'EPP',
      eppCategory: json['category'] ?? json['epp_category'],
      brand: json['brand'],
      model: json['model'],
      size: json['size'],
      deliveryDate: json['delivery_date'] != null
          ? DateTime.tryParse(json['delivery_date'].toString())
          : null,
      expirationDate: json['expiration_date'] != null
          ? DateTime.tryParse(json['expiration_date'].toString())
          : null,
      status: json['status'] ?? 'delivered',
      signed: json['signed'] == true || json['employee_signed'] == true,
      signedAt: json['signed_at'] != null
          ? DateTime.tryParse(json['signed_at'].toString())
          : null,
      condition: json['condition'],
    );
  }

  int? get daysToExpire {
    if (expirationDate == null) return null;
    return expirationDate!.difference(DateTime.now()).inDays;
  }

  bool get isExpired => daysToExpire != null && daysToExpire! < 0;
  bool get isExpiringSoon => daysToExpire != null && daysToExpire! >= 0 && daysToExpire! <= 30;

  Color get statusColor {
    if (isExpired) return Colors.red;
    if (isExpiringSoon) return Colors.orange;
    if (!signed) return Colors.amber;
    return Colors.green;
  }

  IconData get categoryIcon {
    switch (eppCategory?.toLowerCase() ?? '') {
      case 'head':
      case 'cabeza':
        return Icons.construction;
      case 'eyes':
      case 'ojos':
        return Icons.visibility;
      case 'ears':
      case 'oidos':
        return Icons.hearing;
      case 'respiratory':
      case 'respiratorio':
        return Icons.masks;
      case 'hands':
      case 'manos':
        return Icons.back_hand;
      case 'feet':
      case 'pies':
        return Icons.skateboarding;
      case 'body':
      case 'cuerpo':
        return Icons.accessibility_new;
      case 'fall':
      case 'caidas':
        return Icons.airline_seat_recline_extra;
      default:
        return Icons.security;
    }
  }
}

/// EMPLOYEE HSE SCREEN
class EmployeeHseScreen extends StatefulWidget {
  const EmployeeHseScreen({Key? key}) : super(key: key);

  @override
  State<EmployeeHseScreen> createState() => _EmployeeHseScreenState();
}

class _EmployeeHseScreenState extends State<EmployeeHseScreen> {
  final EmployeeApiService _api = EmployeeApiService();

  List<EppDelivery> _deliveries = [];
  bool _isLoading = true;
  String? _error;

  // Stats
  int _totalEpp = 0;
  int _compliantEpp = 0;
  int _expiringEpp = 0;
  int _expiredEpp = 0;
  int _pendingSignature = 0;
  double _complianceRate = 100.0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Cargar entregas y compliance en paralelo
      final results = await Future.wait([
        _api.getMyEppDeliveries(),
        _api.getMyHseCompliance(),
      ]);

      // Entregas
      if (results[0].isSuccess && results[0].data != null) {
        final deliveriesData = results[0].data['deliveries'] ?? results[0].data;
        if (deliveriesData is List) {
          _deliveries = deliveriesData.map((d) => EppDelivery.fromJson(d)).toList();
        }
      }

      // Compliance stats
      if (results[1].isSuccess && results[1].data != null) {
        final compliance = results[1].data;
        _complianceRate = (compliance['compliance_rate'] ?? 100).toDouble();
        _totalEpp = compliance['total_required'] ?? _deliveries.length;
        _compliantEpp = compliance['compliant'] ??
            _deliveries.where((d) => !d.isExpired && d.signed).length;
      }

      // Calcular stats locales
      _expiringEpp = _deliveries.where((d) => d.isExpiringSoon && !d.isExpired).length;
      _expiredEpp = _deliveries.where((d) => d.isExpired).length;
      _pendingSignature = _deliveries.where((d) => !d.signed).length;

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Error cargando datos HSE: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _signDelivery(EppDelivery delivery) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Recepcion'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('EPP: ${delivery.eppName}'),
            if (delivery.brand != null)
              Text('Marca: ${delivery.brand}', style: TextStyle(color: Colors.grey.shade600)),
            if (delivery.size != null)
              Text('Talla: ${delivery.size}', style: TextStyle(color: Colors.grey.shade600)),
            const SizedBox(height: 16),
            const Text(
              'Al firmar, confirmas que has recibido este elemento de proteccion personal en buen estado.',
              style: TextStyle(fontStyle: FontStyle.italic),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.draw),
            label: const Text('Firmar'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final response = await _api.signEppDelivery(delivery.id);

    if (response.isSuccess) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Recepcion firmada exitosamente'),
          backgroundColor: Colors.green,
        ),
      );
      _loadData();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${response.error ?? 'No se pudo firmar'}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Seguridad e Higiene'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorState()
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: Column(
                      children: [
                        _buildComplianceCard(),
                        _buildAlertsBanner(),
                        _buildStatsRow(),
                        const Padding(
                          padding: EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Icon(Icons.security, color: Colors.grey),
                              SizedBox(width: 8),
                              Text(
                                'Mi Equipo de Proteccion',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        _buildDeliveriesList(),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
          const SizedBox(height: 16),
          Text(_error!, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _loadData,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  Widget _buildComplianceCard() {
    Color complianceColor = _complianceRate >= 80
        ? Colors.green
        : _complianceRate >= 50
            ? Colors.orange
            : Colors.red;

    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Cumplimiento HSE',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                    Text(
                      'Estado de tu equipo de proteccion',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: complianceColor.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    '${_complianceRate.toStringAsFixed(0)}%',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: complianceColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: _complianceRate / 100,
              backgroundColor: Colors.grey.shade200,
              valueColor: AlwaysStoppedAnimation(complianceColor),
              minHeight: 8,
              borderRadius: BorderRadius.circular(4),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertsBanner() {
    if (_expiredEpp == 0 && _expiringEpp == 0 && _pendingSignature == 0) {
      return const SizedBox.shrink();
    }

    List<Widget> alerts = [];

    if (_expiredEpp > 0) {
      alerts.add(_buildAlertChip(
        'Vencidos: $_expiredEpp',
        Colors.red,
        Icons.error,
      ));
    }

    if (_expiringEpp > 0) {
      alerts.add(_buildAlertChip(
        'Por vencer: $_expiringEpp',
        Colors.orange,
        Icons.warning,
      ));
    }

    if (_pendingSignature > 0) {
      alerts.add(_buildAlertChip(
        'Sin firmar: $_pendingSignature',
        Colors.amber,
        Icons.draw,
      ));
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.amber.shade200),
      ),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: alerts,
      ),
    );
  }

  Widget _buildAlertChip(String label, Color color, IconData icon) {
    return Chip(
      avatar: Icon(icon, color: color, size: 18),
      label: Text(label, style: TextStyle(color: color)),
      backgroundColor: color.withOpacity(0.1),
      side: BorderSide(color: color.withOpacity(0.3)),
    );
  }

  Widget _buildStatsRow() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem('Total', _totalEpp.toString(), Colors.blue, Icons.security),
          _buildStatItem('Vigente', _compliantEpp.toString(), Colors.green, Icons.check_circle),
          _buildStatItem('Alerta', (_expiringEpp + _expiredEpp).toString(),
              _expiringEpp + _expiredEpp > 0 ? Colors.orange : Colors.grey, Icons.warning),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color, IconData icon) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color),
        ),
        const SizedBox(height: 8),
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
      ],
    );
  }

  Widget _buildDeliveriesList() {
    if (_deliveries.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Center(
          child: Column(
            children: [
              Icon(Icons.security, size: 64, color: Colors.grey.shade400),
              const SizedBox(height: 16),
              Text(
                'No tienes EPP asignado',
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 16),
      itemCount: _deliveries.length,
      itemBuilder: (context, index) => _buildDeliveryCard(_deliveries[index]),
    );
  }

  Widget _buildDeliveryCard(EppDelivery delivery) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: delivery.statusColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(delivery.categoryIcon, color: delivery.statusColor),
        ),
        title: Text(delivery.eppName, style: const TextStyle(fontWeight: FontWeight.w500)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (delivery.brand != null || delivery.size != null)
              Text(
                [delivery.brand, delivery.size].whereType<String>().join(' - '),
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              ),
            if (delivery.expirationDate != null)
              Text(
                delivery.isExpired
                    ? 'Vencido'
                    : delivery.isExpiringSoon
                        ? 'Vence en ${delivery.daysToExpire} dias'
                        : 'Vence: ${_formatDate(delivery.expirationDate!)}',
                style: TextStyle(
                  color: delivery.statusColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
          ],
        ),
        trailing: delivery.signed
            ? Icon(Icons.check_circle, color: Colors.green.shade400)
            : TextButton.icon(
                onPressed: () => _signDelivery(delivery),
                icon: const Icon(Icons.draw, size: 18),
                label: const Text('Firmar'),
                style: TextButton.styleFrom(foregroundColor: Colors.blue),
              ),
        onTap: () => _showDeliveryDetail(delivery),
      ),
    );
  }

  void _showDeliveryDetail(EppDelivery delivery) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: delivery.statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(delivery.categoryIcon, color: delivery.statusColor, size: 32),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    delivery.eppName,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (delivery.brand != null)
              _buildDetailRow('Marca', delivery.brand!),
            if (delivery.model != null)
              _buildDetailRow('Modelo', delivery.model!),
            if (delivery.size != null)
              _buildDetailRow('Talla', delivery.size!),
            if (delivery.deliveryDate != null)
              _buildDetailRow('Fecha Entrega', _formatDate(delivery.deliveryDate!)),
            if (delivery.expirationDate != null)
              _buildDetailRow('Vencimiento', _formatDate(delivery.expirationDate!)),
            _buildDetailRow('Estado Firma', delivery.signed ? 'Firmado' : 'Pendiente'),
            if (delivery.signedAt != null)
              _buildDetailRow('Fecha Firma', _formatDate(delivery.signedAt!)),
            const SizedBox(height: 20),
            if (!delivery.signed)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    _signDelivery(delivery);
                  },
                  icon: const Icon(Icons.draw),
                  label: const Text('Firmar Recepcion'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
