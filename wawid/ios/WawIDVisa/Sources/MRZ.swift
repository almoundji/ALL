import Foundation

/// Lecture MRZ ICAO 9303 (TD3, passeport) — même logique que public/shared/engine.js.
struct MRZ: Equatable {
    let lines: [String]
    let surname: String
    let givenNames: String
    let documentNumber: String
    let nationality: String
    let issuer: String
    let birthDate: String     // AAAA-MM-JJ
    let sex: String
    let expiryDate: String    // AAAA-MM-JJ
    let checksValid: Bool

    /// Clé d'accès BAC/PACE : n° de document + chiffre, naissance + chiffre, expiration + chiffre.
    var accessKey: String {
        let l2 = lines[1]
        return String(l2.prefix(10)) + l2.substring(13, 20) + l2.substring(21, 28)
    }

    static func checkDigit(_ s: Substring) -> Character {
        let weights = [7, 3, 1]
        var total = 0
        for (i, c) in s.enumerated() {
            let v: Int
            if c == "<" { v = 0 }
            else if let d = c.wholeNumberValue { v = d }
            else if let a = c.asciiValue, c.isUppercase { v = Int(a) - 55 }
            else { v = 0 }
            total += v * weights[i % 3]
        }
        return Character(String(total % 10))
    }

    /// Cherche deux lignes TD3 valides dans un texte reconnu par la caméra.
    static func find(in text: String) -> MRZ? {
        let candidates = text.uppercased()
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "«", with: "<")
            .components(separatedBy: .newlines)
            .filter { $0.count == 44 && $0.allSatisfy { $0.isUppercase || $0.isNumber || $0 == "<" } }
        guard candidates.count >= 2 else { return nil }
        for i in 0..<(candidates.count - 1) where candidates[i].hasPrefix("P") {
            if let m = parse(candidates[i] + "\n" + candidates[i + 1]), m.checksValid { return m }
        }
        return nil
    }

    static func parse(_ text: String) -> MRZ? {
        let lines = text.uppercased().components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        guard lines.count == 2, lines.allSatisfy({ $0.count == 44 }), lines[0].hasPrefix("P") else { return nil }
        let a = lines[0], b = lines[1]
        let names = a.substring(5, 44).components(separatedBy: "<<")
        let surname = names.first?.replacingOccurrences(of: "<", with: " ").trimmingCharacters(in: .whitespaces) ?? ""
        let given = names.dropFirst().joined(separator: " ").replacingOccurrences(of: "<", with: " ")
            .components(separatedBy: .whitespaces).filter { !$0.isEmpty }.joined(separator: " ")
        let checks = [
            checkDigit(b.sub(0, 9)) == b.char(9),
            checkDigit(b.sub(13, 19)) == b.char(19),
            checkDigit(b.sub(21, 27)) == b.char(27),
            checkDigit(b.sub(0, 10) + b.sub(13, 20) + b.sub(21, 43)) == b.char(43),
        ]
        return MRZ(
            lines: lines, surname: surname, givenNames: given,
            documentNumber: b.substring(0, 9).replacingOccurrences(of: "<", with: ""),
            nationality: b.substring(10, 13).replacingOccurrences(of: "<", with: ""),
            issuer: a.substring(2, 5).replacingOccurrences(of: "<", with: ""),
            birthDate: date(b.substring(13, 19), birth: true), sex: String(b.char(20)),
            expiryDate: date(b.substring(21, 27), birth: false), checksValid: checks.allSatisfy { $0 }
        )
    }

    private static func date(_ s: String, birth: Bool) -> String {
        guard s.count == 6, let yy = Int(s.prefix(2)) else { return "" }
        let current = Calendar.current.component(.year, from: Date()) % 100
        let century = birth && yy > current ? 1900 : 2000
        return "\(century + yy)-\(s.substring(2, 4))-\(s.substring(4, 6))"
    }
}

extension String {
    func substring(_ from: Int, _ to: Int) -> String {
        let s = index(startIndex, offsetBy: from), e = index(startIndex, offsetBy: to)
        return String(self[s..<e])
    }
    func sub(_ from: Int, _ to: Int) -> Substring { Substring(substring(from, to)) }
    func char(_ i: Int) -> Character { self[index(startIndex, offsetBy: i)] }
}
