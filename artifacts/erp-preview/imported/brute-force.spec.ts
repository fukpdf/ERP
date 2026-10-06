import { BruteForceDetector } from '@erp/security';

describe('brute force lockout (per M15 spec: 5 attempts / 15 min -> lock)', () => {
  it('locks after the 5th failure and reports lockedUntilMs', () => {
    const detector = new BruteForceDetector();
    const now = Date.now();
    const outcomes = Array.from({ length: 5 }, () => detector.recordFailure('acct-1', '10.0.0.1', now));
    expect(outcomes[3].locked).toBe(false);
    expect(outcomes[4].locked).toBe(true);
    expect(outcomes[4].lockedUntilMs).toBeGreaterThan(now);
  });

  it('blocks the IP independently after 20 failures across accounts', () => {
    const detector = new BruteForceDetector();
    const now = Date.now();
    for (let i = 0; i < 20; i++) {
      detector.recordFailure(`acct-${i}`, '10.0.0.2', now);
    }
    expect(detector.isIpBlocked('10.0.0.2', now)).toBe(true);
  });
});
