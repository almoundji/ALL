import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../api.dart';
import '../i18n.dart';
import '../theme.dart';
import 'common.dart';

/// Suivi de la demande, réponse aux demandes d'information et QR code à présenter à la frontière.
class TrackScreen extends StatefulWidget {
  final String ref, docNo;
  const TrackScreen({super.key, this.ref = '', this.docNo = ''});
  @override
  State<TrackScreen> createState() => _TrackScreenState();
}

class _TrackScreenState extends State<TrackScreen> {
  late final _ref = TextEditingController(text: widget.ref);
  late final _doc = TextEditingController(text: widget.docNo);
  final _reply = TextEditingController();
  AppStatus? _status;
  String? _error;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.ref.isNotEmpty && widget.docNo.isNotEmpty) _load();
  }

  @override
  void dispose() {
    _ref.dispose();
    _doc.dispose();
    _reply.dispose();
    super.dispose();
  }

  Future<void> _run(Future<AppStatus> Function() f) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final s = await f();
      setState(() => _status = s);
    } catch (e) {
      setState(() => _error = errorMessage(e));
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _load() => _run(() => WawApi.status(_ref.text, _doc.text));

  @override
  Widget build(BuildContext context) {
    final s = _status;
    return Scaffold(
      appBar: AppBar(title: Text(t('trackTitle')), actions: const [LangSwitch()]),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(padding: const EdgeInsets.all(20), children: [
          Section(title: t('myApp'), children: [
            TextField(controller: _ref, textCapitalization: TextCapitalization.characters, decoration: InputDecoration(labelText: t('refField'))),
            TextField(controller: _doc, textCapitalization: TextCapitalization.characters, decoration: InputDecoration(labelText: t('docNo'))),
            ListenableBuilder(
              listenable: Listenable.merge([_ref, _doc]),
              builder: (context, _) => FilledButton(
                onPressed: _loading || _ref.text.trim().isEmpty || _doc.text.trim().isEmpty ? null : _load,
                child: Text(_loading ? '…' : t('check')),
              ),
            ),
            if (_error != null) ErrorText(_error!),
          ]),
          if (s != null) ...[
            Section(title: t('state'), children: [
              Row(children: [Expanded(child: Text(t('statusLabel'))), StatusBadge(t(s.status), statusColor(s.status))]),
              if (s.visaNo != null) InfoRow(t('evisa'), s.visaNo!),
              if (s.validUntil != null) InfoRow(t('validUntil'), s.validUntil!),
            ]),
            if (s.token != null)
              Section(title: t('showAtBorder'), children: [
                Center(
                  child: Container(
                    color: Colors.white,
                    padding: const EdgeInsets.all(12),
                    child: QrImageView(data: s.token!, size: 240, backgroundColor: Colors.white),
                  ),
                ),
                Text(t('qrHelp'), textAlign: TextAlign.center),
              ]),
            if (s.messages.isNotEmpty || s.status == 'INFO_DEMANDEE')
              Section(title: t('messages'), children: [
                for (final m in s.messages)
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${m.from} · ${m.at.length >= 16 ? m.at.substring(0, 16).replaceFirst('T', ' ') : m.at}', style: Theme.of(context).textTheme.labelSmall),
                    Text(m.text),
                  ]),
                if (s.status == 'INFO_DEMANDEE') ...[
                  TextField(controller: _reply, minLines: 2, maxLines: 5, decoration: InputDecoration(labelText: t('replyHint'))),
                  FilledButton(
                    onPressed: _loading
                        ? null
                        : () => _run(() async {
                              final r = await WawApi.reply(_ref.text, _doc.text, _reply.text.trim());
                              _reply.clear();
                              return r;
                            }),
                    child: Text(t('reply')),
                  ),
                ],
              ]),
          ],
        ]),
      ),
    );
  }
}
