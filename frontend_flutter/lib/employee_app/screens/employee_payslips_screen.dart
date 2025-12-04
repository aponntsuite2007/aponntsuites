/*
 * 💰 EMPLOYEE PAYSLIPS SCREEN
 * ============================
 * Pantalla de liquidaciones y recibos de sueldo
 *
 * Características:
 * - Lista de liquidaciones por mes/año
 * - Descargar PDF de recibos
 * - Ver detalle de conceptos
 * - Historial completo
 *
 * Fecha: 2025-11-30
 * Versión: 1.0.0
 */

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_file/open_file.dart';
import '../services/employee_api_service.dart';

/// 📦 Modelo de liquidación
class Payslip {
  final String id;
  final int year;
  final int month;
  final String period;
  final double grossSalary;
  final double deductions;
  final double netSalary;
  final String status;
  final DateTime? paymentDate;
  final List<PayslipConcept> concepts;

  Payslip({
    required this.id,
    required this.year,
    required this.month,
    required this.period,
    required this.grossSalary,
    required this.deductions,
    required this.netSalary,
    required this.status,
    this.paymentDate,
    this.concepts = const [],
  });

  factory Payslip.fromJson(Map<String, dynamic> json) {
    final conceptsList = (json['concepts'] as List<dynamic>?)
            ?.map((c) => PayslipConcept.fromJson(c))
            .toList() ??
        [];

    return Payslip(
      id: json['id']?.toString() ?? '',
      year: json['year'] ?? DateTime.now().year,
      month: json['month'] ?? DateTime.now().month,
      period: json['period'] ?? '${json['month']}/${json['year']}',
      grossSalary: (json['gross_salary'] ?? json['bruto'] ?? 0).toDouble(),
      deductions: (json['deductions'] ?? json['deducciones'] ?? 0).toDouble(),
      netSalary: (json['net_salary'] ?? json['neto'] ?? 0).toDouble(),
      status: json['status'] ?? 'pending',
      paymentDate: json['payment_date'] != null
          ? DateTime.tryParse(json['payment_date'].toString())
          : null,
      concepts: conceptsList,
    );
  }

  String get monthName {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1];
  }

  bool get isPaid => status == 'paid' || status == 'pagado';
}

/// 📦 Concepto de liquidación
class PayslipConcept {
  final String code;
  final String description;
  final double amount;
  final String type; // earning, deduction

  PayslipConcept({
    required this.code,
    required this.description,
    required this.amount,
    required this.type,
  });

  factory PayslipConcept.fromJson(Map<String, dynamic> json) {
    return PayslipConcept(
      code: json['code'] ?? json['codigo'] ?? '',
      description: json['description'] ?? json['descripcion'] ?? '',
      amount: (json['amount'] ?? json['monto'] ?? 0).toDouble(),
      type: json['type'] ?? json['tipo'] ?? 'earning',
    );
  }

  bool get isEarning => type == 'earning' || type == 'haber';
  bool get isDeduction => type == 'deduction' || type == 'deduccion';
}

/// 💰 EMPLOYEE PAYSLIPS SCREEN
class EmployeePayslipsScreen extends StatefulWidget {
  const EmployeePayslipsScreen({Key? key}) : super(key: key);

  @override
  State<EmployeePayslipsScreen> createState() => _EmployeePayslipsScreenState();
}

class _EmployeePayslipsScreenState extends State<EmployeePayslipsScreen> {
  final EmployeeApiService _api = EmployeeApiService();

  List<Payslip> _payslips = [];
  Map<String, dynamic>? _salaryConfig;

  bool _isLoading = true;
  String? _error;

  int _selectedYear = DateTime.now().year;

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
      final results = await Future.wait([
        _api.getMyPayslips(year: _selectedYear),
        _api.getMySalaryConfig(),
      ]);

