import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wawid_visa/main.dart';
import 'package:wawid_visa/src/draft.dart';
import 'package:wawid_visa/src/i18n.dart';
import 'package:wawid_visa/src/mrz.dart';
import 'package:wawid_visa/src/screens/details.dart';
import 'package:wawid_visa/src/screens/payment.dart';
import 'package:wawid_visa/src/screens/scan.dart';
import 'package:wawid_visa/src/screens/track.dart';

Widget host(Widget w) => MaterialApp(home: w);

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  for (final l in ['fr', 'en']) {
    testWidgets('écrans sans erreur de mise en page ($l)', (tester) async {
      lang.value = l;
      tester.view.physicalSize = const Size(1080, 2340);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(const WawIdApp());
      expect(tester.takeException(), isNull, reason: 'HomeScreen');
      expect(find.text(t('new')), findsOneWidget);
      await tester.tap(find.text('EN' == l.toUpperCase() ? 'FR' : 'EN'));
      await tester.pump();
      lang.value = l;
      await tester.pump();

      draft.apply(Mrz.parse('P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10')!);
      for (final screen in [const ScanScreen(), const DetailsScreen(), const PaymentScreen(), const TrackScreen(), const DoneScreen(ref: 'EV1234567', docNo: 'L898902C3')]) {
        await tester.pumpWidget(host(screen));
        await tester.pump();
        expect(tester.takeException(), isNull, reason: screen.runtimeType.toString());
      }
      expect(find.text('EV1234567'), findsOneWidget);
    });
  }
}
