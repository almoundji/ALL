// Intégrité des données de la puce (ICAO 9303 partie 10, EF.SOD).
// Le SOD est un CMS SignedData dont le contenu signé (LDSSecurityObject) liste l'empreinte de chaque groupe de données.
// On vérifie ici que les DG lus (DG1, DG2) ont bien l'empreinte inscrite dans le SOD : une puce dont les données ont été
// modifiées est détectée. La vérification de la signature du SOD par la chaîne CSCA (liste maîtresse ICAO) n'est pas
// faite sur le téléphone : elle relève du serveur.
import 'dart:typed_data';

import 'package:crypto/crypto.dart';

class Tlv {
  final int tag; // étiquette complète (ex. 0x30, 0x5F1F)
  final Uint8List value;
  final bool constructed;
  const Tlv(this.tag, this.value, this.constructed);

  List<Tlv> get children => constructed ? Der.parseAll(value) : const [];
}

class Der {
  /// Lit tous les TLV consécutifs d'un tampon.
  static List<Tlv> parseAll(Uint8List data) {
    final out = <Tlv>[];
    var i = 0;
    while (i < data.length) {
      if (data[i] == 0x00 || data[i] == 0xFF) break; // remplissage
      final r = _read(data, i);
      if (r == null) break;
      out.add(r.$1);
      i = r.$2;
    }
    return out;
  }

  static (Tlv, int)? _read(Uint8List d, int i) {
    if (i >= d.length) return null;
    final first = d[i];
    var tag = first;
    i++;
    if (first & 0x1F == 0x1F) {
      do {
        if (i >= d.length) return null;
        tag = (tag << 8) | d[i];
      } while (d[i++] & 0x80 == 0x80);
    }
    if (i >= d.length) return null;
    var len = d[i++];
    if (len & 0x80 != 0) {
      final n = len & 0x7F;
      if (n == 0 || n > 4 || i + n > d.length) return null;
      len = 0;
      for (var k = 0; k < n; k++) {
        len = (len << 8) | d[i++];
      }
    }
    if (i + len > d.length) return null;
    return (Tlv(tag, Uint8List.sublistView(d, i, i + len), first & 0x20 != 0), i + len);
  }

  static String oid(Uint8List v) {
    if (v.isEmpty) return '';
    final parts = <int>[v[0] ~/ 40, v[0] % 40];
    var acc = 0;
    for (final b in v.skip(1)) {
      acc = (acc << 7) | (b & 0x7F);
      if (b & 0x80 == 0) {
        parts.add(acc);
        acc = 0;
      }
    }
    return parts.join('.');
  }
}

const _hashOids = {
  '1.3.14.3.2.26': 'sha1',
  '2.16.840.1.101.3.4.2.4': 'sha224',
  '2.16.840.1.101.3.4.2.1': 'sha256',
  '2.16.840.1.101.3.4.2.2': 'sha384',
  '2.16.840.1.101.3.4.2.3': 'sha512',
};

class LdsSecurityObject {
  final String algorithm;
  final Map<int, Uint8List> hashes;
  const LdsSecurityObject(this.algorithm, this.hashes);

  static Digest _digest(String alg, List<int> data) => switch (alg) {
        'sha1' => sha1.convert(data),
        'sha224' => sha224.convert(data),
        'sha384' => sha384.convert(data),
        'sha512' => sha512.convert(data),
        _ => sha256.convert(data),
      };

  /// true si l'empreinte du groupe de données correspond à celle du SOD ; null si le SOD ne la contient pas.
  bool? verify(int dg, Uint8List encoded) {
    final expected = hashes[dg];
    if (expected == null) return null;
    final got = _digest(algorithm, encoded).bytes;
    if (got.length != expected.length) return false;
    for (var i = 0; i < got.length; i++) {
      if (got[i] != expected[i]) return false;
    }
    return true;
  }

  /// Extrait le LDSSecurityObject d'un EF.SOD brut (balise 0x77).
  static LdsSecurityObject? fromSod(Uint8List sod) {
    LdsSecurityObject? found;
    void walk(List<Tlv> nodes, int depth) {
      for (final n in nodes) {
        if (found != null || depth > 12) return;
        if (n.tag == 0x04) {
          final candidate = _tryLds(n.value);
          if (candidate != null) {
            found = candidate;
            return;
          }
        }
        if (n.constructed) walk(n.children, depth + 1);
      }
    }

    walk(Der.parseAll(sod), 0);
    return found;
  }

  // LDSSecurityObject ::= SEQUENCE { version INTEGER, hashAlgorithm AlgorithmIdentifier,
  //                                  dataGroupHashValues SEQUENCE OF SEQUENCE { dataGroupNumber INTEGER, hash OCTET STRING } }
  static LdsSecurityObject? _tryLds(Uint8List v) {
    final top = Der.parseAll(v);
    if (top.length != 1 || top.first.tag != 0x30) return null;
    final f = top.first.children;
    if (f.length < 3 || f[0].tag != 0x02 || f[1].tag != 0x30 || f[2].tag != 0x30) return null;
    final algId = f[1].children;
    if (algId.isEmpty || algId.first.tag != 0x06) return null;
    final alg = _hashOids[Der.oid(algId.first.value)];
    if (alg == null) return null;
    final hashes = <int, Uint8List>{};
    for (final item in f[2].children) {
      final c = item.children;
      if (c.length != 2 || c[0].tag != 0x02 || c[1].tag != 0x04) return null;
      hashes[c[0].value.fold<int>(0, (a, b) => (a << 8) | b)] = Uint8List.fromList(c[1].value);
    }
    return hashes.isEmpty ? null : LdsSecurityObject(alg, hashes);
  }
}

/// MRZ stockée dans DG1 (61 L { 5F1F L mrz }), au format 2 × 44 caractères.
String? mrzFromDg1(Uint8List dg1) {
  for (final t in Der.parseAll(dg1)) {
    for (final c in t.children) {
      if (c.tag == 0x5F1F) {
        final s = String.fromCharCodes(c.value);
        return s.length == 88 ? '${s.substring(0, 44)}\n${s.substring(44)}' : s;
      }
    }
  }
  return null;
}
