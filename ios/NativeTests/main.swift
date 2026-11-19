import Foundation

var checks = 0
func check(_ condition: @autoclosure () -> Bool, _ message: String) {
    checks += 1
    guard condition() else { fatalError("Native check failed: \(message)") }
}

check(StoreURLPolicy.isStore(StoreURLPolicy.home), "store root")
check(StoreURLPolicy.isStore(URL(string: StoreURLPolicy.origin + "/products/123?shade=red")!), "product query")
for raw in ["http://themakeupstorewangkhei.com/", "https://themakeupstorewangkhei.com.evil.test/", "https://user:secret@themakeupstorewangkhei.com/", "https://themakeupstorewangkhei.com:444/", "file:///private/data", "javascript:alert(1)"] {
    check(!StoreURLPolicy.isStore(URL(string: raw)!), "untrusted store origin")
}
check(StoreURLPolicy.isAuthCallback(URL(string: StoreURLPolicy.callback + "?code=private")!), "exact auth return")
for raw in ["themakeupstore://evil/callback?code=x", "themakeupstore://auth/other?code=x", "themakeupstore://user@auth/callback?code=x", "https://evil.test/auth/callback?code=x", "themakeupstore://auth/callback#token"] {
    check(!StoreURLPolicy.isAuthCallback(URL(string: raw)!), "untrusted auth callback")
}
let auth = "https://\(StoreURLPolicy.authHost)/auth/v1/authorize?provider=google&redirect_to=themakeupstore%3A%2F%2Fauth%2Fcallback&code_challenge=\(String(repeating: "a", count: 43))&code_challenge_method=s256"
check(StoreURLPolicy.isGoogleAuthorization(URL(string: auth)!), "PKCE Google authorization")
for raw in [auth.replacingOccurrences(of: StoreURLPolicy.authHost, with: "evil.test"), auth.replacingOccurrences(of: "provider=google", with: "provider=other"), auth.replacingOccurrences(of: "s256", with: "plain"), auth + "&provider=google", auth.replacingOccurrences(of: "themakeupstore%3A%2F%2Fauth%2Fcallback", with: "https%3A%2F%2Fevil.test")] {
    check(!StoreURLPolicy.isGoogleAuthorization(URL(string: raw)!), "invalid authorization request")
}
check(StoreURLPolicy.isRecovery(URL(string: "capacitor://localhost/offline.html")!), "local recovery")
check(!StoreURLPolicy.isRecovery(URL(string: "https://evil.test/offline.html")!), "untrusted recovery")
check(StoreURLPolicy.isRetry(URL(string: "capacitor://localhost/retry")!), "local retry")
check(!StoreURLPolicy.isRetry(URL(string: "capacitor://localhost/retry?next=evil")!), "retry cannot inject a destination")

let ready = StoreStartupGate()
check(ready.finish(ready.generation), "ready without animation minimum")
check(!ready.waiting, "startup dismissed")
let gate = StoreStartupGate()
let old = gate.generation
gate.navigationStarted()
check(!gate.finish(old), "stale document cannot dismiss")
let retryOld = gate.generation
gate.retry()
check(!gate.finish(retryOld), "retry rejects old callback")
check(gate.finish(gate.generation), "current document can dismiss")
check(!gate.finish(gate.generation), "duplicate completion ignored")
gate.retry(); let destroyed = gate.generation; gate.destroy()
check(!gate.finish(destroyed), "destroy rejects late completion")
print("Passed \(checks) native URL/PKCE/startup checks")
