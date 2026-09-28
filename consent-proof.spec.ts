import { generateConsentProof, verifyChain, ConsentAction } from '../../src/modules/consent/services/consent-proof.logic';

function action(overrides: Partial<ConsentAction> = {}): ConsentAction {
  return {
    subjectId: 's1',
    purpose: 'marketing',
    action: 'granted',
    consentVersion: 'v1',
    ip: '1.2.3.4',
    userAgent: 'test-agent',
    timestamp: '2026-01-01T00:00:00.000Z',
    previousHash: null,
    ...overrides,
  };
}

describe('generateConsentProof', () => {
  it('produces a deterministic hash for identical input', () => {
    const a = generateConsentProof(action());
    const b = generateConsentProof(action());
    expect(a.hash).toBe(b.hash);
  });

  it('produces a different hash when any field changes', () => {
    const a = generateConsentProof(action());
    const b = generateConsentProof(action({ ip: '5.6.7.8' }));
    expect(a.hash).not.toBe(b.hash);
  });

  it('produces a different hash for a withdrawal vs a grant, all else equal', () => {
    const granted = generateConsentProof(action({ action: 'granted' }));
    const withdrawn = generateConsentProof(action({ action: 'withdrawn' }));
    expect(granted.hash).not.toBe(withdrawn.hash);
  });
});

describe('verifyChain', () => {
  it('verifies a valid two-record chain', () => {
    const r1 = generateConsentProof(action({ timestamp: '2026-01-01T00:00:00.000Z', previousHash: null }));
    const r2 = generateConsentProof(action({ action: 'withdrawn', timestamp: '2026-02-01T00:00:00.000Z', previousHash: r1.hash }));
    expect(verifyChain([r1, r2])).toEqual({ valid: true });
  });

  it('detects a tampered record (field changed after hash was computed)', () => {
    const r1 = generateConsentProof(action());
    const r2 = generateConsentProof(action({ action: 'withdrawn', previousHash: r1.hash }));
    const tampered = { ...r2, action: 'granted' as const };
    const result = verifyChain([r1, tampered]);
    expect(result.valid).toBe(false);
    expect(result.brokenAtIndex).toBe(1);
  });

  it('detects a broken previousHash link (record reordered or spliced)', () => {
    const r1 = generateConsentProof(action());
    const r2 = generateConsentProof(action({ action: 'withdrawn', previousHash: 'wrong-hash' }));
    const result = verifyChain([r1, r2]);
    expect(result.valid).toBe(false);
    expect(result.brokenAtIndex).toBe(1);
  });

  it('verifies an empty chain as valid', () => {
    expect(verifyChain([])).toEqual({ valid: true });
  });

  it('verifies a single genesis record with no previousHash', () => {
    const r1 = generateConsentProof(action());
    expect(verifyChain([r1])).toEqual({ valid: true });
  });
});
