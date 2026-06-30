import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as supertest from 'supertest';
import { AppModule } from './../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

const request = (supertest as any).default || supertest;

jest.setTimeout(30000);

describe('OrganizationsController (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;

  let adminToken = '';
  let employeeToken = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    mongooseConnection = app.get<Connection>(getConnectionToken());
    await mongooseConnection.dropDatabase();

    // 1. Signup admin & org
    const signupRes = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        orgName: 'Acme Space',
        orgSlug: 'acmespace',
        adminName: 'Acme Admin',
        adminEmail: 'admin@acmespace.com',
        password: 'password123',
      })
      .expect(201);

    // 2. Login admin to get token
    const loginAdminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@acmespace.com',
        password: 'password123',
      })
      .expect(200);
    adminToken = loginAdminRes.body.accessToken;

    // 3. Invite employee
    const inviteRes = await request(app.getHttpServer())
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Acme Staff',
        email: 'staff@acmespace.com',
        role: 'employee',
      })
      .expect(201);

    // 4. Accept employee invite
    await request(app.getHttpServer())
      .post('/api/v1/auth/invite/accept')
      .send({
        token: inviteRes.body.inviteToken,
        password: 'staffpassword123',
      })
      .expect(200);

    // 5. Login employee to get token
    const loginEmployeeRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'staff@acmespace.com',
        password: 'staffpassword123',
      })
      .expect(200);
    employeeToken = loginEmployeeRes.body.accessToken;
  });

  afterAll(async () => {
    await mongooseConnection.dropDatabase();
    await app.close();
  });

  it('/organizations/me (GET) - should return organization details for admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/organizations/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.name).toBe('Acme Space');
    expect(res.body.slug).toBe('acmespace');
    expect(res.body.currency).toBe('USD');
  });

  it('/organizations/me (GET) - should return organization details for employee', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/organizations/me')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(res.body.name).toBe('Acme Space');
  });

  it('/organizations/me (PATCH) - should update settings when called by admin', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/organizations/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        currency: 'EUR',
        timezone: 'Europe/Paris',
        taxSettings: {
          taxId: 'VAT-12345',
          taxName: 'VAT',
          taxRate: 20,
        },
      })
      .expect(200);

    expect(res.body.currency).toBe('EUR');
    expect(res.body.timezone).toBe('Europe/Paris');
    expect(res.body.taxSettings.taxId).toBe('VAT-12345');
    expect(res.body.taxSettings.taxRate).toBe(20);
  });

  it('/organizations/me (PATCH) - should fail with 403 when called by employee', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/organizations/me')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        currency: 'GBP',
      })
      .expect(403);
  });
});
