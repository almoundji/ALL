import 'dart:io';

import 'package:flutter/material.dart';

import '../api.dart';
import '../draft.dart';
import '../i18n.dart';
import '../theme.dart';
import 'common.dart';
import 'track.dart';

const methods = ['Wave', 'Orange Money', 'Free Money', 'Carte bancaire'];

/// Étape 4 : paiement (démonstration) et dépôt.
class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});
  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  bool _sending = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final r = await WawApi.submit(draft, Platform.isIOS ? 'iPhone' : 'Android');
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => DoneScreen(ref: r.ref, docNo: draft.docNo)), (route) => route.isFirst);
    } catch (e) {
      setState(() => _error = errorMessage(e));
    }
    if (mounted) setState(() => _sending = false);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(t('payment')), actions: const [LangSwitch()]),
        body: ListenableBuilder(
          listenable: draft,
          builder: (context, _) => ListView(padding: const EdgeInsets.all(20), children: [
            const StepHeader(4),
            Section(title: t('fees'), children: [
              InfoRow(t('evisa'), '50 000 FCFA'),
              RadioGroup<String>(
                groupValue: draft.paymentMethod,
                onChanged: (v) => draft.update(() => draft.paymentMethod = v ?? draft.paymentMethod),
                child: Column(children: [
                  for (final m in methods) RadioListTile<String>(contentPadding: EdgeInsets.zero, title: Text(tv(m)), value: m),
                ]),
              ),
              Text(t('demoPay'), style: Theme.of(context).textTheme.bodySmall),
            ]),
            Section(children: [
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                value: draft.consent,
                title: Text(t('consent'), style: const TextStyle(fontSize: 13.5)),
                onChanged: (v) => draft.update(() => draft.consent = v ?? false),
              ),
            ]),
            FilledButton(
              onPressed: draft.consent && !_sending ? _submit : null,
              child: Text(_sending ? t('sending') : t('payAndSubmit')),
            ),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: ErrorText(_error!)),
          ]),
        ),
      );
}

class DoneScreen extends StatelessWidget {
  final String ref, docNo;
  const DoneScreen({super.key, required this.ref, required this.docNo});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(automaticallyImplyLeading: false, title: Text(t('submitted'))),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.check_circle, size: 80, color: WawColors.good),
              const SizedBox(height: 16),
              Text(t('submitted'), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
              const SizedBox(height: 20),
              Text(t('reference'), style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
              SelectableText(ref, style: const TextStyle(fontFamily: 'monospace', fontSize: 30, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              Text(t('keepRef'), textAlign: TextAlign.center, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
              const SizedBox(height: 28),
              FilledButton(onPressed: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => TrackScreen(ref: ref, docNo: docNo))), child: Text(t('track'))),
              const SizedBox(height: 10),
              OutlinedButton(onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst), child: Text(t('home'))),
            ]),
          ),
        ),
      );
}
