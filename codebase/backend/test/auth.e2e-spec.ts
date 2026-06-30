import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as supertest from 'supertest';
import { AppModule } from './../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

const request = (supertest as any).default || supertest;

jest.setTimeout(30000);

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;

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
    // Clear test database to start fresh
    await mongooseConnection.dropDatabase();
  });

  afterAll(async () => {
    await mongooseConnection.dropDatabase();
    await app.close();
  });

  const testOrg = {
    orgName: 'Test Corp',
    orgSlug: 'testcorp',
    adminName: 'Test Admin',
    adminEmail: 'admin@testcorp.com',
    password: 'password123',
  };

  it('/auth/signup (POST) - should register organization and admin', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send(testOrg)
      .expect(201);

    expect(res.body).toHaveProperty('organizationId');
    expect(res.body).toHaveProperty('userId');
    expect(res.body.message).toContain('successfully registered');
  });

  it('/auth/signup (POST) - should fail if slug already exists', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send(testOrg)
      .expect(409);
  });

  let accessToken = '';
  let refreshToken = '';

  it('/auth/login (POST) - should login and return JWT tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testOrg.adminEmail,
        password: testOrg.password,
      })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe(testOrg.adminEmail);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('/auth/refresh (POST) - should rotate access token', async () => {
    // Wait 1s to ensure iat changes, leading to a different access token string
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.accessToken).not.toBe(accessToken);
  });

  const testEmployee = {
    name: 'Test Employee',
    email: 'employee@testcorp.com',
    role: 'employee',
  };
  let inviteToken = '';

  it('/auth/invite (POST) - should fail if not authenticated', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/invite')
      .send(testEmployee)
      .expect(401);
  });

  it('/auth/invite (POST) - should invite employee if authenticated', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(testEmployee)
      .expect(201);

    expect(res.body).toHaveProperty('inviteToken');
    expect(res.body).toHaveProperty('inviteLink');
    inviteToken = res.body.inviteToken;
  });

  it('/auth/invite/accept (POST) - should accept invite and activate employee', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/invite/accept')
      .send({
        token: inviteToken,
        password: 'employeepassword123',
      })
      .expect(200);

    expect(res.body.email).toBe(testEmployee.email);
    expect(res.body.message).toContain('activated successfully');
  });

  it('/auth/login (POST) - should login newly invited employee', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testEmployee.email,
        password: 'employeepassword123',
      })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.role).toBe('employee');
  });
});
