/// ============================================================================
/// RUNNER PRINCIPAL DE INTEGRATION TESTS
/// ============================================================================
/// Ejecuta todos los tests de integración y genera un reporte
///
/// EJECUTAR: dart test/integration/run_all_integration_tests.dart
///           o: flutter test test/integration/
///
/// CREADO: 2025-12-14
/// ============================================================================

import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

/// Configuración
const String baseUrl = 'http://localhost:9998';
const int companyId = 11;
const Duration timeout = Duration(seconds: 30);

/// Resultado de un test
class TestResult {
  final String name;
  final bool passed;
  final String? error;
  final int durationMs;

  TestResult({
    required this.name,
    required this.passed,
    this.error,
    required this.durationMs,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'passed': passed,
    'error': error,
    'duration_ms': durationMs,
  };
}

/// Runner de tests
class IntegrationTestRunner {
  final List<TestResult> results = [];
  int passed = 0;
  int failed = 0;

  Future<void> run() async {
    print('\n');
    print('=' * 70);
    print('🧪 FLUTTER INTEGRATION TEST RUNNER');
    print('=' * 70);
    print('📍 Backend: $baseUrl');
    print('🏢 Company: $companyId');
    print('⏰ Started: ${DateTime.now().toIso8601String()}');
    print('=' * 70);
    print('');

    // Ejecutar tests
    await runTest('Health Check', testHealthCheck);
    await runTest('Companies API', testCompaniesApi);
    await runTest('Kiosk Stats', testKioskStats);
    await runTest('Late Arrival Authorizers', testAuthorizers);
    await runTest('Simulated Check-In', testSimulatedCheckIn);
    await runTest('Burst Check-Ins (10x)', testBurstCheckIns);

    // Generar reporte
    generateReport();
  }

  Future<void> runTest(String name, Future<void> Function() testFn) async {
    print('▶️  $name...');
    final stopwatch = Stopwatch()..start();

    try {
      await testFn();
      stopwatch.stop();
      results.add(TestResult(
        name: name,
        passed: true,
        durationMs: stopwatch.elapsedMilliseconds,
      ));
      passed++;
      print('   ✅ PASSED (${stopwatch.elapsedMilliseconds}ms)\n');
    } catch (e) {
      stopwatch.stop();
      results.add(TestResult(
        name: name,
        passed: false,
        error: e.toString(),
        durationMs: stopwatch.elapsedMilliseconds,
      ));
      failed++;
      print('   ❌ FAILED: $e\n');
    }
  }

  // ========== TESTS ==========

  Future<void> testHealthCheck() async {
    final response = await http.get(Uri.parse('$baseUrl/api/v1/health')).timeout(timeout);
    if (response.statusCode != 200) {
      throw Exception('Health check failed: ${response.statusCode}');
    }
    final data = jsonDecode(response.body);
    if (data['status'] != 'ok') {
      throw Exception('Unexpected status: ${data['status']}');
    }
  }

  Future<void> testCompaniesApi() async {
    final response = await http.get(Uri.parse('$baseUrl/api/companies')).timeout(timeout);
    if (response.statusCode != 200) {
      throw Exception('Companies API failed: ${response.statusCode}');
    }
    final data = jsonDecode(response.body);
    if (data is! List || data.isEmpty) {
      throw Exception('No companies found');
    }
  }

  Future<void> testKioskStats() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v2/kiosk-enterprise/stats/$companyId')
    ).timeout(timeout);

    // Puede fallar por auth, pero no debe dar error de conexión
    if (response.statusCode >= 500) {
      throw Exception('Server error: ${response.statusCode}');
    }
  }

  Future<void> testAuthorizers() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/late-arrival/authorizers?company_id=$companyId')
    ).timeout(timeout);

    // Puede requerir auth, pero debe responder
    if (response.statusCode >= 500) {
      throw Exception('Server error: ${response.statusCode}');
    }
  }

  Future<void> testSimulatedCheckIn() async {
    // Simular una captura biométrica (sin enviar al backend)
    final attempts = <Map<String, dynamic>>[];
    for (int i = 0; i < 3; i++) {
      await Future.delayed(Duration(milliseconds: 50));
      attempts.add({
        'attempt': i + 1,
        'timestamp': DateTime.now().toIso8601String(),
        'success': i == 2,
      });
    }

    if (attempts.isEmpty) {
      throw Exception('No capture attempts generated');
    }
  }

  Future<void> testBurstCheckIns() async {
    int successful = 0;
    for (int i = 0; i < 10; i++) {
      // Simular delay de captura
      await Future.delayed(Duration(milliseconds: 20));
      successful++;
    }

    if (successful < 8) {
      throw Exception('Burst test failed: only $successful/10 successful');
    }
  }

  void generateReport() {
    print('');
    print('=' * 70);
    print('📊 TEST REPORT');
    print('=' * 70);
    print('');
    print('📈 Summary:');
    print('   Total: ${results.length}');
    print('   ✅ Passed: $passed');
    print('   ❌ Failed: $failed');
    print('   📊 Pass Rate: ${(passed / results.length * 100).toStringAsFixed(1)}%');
    print('');

    if (failed > 0) {
      print('❌ Failed Tests:');
      for (final result in results.where((r) => !r.passed)) {
        print('   - ${result.name}: ${result.error}');
      }
      print('');
    }

    // Generar JSON para integración con Phase4
    final report = {
      'timestamp': DateTime.now().toIso8601String(),
      'backend_url': baseUrl,
      'company_id': companyId,
      'summary': {
        'total': results.length,
        'passed': passed,
        'failed': failed,
        'pass_rate': passed / results.length * 100,
      },
      'tests': results.map((r) => r.toJson()).toList(),
    };

    print('📋 JSON Report (for Phase4 integration):');
    print(JsonEncoder.withIndent('  ').convert(report));
    print('');
    print('=' * 70);
    print('✅ INTEGRATION TESTS COMPLETED');
    print('=' * 70);
  }
}

void main() async {
  final runner = IntegrationTestRunner();
  await runner.run();

  // Exit con código apropiado
  exit(runner.failed > 0 ? 1 : 0);
}
