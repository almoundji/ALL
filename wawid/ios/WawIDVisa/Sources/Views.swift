import SwiftUI
import VisionKit
import CoreImage.CIFilterBuiltins

// MARK: - Accueil

struct HomeView: View {
    @EnvironmentObject var draft: ApplicationDraft
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Label("E-VISA · NFC · SUIVI", systemImage: "bolt")
                    .font(.caption.weight(.heavy)).padding(.horizontal, 14).padding(.vertical, 8)
                    .background(Theme.ink).foregroundStyle(Theme.accent).clipShape(Capsule())
                (Text("Votre e-Visa,\n") + Text("vérifié").foregroundColor(Theme.brand) + Text(" par la puce"))
                    .font(Theme.display(40))
                Text("Scannez votre passeport, lisez sa puce avec l'iPhone et déposez votre demande en quelques minutes.")
                    .foregroundStyle(.secondary)
                NavigationLink("Nouvelle demande") { ScanStep() }.buttonStyle(PrimaryButton())
                    .simultaneousGesture(TapGesture().onEnded { draft.reset() })
                NavigationLink { TrackView() } label: {
                    Label("Suivre ma demande", systemImage: "magnifyingglass").frame(maxWidth: .infinity, minHeight: 50)
                }.buttonStyle(.bordered)
                GroupBox {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Passeport biométrique (logo puce sur la couverture)", systemImage: "person.text.rectangle")
                        Label("iPhone 7 ou plus récent", systemImage: "iphone.radiowaves.left.and.right")
                        Label("Paiement Wave, Orange Money ou carte", systemImage: "creditcard")
                    }.font(.subheadline)
                } label: { Text("Ce qu'il vous faut").font(.headline) }
            }.padding(20)
        }
        .navigationTitle("WawID")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - 1. Scan de la MRZ

struct ScanStep: View {
    @EnvironmentObject var draft: ApplicationDraft
    @State private var manual = ""
    @State private var scanning = false

    var body: some View {
        Form {
            Section {
                Text("La bande de 2 lignes en bas de la page photo (MRZ) sert de clé pour ouvrir la puce.").font(.subheadline)
                if DataScannerViewController.isSupported {
                    Button { scanning = true } label: { Label("Scanner avec la caméra", systemImage: "camera.viewfinder") }
                }
                TextField("Ou saisissez les 2 lignes de la MRZ", text: $manual, axis: .vertical)
                    .font(.system(.footnote, design: .monospaced)).textInputAutocapitalization(.characters).autocorrectionDisabled()
                    .onChange(of: manual) { value in if let m = MRZ.parse(value) { draft.apply(m) } }
            } header: { Text("Étape 1 — Passeport") }
            if let m = draft.mrz {
                Section("Lecture") {
                    LabeledContent("Nom", value: m.surname)
                    LabeledContent("Prénoms", value: m.givenNames)
                    LabeledContent("Passeport", value: m.documentNumber)
                    LabeledContent("Nationalité", value: m.nationality)
                    LabeledContent("Expiration", value: m.expiryDate)
                    StatusBadge(text: m.checksValid ? "Chiffres de contrôle valides" : "MRZ invalide — vérifiez la saisie", color: m.checksValid ? Theme.good : Theme.critical)
                }
                Section { NavigationLink("Lire la puce") { ChipStep() }.disabled(!m.checksValid) }
            }
        }
        .navigationTitle("Passeport")
        .sheet(isPresented: $scanning) {
            MRZScanner { m in draft.apply(m); manual = m.lines.joined(separator: "\n"); scanning = false }
                .ignoresSafeArea()
        }
    }
}

/// Reconnaissance de texte en direct (VisionKit) jusqu'à trouver une MRZ valide.
struct MRZScanner: UIViewControllerRepresentable {
    let onFound: (MRZ) -> Void

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let vc = DataScannerViewController(recognizedDataTypes: [.text()], qualityLevel: .accurate, recognizesMultipleItems: true, isHighlightingEnabled: true)
        vc.delegate = context.coordinator
        try? vc.startScanning()
        return vc
    }
    func updateUIViewController(_ vc: DataScannerViewController, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator(onFound: onFound) }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let onFound: (MRZ) -> Void
        private var done = false
        init(onFound: @escaping (MRZ) -> Void) { self.onFound = onFound }
        func dataScanner(_ scanner: DataScannerViewController, didUpdate items: [RecognizedItem], allItems: [RecognizedItem]) {
            guard !done else { return }
            let text = allItems.compactMap { if case .text(let t) = $0 { return t.transcript } else { return nil } }.joined(separator: "\n")
            if let m = MRZ.find(in: text) { done = true; scanner.stopScanning(); onFound(m) }
        }
    }
}

