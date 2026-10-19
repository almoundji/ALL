# WawID e-Visa — application iPhone

Application native SwiftUI : scan de la MRZ (caméra), **lecture de la puce du passeport par NFC**
(BAC/PACE, DG1, portrait DG2, authentification passive), saisie du séjour, paiement et dépôt de la demande
sur l'API WawID ; suivi de la demande et QR code e-Visa à présenter à la frontière.

Pourquoi une app native ? Safari n'a pas accès aux puces ISO 14443 des passeports : seul Core NFC
(iOS 13+) le permet, dans une application signée avec la capacité *NFC Tag Reading*.

## Construire
1. macOS + Xcode 15 ou plus, compte Apple Developer (capacité NFC Tag Reading activée sur l'App ID `sn.wawtelecom.wawid.visa`).
2. `brew install xcodegen && cd wawid/ios && xcodegen` puis ouvrir `WawIDVisa.xcodeproj`.
3. Renseigner l'URL du site déployé dans `project.yml` (`WAWIDApiBaseURL`), ajouter `masterList.pem` dans `WawIDVisa/Resources`.
4. Lancer sur un **iPhone réel** (le NFC ne fonctionne pas dans le simulateur).

Dépendance : [NFCPassportReader](https://github.com/AndyQ/NFCPassportReader) (MIT). Si votre version de la
bibliothèque nomme le paramètre `password:` au lieu de `mrzKey:`, adaptez l'appel dans `PassportNFC.swift`.

## État
Code écrit et relu, **non compilé** dans cet environnement (pas de Xcode sous Linux) : prévoir une passe
de compilation et un test sur iPhone avec un vrai passeport biométrique.
