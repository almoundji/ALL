import SwiftUI

@main
struct WawIDVisaApp: App {
    @StateObject private var draft = ApplicationDraft()

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                HomeView()
            }
            .environmentObject(draft)
            .tint(Theme.ink)
        }
    }
}
