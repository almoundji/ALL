import 'package:flutter/material.dart';

import '../draft.dart';
import '../i18n.dart';
import '../theme.dart';
import 'common.dart';
import 'scan.dart';
import 'track.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final ink = dark ? Colors.white : WawColors.ink;
    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.asset('assets/logo.png', width: 32, height: 32)),
          const SizedBox(width: 10),
          Text.rich(TextSpan(children: [
            TextSpan(text: 'Waw', style: TextStyle(fontWeight: FontWeight.w800, color: ink)),
            const TextSpan(text: 'ID', style: TextStyle(fontWeight: FontWeight.w800, color: WawColors.accent)),
          ])),
        ]),
        actions: const [LangSwitch()],
      ),
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(20), children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(color: WawColors.ink, borderRadius: BorderRadius.circular(20)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.bolt, size: 16, color: WawColors.accent),
                const SizedBox(width: 6),
                Flexible(child: Text(t('tagline'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12, letterSpacing: 0.5))),
              ]),
            ),
          ),
          const SizedBox(height: 18),
          Text.rich(
            TextSpan(style: TextStyle(fontSize: 36, height: 1.1, fontWeight: FontWeight.w800, color: ink), children: [
              TextSpan(text: '${t('hero1')}\n'),
              TextSpan(text: t('hero2'), style: const TextStyle(color: WawColors.accent)),
              TextSpan(text: t('hero3')),
            ]),
          ),
          const SizedBox(height: 12),
          Text(t('heroSub'), style: TextStyle(fontSize: 16, color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 24),
          FilledButton.icon(
            icon: const Icon(Icons.document_scanner_outlined),
            label: Text(t('new')),
            onPressed: () {
              draft.reset();
              push(context, const ScanScreen());
            },
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(icon: const Icon(Icons.search), label: Text(t('track')), onPressed: () => push(context, const TrackScreen())),
          const SizedBox(height: 24),
          Section(title: t('need'), children: [
            _need(Icons.badge_outlined, t('need1')),
            _need(Icons.nfc, t('need2')),
            _need(Icons.payments_outlined, t('need3')),
          ]),
        ]),
      ),
    );
  }

  Widget _need(IconData i, String s) => Row(children: [Icon(i, color: WawColors.brand), const SizedBox(width: 12), Expanded(child: Text(s))]);
}
