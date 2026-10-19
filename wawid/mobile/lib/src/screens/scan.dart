import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

import '../draft.dart';
import '../i18n.dart';
import '../mrz.dart';
import '../theme.dart';
import 'chip.dart';
import 'common.dart';

/// Étape 1 : MRZ du passeport (caméra ou saisie).
class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});
  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final _manual = TextEditingController();

  @override
  void dispose() {
    _manual.dispose();
    super.dispose();
  }

  Future<void> _scan() async {
    final m = await push<Mrz>(context, const MrzCameraScreen());
    if (m != null) {
      draft.apply(m);
      _manual.text = m.lines.join('\n');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(t('passport')), actions: const [LangSwitch()]),
        body: ListenableBuilder(
          listenable: draft,
          builder: (context, _) {
            final m = draft.mrz;
            return ListView(padding: const EdgeInsets.all(20), children: [
              const StepHeader(1),
              Section(children: [
                Text(t('mrzHelp')),
                FilledButton.icon(icon: const Icon(Icons.photo_camera_outlined), label: Text(t('scan')), onPressed: _scan),
                TextField(
                  controller: _manual,
                  minLines: 2,
                  maxLines: 3,
                  textCapitalization: TextCapitalization.characters,
                  autocorrect: false,
                  enableSuggestions: false,
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 12.5),
                  decoration: InputDecoration(labelText: t('mrzManual'), hintText: 'P<SEN…\n…'),
                  onChanged: (v) {
                    final parsed = Mrz.parse(v);
                    if (parsed != null) draft.apply(parsed);
                  },
                ),
              ]),
              if (m != null) ...[
                Section(title: t('reading'), children: [
                  InfoRow(t('surname'), m.surname),
                  InfoRow(t('given'), m.givenNames),
                  InfoRow(t('docNo'), m.documentNumber),
                  InfoRow(t('nat'), m.nationality),
                  InfoRow(t('dob'), m.birthDate),
                  InfoRow(t('expiry'), m.expiryDate),
                  Align(alignment: Alignment.centerLeft, child: StatusBadge(m.checksValid ? t('checksOk') : t('checksBad'), m.checksValid ? WawColors.good : WawColors.critical)),
                ]),
                FilledButton.icon(
                  icon: const Icon(Icons.nfc),
                  label: Text(t('readChip')),
                  onPressed: m.checksValid ? () => push(context, const ChipScreen()) : null,
                ),
              ],
            ]);
          },
        ),
      );
}

/// Caméra : photos successives analysées par ML Kit (sur l'appareil, hors ligne) jusqu'à trouver une MRZ valide.
class MrzCameraScreen extends StatefulWidget {
  const MrzCameraScreen({super.key});
  @override
  State<MrzCameraScreen> createState() => _MrzCameraScreenState();
}

class _MrzCameraScreenState extends State<MrzCameraScreen> {
  CameraController? _cam;
  final _recognizer = TextRecognizer(script: TextRecognitionScript.latin);
  String? _error;
  bool _busy = false, _closed = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    try {
      final cams = await availableCameras();
      final back = cams.firstWhere((c) => c.lensDirection == CameraLensDirection.back, orElse: () => cams.first);
      final cam = CameraController(back, ResolutionPreset.high, enableAudio: false);
      await cam.initialize();
      try {
        await cam.setFocusMode(FocusMode.auto);
        await cam.setFlashMode(FlashMode.off);
      } catch (_) {}
      if (!mounted) {
        await cam.dispose();
        return;
      }
      setState(() => _cam = cam);
      _timer = Timer.periodic(const Duration(milliseconds: 1300), (_) => _shoot());
    } catch (_) {
      if (mounted) setState(() => _error = t('cameraDenied'));
    }
  }

  Future<void> _shoot() async {
    final cam = _cam;
    if (_busy || _closed || cam == null || !cam.value.isInitialized || cam.value.isTakingPicture) return;
    _busy = true;
    try {
      final file = await cam.takePicture();
      final text = await _recognizer.processImage(InputImage.fromFilePath(file.path));
      unawaited(File(file.path).delete().catchError((_) => File(file.path)));
      final lines = text.blocks.expand((b) => b.lines).map((l) => l.text).join('\n');
      final m = Mrz.find(lines) ?? Mrz.find(text.text);
      if (m != null && mounted && !_closed) {
        _closed = true;
        Navigator.of(context).pop(m);
      }
    } catch (_) {
      // image floue ou caméra occupée : on réessaie au prochain cycle
    } finally {
      _busy = false;
    }
  }

  @override
  void dispose() {
    _closed = true;
    _timer?.cancel();
    _cam?.dispose();
    _recognizer.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white, title: Text(t('scan'))),
        body: _error != null
            ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, style: const TextStyle(color: Colors.white), textAlign: TextAlign.center)))
            : _cam == null
                ? const Center(child: CircularProgressIndicator())
                : Stack(fit: StackFit.expand, children: [
                    Center(child: CameraPreview(_cam!)),
                    // Gabarit : bande MRZ en bas de la page photo.
                    LayoutBuilder(builder: (context, c) {
                      final w = c.maxWidth * 0.9;
                      return Center(
                        child: Container(
                          width: w,
                          height: w * 0.22,
                          decoration: BoxDecoration(border: Border.all(color: WawColors.accent, width: 3), borderRadius: BorderRadius.circular(10)),
                        ),
                      );
                    }),
                    Positioned(
                      left: 20,
                      right: 20,
                      bottom: 32,
                      child: Column(children: [
                        Text(t('scanTitle'), textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 6),
                        Text(t('scanHint'), textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70)),
                      ]),
                    ),
                  ]),
      );
}
