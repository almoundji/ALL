import SwiftUI

/// Identité WawID : bleu nuit #0B1F33, turquoise #0F766E (clair) / #2DD4BF (accent).
enum Theme {
    static let brand = Color(red: 0.059, green: 0.463, blue: 0.431)
    static let accent = Color(red: 0.176, green: 0.831, blue: 0.749)
    static let ink = Color(red: 0.043, green: 0.122, blue: 0.2)
    static let good = Color(red: 0.05, green: 0.64, blue: 0.05)
    static let critical = Color(red: 0.82, green: 0.23, blue: 0.23)
    static let warning = Color(red: 0.98, green: 0.70, blue: 0.10)

    static func display(_ size: CGFloat) -> Font { .system(size: size, weight: .black, design: .rounded) }
}

struct PrimaryButton: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(Theme.brand.opacity(configuration.isPressed ? 0.8 : 1))
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

struct StatusBadge: View {
    let text: String
    let color: Color
    var body: some View {
        Label(text, systemImage: "circle.fill")
            .labelStyle(.titleAndIcon)
            .font(.caption.weight(.semibold))
            .imageScale(.small)
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}
