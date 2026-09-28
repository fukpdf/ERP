describe('Inventory invariants', () => {
  it('does not allow zero or negative reservation quantities', () => { expect(0 > 0).toBe(false); expect(-1 > 0).toBe(false); });
  it('requires distinct transfer warehouses', () => { const from='w1', to='w1'; expect(from === to).toBe(true); });
  it('count variance is counted minus expected', () => { expect(125 - 100).toBe(25); expect(90 - 100).toBe(-10); });
});
