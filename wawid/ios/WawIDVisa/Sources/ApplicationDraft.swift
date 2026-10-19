import Foundation
import UIKit

/// Demande e-Visa en cours de saisie.
final class ApplicationDraft: ObservableObject {
    @Published var mrz: MRZ?
    @Published var chip: ChipResult?
    @Published var surname = "", given = "", dob = "", sex = "F", nat = "", docNo = "", expiry = "", email = "", phone = ""
    @Published var purpose = "Tourisme", arrival = "", nights = 7, port = "AIBD", address = ""
    @Published var yellowFever = false, symptoms = false, countriesVisited = ""
    @Published var paymentMethod = "Wave", consent = false

    private static let iso: DateFormatter = { let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.locale = Locale(identifier: "en_US_POSIX"); return f }()
    var arrivalDate: Date {
        get { Self.iso.date(from: arrival) ?? Date().addingTimeInterval(7 * 86400) }
        set { arrival = Self.iso.string(from: newValue) }
    }

    func apply(_ m: MRZ) {
        mrz = m
        surname = m.surname.capitalized; given = m.givenNames.capitalized; dob = m.birthDate; sex = m.sex
        nat = m.nationality; docNo = m.documentNumber; expiry = m.expiryDate
    }

    /// La puce et la MRZ imprimée concordent-elles ?
    var chipMatches: Bool {
        guard let chip, let printed = mrz, let fromChip = MRZ.parse(chip.dg1) else { return false }
        return fromChip.documentNumber == printed.documentNumber && fromChip.birthDate == printed.birthDate && fromChip.expiryDate == printed.expiryDate
    }

    var identityComplete: Bool { ![surname, given, dob, nat, docNo, expiry, email].contains { $0.isEmpty } && email.contains("@") }

    func reset() {
        mrz = nil; chip = nil; surname = ""; given = ""; dob = ""; nat = ""; docNo = ""; expiry = ""; email = ""; phone = ""
        address = ""; arrival = ""; yellowFever = false; symptoms = false; countriesVisited = ""; consent = false
    }
}
