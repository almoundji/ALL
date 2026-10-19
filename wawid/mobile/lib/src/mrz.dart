// Lecture MRZ ICAO 9303 (TD3, passeport) — même logique que public/shared/engine.js et l'app iOS.

class Mrz {
  final List<String> lines;
  final String surname, givenNames, documentNumber, nationality, issuer, sex;
  final String birthDate, expiryDate; // AAAA-MM-JJ
  final bool checksValid;

  const Mrz._(this.lines, this.surname, this.givenNames, this.documentNumber, this.nationality, this.issuer, this.sex,
      this.birthDate, this.expiryDate, this.checksValid);

  /// Champs de la clé d'accès BAC/PACE (n° de document, naissance, expiration).
  String get docField => lines[1].substring(0, 9);
  DateTime get birth => _asDate(lines[1].substring(13, 19), birth: true);
  DateTime get expiry => _asDate(lines[1].substring(21, 27), birth: false);

  static int checkDigit(String s) {
    const weights = [7, 3, 1];
    var total = 0;
    for (var i = 0; i < s.length; i++) {
      final c = s.codeUnitAt(i);
      int v;
      if (c >= 48 && c <= 57) {
        v = c - 48;
      } else if (c >= 65 && c <= 90) {
        v = c - 55;
      } else {
        v = 0; // « < »
      }
      total += v * weights[i % 3];
    }
    return total % 10;
  }

  static bool _check(String data, String digit) => digit == '<' ? data.replaceAll('<', '').isEmpty : checkDigit(data).toString() == digit;

  /// Cherche deux lignes TD3 valides dans un texte reconnu par la caméra.
  static Mrz? find(String text) {
    final candidates = text
        .toUpperCase()
        .replaceAll(' ', '')
        .replaceAll('«', '<')
        .split(RegExp(r'\r?\n'))
        .map((l) => l.trim())
        .where((l) => l.length == 44 && RegExp(r'^[A-Z0-9<]+$').hasMatch(l))
        .toList();
    for (var i = 0; i + 1 < candidates.length; i++) {
      if (!candidates[i].startsWith('P')) continue;
      final m = parse('${candidates[i]}\n${candidates[i + 1]}');
      if (m != null && m.checksValid) return m;
    }
    return null;
  }

  static Mrz? parse(String text) {
    final lines = text.toUpperCase().split(RegExp(r'\r?\n')).map((l) => l.replaceAll(' ', '').trim()).where((l) => l.isNotEmpty).toList();
    if (lines.length != 2 || lines.any((l) => l.length != 44) || !lines[0].startsWith('P')) return null;
    final a = lines[0], b = lines[1];
    final names = a.substring(5).split('<<');
    final surname = names.first.replaceAll('<', ' ').trim();
    final given = names.skip(1).join(' ').replaceAll('<', ' ').split(' ').where((s) => s.isNotEmpty).join(' ');
    final checks = [
      _check(b.substring(0, 9), b[9]),
      _check(b.substring(13, 19), b[19]),
      _check(b.substring(21, 27), b[27]),
      checkDigit(b.substring(0, 10) + b.substring(13, 20) + b.substring(21, 43)).toString() == b[43],
    ];
    return Mrz._(
      lines,
      surname,
      given,
      b.substring(0, 9).replaceAll('<', ''),
      b.substring(10, 13).replaceAll('<', ''),
      a.substring(2, 5).replaceAll('<', ''),
      b[20],
      _iso(b.substring(13, 19), birth: true),
      _iso(b.substring(21, 27), birth: false),
      checks.every((c) => c),
    );
  }

  static DateTime _asDate(String s, {required bool birth}) {
    final yy = int.tryParse(s.substring(0, 2)) ?? 0;
    final current = DateTime.now().year % 100;
    final century = birth && yy > current ? 1900 : 2000;
    return DateTime.utc(century + yy, int.tryParse(s.substring(2, 4)) ?? 1, int.tryParse(s.substring(4, 6)) ?? 1);
  }

  static String _iso(String s, {required bool birth}) {
    if (!RegExp(r'^\d{6}$').hasMatch(s)) return '';
    final d = _asDate(s, birth: birth);
    return '${d.year.toString().padLeft(4, '0')}-${s.substring(2, 4)}-${s.substring(4, 6)}';
  }
}
