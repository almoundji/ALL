import 'package:flutter/material.dart';

import '../i18n.dart';
import '../theme.dart';

/// Sélecteur FR | EN.
class LangSwitch extends StatelessWidget {
  const LangSwitch({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    Widget seg(String l) {
      final on = lang.value == l;
      return Semantics(
        button: true,
        selected: on,
        child: InkWell(
          onTap: on ? null : () => setLang(l),
          child: Container(
            width: 38,
            height: 30,
            alignment: Alignment.center,
            color: on ? WawColors.ink : Colors.transparent,
            child: Text(l.toUpperCase(), style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: on ? Colors.white : scheme.onSurfaceVariant)),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(right: 12),
      child: Center(
        child: Container(
          decoration: BoxDecoration(border: Border.all(color: scheme.outlineVariant), borderRadius: BorderRadius.circular(8)),
          clipBehavior: Clip.antiAlias,
          child: Row(mainAxisSize: MainAxisSize.min, children: [seg('fr'), seg('en')]),
        ),
      ),
    );
  }
}

/// En-tête d'étape « Étape n sur 4 » avec barre de progression.
class StepHeader extends StatelessWidget {
  final int step;
  const StepHeader(this.step, {super.key});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(t('step', {'n': step}), style: const TextStyle(fontWeight: FontWeight.w700, color: WawColors.accent)),
          const SizedBox(height: 8),
          ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(value: step / 4, minHeight: 6, color: WawColors.accent, backgroundColor: WawColors.accent.withValues(alpha: 0.15))),
        ]),
      );
}

class ErrorText extends StatelessWidget {
  final String text;
  const ErrorText(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Text(text, style: const TextStyle(color: WawColors.critical, fontSize: 13));
}

String errorMessage(Object e) {
  final s = e.toString();
  return s == 'network' ? t('network') : s;
}

Color statusColor(String s) => switch (s) {
      'APPROUVEE' => WawColors.good,
      'REFUSEE' => WawColors.critical,
      'INFO_DEMANDEE' => WawColors.warning,
      'EN_EXAMEN' => WawColors.warning,
      _ => WawColors.info,
    };

Future<T?> push<T>(BuildContext context, Widget page) => Navigator.of(context).push<T>(MaterialPageRoute(builder: (_) => page));
