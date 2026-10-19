import Foundation

/// Client de l'API publique WawID (mêmes routes que le portail web).
struct WawAPI {
    static var baseURL: URL {
        let s = Bundle.main.object(forInfoDictionaryKey: "WAWIDApiBaseURL") as? String ?? "https://wawid-waw-telecom.netlify.app"
        return URL(string: s)!
    }

    struct Failure: LocalizedError { let message: String; var errorDescription: String? { message } }

    static func post<T: Decodable>(_ path: String, _ body: [String: Any]) async throws -> T {
        var req = URLRequest(url: baseURL.appendingPathComponent(path))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: req)
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else {
            let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
            throw Failure(message: msg ?? "Erreur réseau (\(code))")
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    struct Submitted: Decodable { let ref: String; let status: String; let receipt: String; let amount: Int }
    struct Message: Decodable, Identifiable { var id: String { at + text }; let from: String; let at: String; let text: String }
    struct Status: Decodable {
        let ref: String; let status: String; let visaNo: String?; let validUntil: String?; let token: String?; let messages: [Message]
    }

    static func submit(_ d: ApplicationDraft) async throws -> Submitted {
        var body: [String: Any] = [
            "consent": true, "channel": "iPhone", "paymentMethod": d.paymentMethod,
            "applicant": ["surname": d.surname, "given": d.given, "dob": d.dob, "sex": d.sex, "nat": d.nat,
                          "docNo": d.docNo, "expiry": d.expiry, "email": d.email, "phone": d.phone],
            "trip": ["purpose": d.purpose, "arrival": d.arrival, "nights": d.nights, "port": d.port, "address": d.address],
            "health": ["yellowFever": d.yellowFever, "symptoms": d.symptoms, "countriesVisited": d.countriesVisited],
        ]
        if let chip = d.chip {
            body["chip"] = ["read": true, "dg1": chip.dg1, "passiveAuth": chip.passiveAuth, "protocol": chip.protocolUsed, "source": "iPhone NFC"]
        }
        return try await post("api/public/evisa", body)
    }

    static func status(ref: String, docNo: String) async throws -> Status {
        try await post("api/public/evisa/status", ["ref": ref, "docNo": docNo])
    }
}
