package com.themakeupstorewangkhei.twa;

/** Only the current document may dismiss startup; ready pages never wait for an animation timer. */
final class StartupGate {
    private long document;
    private boolean waiting = true;

    long current() { return document; }
    boolean isWaiting() { return waiting; }
    void navigationStarted() { document++; }
    void retry() { waiting = true; document++; }
    boolean accepts(long token) { return waiting && token == document; }
    boolean finish(long token) {
        if (!accepts(token)) return false;
        waiting = false;
        return true;
    }
    void destroy() { waiting = false; document++; }
}
