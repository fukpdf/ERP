# Module Contract Specification

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Explicit, Immutable Inter-Module Contracts  
**Standard:** Interface-First, Backward-Compatible Contract Design

---

## 1. Principles of Inter-Module Contracts

To ensure that hundreds or thousands of business capabilities can interact seamlessly without runtime breakage or hidden couplings, all inter-module communication is governed by **Contract Specifications**:

1. **Explicit Interface Definition:** Every module must publish its external API as TypeScript interfaces in `src/contract/`.
2. **Immutability & Semantic Versioning:** Once a contract version is published, it cannot undergo breaking changes. Breaking modifications require a new major contract version (e.g., `ISalesServiceV2`).
3. **Data Transfer Objects (DTOs) Only:** Contracts deal strictly with plain data objects (primitives, DTOs, readonly arrays). Domain entities with methods, database active records, or ORM model instances must **never** be passed across a contract boundary.
4. **Declared Exceptions:** Methods must declare known failure cases using typed error results (`Result<T, E>`) or documented domain exceptions.

---

## 2. Standard Contract Structure & Example

Below is the canonical contract pattern illustrated using the Inventory Module:

```typescript
// packages/modules/module-inventory/src/contract/inventory.contract.ts

import { Result } from '@erp/core/result';
import { 
  CheckAvailabilityInputDto, 
  AvailabilityResultDto, 
  ReserveStockInputDto, 
  ReservationResultDto, 
  ReleaseReservationInputDto 
} from './inventory.dto';
import { InventoryContractError } from './inventory.errors';

export const INVENTORY_SERVICE_TOKEN = Symbol('IInventoryPublicService');

export interface IInventoryPublicService {
  /**
   * Checks the available-to-promise (ATP) quantity for given items at specific locations.
   * Read-only operation; does not lock database rows.
   */
  checkAvailability(
    input: CheckAvailabilityInputDto
  ): Promise<Result<AvailabilityResultDto, InventoryContractError>>;

  /**
   * Creates an atomic stock reservation for a pending order or process.
   * Must be executed within a transactional context or idempotently via reservationId.
   */
  reserveStock(
    input: ReserveStockInputDto
  ): Promise<Result<ReservationResultDto, InventoryContractError>>;

  /**
   * Releases or decrements an existing stock reservation upon order fulfillment or cancellation.
   */
  releaseReservation(
    input: ReleaseReservationInputDto
  ): Promise<Result<void, InventoryContractError>>;
}
```

---

## 3. Standard DTO Definitions

DTOs must be fully self-contained and serializable to JSON:

```typescript
// packages/modules/module-inventory/src/contract/inventory.dto.ts

export interface CheckAvailabilityInputDto {
  readonly tenantId: string;
  readonly legalEntityId: string;
  readonly items: readonly {
    readonly productId: string;
    readonly warehouseId?: string;
    readonly requiredQuantity: number;
    readonly uomId: string; // Unit of Measure
  }[];
}

export interface AvailabilityResultDto {
  readonly isFullyAvailable: boolean;
  readonly itemAvailability: readonly {
    readonly productId: string;
    readonly warehouseId: string;
    readonly availableQuantity: number;
    readonly reservedQuantity: number;
    readonly incomingQuantity: number;
    readonly shortfallQuantity: number;
  }[];
}
```

---

## 4. Contract Error Model

Modules must never let raw SQL errors, foreign key violations, or unhandled exceptions escape across contract boundaries. Errors must be mapped to strongly-typed contract errors:

```typescript
// packages/modules/module-inventory/src/contract/inventory.errors.ts

export type InventoryContractErrorCode =
  | 'INSUFFICIENT_STOCK'
  | 'WAREHOUSE_NOT_FOUND'
  | 'PRODUCT_INACTIVE'
  | 'RESERVATION_EXPIRED'
  | 'CONCURRENCY_CONFLICT';

export class InventoryContractError extends Error {
  constructor(
    public readonly code: InventoryContractErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'InventoryContractError';
  }
}
```

---

## 5. Contract Testing & Backward Compatibility Rules

1. **Contract Test Suites:** Every module must maintain contract test suites verifying that its implementation satisfies every method, parameter validation, and error condition defined in the interface.
2. **Contract Mock Implementations:** Each module must publish an in-memory mock implementation (e.g., `MockInventoryPublicService`) to allow consuming modules to execute fast, isolated unit tests without loading the entire dependency graph.
3. **Deprecation Policy:** Deprecated contract methods must be decorated with `@deprecated` comments, logged with telemetry warnings, and supported for a minimum of two minor platform release cycles before removal.
