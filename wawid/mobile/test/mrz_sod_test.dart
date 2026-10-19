import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wawid_visa/src/mrz.dart';
import 'package:wawid_visa/src/sod.dart';

// Spécimen ICAO 9303.
const l1 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
const l2 = 'L898902C36UTO7408122F1204159ZE184226B<<<<<10';

Uint8List tlv(int tag, List<int> v) {
  final len = v.length < 128 ? [v.length] : (v.length < 256 ? [0x81, v.length] : [0x82, v.length >> 8, v.length & 0xFF]);
  final t = tag > 0xFF ? [tag >> 8, tag & 0xFF] : [tag];
  return Uint8List.fromList([...t, ...len, ...v]);
}

void main() {
  test('MRZ TD3 : champs et chiffres de contrôle', () {
    final m = Mrz.parse('$l1\n$l2')!;
    expect(m.surname, 'ERIKSSON');
    expect(m.givenNames, 'ANNA MARIA');
    expect(m.documentNumber, 'L898902C3');
    expect(m.nationality, 'UTO');
    expect(m.birthDate, '1974-08-12');
    expect(m.expiryDate, '2012-04-15');
    expect(m.sex, 'F');
    expect(m.checksValid, isTrue);
    expect(m.docField, 'L898902C3');
  });

  test('MRZ altérée détectée', () {
    final m = Mrz.parse('$l1\n${l2.replaceFirst('7408122', '7408132')}')!;
    expect(m.checksValid, isFalse);
  });

  test('MRZ retrouvée dans un texte OCR bruité', () {
    final ocr = 'PASSPORT\nREPUBLIC OF UTOPIA\n${l1.replaceAll('<', ' <').replaceFirst(' <', '<')}\n$l2\n';
    expect(Mrz.find(ocr)?.documentNumber, 'L898902C3');
    expect(Mrz.find('rien'), isNull);
  });

  test('SOD : empreintes DG1 vérifiées, altération détectée', () {
    final dg1 = tlv(0x61, tlv(0x5F1F, ('$l1$l2').codeUnits));
    final dg2 = tlv(0x75, [1, 2, 3, 4]);
    final sha256Oid = [0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01];
    final lds = tlv(0x30, [
      ...tlv(0x02, [0]),
      ...tlv(0x30, tlv(0x06, sha256Oid)),
      ...tlv(0x30, [
        ...tlv(0x30, [...tlv(0x02, [1]), ...tlv(0x04, sha256.convert(dg1).bytes)]),
        ...tlv(0x30, [...tlv(0x02, [2]), ...tlv(0x04, sha256.convert(dg2).bytes)]),
      ]),
    ]);
    // EF.SOD (0x77) > SignedData simplifié > encapContentInfo > [0] > OCTET STRING(LDSSecurityObject)
    final sod = tlv(0x77, tlv(0x30, [...tlv(0x06, [0x2A]), ...tlv(0xA0, tlv(0x30, [...tlv(0x02, [3]), ...tlv(0x30, [...tlv(0x06, [0x67]), ...tlv(0xA0, tlv(0x04, lds))])]))]));
    final parsed = LdsSecurityObject.fromSod(sod)!;
    expect(parsed.algorithm, 'sha256');
    expect(parsed.verify(1, dg1), isTrue);
    expect(parsed.verify(2, dg2), isTrue);
    final forged = Uint8List.fromList(dg1)..[10] ^= 1;
    expect(parsed.verify(1, forged), isFalse);
    expect(parsed.verify(3, dg1), isNull);
    expect(mrzFromDg1(dg1), '$l1\n$l2');
  });
}
