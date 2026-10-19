import 'dart:io';

import 'package:flutter/material.dart';

import '../draft.dart';
import '../i18n.dart';
import '../passport_reader.dart';
import '../theme.dart';
import 'common.dart';
import 'details.dart';

/// Étape 2 : lecture de la puce NFC.
class ChipScreen extends StatefulWidget {
  const ChipScreen({super.key});
  @override
  State<ChipScreen> createState() => _ChipScreenState();
}

class _ChipScreenState extends State<ChipScreen> {
  final _reader = PassportReader();
  bool _reading = false;
  String? _error, _progress;

  Future<void> _read() async {
    final m = draft.mrz;
    if (m == null) return;
    setState(() {
      _reading = true;
      _error = null;
      _progress = t('nfcPresent');
    });
    try {
      if (!await PassportReader.available) throw Exception('nfc-off');
      final chip = await _reader.read(m,
          msg: {'present': t('nfcPresent'), 'auth': t('nfcAuth'), 'reading': t('nfcReading'), 'done': t('nfcDone'), 'error': t('nfcError')},
          onProgress: (s) => mounted ? setState(() => _progress = s) : null);
      draft.update(() => draft.chip = chip);
    } catch (e) {
      final s = e.toString();
      _error = s.contains('nfc-off') ? t('nfcOff') : t('nfcFailed', {'e': s.replaceFirst('Exception: ', '').split('\n').first});
    }
    if (mounted) setState(() => _reading = false);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(t('chip')), actions: const [LangSwitch()]),
        body: ListenableBuilder(
          listenable: draft,
          builder: (context, _) {
            final chip = draft.chip;
            return ListView(padding: const EdgeInsets.all(20), children: [
              const StepHeader(2),
              Section(children: [
                Row(children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(color: WawColors.brand.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14)),
                    child: const Icon(Icons.nfc, color: WawColors.brand, size: 30),
                  ),
                  const SizedBox(width: 14),
                  Expanded(child: Text(Platform.isIOS ? t('chipHelpIos') : t('chipHelpAndroid'))),
                ]),
                FilledButton.icon(
                  icon: _reading ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.wifi_tethering),
                  label: Text(_reading ? t('readingNfc') : t('readNfc')),
                  onPressed: _reading ? null : _read,
                ),
                if (_reading && _progress != null && !Platform.isIOS) Text(_progress!, textAlign: TextAlign.center),
                if (_error != null) ErrorText(_error!),
              ]),
              if (chip != null)
                Section(title: t('result'), children: [
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    if (chip.photo != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.memory(chip.photo!, width: 84, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox(width: 84, height: 100, child: Icon(Icons.person, size: 48))),
                      ),
                    if (chip.photo != null) const SizedBox(width: 14),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        StatusBadge(
                          chip.integrity == true ? t('integrityOk') : chip.integrity == false ? t('integrityBad') : t('integrityNa'),
                          chip.integrity == true ? WawColors.good : chip.integrity == false ? WawColors.critical : WawColors.warning,
                        ),
                        const SizedBox(height: 8),
                        StatusBadge(draft.chipMatches ? t('chipMatch') : t('chipMismatch'), draft.chipMatches ? WawColors.good : WawColors.critical),
                        const SizedBox(height: 8),
                        Text(chip.protocolUsed, style: Theme.of(context).textTheme.bodySmall),
                        if (chip.photoIsJpeg2000) Text(t('jp2'), style: Theme.of(context).textTheme.bodySmall),
                      ]),
                    ),
                  ]),
                ]),
              FilledButton(onPressed: _reading ? null : () => push(context, const DetailsScreen()), child: Text(t('continue'))),
              if (chip == null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(t('skipChip'), style: Theme.of(context).textTheme.bodySmall)),
            ]);
          },
        ),
      );
}
