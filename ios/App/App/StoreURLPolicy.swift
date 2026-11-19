import Foundation

enum StoreURLPolicy {
    static let origin = "https://themakeupstorewangkhei.com"
    static let home = URL(string: origin + "/")!
    static let callback = "themakeupstore://auth/callback"
    static let authHost = "pdfkikpoalylyufuprki.supabase.co"

    static func isStore(_ url: URL) -> Bool {
        url.scheme?.lowercased() == "https" && url.host?.lowercased() == "themakeupstorewangkhei.com"
            && (url.port == nil || url.port == 443) && url.user == nil && url.password == nil
            && !url.path.contains("\\")
    }

    static func isLocal(_ url: URL) -> Bool {
        url.scheme == "capacitor" && url.host == "localhost" && url.port == nil
            && url.user == nil && url.password == nil
    }

    static func isRecovery(_ url: URL) -> Bool { isLocal(url) && url.path == "/offline.html" }
    static func isRetry(_ url: URL) -> Bool { isLocal(url) && url.path == "/retry" && url.query == nil }

    static func isAuthCallback(_ url: URL) -> Bool {
        url.scheme == "themakeupstore" && url.host == "auth" && url.path == "/callback"
            && url.port == nil && url.user == nil && url.password == nil && url.fragment == nil
    }

    static func isGoogleAuthorization(_ url: URL) -> Bool {
        guard url.scheme == "https", url.host == authHost, url.path == "/auth/v1/authorize",
              url.user == nil, url.password == nil, url.fragment == nil,
              url.port == nil || url.port == 443,
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return false }
        let values = components.queryItems ?? []
        func value(_ key: String) -> String? {
            let matches = values.filter { $0.name == key }
            return matches.count == 1 ? matches.first?.value : nil
        }
        guard value("provider") == "google", value("redirect_to") == callback,
              value("code_challenge_method")?.lowercased() == "s256",
              let challenge = value("code_challenge") else { return false }
        return challenge.range(of: "^[A-Za-z0-9_-]{43,128}$", options: .regularExpression) != nil
    }
}

final class StoreStartupGate {
    private(set) var generation = 0
    private(set) var waiting = true
    func navigationStarted() { generation += 1 }
    func retry() { waiting = true; generation += 1 }
    func accepts(_ token: Int) -> Bool { waiting && token == generation }
    @discardableResult func finish(_ token: Int) -> Bool {
        guard accepts(token) else { return false }
        waiting = false
        return true
    }
    func destroy() { waiting = false; generation += 1 }
}
