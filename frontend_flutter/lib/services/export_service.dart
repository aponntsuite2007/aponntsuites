import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:excel/excel.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/attendance.dart';
import '../models/user.dart';

class ExportService {
  static final ExportService _instance = ExportService._internal();
  factory ExportService() => _instance;
  ExportService._internal();

  /// Exportar datos de asistencia a CSV
  Future<String> exportAttendanceToCSV({
    required List<Attendance> attendances,
    required List<User> users,
    String? fileName,
  }) async {
    final csv = StringBuffer();
    
    // Headers
    csv.writeln('Fecha,Usuario,Legajo,Entrada,Salida,Horas Trabajadas,Estado,Ubicación,Notas');
    
    for (final attendance in attendances) {
      final user = users.firstWhere(
        (u) => u.id == attendance.userId,
        orElse: () => User(
          id: attendance.userId,
          legajo: 'N/A',
          firstName: 'Usuario',
          lastName: 'Desconocido',
          email: '',
          role: 'employee',
        ),
      );
      
      final dateStr = '${attendance.date.day}/${attendance.date.month}/${attendance.date.year}';
      final checkInStr = attendance.checkInTime != null
          ? '${attendance.checkInTime!.hour}:${attendance.checkInTime!.minute.toString().padLeft(2, '0')}'
          : '';
      final checkOutStr = attendance.checkOutTime != null
          ? '${attendance.checkOutTime!.hour}:${attendance.checkOutTime!.minute.toString().padLeft(2, '0')}'
          : '';
      
      csv.writeln([
        dateStr,
        '${user.firstName} ${user.lastName}',
        user.legajo,
        checkInStr,
        checkOutStr,
        attendance.workingHours.toStringAsFixed(2),
        attendance.displayStatus,
        attendance.location ?? '',
        attendance.notes ?? '',
      ].map((field) => '"${field.toString().replaceAll('"', '""')}"').join(','));
    }
    
    return await _saveFile(
      content: csv.toString(),
      fileName: fileName ?? 'reporte_asistencia_${DateTime.now().millisecondsSinceEpoch}.csv',
      extension: 'csv',
    );
  }

  /// Exportar usuarios a CSV
  Future<String> exportUsersToCSV({
    required List<User> users,
    String? fileName,
  }) async {
    final csv = StringBuffer();
    
    // Headers
    csv.writeln('Legajo,Nombre,Apellido,Email,DNI,Teléfono,Rol,Estado,Departamento,Posición,Fecha Creación');
    
    for (final user in users) {
      final createdAtStr = user.createdAt != null
          ? '${user.createdAt!.day}/${user.createdAt!.month}/${user.createdAt!.year}'
          : '';
      
      csv.writeln([
        user.legajo,
        user.firstName,
        user.lastName,
        user.email,
        user.dni ?? '',
        user.phone ?? '',
        user.displayRole,
        user.isActive ? 'Activo' : 'Inactivo',
        user.department ?? '',
        user.position ?? '',
        createdAtStr,
      ].map((field) => '"${field.toString().replaceAll('"', '""')}"').join(','));
    }
    
    return await _saveFile(
      content: csv.toString(),
      fileName: fileName ?? 'usuarios_${DateTime.now().millisecondsSinceEpoch}.csv',
      extension: 'csv',
    );
  }

  /// Exportar datos de asistencia a Excel
  Future<String> exportAttendanceToExcel({
    required List<Attendance> attendances,
    required List<User> users,
    String? fileName,
  }) async {
    final excel = Excel.createExcel();
    final sheet = excel['Reporte de Asistencia'];
    
    // Headers
    final headers = [
      'Fecha', 'Usuario', 'Legajo', 'Entrada', 'Salida', 
      'Horas Trabajadas', 'Estado', 'Ubicación', 'Notas'
    ];
    
    for (int i = 0; i < headers.length; i++) {
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: i, rowIndex: 0)).value = headers[i];
    }
    
    // Data
    for (int i = 0; i < attendances.length; i++) {
      final attendance = attendances[i];
      final user = users.firstWhere(
        (u) => u.id == attendance.userId,
        orElse: () => User(
          id: attendance.userId,
          legajo: 'N/A',
          firstName: 'Usuario',
          lastName: 'Desconocido',
          email: '',
          role: 'employee',
        ),
      );
      
      final row = i + 1;
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: row)).value = 
          '${attendance.date.day}/${attendance.date.month}/${attendance.date.year}';
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 1, rowIndex: row)).value = 
          '${user.firstName} ${user.lastName}';
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 2, rowIndex: row)).value = user.legajo;
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 3, rowIndex: row)).value = 
          attendance.checkInTime != null 
              ? '${attendance.checkInTime!.hour}:${attendance.checkInTime!.minute.toString().padLeft(2, '0')}'
              : '';
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 4, rowIndex: row)).value = 
          attendance.checkOutTime != null 
              ? '${attendance.checkOutTime!.hour}:${attendance.checkOutTime!.minute.toString().padLeft(2, '0')}'
              : '';
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 5, rowIndex: row)).value = 
          attendance.workingHours.toStringAsFixed(2);
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 6, rowIndex: row)).value = 
          attendance.displayStatus;
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 7, rowIndex: row)).value = 
          attendance.location ?? '';
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 8, rowIndex: row)).value = 
          attendance.notes ?? '';
    }
    
    final bytes = excel.encode();
    return await _saveFileBytes(
      bytes: bytes!,
      fileName: fileName ?? 'reporte_asistencia_${DateTime.now().millisecondsSinceEpoch}.xlsx',
      extension: 'xlsx',
    );
  }

  /// Exportar reporte de asistencia a PDF
  Future<String> exportAttendanceToPDF({
    required List<Attendance> attendances,
    required List<User> users,
    String? fileName,
    String? title,
  }) async {
    final pdf = pw.Document();
    
    pdf.addPage(
      pw.MultiPage(
        build: (pw.Context context) {
          return [
            pw.Header(
              level: 0,
              child: pw.Text(
                title ?? 'Reporte de Asistencia',
                style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
              ),
            ),
            pw.SizedBox(height: 20),
            pw.Text(
              'Generado el: ${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}',
              style: pw.TextStyle(fontSize: 12, color: PdfColors.grey),
            ),
            pw.SizedBox(height: 20),
            pw.Table.fromTextArray(
              headers: ['Fecha', 'Usuario', 'Entrada', 'Salida', 'Horas', 'Estado'],
              data: attendances.map((attendance) {
                final user = users.firstWhere(
                  (u) => u.id == attendance.userId,
                  orElse: () => User(
                    id: attendance.userId,
                    legajo: 'N/A',
                    firstName: 'Usuario',
                    lastName: 'Desconocido',
                    email: '',
                    role: 'employee',
                  ),
                );
                
                return [
                  '${attendance.date.day}/${attendance.date.month}/${attendance.date.year}',
                  '${user.firstName} ${user.lastName}',
                  attendance.checkInTime != null
                      ? '${attendance.checkInTime!.hour}:${attendance.checkInTime!.minute.toString().padLeft(2, '0')}'
                      : '-',
                  attendance.checkOutTime != null
                      ? '${attendance.checkOutTime!.hour}:${attendance.checkOutTime!.minute.toString().padLeft(2, '0')}'
                      : '-',
                  '${attendance.workingHours.toStringAsFixed(1)}h',
                  attendance.displayStatus,
                ];
              }).toList(),
              cellStyle: pw.TextStyle(fontSize: 10),
              headerStyle: pw.TextStyle(
                fontSize: 10,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.white,
              ),
              headerDecoration: pw.BoxDecoration(color: PdfColors.blueGrey),
              cellAlignments: {
                0: pw.Alignment.centerLeft,
                1: pw.Alignment.centerLeft,
                2: pw.Alignment.center,
                3: pw.Alignment.center,
                4: pw.Alignment.center,
                5: pw.Alignment.center,
              },
            ),
          ];
        },
      ),
    );
    
    final bytes = await pdf.save();
    return await _saveFileBytes(
      bytes: bytes,
      fileName: fileName ?? 'reporte_asistencia_${DateTime.now().millisecondsSinceEpoch}.pdf',
      extension: 'pdf',
    );
  }

  /// Crear backup completo del sistema
  Future<String> createSystemBackup({
    required List<User> users,
    required List<Attendance> attendances,
    Map<String, dynamic>? settings,
    String? fileName,
  }) async {
    final backup = {
      'version': '1.0',
      'timestamp': DateTime.now().toIso8601String(),
      'users': users.map((u) => u.toJson()).toList(),
      'attendances': attendances.map((a) => a.toJson()).toList(),
      'settings': settings ?? {},
      'metadata': {
        'totalUsers': users.length,
        'totalAttendances': attendances.length,
        'activeUsers': users.where((u) => u.isActive).length,
        'exportedBy': 'Sistema de Asistencia',
      },
    };
    
    final jsonString = json.encode(backup);
    
    return await _saveFile(
      content: jsonString,
      fileName: fileName ?? 'backup_sistema_${DateTime.now().millisecondsSinceEpoch}.json',
      extension: 'json',
    );
  }

  /// Imprimir reporte
  Future<void> printReport({
    required List<Attendance> attendances,
    required List<User> users,
    String? title,
  }) async {
    final pdf = pw.Document();
    
    pdf.addPage(
      pw.MultiPage(
        build: (pw.Context context) {
          return [
            pw.Header(
              level: 0,
              child: pw.Text(
                title ?? 'Reporte de Asistencia',
                style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
              ),
            ),
            pw.SizedBox(height: 20),
            pw.Text(
              'Generado el: ${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}',
              style: pw.TextStyle(fontSize: 12, color: PdfColors.grey),
            ),
            pw.SizedBox(height: 20),
            pw.Table.fromTextArray(
              headers: ['Fecha', 'Usuario', 'Entrada', 'Salida', 'Horas', 'Estado'],
              data: attendances.map((attendance) {
                final user = users.firstWhere(
                  (u) => u.id == attendance.userId,
                  orElse: () => User(
                    id: attendance.userId,
                    legajo: 'N/A',
                    firstName: 'Usuario',
                    lastName: 'Desconocido',
                    email: '',
                    role: 'employee',
                  ),
                );
                
                return [
                  '${attendance.date.day}/${attendance.date.month}/${attendance.date.year}',
                  '${user.firstName} ${user.lastName}',
                  attendance.checkInTime != null
                      ? '${attendance.checkInTime!.hour}:${attendance.checkInTime!.minute.toString().padLeft(2, '0')}'
                      : '-',
                  attendance.checkOutTime != null
                      ? '${attendance.checkOutTime!.hour}:${attendance.checkOutTime!.minute.toString().padLeft(2, '0')}'
                      : '-',
                  '${attendance.workingHours.toStringAsFixed(1)}h',
                  attendance.displayStatus,
                ];
              }).toList(),
              cellStyle: pw.TextStyle(fontSize: 10),
              headerStyle: pw.TextStyle(
                fontSize: 10,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.white,
              ),
              headerDecoration: pw.BoxDecoration(color: PdfColors.blueGrey),
            ),
          ];
        },
      ),
    );
    
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
    );
  }

  /// Compartir archivo
  Future<void> shareFile(String filePath) async {
    final xFile = XFile(filePath);
    await Share.shareXFiles([xFile]);
  }

  /// Guardar archivo de texto
  Future<String> _saveFile({
    required String content,
    required String fileName,
    required String extension,
  }) async {
    final directory = await _getExportDirectory();
    final file = File('${directory.path}/$fileName');
    
    await file.writeAsString(content);
    return file.path;
  }

  /// Guardar archivo binario
  Future<String> _saveFileBytes({
    required List<int> bytes,
    required String fileName,
    required String extension,
  }) async {
    final directory = await _getExportDirectory();
    final file = File('${directory.path}/$fileName');
    
    await file.writeAsBytes(bytes);
    return file.path;
  }

  /// Obtener directorio de exportación
  Future<Directory> _getExportDirectory() async {
    if (kIsWeb) {
      throw UnsupportedError('File operations not supported on web');
    }
    
    final appDir = await getApplicationDocumentsDirectory();
    final exportDir = Directory('${appDir.path}/exports');
    
    if (!await exportDir.exists()) {
      await exportDir.create(recursive: true);
    }
    
    return exportDir;
  }

  /// Obtener lista de archivos exportados
  Future<List<File>> getExportedFiles() async {
    try {
      final directory = await _getExportDirectory();
      final files = directory.listSync()
          .where((entity) => entity is File)
          .cast<File>()
          .toList();
      
      // Ordenar por fecha de modificación (más recientes primero)
      files.sort((a, b) => b.lastModifiedSync().compareTo(a.lastModifiedSync()));
      
      return files;
    } catch (e) {
      print('Error obteniendo archivos exportados: $e');
      return [];
    }
  }

  /// Eliminar archivo exportado
  Future<bool> deleteExportedFile(String filePath) async {
    try {
      final file = File(filePath);
      if (await file.exists()) {
        await file.delete();
        return true;
      }
      return false;
    } catch (e) {
      print('Error eliminando archivo: $e');
      return false;
    }
  }

  /// Limpiar archivos antiguos (más de 30 días)
  Future<void> cleanOldExports() async {
    try {
      final files = await getExportedFiles();
      final cutoffDate = DateTime.now().subtract(Duration(days: 30));
      
      for (final file in files) {
        final lastModified = file.lastModifiedSync();
        if (lastModified.isBefore(cutoffDate)) {
          await file.delete();
        }
      }
    } catch (e) {
      print('Error limpiando archivos antiguos: $e');
    }
  }
}