      setState(() {
        if (results[0].isSuccess && results[0].data != null) {
          final List<dynamic> list = results[0].data is List ? results[0].data : [];
          _payslips = list.map((p) => Payslip.fromJson(p)).toList();
          _payslips.sort((a, b) => b.month.compareTo(a.month));
        }

        if (results[1].isSuccess) {
          _salaryConfig = results[1].data;
        }

        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1B2A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B263B),
        elevation: 0,
        title: const Text('Mis Liquidaciones'),
        actions: [
          // Selector de año
          DropdownButton<int>(
            value: _selectedYear,
            dropdownColor: const Color(0xFF1B263B),
            icon: const Icon(Icons.arrow_drop_down, color: Colors.white),
            underline: const SizedBox(),
            items: List.generate(5, (i) => DateTime.now().year - i)
                .map((year) => DropdownMenuItem(
                      value: year,
                      child: Text(
                        year.toString(),
                        style: const TextStyle(color: Colors.white),
                      ),
                    ))
                .toList(),
            onChanged: (year) {
              if (year != null) {
                setState(() => _selectedYear = year);
                _loadData();
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.cyan))
          : _error != null
              ? _buildError()
              : _buildContent(),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(_error!, style: const TextStyle(color: Colors.white70)),
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

  Widget _buildContent() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Resumen salarial
        if (_salaryConfig != null) _buildSalarySummary(),
        const SizedBox(height: 16),

        // Título de liquidaciones
        Row(
          children: [
            const Icon(Icons.receipt_long, color: Colors.cyan, size: 20),
            const SizedBox(width: 8),
            Text(
              'Recibos $_selectedYear',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Spacer(),
            Text(
              '${_payslips.length} recibos',
              style: const TextStyle(color: Colors.white54, fontSize: 13),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Lista de liquidaciones
        if (_payslips.isEmpty)
          _buildEmptyState()
        else
          ..._payslips.map((p) => _buildPayslipCard(p)),
      ],
    );
  }

  Widget _buildSalarySummary() {
    final baseSalary = (_salaryConfig!['base_salary'] ?? 0).toDouble();
    final currency = _salaryConfig!['currency'] ?? 'ARS';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.green.shade700, Colors.green.shade900],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.account_balance_wallet, color: Colors.white),
              const SizedBox(width: 8),
              const Text(
                'Tu Configuración Salarial',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Salario Base',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.7),
                      fontSize: 12,
                    ),
                  ),
                  Text(
                    '\$ ${_formatNumber(baseSalary)}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  currency,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(48),
      child: Column(
        children: [
          Icon(Icons.receipt_long, size: 64, color: Colors.grey.shade600),
          const SizedBox(height: 16),
          const Text(
            'No hay liquidaciones',
            style: TextStyle(color: Colors.white70, fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            'No se encontraron recibos para $_selectedYear',
            style: const TextStyle(color: Colors.white54, fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildPayslipCard(Payslip payslip) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: () => _showPayslipDetail(payslip),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // Header
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.cyan.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        payslip.month.toString().padLeft(2, '0'),
                        style: const TextStyle(
                          color: Colors.cyan,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          payslip.monthName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          payslip.year.toString(),
                          style: const TextStyle(
                            color: Colors.white54,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '\$ ${_formatNumber(payslip.netSalary)}',
                        style: const TextStyle(
                          color: Colors.green,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: payslip.isPaid
                              ? Colors.green.withOpacity(0.2)
                              : Colors.orange.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          payslip.isPaid ? 'Pagado' : 'Pendiente',
                          style: TextStyle(
                            color: payslip.isPaid ? Colors.green : Colors.orange,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Detalles rápidos
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildQuickInfo('Bruto', payslip.grossSalary, Colors.white70),
                  _buildQuickInfo('Deducciones', payslip.deductions, Colors.red.shade300),
                  _buildQuickInfo('Neto', payslip.netSalary, Colors.green),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickInfo(String label, double amount, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(color: Colors.white54, fontSize: 11),
        ),
        Text(
          '\$ ${_formatNumber(amount)}',
          style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  void _showPayslipDetail(Payslip payslip) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1B263B),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white30,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Header
              Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.cyan.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.receipt_long, color: Colors.cyan, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Recibo ${payslip.monthName} ${payslip.year}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (payslip.paymentDate != null)
                          Text(
                            'Pagado: ${_formatDate(payslip.paymentDate!)}',
                            style: const TextStyle(color: Colors.white54, fontSize: 12),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Resumen
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'NETO A COBRAR',
                      style: TextStyle(
                        color: Colors.green,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '\$ ${_formatNumber(payslip.netSalary)}',
                      style: const TextStyle(
                        color: Colors.green,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Haberes
              if (payslip.concepts.where((c) => c.isEarning).isNotEmpty) ...[
                const Text(
                  'HABERES',
                  style: TextStyle(
                    color: Colors.cyan,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 8),
                ...payslip.concepts.where((c) => c.isEarning).map((c) => _buildConceptRow(c)),
                const Divider(color: Colors.white24, height: 24),
                _buildTotalRow('Total Haberes', payslip.grossSalary, Colors.white),
                const SizedBox(height: 16),
              ],

              // Deducciones
              if (payslip.concepts.where((c) => c.isDeduction).isNotEmpty) ...[
                const Text(
                  'DEDUCCIONES',
                  style: TextStyle(
                    color: Colors.red,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 8),
                ...payslip.concepts.where((c) => c.isDeduction).map((c) => _buildConceptRow(c, isDeduction: true)),
                const Divider(color: Colors.white24, height: 24),
                _buildTotalRow('Total Deducciones', payslip.deductions, Colors.red),
                const SizedBox(height: 16),
              ],

              // Si no hay conceptos, mostrar resumen simple
              if (payslip.concepts.isEmpty) ...[
                _buildSummaryRow('Bruto', payslip.grossSalary),
                _buildSummaryRow('Deducciones', -payslip.deductions, isNegative: true),
                const Divider(color: Colors.white24, height: 24),
                _buildSummaryRow('Neto', payslip.netSalary, isTotal: true),
              ],

              const SizedBox(height: 24),

              // Botón descargar PDF
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _downloadPayslipPdf(payslip),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.cyan,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: const Icon(Icons.download),
                  label: const Text('Descargar Recibo PDF'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConceptRow(PayslipConcept concept, {bool isDeduction = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            width: 40,
            child: Text(
              concept.code,
              style: const TextStyle(
                color: Colors.white38,
                fontSize: 11,
                fontFamily: 'monospace',
              ),
            ),
          ),
          Expanded(
            child: Text(
              concept.description,
              style: const TextStyle(color: Colors.white70, fontSize: 14),
            ),
          ),
          Text(
            '${isDeduction ? '-' : ''}\$ ${_formatNumber(concept.amount)}',
            style: TextStyle(
              color: isDeduction ? Colors.red.shade300 : Colors.white,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalRow(String label, double amount, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(color: color, fontWeight: FontWeight.bold),
          ),
          Text(
            '\$ ${_formatNumber(amount)}',
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, double amount, {bool isNegative = false, bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isTotal ? Colors.green : Colors.white70,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              fontSize: isTotal ? 16 : 14,
            ),
          ),
          Text(
            '${isNegative ? '-' : ''}\$ ${_formatNumber(amount.abs())}',
            style: TextStyle(
              color: isNegative ? Colors.red.shade300 : isTotal ? Colors.green : Colors.white,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              fontSize: isTotal ? 18 : 14,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _downloadPayslipPdf(Payslip payslip) async {
    // Mostrar loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: Colors.cyan),
      ),
    );

    try {
      final bytes = await _api.downloadPayslipPdf(payslip.id);
      Navigator.pop(context); // Cerrar loading

      if (bytes != null) {
        // Guardar archivo
        final directory = await getApplicationDocumentsDirectory();
        final file = File('${directory.path}/recibo_${payslip.month}_${payslip.year}.pdf');
        await file.writeAsBytes(bytes);

        // Abrir archivo
        await OpenFile.open(file.path);

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Recibo descargado'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error al descargar el recibo'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  String _formatNumber(double number) {
    return number.toStringAsFixed(2).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]}.',
        );
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}
