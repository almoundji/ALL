import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'src/draft.dart';
import 'src/i18n.dart';
import 'src/screens/home.dart';
import 'src/theme.dart';


Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initLang();
  await draft.loadDeviceId();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  runApp(const WawIdApp());
}

class WawIdApp extends StatelessWidget {
  const WawIdApp({super.key});

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<String>(
        valueListenable: lang,
        builder: (context, l, _) => MaterialApp(
          title: 'WawID e-Visa',
          debugShowCheckedModeBanner: false,
          locale: Locale(l),
          supportedLocales: const [Locale('fr'), Locale('en')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          theme: wawTheme(Brightness.light),
          darkTheme: wawTheme(Brightness.dark),
          home: const HomeScreen(),
        ),
      );
}
