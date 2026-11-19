package com.themakeupstorewangkhei.twa;

import android.graphics.Bitmap;
import android.net.http.SslError;
import android.os.Handler;
import android.os.Looper;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

/** Adds startup recovery while retaining Capacitor's request and external-intent handling. */
final class StoreWebViewClient extends BridgeWebViewClient {
    private final MainActivity activity;
    private final Bridge bridge;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private String retryUrl = StoreUrls.HOME;
    private final StartupGate startup = new StartupGate();
    private boolean readinessPending;
    private final Runnable timeout;

    StoreWebViewClient(Bridge bridge, MainActivity activity) {
        super(bridge);
        this.bridge = bridge;
        this.activity = activity;
        timeout = () -> {
            // Offer recovery; never automatically reload a payment or submit a request.
            if (startup.isWaiting()) activity.showStartupRetry(this::retry);
        };
        activity.showStartupLoading();
        handler.postDelayed(timeout, 25000);
    }

    private void finishStartup(long document) {
        if (!startup.finish(document)) return;
        readinessPending = false;
        handler.removeCallbacksAndMessages(null);
        activity.hideStartup();
    }

    private void checkDocumentReady(WebView view, long document) {
        if (!startup.accepts(document) || readinessPending || !StoreUrls.isStore(view.getUrl())) return;
        readinessPending = true;
        // A streamed Next.js shell can commit before its document has arrived.
        // Wait for parsing and the next drawable frame, not images or an animation timer.
        view.evaluateJavascript("document.readyState !== 'loading'", result -> {
            if (!startup.accepts(document)) return;
            if ("true".equals(result)) {
                view.postVisualStateCallback(document, new WebView.VisualStateCallback() {
                    @Override public void onComplete(long requestId) { finishStartup(requestId); }
                });
            } else {
                handler.postDelayed(() -> {
                    if (!startup.accepts(document)) return;
                    readinessPending = false;
                    checkDocumentReady(view, document);
                }, 80);
            }
        });
    }

    void retry() {
        startup.retry();
        readinessPending = false;
        activity.showStartupLoading();
        handler.removeCallbacks(timeout);
        handler.postDelayed(timeout, 25000);
        bridge.getWebView().stopLoading();
        bridge.getWebView().loadUrl(retryUrl);
    }

    void destroy() {
        startup.destroy();
        handler.removeCallbacksAndMessages(null);
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        if (StoreUrls.isRecovery(view.getUrl()) && "https://localhost/retry".equals(request.getUrl().toString())) {
            retry();
            return true;
        }
        return super.shouldOverrideUrlLoading(view, request);
    }

    @Override
    public void onPageStarted(WebView view, String url, Bitmap favicon) {
        startup.navigationStarted();
        readinessPending = false;
        if (StoreUrls.isStore(url)) retryUrl = url;
        super.onPageStarted(view, url, favicon);
    }

    @Override
    public void onPageCommitVisible(WebView view, String url) {
        super.onPageCommitVisible(view, url);
        if (StoreUrls.isRecovery(url)) finishStartup(startup.current());
        else if (StoreUrls.isStore(url)) checkDocumentReady(view, startup.current());
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        if (StoreUrls.isRecovery(url)) finishStartup(startup.current());
        else if (StoreUrls.isStore(url)) checkDocumentReady(view, startup.current());
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        if (request.isForMainFrame() && StoreUrls.isRecovery(request.getUrl().toString())) {
            handler.removeCallbacks(timeout);
            activity.showStartupRetry(this::retry);
            return; // Prevent a loop if the bundled error page itself cannot load.
        }
        super.onReceivedError(view, request, error);
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
        // Keep normal website 4xx pages (including sign-in and not-found responses).
        if (response.getStatusCode() >= 500) super.onReceivedHttpError(view, request, response);
    }

    @Override
    public void onReceivedSslError(WebView view, SslErrorHandler sslHandler, SslError error) {
        sslHandler.cancel(); // Never bypass certificate validation.
        if (error != null && StoreUrls.isStore(error.getUrl()) && error.getUrl().equals(view.getUrl())) {
            view.loadUrl(StoreUrls.RECOVERY);
        }
    }
}
