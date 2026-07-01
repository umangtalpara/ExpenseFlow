import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { Organization, OrganizationDocument } from '../src/modules/organizations/schemas/organization.schema';
import { User, UserDocument, UserStatus } from '../src/modules/users/schemas/user.schema';
import { Role, RoleDocument } from '../src/modules/roles/schemas/role.schema';
import { runWithTenant } from '../src/common/tenant/tenant.context';

describe('Employee Directory & Management (E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let roleModel: Model<RoleDocument>;

  const signupData = {
    email: 'admin-dir@provenpeak.com',
    name: 'Admin Directory',
    password: 'password123',
    orgName: 'Directory Inc',
    orgSlug: 'directoryinc',
  };

  let adminAccessToken: string;
  let employeeAccessToken: string;
  let tenantId: string;
  let employeeUserId: string;

  beforeAll(async () => {
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseflow_test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    organizationModel = moduleFixture.get<Model<OrganizationDocument>>(getModelToken(Organization.name));
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
    roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));

    // Clear collections
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });

    // 1. Sign up admin
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupData)
      .expect(HttpStatus.CREATED);

    adminAccessToken = signupResponse.body.accessToken;

    const adminUser = await userModel.findOne({ email: signupData.email }).setOptions({ bypassTenantIsolation: true });
    tenantId = adminUser!.organization.toString();

    // Fetch default Employee role
    const employeeRole = await roleModel.findOne({ name: 'Employee', organization: adminUser!.organization }).setOptions({ bypassTenantIsolation: true });
    
    // 2. Create Employee User
    let employeeUser: any;
    await new Promise<void>((resolve, reject) => {
      runWithTenant(tenantId, async () => {
        try {
          employeeUser = await userModel.create({
            email: 'employee-dir@provenpeak.com',
            name: 'Jane Employee',
            password: await bcrypt.hash('password123', 12),
            organization: new Types.ObjectId(tenantId),
            role: employeeRole!._id,
            status: UserStatus.ACTIVE,
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    employeeUserId = employeeUser._id.toString();

    // 3. Log in employee
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'employee-dir@provenpeak.com',
        password: 'password123',
      })
      .expect(HttpStatus.OK);

    employeeAccessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await app.close();
  });

  describe('GET /users (Directory Listing)', () => {
    it('should retrieve a paginated directory for authenticated users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=5')
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.total).toBe(2); // Admin + Employee
    });

    it('should support search query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?search=Jane')
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.users.length).toBe(1);
      expect(response.body.users[0].name).toBe('Jane Employee');
    });
  });

  describe('PATCH /users/:id (Profile Management)', () => {
    it('should block non-admin employee from updating profile settings (RBAC)', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${employeeUserId}`)
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .send({ department: 'Engineering' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should allow admin to update employee profile', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${employeeUserId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          department: 'Customer Success',
          designation: 'Manager',
          mobile: '+15550199',
        })
        .expect(HttpStatus.OK);

      expect(response.body.department).toBe('Customer Success');
      expect(response.body.designation).toBe('Manager');
      expect(response.body.mobile).toBe('+15550199');
    });

    it('should block user from being their own manager', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${employeeUserId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ manager: employeeUserId })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('PATCH /users/:id/status (Deactivation)', () => {
    it('should allow admin to disable employee and verify employee can no longer log in', async () => {
      // Disable
      await request(app.getHttpServer())
        .patch(`/users/${employeeUserId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: UserStatus.DISABLED })
        .expect(HttpStatus.OK);

      // Verify login fails
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'employee-dir@provenpeak.com',
          password: 'password123',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
