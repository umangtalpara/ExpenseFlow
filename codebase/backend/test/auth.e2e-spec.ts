import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Organization, OrganizationDocument } from '../src/modules/organizations/schemas/organization.schema';
import { User, UserDocument } from '../src/modules/users/schemas/user.schema';
import { Role, RoleDocument } from '../src/modules/roles/schemas/role.schema';
import { Permission, PermissionDocument } from '../src/modules/permissions/schemas/permission.schema';
import { Invitation, InvitationDocument } from '../src/modules/invitations/schemas/invitation.schema';

describe('Authentication & Authorization (E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let roleModel: Model<RoleDocument>;
  let permissionModel: Model<PermissionDocument>;
  let invitationModel: Model<InvitationDocument>;

  const signupData = {
    email: 'admin@provenpeak.com',
    name: 'Admin User',
    password: 'password123',
    orgName: 'ProvenPeak Solutions',
    orgSlug: 'provenpeak',
  };

  let adminAccessToken: string;
  let adminRefreshToken: string;
  let employeeRoleId: string;
  let inviteToken: string;

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
    permissionModel = moduleFixture.get<Model<PermissionDocument>>(getModelToken(Permission.name));
    invitationModel = moduleFixture.get<Model<InvitationDocument>>(getModelToken(Invitation.name));

    // Reset database collections
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await permissionModel.deleteMany({});
    await invitationModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
  });

  afterAll(async () => {
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await permissionModel.deleteMany({});
    await invitationModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should successfully register a new organization and admin user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupData)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      adminAccessToken = response.body.accessToken;
      adminRefreshToken = response.body.refreshToken;

      // Verify organization was created
      const org = await organizationModel.findOne({ slug: signupData.orgSlug });
      expect(org).toBeDefined();
      expect(org?.name).toBe(signupData.orgName);

      // Verify admin user was created scoped to organization
      const user = await userModel.findOne({ email: signupData.email }).setOptions({ bypassTenantIsolation: true });
      expect(user).toBeDefined();
      expect(user?.name).toBe(signupData.name);
      expect(user?.organization.toString()).toBe(org?._id.toString());

      // Fetch employee role ID for later tests
      const role = await roleModel.findOne({ name: 'Employee', organization: org?._id }).setOptions({ bypassTenantIsolation: true });
      expect(role).toBeDefined();
      employeeRoleId = role!._id.toString();
    });

    it('should fail if organization slug is already taken', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          ...signupData,
          email: 'another@provenpeak.com',
        })
        .expect(HttpStatus.CONFLICT);
    });
  });

  describe('POST /auth/login', () => {
    it('should issue tokens for correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: signupData.email,
          password: signupData.password,
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: signupData.email,
          password: 'wrong_password',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should issue new tokens using a valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: adminRefreshToken })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });
  });

  describe('Forgot & Reset Password', () => {
    let resetToken: string;

    it('should generate reset password token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: signupData.email })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('token');
      resetToken = response.body.token;
    });

    it('should reset password using token', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: 'new_password_123',
        })
        .expect(HttpStatus.OK);

      // Verify login with new password
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: signupData.email,
          password: 'new_password_123',
        })
        .expect(HttpStatus.OK);

      adminAccessToken = response.body.accessToken;
      adminRefreshToken = response.body.refreshToken;
    });
  });

  describe('Invitations & RBAC', () => {
    const inviteEmail = 'employee@provenpeak.com';

    it('should protect invitations endpoint from unauthorized requests', async () => {
      await request(app.getHttpServer())
        .post('/invitations')
        .send({ email: inviteEmail, roleId: employeeRoleId })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should allow admin with users:manage permission to invite employee', async () => {
      const response = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ email: inviteEmail, roleId: employeeRoleId })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('token');
      inviteToken = response.body.token;
    });

    it('should allow public verification of invitation token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/invitations/verify/${inviteToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.email).toBe(inviteEmail);
      expect(response.body.organizationName).toBe(signupData.orgName);
      expect(response.body.roleName).toBe('Employee');
    });

    it('should allow onboarding user to accept invitation and claim profile', async () => {
      const response = await request(app.getHttpServer())
        .post('/invitations/accept')
        .send({
          token: inviteToken,
          name: 'Jane Employee',
          password: 'employee_password',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      const employeeToken = response.body.accessToken;

      // Verify newly created user can access app but is blocked from admin routes (RBAC)
      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ email: 'other@provenpeak.com', roleId: employeeRoleId })
        .expect(HttpStatus.FORBIDDEN); // Blocked because Employee lacks users:manage
    });
  });
});
