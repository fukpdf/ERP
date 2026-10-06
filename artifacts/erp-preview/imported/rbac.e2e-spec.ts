/**
 * e2e/rbac.e2e-spec.ts
 *
 * NOT EXECUTED IN THIS SANDBOX — needs a real Nest application, a real
 * auth module producing real JWTs (M3.1, not available to this session),
 * and per the prompt's own instruction ("If DATABASE_URL missing,
 * integration/e2e skip with clear message") a real database. This file
 * is the scenario the prompt asks for ("Admin creates custom role →
 * assigns to user → user can access"), written against supertest the way
 * the rest of this repo's e2e suite presumably already works. The
 * underlying logic it exercises (role creation, assignment, permission
 * check) IS covered for real, end to end at the service layer, by
 * role.service.spec.ts + control-erp-isolation.spec.ts +
 * permission.service.spec.ts. See MANIFEST.md → "What's NOT locally
 * verified".
 */
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { RbacModule } from '../../src/modules/rbac/rbac.module';

describe('RBAC e2e', () => {
  let app: INestApplication;
  const adminToken = 'Bearer test-admin-token'; // fixture — real repo wires this through M3.1's test helpers
  const userToken = 'Bearer test-user-token';

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      // eslint-disable-next-line no-console
      console.warn('DATABASE_URL not set — skipping RBAC e2e suite (see MANIFEST.md).');
      return;
    }
    const moduleRef = await Test.createTestingModule({ imports: [RbacModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const maybeIt = process.env.DATABASE_URL ? it : it.skip;

  maybeIt('admin creates a custom role, assigns it to a user, and the user can then access the gated endpoint', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/v1/rbac/roles')
      .set('Authorization', adminToken)
      .send({ key: 'erp.custom.reviewer', name: 'Reviewer', description: 'Reviews sales orders', permissionKeys: ['erp.sales.order.read'] })
      .expect(201);

    const roleId = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/v1/rbac/users/user-e2e-1/roles`)
      .set('Authorization', adminToken)
      .send({ roleKey: 'erp.custom.reviewer' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/v1/rbac/roles/' + roleId)
      .set('Authorization', userToken) // now-privileged user
      .expect(200);
  });

  maybeIt('a user without the role is denied with 403', async () => {
    await request(app.getHttpServer())
      .get('/v1/rbac/roles')
      .set('Authorization', 'Bearer no-permissions-token')
      .expect(403);
  });
});
