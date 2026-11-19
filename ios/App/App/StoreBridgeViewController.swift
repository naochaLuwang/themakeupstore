import Capacitor
import UIKit
import WebKit

final class StoreBridgeViewController: CAPBridgeViewController {
    private let startup = StoreStartupGate()
    private var shellPlugin: StoreShellPlugin?
    private var navigationProxy: StoreNavigationDelegate?
    private var loadingObservation: NSKeyValueObservation?
    private var overlay: UIView?
    private var brand: StoreBrandSplashView?
    private var watchdog: DispatchWorkItem?
    private var readiness: DispatchWorkItem?
    private var probing = false
    private var retryURL = StoreURLPolicy.home

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        let plugin = StoreShellPlugin()
        shellPlugin = plugin
        bridge?.registerPluginInstance(plugin)
    }

    override func viewDidLoad() {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--preview-splash") {
            // Local native visual verification without loading the production website.
            showLoading()
            return
        }
        #endif
        super.viewDidLoad()
        guard let webView = webView else { return }
        webView.allowsBackForwardNavigationGestures = true
        let proxy = StoreNavigationDelegate(owner: self, original: webView.navigationDelegate)
        navigationProxy = proxy
        webView.navigationDelegate = proxy
        loadingObservation = webView.observe(\.isLoading, options: [.new]) { [weak self] _, _ in
            DispatchQueue.main.async { self?.checkReadiness() }
        }
        showLoading()
        armWatchdog()
    }

    func remember(_ url: URL) { if StoreURLPolicy.isStore(url) { retryURL = url } }
    func navigationStarted(_ url: URL?) {
        startup.navigationStarted()
        probing = false
        readiness?.cancel()
        if let url = url { remember(url) }
    }

    private func showLoading() {
        removeOverlay()
        let splash = StoreBrandSplashView()
        brand = splash
        installOverlay(splash)
    }
    private func installOverlay(_ content: UIView) {
        content.translatesAutoresizingMaskIntoConstraints = false
        content.backgroundColor = .white
        view.addSubview(content)
        NSLayoutConstraint.activate([
            content.leadingAnchor.constraint(equalTo: view.leadingAnchor), content.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            content.topAnchor.constraint(equalTo: view.topAnchor), content.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        overlay = content
        setNeedsStatusBarAppearanceUpdate()
    }
    private func removeOverlay() {
        brand?.stop()
        brand = nil
        overlay?.layer.removeAllAnimations()
        overlay?.removeFromSuperview()
        overlay = nil
    }
    override var preferredStatusBarStyle: UIStatusBarStyle { overlay != nil ? .darkContent : super.preferredStatusBarStyle }

    private func armWatchdog() {
        watchdog?.cancel()
        let work = DispatchWorkItem { [weak self] in
            guard let self = self, self.startup.waiting else { return }
            self.showRecovery(keepWaiting: true)
        }
        watchdog = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 25, execute: work)
    }

    func checkReadiness() {
        guard startup.waiting, !probing, let webView = webView, let url = webView.url else { return }
        let token = startup.generation
        if StoreURLPolicy.isRecovery(url) { finishStartup(token); return }
        guard StoreURLPolicy.isStore(url) else { return }
        probing = true
        webView.callAsyncJavaScript("return await new Promise(resolve => requestAnimationFrame(() => resolve(document.readyState !== 'loading')));", arguments: [:], in: nil, in: .page) { [weak self] result in
            guard let self = self, self.startup.accepts(token) else { return }
            self.probing = false
            if case .success(let value) = result, value as? Bool == true {
                self.finishStartup(token)
            } else {
                let work = DispatchWorkItem { [weak self] in
                    guard let self = self, self.startup.accepts(token) else { return }
                    self.checkReadiness()
                }
                self.readiness = work
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.08, execute: work)
            }
        }
    }

    private func finishStartup(_ token: Int) {
        guard startup.finish(token) else { return }
        watchdog?.cancel()
        readiness?.cancel()
        guard let old = overlay else { return }
        old.isUserInteractionEnabled = false
        old.accessibilityElementsHidden = true
        let finish = { [weak self, weak old] in
            guard let self = self, self.overlay === old else { return }
            self.removeOverlay()
            self.setNeedsStatusBarAppearanceUpdate()
        }
        if UIAccessibility.isReduceMotionEnabled { finish() }
        else { UIView.animate(withDuration: 0.12, delay: 0, options: [.allowUserInteraction], animations: { old.alpha = 0 }, completion: { _ in finish() }) }
    }

    func loadRecovery() {
        guard let url = bridge?.config.errorPathURL else { showRecovery(); return }
        webView?.load(URLRequest(url: url))
    }
    func showRecovery(keepWaiting: Bool = false) {
        if !keepWaiting { startup.retry(); readiness?.cancel(); probing = false }
        watchdog?.cancel()
        removeOverlay()
        let errorView = UIView()
        let stack = UIStackView()
        stack.axis = .vertical; stack.spacing = 18; stack.translatesAutoresizingMaskIntoConstraints = false
        let title = UILabel(); title.text = "The Makeup Store"; title.font = .preferredFont(forTextStyle: .title2)
        title.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        let message = UILabel(); message.text = "Unable to connect. Check your connection and try again. If a payment was interrupted, check your orders before paying again."
        message.numberOfLines = 0; message.font = .preferredFont(forTextStyle: .body); message.textColor = .darkGray
        let retry = UIButton(type: .system); retry.setTitle("Try again", for: .normal)
        retry.addTarget(self, action: #selector(retryStore), for: .touchUpInside)
        retry.backgroundColor = UIColor(red: 190/255, green: 24/255, blue: 93/255, alpha: 1); retry.tintColor = .white; retry.layer.cornerRadius = 12
        retry.heightAnchor.constraint(greaterThanOrEqualToConstant: 48).isActive = true
        [title, message, retry].forEach { stack.addArrangedSubview($0) }
        errorView.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: errorView.centerXAnchor), stack.centerYAnchor.constraint(equalTo: errorView.centerYAnchor),
            stack.widthAnchor.constraint(lessThanOrEqualToConstant: 360), stack.leadingAnchor.constraint(greaterThanOrEqualTo: errorView.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: errorView.trailingAnchor, constant: -24)
        ])
        installOverlay(errorView)
    }
    @objc func retryStore() {
        startup.retry(); probing = false; readiness?.cancel()
        showLoading(); armWatchdog()
        webView?.stopLoading()
        webView?.load(URLRequest(url: retryURL))
    }
    deinit {
        startup.destroy(); watchdog?.cancel(); readiness?.cancel(); loadingObservation?.invalidate()
        shellPlugin?.cancelAuthentication()
    }
}
