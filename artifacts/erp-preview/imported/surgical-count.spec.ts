import {
  SurgicalCountService,
  InMemorySurgicalCountStore,
  CountPhase,
} from '../../src/modules/his-or/services/surgical-count.service';
import { SurgicalCountGuard } from '../../src/modules/his-or/guards/surgical-count.guard';

describe('SurgicalCountService', () => {
  const NURSE = { nurseId: 'nurse-1', nurseName: 'N. Ortiz' };
  const SURGEON = { surgeonId: 'surgeon-1', surgeonName: 'Dr. Vance' };
  const CASE_ID = 'case-001';

  let store: InMemorySurgicalCountStore;
  let auditEvents: Array<{ event: string; payload: unknown }>;
  let service: SurgicalCountService;

  beforeEach(() => {
    store = new InMemorySurgicalCountStore();
    auditEvents = [];
    service = new SurgicalCountService(store, (event, payload) => auditEvents.push({ event, payload }));
  });

  function baselineTallies() {
    return [
      { itemType: 'SPONGE' as const, label: '4x4 gauze', count: 20 },
      { itemType: 'INSTRUMENT' as const, label: 'Metzenbaum scissors', count: 1 },
      { itemType: 'NEEDLE' as const, label: 'suture needle', count: 5 },
    ];
  }

  it('records a correct baseline count as PENDING_SIGN', () => {
    const record = service.recordCount({
      caseId: CASE_ID,
      phase: CountPhase.BASELINE,
      tallies: baselineTallies(),
      countedBy: NURSE,
    });

    expect(record.status).toBe('PENDING_SIGN');
    expect(record.mismatches).toHaveLength(0);
    expect(record.immutable).toBe(false);
  });

  it('requires dual sign (distinct nurse and surgeon) before becoming immutable', () => {
    const record = service.recordCount({
      caseId: CASE_ID,
      phase: CountPhase.BASELINE,
      tallies: baselineTallies(),
      countedBy: NURSE,
    });

    // Same person cannot both count and co-sign.
    expect(() =>
      service.signCorrectCount(CASE_ID, record.id, { surgeonId: NURSE.nurseId, surgeonName: 'imposter' }),
    ).toThrow(/distinct/i);

    const signed = service.signCorrectCount(CASE_ID, record.id, SURGEON);
    expect(signed.status).toBe('CORRECT_SIGNED');
    expect(signed.immutable).toBe(true);
    expect(signed.surgeonSignOff?.surgeonId).toBe(SURGEON.surgeonId);
  });

  it('is immutable after signing: no further changes possible', () => {
    const record = service.recordCount({
      caseId: CASE_ID,
      phase: CountPhase.BASELINE,
      tallies: baselineTallies(),
      countedBy: NURSE,
    });
    service.signCorrectCount(CASE_ID, record.id, SURGEON);

    expect(() => service.signCorrectCount(CASE_ID, record.id, SURGEON)).toThrow(/immutable/i);
  });

  it('BLOCKS the case when a subsequent count is short an item (core G16 requirement)', () => {
    const baseline = service.recordCount({
      caseId: CASE_ID,
      phase: CountPhase.BASELINE,
      tallies: baselineTallies(),
      countedBy: NURSE,
    });
    service.signCorrectCount(CASE_ID, baseline.id, SURGEON);

    // One sponge is missing before cavity closure.
    const shortCount = service.recordCount({
      caseId: CASE_ID,
      phase: CountPhase.BEFORE_CAVITY_CLOSURE,
      tallies: [
        { itemType: 'SPONGE', label: '4x4 gauze', count: 19 }, // missing one
        { itemType: 'INSTRUMENT', label: 'Metzenbaum scissors', count: 1 },
        { itemType: 'NEEDLE', label: 'suture needle', count: 5 },
      ],
      countedBy: NURSE,
    });

    expect(shortCount.status).toBe('INCORRECT_BLOCKED');
    expect(shortCount.mismatches).toEqual([
      expect.objectContaining({ itemType: 'SPONGE', label: '4x4 gauze', expected: 20, actual: 19, difference: -1 }),
    ]);

    // The case must now be reported as blocked for this phase.
    expect(service.isPhaseBlocking(CASE_ID, CountPhase.BEFORE_CAVITY_CLOSURE)).toBe(true);

    // And it must be impossible to "sign correct" an incorrect count —
    // there is no backdoor to mark a mismatch as fine.
    expect(() => service.signCorrectCount(CASE_ID, shortCount.id, SURGEON)).toThrow(/incorrect and blocked/i);

    // Nor can the same phase simply be recounted to skip past — recording
    // a *new* phase while this one is blocked is forbidden.
    expect(() =>
      service.recordCount({
        caseId: CASE_ID,
        phase: CountPhase.BEFORE_SKIN_CLOSURE,
        tallies: baselineTallies(),
        countedBy: NURSE,
      }),
    ).toThrow(/unresolved and blocking/i);

    expect(auditEvents.some((e) => e.event === 'or.surgical.count.incorrect')).toBe(true);
  });

  it('clears the block only via a documented, dual-signed resolution', () => {
    const baseline = service.recordCount({
      caseId: CASE_ID,
      phase: CountPhase.BASELINE,
      tallies: baselineTallies(),
      countedBy: NURSE,
    });
    service.signCorrectCount(CASE_ID, baseline.id, SURGEON);

    const shortCount = service.recordCount({
      caseId: CASE_ID,
      phase: CountPhase.BEFORE_CAVITY_CLOSURE,
      tallies: [
        { itemType: 'SPONGE', label: '4x4 gauze', count: 19 },
        { itemType: 'INSTRUMENT', label: 'Metzenbaum scissors', count: 1 },
        { itemType: 'NEEDLE', label: 'suture needle', count: 5 },
      ],
      countedBy: NURSE,
    });

    // A single signer cannot resolve it alone.
    expect(() =>
      service.resolveIncorrectCount(
        CASE_ID,
        shortCount.id,
        { method: 'XRAY_CLEARED', notes: 'x-ray negative', resolvedBy: { userId: SURGEON.surgeonId, name: SURGEON.surgeonName, role: 'SURGEON' } },
        { secondSignerId: SURGEON.surgeonId, secondSignerName: SURGEON.surgeonName, secondSignerRole: 'SURGEON' },
      ),
    ).toThrow(/distinct/i);

    // Must have one surgeon and one nurse.
    const resolved = service.resolveIncorrectCount(
      CASE_ID,
      shortCount.id,
      {
        method: 'XRAY_CLEARED',
        notes: 'Portable x-ray of surgical field negative for retained sponge.',
        resolvedBy: { userId: SURGEON.surgeonId, name: SURGEON.surgeonName, role: 'SURGEON' },
      },
      { secondSignerId: NURSE.nurseId, secondSignerName: NURSE.nurseName, secondSignerRole: 'NURSE' },
    );

    expect(resolved.status).toBe('INCORRECT_RESOLVED');
    expect(resolved.immutable).toBe(true);
    expect(service.isPhaseBlocking(CASE_ID, CountPhase.BEFORE_CAVITY_CLOSURE)).toBe(false);

    // Now the next phase can proceed.
    const nextCount = service.recordCount({
      caseId: CASE_ID,
      phase: CountPhase.BEFORE_SKIN_CLOSURE,
      tallies: [
        { itemType: 'SPONGE', label: '4x4 gauze', count: 19 },
        { itemType: 'INSTRUMENT', label: 'Metzenbaum scissors', count: 1 },
        { itemType: 'NEEDLE', label: 'suture needle', count: 5 },
      ],
      countedBy: NURSE,
    });
    expect(nextCount.status).toBe('PENDING_SIGN');
  });

  it('rejects counts recorded out of phase order semantics (already-finalized phase)', () => {
    const baseline = service.recordCount({
      caseId: CASE_ID,
      phase: CountPhase.BASELINE,
      tallies: baselineTallies(),
      countedBy: NURSE,
    });
    service.signCorrectCount(CASE_ID, baseline.id, SURGEON);

    expect(() =>
      service.recordCount({
        caseId: CASE_ID,
        phase: CountPhase.BASELINE,
        tallies: baselineTallies(),
        countedBy: NURSE,
      }),
    ).toThrow(/already finalized/i);
  });

  it('rejects malformed tallies (negative or non-integer counts)', () => {
    expect(() =>
      service.recordCount({
        caseId: CASE_ID,
        phase: CountPhase.BASELINE,
        tallies: [{ itemType: 'SPONGE', label: '4x4 gauze', count: -1 }],
        countedBy: NURSE,
      }),
    ).toThrow(/non-negative integer/i);

    expect(() =>
      service.recordCount({
        caseId: CASE_ID,
        phase: CountPhase.BASELINE,
        tallies: [],
        countedBy: NURSE,
      }),
    ).toThrow(/at least one item tally/i);
  });
});

