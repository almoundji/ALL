// Client de l'API publique WawID (mêmes routes que le portail web et l'app iOS).
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'draft.dart';

const apiBase = String.fromEnvironment('WAWID_API', defaultValue: 'https://wawid-waw-telecom.netlify.app');

class ApiError implements Exception {
  final String message;
  ApiError(this.message);
  @override
  String toString() => message;
}

class Submitted {
  final String ref, status, receipt;
  final int amount;
  Submitted.fromJson(Map<String, dynamic> j)
      : ref = j['ref'] as String,
        status = j['status'] as String,
        receipt = j['receipt'] as String? ?? '',
        amount = (j['amount'] as num?)?.toInt() ?? 0;
}

class AppMessage {
  final String from, at, text;
  AppMessage.fromJson(Map<String, dynamic> j)
      : from = j['from'] as String? ?? '',
        at = j['at'] as String? ?? '',
        text = j['text'] as String? ?? '';
}

class AppStatus {
  final String ref, status;
  final String? visaNo, validUntil, token;
  final List<AppMessage> messages;
  AppStatus.fromJson(Map<String, dynamic> j)
      : ref = j['ref'] as String,
        status = j['status'] as String,
        visaNo = j['visaNo'] as String?,
        validUntil = j['validUntil'] as String?,
        token = j['token'] as String?,
        messages = ((j['messages'] as List?) ?? []).map((m) => AppMessage.fromJson(m as Map<String, dynamic>)).toList();
}

class WawApi {
  static Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body) async {
    final http.Response res;
    try {
      res = await http
          .post(Uri.parse('$apiBase/$path'), headers: {'content-type': 'application/json'}, body: jsonEncode(body))
          .timeout(const Duration(seconds: 30));
    } catch (_) {
      throw ApiError('network');
    }
    Map<String, dynamic> data;
    try {
      data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    } catch (_) {
      data = {};
    }
    if (res.statusCode < 200 || res.statusCode >= 300) throw ApiError(data['error'] as String? ?? 'HTTP ${res.statusCode}');
    return data;
  }

  static Future<Submitted> submit(ApplicationDraft d, String channel) async {
    final body = <String, dynamic>{
      'consent': d.consent,
      'channel': channel,
      'paymentMethod': d.paymentMethod,
      'deviceId': d.deviceId,
      'applicant': {
        'surname': d.surname, 'given': d.given, 'dob': d.dob, 'sex': d.sex, 'nat': d.nat,
        'docNo': d.docNo, 'expiry': d.expiry, 'email': d.email, 'phone': d.phone,
      },
      'trip': {'purpose': d.purpose, 'arrival': d.arrival, 'nights': d.nights, 'port': d.port, 'address': d.address},
      'health': {'yellowFever': d.yellowFever, 'symptoms': d.symptoms, 'countriesVisited': d.countriesVisited},
    };
    final chip = d.chip;
    if (chip != null) {
      body['chip'] = {
        'read': true,
        'dg1': chip.dg1,
        // Échec d'intégrité signalé ; une intégrité conforme n'est pas une authentification passive complète (signature CSCA
        // non vérifiée sur le téléphone), donc on n'affirme rien dans ce cas.
        if (chip.integrity == false) 'passiveAuth': false,
        'protocol': chip.protocolUsed,
        'source': '$channel NFC',
      };
    }
    return Submitted.fromJson(await _post('api/public/evisa', body));
  }

  static Future<AppStatus> status(String ref, String docNo) async =>
      AppStatus.fromJson(await _post('api/public/evisa/status', {'ref': ref.trim().toUpperCase(), 'docNo': docNo.trim().toUpperCase()}));

  static Future<AppStatus> reply(String ref, String docNo, String text) async =>
      AppStatus.fromJson(await _post('api/public/evisa/reply', {'ref': ref.trim().toUpperCase(), 'docNo': docNo.trim().toUpperCase(), 'text': text}));
}
