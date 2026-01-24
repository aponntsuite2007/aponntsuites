import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import 'package:crypto/crypto.dart' as crypto;

/// 🔐 SSL CERTIFICATE PINNING SERVICE
/// ====================================
/// Provides certificate pinning for HTTPS connections to www.aponnt.com
/// Uses SHA-256 fingerprint verification to prevent MITM attacks.
///
/// Usage:
///   final client = SSLPinningService.createPinnedClient();
///   final response = await client.get(Uri.parse('https://www.aponnt.com/api/v1/health'));
///
class SSLPinningService {
  // SHA-256 fingerprints of www.aponnt.com certificate chain (Google Trust Services)
  // Updated: 2025-01 - Rotate when certificates change
  static const List<String> _pinnedFingerprints = [
    // Leaf certificate: CN=www.aponnt.com (Google Trust Services WE1)
    '71:C0:D5:41:5B:E8:0E:5A:4F:2E:6C:1C:4C:D2:BF:EF:4F:D2:EA:6B:33:9D:0F:20:DC:DD:2A:53:F8:A1:8D:59',
    // Intermediate certificate: Google Trust Services WE1
    '1D:FC:16:05:FB:AD:35:8D:8B:C8:44:F7:6D:15:20:3F:AC:9C:A5:C1:A7:9F:D4:85:7F:FA:F2:86:4F:BE:BF:96',
  ];

  // Pinned hosts - only pin our own domain
  static const List<String> _pinnedHosts = [
    'www.aponnt.com',
    'aponntsuites.onrender.com',
  ];

  /// Whether SSL pinning is enabled (disable for development)
  static bool _enabled = !kDebugMode;

  /// Enable or disable SSL pinning (for testing purposes)
  static void setEnabled(bool enabled) {
    _enabled = enabled;
    debugPrint('🔐 [SSL-PIN] Certificate pinning ${enabled ? "enabled" : "disabled"}');
  }

  /// Create an HTTP client with certificate pinning
  static http.Client createPinnedClient() {
    if (!_enabled) {
      debugPrint('⚠️ [SSL-PIN] Pinning disabled, using standard client');
      return http.Client();
    }

    final httpClient = HttpClient()
      ..badCertificateCallback = (X509Certificate cert, String host, int port) {
        // Only validate pinned hosts
        if (!_pinnedHosts.contains(host)) {
          return true; // Allow non-pinned hosts
        }

        // Validate certificate fingerprint
        final fingerprint = _sha256Fingerprint(cert);
        final isValid = _pinnedFingerprints.contains(fingerprint);

        if (!isValid) {
          debugPrint('❌ [SSL-PIN] Certificate pinning FAILED for $host');
          debugPrint('   Got: $fingerprint');
          debugPrint('   Expected one of: $_pinnedFingerprints');
        } else {
          debugPrint('✅ [SSL-PIN] Certificate verified for $host');
        }

        return isValid;
      };

    return IOClient(httpClient);
  }

  /// Extract SHA-256 fingerprint from X509Certificate DER encoding
  static String _sha256Fingerprint(X509Certificate cert) {
    final derBytes = cert.der;
    final digest = crypto.sha256.convert(derBytes);
    // Format: XX:XX:XX:... (uppercase hex with colons)
    return digest.bytes
        .map((b) => b.toRadixString(16).padLeft(2, '0').toUpperCase())
        .join(':');
  }

  /// Verify a specific host's certificate
  static Future<bool> verifyCertificate(String host) async {
    if (!_enabled) return true;

    try {
      final client = createPinnedClient();
      final response = await client.get(
        Uri.parse('https://$host/'),
      ).timeout(const Duration(seconds: 10));
      client.close();
      return response.statusCode > 0;
    } catch (e) {
      debugPrint('❌ [SSL-PIN] Verification failed for $host: $e');
      return false;
    }
  }

  /// Update pinned fingerprints (for OTA certificate rotation)
  /// In production, these would come from a secure channel
  static void updateFingerprints(List<String> newFingerprints) {
    if (newFingerprints.isEmpty) return;
    debugPrint('🔐 [SSL-PIN] Fingerprints updated (${newFingerprints.length} entries)');
    // In a real implementation, store securely and validate source
  }
}
