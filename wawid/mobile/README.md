# WawID e-Visa — application mobile (Flutter, iPhone et Android)

Application voyageur : demande d'e-Visa pour le Sénégal avec lecture de la MRZ à la caméra et de la puce du passeport en NFC,
paiement (démonstration), suivi de la demande et QR code à présenter à la frontière. Interface en français et en anglais.
Elle utilise l'API publique WawID (`/api/public/evisa…`), comme le portail web.

| Étape | Technique |
| --- | --- |
| 1. Passeport | Caméra + Google ML Kit (reconnaissance de texte sur l'appareil, hors ligne), contrôle des chiffres ICAO 9303 |
| 2. Puce NFC | dmrtd (ZeroPass) : PACE ou BAC, DG1 (MRZ), DG2 (photo), EF.SOD : empreintes des DG vérifiées |
| 3. Séjour | Coordonnées, voyage, santé |
| 4. Paiement | Wave / Orange Money / Free Money / carte (démonstration) puis dépôt |
| Suivi | Statut, messages, réponse aux demandes d'information, QR code signé une fois l'e-Visa approuvé |

**Authentification de la puce.** Le téléphone vérifie que DG1 et DG2 ont l'empreinte inscrite dans le SOD : une puce dont les
données ont été modifiées est signalée (« Données de la puce altérées ») et le serveur lève le facteur de risque PUCE_PA.
La vérification de la signature du SOD par les certificats CSCA (liste maîtresse ICAO) n'est pas faite sur le téléphone.

## Prérequis

- Flutter 3.47 (Dart 3.x) ; Android SDK 36 ; Xcode 16 et CocoaPods pour iOS.
- Téléphone : iPhone 7 ou plus récent (iOS 15.5+), ou Android 7+ (API 24) avec NFC. La lecture NFC ne fonctionne pas en simulateur.

## Développement

```bash
cd wawid/mobile
flutter pub get
flutter test                 # MRZ et intégrité du SOD
flutter run                  # téléphone branché en USB
flutter run --dart-define=WAWID_API=http://192.168.1.20:8888   # API locale (npm run dev)
```

## Compiler

```bash
flutter build apk --release        # APK à installer directement (signé avec la clé de test sans key.properties)
flutter build appbundle --release  # AAB pour Google Play (exige une clé de publication)
flutter build ipa                  # iOS, sur un Mac avec le compte Apple Developer
```

Clé de publication Android : créer `android/key.properties` (non versionné) :

```
storeFile=/chemin/upload.jks
storePassword=…
keyAlias=upload
keyPassword=…
```

## Distribution de test

Le workflow GitHub `.github/workflows/wawid-mobile.yml` s'exécute à chaque modification de `wawid/mobile/` :

- **Android** : APK et AAB en artefacts du run (onglet Actions → run → Artifacts). L'APK s'installe directement sur un téléphone
  (autoriser « Installer des applications inconnues »). Avec les secrets `ANDROID_KEYSTORE_*` et `PLAY_SERVICE_ACCOUNT_JSON`,
  l'AAB est aussi envoyé sur la piste « test interne » de Google Play.
- **iOS** : avec les secrets `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64`, l'app est signée et envoyée sur
  TestFlight.

Identifiant de l'application (iOS et Android) : `sn.wawtelecom.wawid.visa`.

## Licences

`dmrtd` est publié sous double licence LGPL-3.0 / commerciale (ZeroPass). Pour une diffusion sur les stores au nom de l'État,
faire valider la licence (ou acquérir la licence commerciale) avant la mise en production.
