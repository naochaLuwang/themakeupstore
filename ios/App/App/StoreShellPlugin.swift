import AuthenticationServices
import Capacitor
import UIKit
import FirebaseMessaging

@objc(StoreShellPlugin)
final class StoreShellPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    let identifier = "StoreShellPlugin"
    let jsName = "StoreShell"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPushAutoInit", returnType: CAPPluginReturnPromise)
    ]
    private var authSession: ASWebAuthenticationSession?
    private weak var authWindow: UIWindow?

    @objc func setPushAutoInit(_ call: CAPPluginCall) {
        guard let enabled = call.getBool("enabled") else { call.reject("Missing enabled flag"); return }
        Messaging.messaging().isAutoInitEnabled = enabled
        call.resolve()
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        guard let raw = call.getString("url"), let url = URL(string: raw), StoreURLPolicy.isGoogleAuthorization(url) else {
            call.reject("Invalid authentication request", "INVALID_AUTH_URL")
            return
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { call.reject("Sign-in is unavailable", "AUTH_UNAVAILABLE"); return }
            guard self.authSession == nil else { call.reject("A sign-in is already open", "AUTH_IN_PROGRESS"); return }
            guard let window = self.bridge?.viewController?.view.window else {
                call.reject("Sign-in is not available yet", "AUTH_UNAVAILABLE")
                return
            }
            self.authWindow = window
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "themakeupstore") { [weak self] callback, error in
                DispatchQueue.main.async {
                    self?.authSession = nil
                    self?.authWindow = nil
                    if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                        call.resolve(["cancelled": true])
                    } else if let callback = callback, StoreURLPolicy.isAuthCallback(callback) {
                        call.resolve(["url": callback.absoluteString, "cancelled": false])
                    } else {
                        // Do not expose callback URLs, authorization codes or provider payloads.
                        call.reject("Sign-in could not be completed", "AUTH_FAILED")
                    }
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.authSession = session
            if !session.start() {
                self.authSession = nil
                self.authWindow = nil
                call.reject("Sign-in could not be opened", "AUTH_UNAVAILABLE")
            }
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        authWindow ?? ASPresentationAnchor()
    }

    func cancelAuthentication() { authSession?.cancel() }
}
