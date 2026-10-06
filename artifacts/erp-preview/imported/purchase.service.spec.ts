import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PurchaseService } from '../../src/modules/purchase/services/purchase.service';

function txMock() {
  return {
    purchaseNumberSequence: { upsert: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({ nextNumber: 2n }) },
    purchaseRequisition: { create: jest.fn().mockResolvedValue({ id: 'req-1', number: 'PR-00000001', status: 'draft' }), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'req-1', version: 2 }) },
    purchaseRequisitionLine: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    purchaseRfq: { create: jest.fn().mockResolvedValue({ id: 'rfq-1', number: 'RFQ-00000001' }), findFirst: jest.fn(), findMany: jest.fn() },
    purchaseRfqVendor: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn() },
    purchaseRfqLine: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn() },
    vendor: { findMany: jest.fn(), findFirst: jest.fn() },
    purchaseVendorQuote: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    purchaseVendorQuoteLine: { create: jest.fn(), findMany: jest.fn() },
    purchaseOrder: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    purchaseOrderLine: { create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    purchaseReturn: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    purchaseReturnLine: { create: jest.fn(), findMany: jest.fn() },
    product: { findFirst: jest.fn(), findMany: jest.fn() },
    warehouse: { findFirst: jest.fn(), findMany: jest.fn() },
    purchaseApproval: { findFirst: jest.fn(), upsert: jest.fn() },
    document: { findFirst: jest.fn() },
    purchaseDocumentLink: { create: jest.fn(), findMany: jest.fn() },
    purchaseGoodsReceipt: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    purchaseGoodsReceiptLine: { create: jest.fn(), findMany: jest.fn() },
    invoice: { findFirst: jest.fn() },
    purchaseInvoiceMatch: { upsert: jest.fn(), findMany: jest.fn() },
  } as any;
}

describe('PurchaseService business invariants', () => {
  const audit = { enqueue: jest.fn().mockResolvedValue(undefined) } as any;
  let tx: any;
  let prisma: any;
  let service: PurchaseService;

  beforeEach(() => {
    tx = txMock();
    prisma = { withTenant: jest.fn(async (_tenant: string, fn: any) => fn(tx)) };
    service = new PurchaseService(prisma, audit);
    jest.clearAllMocks();
  });

  it('rejects empty requisitions', async () => {
    await expect(service.createRequisition('t', 'u', { lines: [] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-positive requisition quantities', async () => {
    await expect(service.createRequisition('t', 'u', { lines: [{ description: 'x', quantity: 0 }] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('calculates requisition estimated total using decimal arithmetic', async () => {
    const result = await service.createRequisition('t', 'u', { lines: [{ description: 'x', quantity: 3, estimatedUnitPrice: 10.01, taxRate: 5 }] });
    expect(tx.purchaseRequisition.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ estimatedTotal: new Prisma.Decimal('31.5315') }) }));
    expect(result).toBeDefined();
  });

  it('rejects invalid requisition status transition', async () => {
    tx.purchaseRequisition.findFirst.mockResolvedValue({ id: 'r', status: 'draft' });
    await expect(service.transitionRequisition('t', 'u', 'r', 'approved')).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not allow self approval of a purchase order', async () => {
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: 'po', status: 'pending_approval', createdBy: 'u' });
    await expect(service.approvePurchaseOrder('t', 'u', 'po')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects receipt quantity beyond ordered quantity', async () => {
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: 'po', status: 'sent', vendorId: 'v' });
    tx.purchaseOrderLine.findMany.mockResolvedValue([{ id: 'pol', lineNo: 1, quantity: new Prisma.Decimal(5), receivedQty: new Prisma.Decimal(4), returnedQty: new Prisma.Decimal(0), unitPrice: new Prisma.Decimal(10) }]);
    await expect(service.createGoodsReceipt('t', 'u', { purchaseOrderId: 'po', lines: [{ purchaseOrderLineId: 'pol', acceptedQty: 2 }] })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects direct requisition approval transition', async () => {
    tx.purchaseRequisition.findFirst.mockResolvedValue({ id: 'r', status: 'submitted' });
    await expect(service.transitionRequisition('t', 'approver', 'r', 'approved')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects self approval of a requisition', async () => {
    tx.purchaseRequisition.findFirst.mockResolvedValue({ id: 'r', status: 'submitted', requestedBy: 'u' });
    await expect(service.approveRequisition('t', 'u', 'r')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects direct RFQ award transition', async () => {
    tx.purchaseRfq.findFirst.mockResolvedValue({ id: 'rfq', status: 'closed' });
    await expect(service.transitionRfq('t', 'u', 'rfq', 'awarded')).rejects.toBeInstanceOf(ConflictException);
  });

  it('aggregates duplicate receipt lines before quantity validation', async () => {
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: 'po', status: 'sent', vendorId: 'v' });
    tx.purchaseOrderLine.findMany.mockResolvedValue([{ id: 'pol', lineNo: 1, quantity: new Prisma.Decimal(5), receivedQty: new Prisma.Decimal(4), returnedQty: new Prisma.Decimal(0), unitPrice: new Prisma.Decimal(10) }]);
    await expect(service.createGoodsReceipt('t', 'u', { purchaseOrderId: 'po', lines: [
      { purchaseOrderLineId: 'pol', acceptedQty: 0.5, rejectedQty: 0 },
      { purchaseOrderLineId: 'pol', acceptedQty: 0.6, rejectedQty: 0 },
    ] })).rejects.toBeInstanceOf(ConflictException);
  });
});
