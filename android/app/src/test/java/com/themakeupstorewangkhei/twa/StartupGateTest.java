package com.themakeupstorewangkhei.twa;

import org.junit.Test;
import static org.junit.Assert.*;

public class StartupGateTest {
    @Test public void readyImmediatelyWithoutWaitingForAnimation() {
        StartupGate gate = new StartupGate();
        assertTrue(gate.finish(gate.current()));
        assertFalse(gate.isWaiting());
    }
    @Test public void aPriorDocumentCannotHideTheNewDocument() {
        StartupGate gate = new StartupGate();
        long old = gate.current();
        gate.navigationStarted();
        assertFalse(gate.finish(old));
        assertTrue(gate.isWaiting());
        assertTrue(gate.finish(gate.current()));
    }
    @Test public void retryInvalidatesTheOldReadinessCallback() {
        StartupGate gate = new StartupGate();
        long old = gate.current();
        gate.retry();
        assertFalse(gate.finish(old));
        assertTrue(gate.finish(gate.current()));
        assertFalse(gate.finish(gate.current()));
    }
    @Test public void destroyCancelsLateCompletion() {
        StartupGate gate = new StartupGate();
        long old = gate.current();
        gate.destroy();
        assertFalse(gate.accepts(old));
        assertFalse(gate.finish(old));
    }
}
