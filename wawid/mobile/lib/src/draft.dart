// Demande e-Visa en cours de saisie.
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'mrz.dart';
import 'passport_reader.dart';

class ApplicationDraft extends ChangeNotifier {
  Mrz? mrz;
  ChipResult? chip;
  String surname = '', given = '', dob = '', sex = 'F', nat = '', docNo = '', expiry = '', email = '', phone = '';
  String purpose = 'Tourisme', arrival = '', port = 'AIBD', address = '';
  int nights = 7;
  bool yellowFever = false, symptoms = false, consent = false;
  String countriesVisited = '', paymentMethod = 'Wave';
  String deviceId = '';

  /// Identifiant d'installation (détection des réseaux de demandes frauduleuses côté serveur).
  Future<void> loadDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString('wawid:device') ?? '';
    if (id.isEmpty) {
      final r = Random.secure();
      id = 'MOB-${List.generate(12, (_) => r.nextInt(16).toRadixString(16)).join().toUpperCase()}';
      await prefs.setString('wawid:device', id);
    }
    deviceId = id;
  }

  void update(VoidCallback f) {
    f();
    notifyListeners();
  }

  static String _title(String s) => s.toLowerCase().split(' ').map((w) => w.isEmpty ? w : w[0].toUpperCase() + w.substring(1)).join(' ');

  void apply(Mrz m) => update(() {
        mrz = m;
        chip = null;
        surname = _title(m.surname);
        given = _title(m.givenNames);
        dob = m.birthDate;
        sex = m.sex == 'M' || m.sex == 'F' ? m.sex : 'X';
        nat = m.nationality;
        docNo = m.documentNumber;
        expiry = m.expiryDate;
      });

  /// La puce et la MRZ imprimée concordent-elles ?
  bool get chipMatches {
    final c = chip, printed = mrz;
    if (c == null || printed == null) return false;
    final fromChip = Mrz.parse(c.dg1);
    return fromChip != null &&
        fromChip.documentNumber == printed.documentNumber &&
        fromChip.birthDate == printed.birthDate &&
        fromChip.expiryDate == printed.expiryDate;
  }

  bool get identityComplete =>
      [surname, given, dob, nat, docNo, expiry, email].every((v) => v.trim().isNotEmpty) && RegExp(r'^\S+@\S+\.\S+$').hasMatch(email.trim());

  void reset() => update(() {
        mrz = null;
        chip = null;
        surname = given = dob = nat = docNo = expiry = email = phone = address = arrival = countriesVisited = '';
        sex = 'F';
        purpose = 'Tourisme';
        nights = 7;
        port = 'AIBD';
        yellowFever = symptoms = consent = false;
        paymentMethod = 'Wave';
      });
}

/// Demande en cours (une seule à la fois dans l'app).
final draft = ApplicationDraft();
