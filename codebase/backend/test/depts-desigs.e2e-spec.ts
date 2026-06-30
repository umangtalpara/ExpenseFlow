import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as supertest from 'supertest';
import { AppModule } from './../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

const request = (supertest as any).default || supertest;

jest.setTimeout(30000);

describe('Departments & Designations CRUD (e2e)', () => {
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
    await request(app.getHttpServer())
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

  describe('Departments Flow', () => {
    let deptId = '';

    it('/departments (POST) - should fail if employee tries to create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Engineering',
          code: 'ENG',
        })
        .expect(403);
    });

    it('/departments (POST) - should create department for admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Engineering',
          code: 'ENG',
        })
        .expect(201);

      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toBe('Engineering');
      expect(res.body.code).toBe('ENG');
      deptId = res.body._id;
    });

    it('/departments (GET) - should return list of departments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Engineering');
    });

    it('/departments/:id (PATCH) - should update department settings', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/departments/${deptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Software Engineering',
        })
        .expect(200);

      expect(res.body.name).toBe('Software Engineering');
    });

    it('/departments/:id (DELETE) - should delete department', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/departments/${deptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/departments/${deptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Designations Flow', () => {
    let desigId = '';

    it('/designations (POST) - should create designation for admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/designations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Software Architect',
          code: 'ARCH',
        })
        .expect(201);

      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toBe('Software Architect');
      expect(res.body.code).toBe('ARCH');
      desigId = res.body._id;
    });

    it('/designations (GET) - should return list of designations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/designations')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Software Architect');
    });

    it('/designations/:id (PATCH) - should update designation', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/designations/${desigId}`)
        .set('Authorization', `Bearer={adminToken}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Principal Software Architect',
        })
        .expect(200);

      expect(res.body.name).toBe('Principal Software Architect');
    });

    it('/designations/:id (DELETE) - should delete designation', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/designations/${desigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
