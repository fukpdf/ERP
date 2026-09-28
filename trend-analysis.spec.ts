import { TrendAnalysisService } from '../../src/modules/analytics/services/trend-analysis.service';

describe('TrendAnalysisService', () => {
  const svc = new TrendAnalysisService();

  it('recovers exact slope/intercept for a perfect line', () => {
    const pts = [1, 2, 3, 4, 5].map((t) => ({ t, v: 2 * t + 1 }));
    const r = svc.linearRegression(pts);
    expect(r.slope).toBeCloseTo(2, 9);
    expect(r.intercept).toBeCloseTo(1, 9);
    expect(r.rSquared).toBeCloseTo(1, 9);
    expect(r.predict(10)).toBeCloseTo(21, 9);
  });

  it('flat data has zero slope', () => {
    const r = svc.linearRegression([{ t: 1, v: 5 }, { t: 2, v: 5 }, { t: 3, v: 5 }]);
    expect(r.slope).toBe(0);
  });

  it('throws with fewer than 2 points', () => {
    expect(() => svc.linearRegression([{ t: 1, v: 1 }])).toThrow();
  });

  it('moving average uses a partial window at the start and a full window once available', () => {
    const pts = [1, 2, 3, 4, 5].map((v, i) => ({ t: i, v }));
    const ma = svc.movingAverage(pts, 3);
    expect(ma[0].v).toBeCloseTo(1, 9); // avg(1)
    expect(ma[4].v).toBeCloseTo(4, 9); // avg(3,4,5)
    expect(ma).toHaveLength(5);
  });
});