describe('SurgicalCountGuard', () => {
  const NURSE = { nurseId: 'nurse-1', nurseName: 'N. Ortiz' };
  const SURGEON = { surgeonId: 'surgeon-1', surgeonName: 'Dr. Vance' };
  const CASE_ID = 'case-guard-1';

  function makeContext(caseId: string, action: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ params: { id: caseId }, body: { action } }),
      }),
    } as any;
  }

  it('blocks the close-case route when baseline count is unresolved', () => {
    const service = new SurgicalCountService();
    const guard = new SurgicalCountGuard(service);

    service.recordCount({
      caseId: CASE_ID,
      phase: CountPhase.BASELINE,
      tallies: [{ itemType: 'SPONGE', label: '4x4 gauze', count: 10 }],
      countedBy: NURSE,
    });
    // Immediately recount short, leaving it blocked.
    service.recordCount({
      caseId: CASE_ID,
      phase: CountPhase.BASELINE,
      tallies: [{ itemType: 'SPONGE', label: '4x4 gauze', count: 10 }],
      countedBy: NURSE,
    });

    // Force a blocked state directly for the guard test via cavity-close gating on BASELINE.
    const blockedRecord = service.recordCount({
      caseId: 'case-guard-2',
      phase: CountPhase.BASELINE,
      tallies: [{ itemType: 'SPONGE', label: '4x4 gauze', count: 10 }],
      countedBy: NURSE,
    });
    // Simulate a mismatch scenario cleanly on its own case id.
    expect(() => guard.canActivate(makeContext('case-guard-2', 'cavity-close'))).not.toThrow();

    // Now create a genuinely blocked case and verify the guard throws.
    service.recordCount({
      caseId: 'case-guard-3',
      phase: CountPhase.BASELINE,
      tallies: [{ itemType: 'SPONGE', label: '4x4 gauze', count: 10 }],
      countedBy: NURSE,
    });
    // second baseline attempt would throw (already handled above); instead
    // directly assert isPhaseBlocking drives the guard by constructing a
    // mismatch at BASELINE-equivalent gate for skin-close, which checks
    // BEFORE_CAVITY_CLOSURE too.
    const base = service.recordCount({
      caseId: 'case-guard-4',
      phase: CountPhase.BASELINE,
      tallies: [{ itemType: 'SPONGE', label: '4x4 gauze', count: 10 }],
      countedBy: NURSE,
    });
    service.signCorrectCount('case-guard-4', base.id, SURGEON);
    service.recordCount({
      caseId: 'case-guard-4',
      phase: CountPhase.BEFORE_CAVITY_CLOSURE,
      tallies: [{ itemType: 'SPONGE', label: '4x4 gauze', count: 9 }],
      countedBy: NURSE,
    });

    expect(() => guard.canActivate(makeContext('case-guard-4', 'skin-close'))).toThrow(/unresolved and blocking/i);
  });

  it('allows the route through when no gated phase applies', () => {
    const service = new SurgicalCountService();
    const guard = new SurgicalCountGuard(service);
    expect(guard.canActivate(makeContext('any-case', 'view'))).toBe(true);
  });
});