// MARK: - 2. Lecture NFC

struct ChipStep: View {
    @EnvironmentObject var draft: ApplicationDraft
    @StateObject private var nfc = PassportNFC()
    @State private var error: String?
    @State private var reading = false

    var body: some View {
        Form {
            Section {
                Text("Posez votre passeport fermé sur une table et approchez le haut de l'iPhone de la couverture. Ne bougez plus pendant la lecture (5 à 15 s).").font(.subheadline)
                Button {
                    guard let m = draft.mrz else { return }
                    reading = true; error = nil
                    Task {
                        do { draft.chip = try await nfc.read(mrz: m) } catch { self.error = error.localizedDescription }
                        reading = false
                    }
                } label: { Label(reading ? "Lecture…" : "Lire la puce NFC", systemImage: "wave.3.right") }
                .disabled(reading)
                if let error { Text(error).foregroundStyle(Theme.critical).font(.footnote) }
            } header: { Text("Étape 2 — Puce électronique") }
            if let chip = draft.chip {
                Section("Résultat") {
                    HStack(alignment: .top, spacing: 14) {
                        if let photo = chip.photo { Image(uiImage: photo).resizable().scaledToFit().frame(width: 80).clipShape(RoundedRectangle(cornerRadius: 8)) }
                        VStack(alignment: .leading, spacing: 8) {
                            StatusBadge(text: chip.passiveAuth ? "Passeport authentique" : "Authentification échouée", color: chip.passiveAuth ? Theme.good : Theme.critical)
                            StatusBadge(text: draft.chipMatches ? "Puce et MRZ concordantes" : "Puce et MRZ différentes", color: draft.chipMatches ? Theme.good : Theme.critical)
                            Text(chip.protocolUsed).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            Section {
                NavigationLink("Continuer") { DetailsStep() }
                if draft.chip == nil { Text("Vous pouvez continuer sans lecture de la puce ; l'instruction sera alors plus longue.").font(.footnote).foregroundStyle(.secondary) }
            }
        }
        .navigationTitle("Puce NFC")
    }
}

// MARK: - 3. Coordonnées, voyage, santé

struct DetailsStep: View {
    @EnvironmentObject var draft: ApplicationDraft
    let purposes = ["Tourisme", "Affaires", "Visite familiale", "Conférence", "Études", "Transit"]
    let ports = [("AIBD", "Aéroport Int. Blaise Diagne"), ("PDK", "Port de Dakar"), ("ZIG", "Aéroport de Ziguinchor"), ("ROS", "Rosso"), ("KID", "Kidira"), ("KAR", "Karang")]

    var body: some View {
        Form {
            Section("Identité") {
                TextField("Nom", text: $draft.surname)
                TextField("Prénoms", text: $draft.given)
                TextField("E-mail", text: $draft.email).keyboardType(.emailAddress).textInputAutocapitalization(.never)
                TextField("Téléphone", text: $draft.phone).keyboardType(.phonePad)
            }
            Section("Voyage") {
                Picker("Motif", selection: $draft.purpose) { ForEach(purposes, id: \.self) { Text($0) } }
                DatePicker("Arrivée", selection: $draft.arrivalDate, in: Date()..., displayedComponents: .date)
                Stepper("Durée : \(draft.nights) nuits", value: $draft.nights, in: 1...90)
                Picker("Point d'entrée", selection: $draft.port) { ForEach(ports, id: \.0) { Text($0.1).tag($0.0) } }
                TextField("Adresse de séjour", text: $draft.address)
            }
            Section("Santé") {
                Toggle("Vacciné(e) contre la fièvre jaune", isOn: $draft.yellowFever)
                Toggle("Fièvre ou symptômes ces 14 derniers jours", isOn: $draft.symptoms)
                TextField("Pays visités (21 derniers jours)", text: $draft.countriesVisited)
            }
            Section { NavigationLink("Paiement") { PaymentStep() }.disabled(!draft.identityComplete) }
        }
        .navigationTitle("Votre séjour")
        .onAppear { if draft.arrival.isEmpty { draft.arrivalDate = Date().addingTimeInterval(7 * 86400) } }
    }
}

// MARK: - 4. Paiement et dépôt

struct PaymentStep: View {
    @EnvironmentObject var draft: ApplicationDraft
    @State private var sending = false
    @State private var error: String?
    @State private var result: WawAPI.Submitted?

    var body: some View {
        Form {
            Section("Frais de traitement") {
                LabeledContent("e-Visa", value: "50 000 FCFA")
                Picker("Moyen de paiement", selection: $draft.paymentMethod) { ForEach(["Wave", "Orange Money", "Free Money", "Carte bancaire"], id: \.self) { Text($0) } }
                Text("Démonstration : aucun paiement réel.").font(.footnote).foregroundStyle(.secondary)
            }
            Section {
                Toggle("J'accepte le traitement de mes données par les services de l'immigration (loi n° 2008-12) et certifie l'exactitude des informations.", isOn: $draft.consent).font(.footnote)
            }
            Section {
                Button(sending ? "Envoi…" : "Payer et déposer") {
                    sending = true; error = nil
                    Task {
                        do { result = try await WawAPI.submit(draft) } catch { self.error = error.localizedDescription }
                        sending = false
                    }
                }.disabled(!draft.consent || sending)
                if let error { Text(error).foregroundStyle(Theme.critical).font(.footnote) }
            }
        }
        .navigationTitle("Paiement")
        .navigationDestination(item: Binding(get: { result.map { Ref(id: $0.ref) } }, set: { _ in })) { ref in
            DoneView(ref: ref.id, docNo: draft.docNo)
        }
    }
}

struct Ref: Identifiable, Hashable { let id: String }

struct DoneView: View {
    let ref: String
    let docNo: String
    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "checkmark.circle.fill").font(.system(size: 72)).foregroundStyle(Theme.good)
            Text("Demande déposée").font(Theme.display(30))
            Text("Référence").foregroundStyle(.secondary)
            Text(ref).font(.system(.title, design: .monospaced).weight(.bold)).textSelection(.enabled)
            Text("Vous recevrez la réponse par e-mail. Conservez cette référence.").multilineTextAlignment(.center).foregroundStyle(.secondary)
            NavigationLink("Suivre ma demande") { TrackView(ref: ref, docNo: docNo) }.buttonStyle(PrimaryButton())
        }.padding(24).navigationBarBackButtonHidden()
    }
}

// MARK: - Suivi et QR

struct TrackView: View {
    @State var ref = ""
    @State var docNo = ""
    @State private var status: WawAPI.Status?
    @State private var error: String?

