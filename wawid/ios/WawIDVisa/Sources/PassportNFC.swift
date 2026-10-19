import Foundation
import UIKit
import NFCPassportReader

/// Résultat de la lecture de la puce (ICAO 9303 parties 10 et 11).
struct ChipResult {
    let dg1: String            // MRZ stockée dans la puce (DG1), 2 × 44 caractères
    let photo: UIImage?        // Portrait (DG2)
    let passiveAuth: Bool      // Signature du SOD et intégrité des groupes de données
    let protocolUsed: String   // PACE ou BAC
}

/// Lecture NFC du passeport avec la bibliothèque open source NFCPassportReader (MIT).
/// Nécessite un iPhone 7 ou plus récent ; la lecture NFC ne fonctionne pas dans le simulateur.
@MainActor
final class PassportNFC: ObservableObject {
    @Published var status = ""

    func read(mrz: MRZ) async throws -> ChipResult {
        let reader = PassportReader()
        // Liste maîtresse des certificats CSCA (ICAO PKD) pour l'authentification passive.
        if let masterList = Bundle.main.url(forResource: "masterList", withExtension: "pem") {
            reader.setMasterListURL(masterList)
        }
        let passport = try await reader.readPassport(
            mrzKey: mrz.accessKey,
            tags: [.COM, .SOD, .DG1, .DG2],
            customDisplayMessage: { message in
                switch message {
                case .requestPresentPassport: return "Approchez le haut de l'iPhone de la page photo de votre passeport."
                case .authenticatingWithPassport: return "Authentification avec la puce…"
                case .readingDataGroupProgress(_, let progress): return "Lecture de la puce… \(progress) %"
                case .error(let error): return "Erreur : \(error.localizedDescription)"
                case .successfulRead: return "Passeport lu avec succès."
                default: return nil
                }
            }
        )
        let raw = passport.passportMRZ.replacingOccurrences(of: "\n", with: "")
        let dg1 = raw.count == 88 ? raw.substring(0, 44) + "\n" + raw.substring(44, 88) : raw
        return ChipResult(
            dg1: dg1,
            photo: passport.passportImage,
            passiveAuth: passport.passportCorrectlySigned,
            protocolUsed: passport.PACEStatus == .success ? "PACE" : "BAC"
        )
    }
}
