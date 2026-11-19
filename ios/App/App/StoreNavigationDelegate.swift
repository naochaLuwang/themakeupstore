import UIKit
import WebKit

/// Preserve Capacitor's delegate/plugin/permission handling while adding main-document recovery.
final class StoreNavigationDelegate: NSObject, WKNavigationDelegate {
    weak var owner: StoreBridgeViewController?
    private weak var original: WKNavigationDelegate?

    init(owner: StoreBridgeViewController, original: WKNavigationDelegate?) {
        self.owner = owner
        self.original = original
    }

    override func responds(to selector: Selector!) -> Bool {
        super.responds(to: selector) || (original?.responds(to: selector) ?? false)
    }
    override func forwardingTarget(for selector: Selector!) -> Any? {
        if original?.responds(to: selector) == true { return original }
        return super.forwardingTarget(for: selector)
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        owner?.navigationStarted(webView.url)
        original?.webView?(webView, didStartProvisionalNavigation: navigation)
    }
    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        original?.webView?(webView, didCommit: navigation)
        owner?.checkReadiness()
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        original?.webView?(webView, didFinish: navigation)
        owner?.checkReadiness()
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        fail(webView, error: error) { self.original?.webView?(webView, didFail: navigation, withError: error) }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        fail(webView, error: error) { self.original?.webView?(webView, didFailProvisionalNavigation: navigation, withError: error) }
    }
    private func fail(_ webView: WKWebView, error: Error, forward: () -> Void) {
        if (error as NSError).code == NSURLErrorCancelled { return }
        if let url = webView.url, StoreURLPolicy.isRecovery(url) { owner?.showRecovery(); return }
        // Capacitor loads the bundled error page. A failed local page falls back to native Retry.
        forward()
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        let topLevel = action.targetFrame == nil || action.targetFrame?.isMainFrame == true
        if topLevel, StoreURLPolicy.isRetry(url) {
            if let current = webView.url, StoreURLPolicy.isRecovery(current), action.sourceFrame.isMainFrame {
                owner?.retryStore()
            }
            decisionHandler(.cancel)
            return
        }
        if topLevel {
            if StoreURLPolicy.isStore(url) { owner?.remember(url) }
            else if ["http", "https"].contains(url.scheme?.lowercased() ?? "") {
                // Exact origins: never trust the SDK's string-prefix origin check for external hosts.
                if url.user == nil && url.password == nil { UIApplication.shared.open(url, options: [:]) }
                decisionHandler(.cancel)
                return
            } else if ["javascript", "data", "file"].contains(url.scheme?.lowercased() ?? "") ||
                        (url.scheme == "capacitor" && !StoreURLPolicy.isLocal(url)) {
                decisionHandler(.cancel)
                return
            }
        }
        if original?.responds(to: NSSelectorFromString("webView:decidePolicyForNavigationAction:decisionHandler:")) == true {
            original?.webView?(webView, decidePolicyFor: action, decisionHandler: decisionHandler)
        } else { decisionHandler(.allow) }
    }

    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if response.isForMainFrame, let http = response.response as? HTTPURLResponse, http.statusCode >= 500 {
            decisionHandler(.cancel)
            owner?.loadRecovery()
        } else if original?.responds(to: NSSelectorFromString("webView:decidePolicyForNavigationResponse:decisionHandler:")) == true {
            original?.webView?(webView, decidePolicyFor: response, decisionHandler: decisionHandler)
        } else {
            decisionHandler(.allow)
        }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        // The SDK otherwise reloads automatically; require an explicit retry during checkout/payment.
        owner?.showRecovery()
    }
}