    var body: some View {
        Form {
            Section("Ma demande") {
                TextField("Référence (EV…)", text: $ref).textInputAutocapitalization(.characters)
                TextField("N° de passeport", text: $docNo).textInputAutocapitalization(.characters)
                Button("Consulter") { Task { await load() } }.disabled(ref.isEmpty || docNo.isEmpty)
                if let error { Text(error).foregroundStyle(Theme.critical).font(.footnote) }
            }
            if let s = status {
                Section("État") {
                    LabeledContent("Statut", value: label(s.status))
                    if let v = s.visaNo { LabeledContent("e-Visa", value: v) }
                    if let u = s.validUntil { LabeledContent("Valable jusqu'au", value: u) }
                }
                if let token = s.token, let qr = qrImage(token) {
                    Section("À présenter à la frontière") {
                        Image(uiImage: qr).interpolation(.none).resizable().scaledToFit().frame(maxWidth: .infinity).padding()
                    }
                }
                if !s.messages.isEmpty {
                    Section("Messages") { ForEach(s.messages) { m in VStack(alignment: .leading) { Text(m.from).font(.caption.bold()); Text(m.text) } } }
                }
            }
        }
        .navigationTitle("Suivi")
        .task { if !ref.isEmpty && !docNo.isEmpty { await load() } }
    }

    func load() async {
        do { status = try await WawAPI.status(ref: ref, docNo: docNo); error = nil } catch { self.error = error.localizedDescription }
    }

    func label(_ s: String) -> String {
        ["SOUMISE": "Soumise", "EN_EXAMEN": "En examen", "INFO_DEMANDEE": "Information demandée", "APPROUVEE": "Approuvée", "REFUSEE": "Refusée"][s] ?? s
    }

    func qrImage(_ text: String) -> UIImage? {
        let f = CIFilter.qrCodeGenerator()
        f.message = Data(text.utf8)
        guard let out = f.outputImage?.transformed(by: CGAffineTransform(scaleX: 10, y: 10)),
              let cg = CIContext().createCGImage(out, from: out.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}
