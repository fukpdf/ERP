import { ComparativeAnalysisService } from '../../src/modules/analytics/services/comparative-analysis.service';

describe('ComparativeAnalysisService', () => {
  const svc = new ComparativeAnalysisService();

  it('computes absolute and percent delta', () => {
    const r = svc.compare(120, 100);
    expect(r.deltaAbsolute).toBe(20);
    expect(r.deltaPct).toBe(20);
  });

  it('handles a decrease', () => {
    const r = svc.compare(80, 100);
    expect(r.deltaAbsolute).toBe(-20);
    expect(r.deltaPct).toBe(-20);
  });

  it('returns null percent when previous is 0 (avoids divide-by-zero)', () => {
    const r = svc.compare(50, 0);
    expect(r.deltaPct).toBeNull();
    expect(r.deltaAbsolute).toBe(50);
  });

  it('yoy/qoq/mom are thin wrappers over compare', () => {
    expect(svc.yoy(110, 100).deltaPct).toBe(10);
    expect(svc.qoq(90, 100).deltaPct).toBe(-10);
    expect(svc.mom(105, 100).deltaPct).toBe(5);
  });
});
