package com.themakeupstorewangkhei.twa;

import java.net.URI;
import java.net.URISyntaxException;

/** URLs which are safe to retry inside the privileged store WebView. */
final class StoreUrls {
    static final String HOME = "https://themakeupstorewangkhei.com/";
    static final String RECOVERY = "https://localhost/offline.html";

    static boolean isStore(String value) {
        if (value == null || value.contains("\\")) return false;
        try {
            URI url = new URI(value);
            return "https".equals(url.getScheme())
                && "themakeupstorewangkhei.com".equals(url.getHost())
                && url.getRawUserInfo() == null
                && (url.getPort() == -1 || url.getPort() == 443);
        } catch (URISyntaxException error) {
            return false;
        }
    }

    static boolean isRecovery(String value) {
        return RECOVERY.equals(value);
    }
}
