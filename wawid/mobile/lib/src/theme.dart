// Charte WawID : bleu nuit #14254B, bleu #1D4E89, orange #E4572E.
import 'package:flutter/material.dart';

class WawColors {
  static const ink = Color(0xFF14254B);
  static const brand = Color(0xFF1D4E89);
  static const accent = Color(0xFFE4572E);
  static const bg = Color(0xFFF3F4F7);
  static const good = Color(0xFF107E3E);
  static const warning = Color(0xFFE9730C);
  static const critical = Color(0xFFBB0000);
  static const info = Color(0xFF0A6ED1);
}

ThemeData wawTheme(Brightness b) {
  final dark = b == Brightness.dark;
  final scheme = ColorScheme.fromSeed(seedColor: WawColors.brand, brightness: b, primary: dark ? const Color(0xFF8DB4E8) : WawColors.brand, secondary: WawColors.accent);
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: dark ? const Color(0xFF0E1726) : WawColors.bg,
    appBarTheme: AppBarTheme(backgroundColor: dark ? const Color(0xFF0E1726) : Colors.white, foregroundColor: dark ? Colors.white : WawColors.ink, elevation: 0, scrolledUnderElevation: 1, centerTitle: false),
    cardTheme: CardThemeData(color: dark ? const Color(0xFF172338) : Colors.white, elevation: 0, margin: EdgeInsets.zero, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: dark ? const Color(0xFF26344D) : const Color(0xFFE2E5EB)))),
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(backgroundColor: dark ? const Color(0xFF2F6CB5) : WawColors.brand, foregroundColor: Colors.white, minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600))),
    outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)))),
    inputDecorationTheme: InputDecorationTheme(border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)), isDense: true),
  );
}

class StatusBadge extends StatelessWidget {
  final String text;
  final Color color;
  const StatusBadge(this.text, this.color, {super.key});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.circle, size: 8, color: color),
          const SizedBox(width: 6),
          Flexible(child: Text(text, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12.5))),
        ]),
      );
}

class Section extends StatelessWidget {
  final String? title;
  final List<Widget> children;
  const Section({super.key, this.title, required this.children});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (title != null)
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 8),
              child: Text(title!.toUpperCase(), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: Theme.of(context).colorScheme.onSurfaceVariant)),
            ),
          Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: _spaced(children)))),
        ]),
      );

  static List<Widget> _spaced(List<Widget> c) => [for (var i = 0; i < c.length; i++) ...[if (i > 0) const SizedBox(height: 12), c[i]]];
}

class InfoRow extends StatelessWidget {
  final String label, value;
  const InfoRow(this.label, this.value, {super.key});

  @override
  Widget build(BuildContext context) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Text(label, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))),
        const SizedBox(width: 12),
        Flexible(child: Text(value, textAlign: TextAlign.end, style: const TextStyle(fontWeight: FontWeight.w600))),
      ]);
}
