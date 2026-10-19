// Lecture NFC du passeport (ICAO 9303 parties 10 et 11) avec dmrtd : PACE si la puce le propose, sinon BAC.
// Fonctionne sur iPhone 7 et plus récent, et sur les téléphones Android équipés du NFC.
import 'dart:typed_data';

import 'package:dmrtd/dmrtd.dart';

import 'mrz.dart';
import 'sod.dart';

class ChipResult {
  final String dg1; // MRZ stockée dans la puce, 2 × 44 caractères
  final Uint8List? photo; // portrait DG2 (JPEG uniquement ; le JPEG 2000 n'est pas affichable)
  final bool photoIsJpeg2000;
  final bool? integrity; // empreintes DG1/DG2 conformes au SOD (null si le SOD est illisible)
  final String protocolUsed; // PACE ou BAC

  const ChipResult({required this.dg1, this.photo, this.photoIsJpeg2000 = false, this.integrity, required this.protocolUsed});
}

typedef Progress = void Function(String message);

class PassportReader {
  final _nfc = NfcProvider();

  static Future<bool> get available async => (await NfcProvider.nfcStatus) == NfcStatus.enabled;

  Future<ChipResult> read(Mrz mrz, {required Map<String, String> msg, Progress? onProgress}) async {
    void step(String m) {
      onProgress?.call(m);
      _nfc.setIosAlertMessage(m);
    }

    try {
      await _nfc.connect(iosAlertMessage: msg['present']!, timeout: const Duration(seconds: 20));
      final passport = Passport(_nfc);
      step(msg['auth']!);
      final key = DBAKey(mrz.docField.replaceAll('<', ''), mrz.birth, mrz.expiry);
      var protocol = 'BAC';
      EfCardAccess? cardAccess;
      try {
        cardAccess = await passport.readEfCardAccess();
      } catch (_) {
        cardAccess = null; // pas de EF.CardAccess : la puce ne gère que le BAC
      }
      if (cardAccess != null) {
        try {
          await passport.startSessionPACE(DBAKey(mrz.docField.replaceAll('<', ''), mrz.birth, mrz.expiry, paceMode: true), cardAccess);
          protocol = 'PACE';
        } catch (_) {
          // Certaines puces annoncent PACE mais n'acceptent que le BAC : on réessaie après reconnexion.
          await _nfc.disconnect();
          await _nfc.connect(iosAlertMessage: msg['present']!, timeout: const Duration(seconds: 20));
          await passport.startSession(key);
        }
      } else {
        await passport.startSession(key);
      }

      step('${msg['reading']!} 20 %');
      final dg1 = await passport.readEfDG1();
      step('${msg['reading']!} 40 %');
      EfDG2? dg2;
      try {
        dg2 = await passport.readEfDG2();
      } catch (_) {
        dg2 = null;
      }
      step('${msg['reading']!} 85 %');
      bool? integrity;
      try {
        final sod = await passport.readEfSOD();
        final lds = LdsSecurityObject.fromSod(sod.toBytes());
        if (lds != null) {
          final r1 = lds.verify(1, dg1.toBytes());
          final r2 = dg2 == null ? null : lds.verify(2, dg2.toBytes());
          integrity = r1 == false || r2 == false ? false : (r1 == true ? true : null);
        }
      } catch (_) {
        integrity = null;
      }
      await _nfc.disconnect(iosAlertMessage: msg['done']!);
      final jp2 = dg2?.imageType == ImageType.jpeg2000;
      return ChipResult(
        dg1: mrzFromDg1(dg1.toBytes()) ?? '',
        photo: jp2 ? null : dg2?.imageData,
        photoIsJpeg2000: jp2,
        integrity: integrity,
        protocolUsed: protocol,
      );
    } catch (e) {
      await _nfc.disconnect(iosErrorMessage: msg['error']!);
      rethrow;
    }
  }
}
