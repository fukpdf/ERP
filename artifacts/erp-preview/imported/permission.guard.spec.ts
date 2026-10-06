/**
 * permission.guard.spec.ts
 *
 * NOT EXECUTED IN THIS SANDBOX — needs @nestjs/common's real
 * ExecutionContext/Reflector at runtime, not just its types. The
 * equivalent logic (fail-closed on missing metadata, missing user, and
 * denied permission) IS exercised for real via PermissionService's own
 * tests (permission.service.spec.ts) and the CEL evaluator's tests, since
 * both of PermissionGuard's real decision-making dependencies are
 * covered there — this file additionally checks the Nest-specific
 * wiring (Reflector metadata reads, ExecutionContext plumbing) that only
 * exists once the real framework is present. See MANIFEST.md → "What's
 * NOT locally verified".
 */
import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PermissionService } from '../services/permission.service';
import { CelEvaluatorService } from '../services/cel-evaluator.service';
import { REQUIRE_PERMISSION_KEY, ALLOW_IF_KEY } from '../rbac.constants';

function mockContext(opts: { metadata?: Record<string, unknown>; user?: unknown; body?: unknown }): ExecutionContext {
  const handler = () => undefined;
  Reflect.defineMetadata(REQUIRE_PERMISSION_KEY, opts.metadata?.[REQUIRE_PERMISSION_KEY], handler);
  if (opts.metadata?.[ALLOW_IF_KEY]) Reflect.defineMetadata(ALLOW_IF_KEY, opts.metadata[ALLOW_IF_KEY], handler);
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ user: opts.user, body: opts.body ?? {} }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let permissions: jest.Mocked<PermissionService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        Reflector,
        { provide: PermissionService, useValue: { userHasAllPermissions: jest.fn(), userHasPermission: jest.fn(), assertHasPermission: jest.fn() } },
        { provide: CelEvaluatorService, useValue: { evaluateBoolean: jest.fn() } },
      ],
    }).compile();

    guard = moduleRef.get(PermissionGuard);
    permissions = moduleRef.get(PermissionService);
  });

  it('denies (fail-closed) when no @RequirePermission metadata is present', async () => {
    const ctx = mockContext({ user: { id: 'u1', tenantId: 't1' } });
    expect(await guard.canActivate(ctx)).toBe(false);
  });

  it('denies when there is no authenticated user on the request', async () => {
    const ctx = mockContext({ metadata: { [REQUIRE_PERMISSION_KEY]: ['erp.sales.order.create'] } });
    expect(await guard.canActivate(ctx)).toBe(false);
  });

  it('allows when the user has every required permission', async () => {
    permissions.userHasAllPermissions.mockResolvedValue(true);
    const ctx = mockContext({
      metadata: { [REQUIRE_PERMISSION_KEY]: ['erp.sales.order.create'] },
      user: { id: 'u1', tenantId: 't1' },
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('denies when the user is missing a required permission', async () => {
    permissions.userHasAllPermissions.mockResolvedValue(false);
    permissions.userHasPermission.mockResolvedValue(false);
    permissions.assertHasPermission.mockRejectedValue(new Error('denied'));
    const ctx = mockContext({
      metadata: { [REQUIRE_PERMISSION_KEY]: ['erp.sales.order.create'] },
      user: { id: 'u1', tenantId: 't1' },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });
});
