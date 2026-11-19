package com.themakeupstorewangkhei.twa;

import org.junit.Test;
import static org.junit.Assert.*;

public class StoreUrlsTest {
    @Test public void allowsStorePathsAndQueries() {
        assertTrue(StoreUrls.isStore(StoreUrls.HOME));
        assertTrue(StoreUrls.isStore("https://themakeupstorewangkhei.com/products/123?shade=red"));
        assertTrue(StoreUrls.isStore("https://themakeupstorewangkhei.com:443/checkout"));
    }
    @Test public void rejectsUntrustedRetryTargets() {
        for (String url : new String[] {null, "http://themakeupstorewangkhei.com/", "https://themakeupstorewangkhei.com.evil.test/", "https://user:secret@themakeupstorewangkhei.com/", "https://themakeupstorewangkhei.com:444/", "javascript:alert(1)", "file:///etc/passwd", "https://themakeupstorewangkhei.com/\\evil"}) {
            assertFalse(url, StoreUrls.isStore(url));
        }
    }
    @Test public void recoveryIsExactAndLocal() {
        assertTrue(StoreUrls.isRecovery(StoreUrls.RECOVERY));
        assertFalse(StoreUrls.isRecovery("https://evil.test/offline.html"));
        assertFalse(StoreUrls.isRecovery("https://localhost/offline.html?redirect=evil"));
    }
}
