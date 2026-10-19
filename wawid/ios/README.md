# WawID e-Visa — application iPhone

Application native SwiftUI : scan de la MRZ (caméra), **lecture de la puce du passeport par NFC**
(BAC/PACE, DG1, portrait DG2, authentification passive), saisie du séjour, paiement et dépôt de la demande
sur l'API WawID ; suivi de la demande et QR code e-Visa à présenter à la frontière.

Pourquoi une app native ? Safari n'a pas accès aux puces ISO 14443 des passeports : seul Core NFC
(iOS 13+) le permet, dans une application signée avec la capacité *NFC Tag Reading*.

## Construire
1. macOS + Xcode 15 ou plus, compte Apple Developer (capacité NFC Tag Reading activée sur l'App ID `sn.wawtelecom.wawid.visa`).
2. `brew install xcodegen && cd wawid/ios && xcodegen` puis ouvrir `WawIDVisa.xcodeproj`.
3. L'URL de l'API est réglée sur `https://wawid-waw-telecom.netlify.app` (`project.yml`, `WAWIDApiBaseURL`) ; ajouter `masterList.pem` dans `WawIDVisa/Resources`.
4. Lancer sur un **iPhone réel** (le NFC ne fonctionne pas dans le simulateur).

Dépendance : [NFCPassportReader](https://github.com/AndyQ/NFCPassportReader) (MIT). Si votre version de la
bibliothèque nomme le paramètre `password:` au lieu de `mrzKey:`, adaptez l'appel dans `PassportNFC.swift`.

## TestFlight
Publication automatisée par GitHub Actions (`.github/workflows/wawid-ios-testflight.yml`, Mac fourni par GitHub) :
1. Compte Apple Developer (99 USD/an) ; dans *Certificates, Identifiers & Profiles*, l'App ID
   `sn.wawtelecom.wawid.visa` est créé automatiquement au premier envoi (capacité *NFC Tag Reading* incluse).
2. Dans App Store Connect : créer l'app (nom « WawID e-Visa », bundle `sn.wawtelecom.wawid.visa`), puis
   *Users and Access → Integrations → App Store Connect API* : créer une clé rôle **App Manager**, télécharger `AuthKey_XXXX.p8`.
3. Dans GitHub (*Settings → Secrets and variables → Actions*), ajouter : `APPLE_TEAM_ID`, `ASC_KEY_ID`,
   `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64` (`base64 -i AuthKey_XXXX.p8`).
4. Lancer le workflow « WawID iOS → TestFlight » (onglet Actions) ; la version apparaît dans TestFlight après
   le traitement Apple (10 à 30 min). Ajouter les testeurs internes (jusqu'à 100) ou un groupe externe (revue Apple
   « Beta App Review », ~24 h, avec un lien public d'invitation).

En local sur un Mac : `bundle install && APPLE_TEAM_ID=… ASC_KEY_ID=… ASC_ISSUER_ID=… ASC_KEY_P8_BASE64=… bundle exec fastlane beta`.

## État
Code écrit et relu, **non compilé** dans cet environnement (pas de Xcode sous Linux) : prévoir une passe
de compilation et un test sur iPhone avec un vrai passeport biométrique.
