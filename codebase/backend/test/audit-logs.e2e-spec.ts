import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Organization, OrganizationDocument } from '../src/modules/organizations/schemas/organization.schema';
import { User, UserDocument } from '../src/modules/users/schemas/user.schema';
import { AuditLog, AuditLogDocument } from '../src/modules/audit-logs/schemas/audit-log.schema';
import { Project, ProjectDocument } from '../src/modules/projects/schemas/project.schema';
import { Role, RoleDocument } from '../src/modules/roles/schemas/role.schema';
import { runWithTenant } from '../src/common/tenant/tenant.context';

describe('Audit Logging System (E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let auditLogModel: Model<AuditLogDocument>;
  let projectModel: Model<ProjectDocument>;
  let roleModel: Model<RoleDocument>;

  const adminSignupData = {
    email: 'admin-audit@provenpeak.com',
    name: 'Admin Audit',
    password: 'password123',
    orgName: 'Audit Labs',
    orgSlug: 'auditlabs',
  };

  const employeeData = {
    email: 'employee-audit@provenpeak.com',
    name: 'Employee Audit',
    password: 'password123',
  };

  let adminAccessToken: string;
  let employeeAccessToken: string;
  let tenantId: string;
  let createdProjectId: string;

  beforeAll(async () => {
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseflow_test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    organizationModel = moduleFixture.get<Model<OrganizationDocument>>(getModelToken(Organization.name));
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
    auditLogModel = moduleFixture.get<Model<AuditLogDocument>>(getModelToken(AuditLog.name));
    projectModel = moduleFixture.get<Model<ProjectDocument>>(getModelToken(Project.name));
    roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));

    // Clear collections
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await auditLogModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });

    // Sign up admin
    const adminSignupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(adminSignupData);

    if (adminSignupRes.status !== HttpStatus.CREATED) {
      console.log('AUDIT LOG SIGNUP FAILED:', adminSignupRes.body);
    }
    expect(adminSignupRes.status).toBe(HttpStatus.CREATED);

    adminAccessToken = adminSignupRes.body.accessToken;

    const adminUser = await userModel.findOne({ email: adminSignupData.email }).setOptions({ bypassTenantIsolation: true });
    tenantId = adminUser!.organization.toString();

    // Get the Employee role
    const employeeRole = await roleModel.findOne({ name: 'Employee', organization: adminUser!.organization }).setOptions({ bypassTenantIsolation: true });

    // Invite & create employee
    const inviteRes = await request(app.getHttpServer())
      .post('/invitations')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ email: employeeData.email, roleId: employeeRole!._id.toString() });

    expect(inviteRes.status).toBe(HttpStatus.CREATED);
    const token = inviteRes.body.token;

    const claimRes = await request(app.getHttpServer())
      .post('/invitations/accept')
      .send({
        token,
        name: employeeData.name,
        password: employeeData.password,
      });

    expect(claimRes.status).toBe(HttpStatus.OK);
    employeeAccessToken = claimRes.body.accessToken;
  });

  afterAll(async () => {
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await auditLogModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await app.close();
  });

  describe('Audit Logging Verification', () => {
    it('should log logins and signups', async () => {
      // Find audit logs in DB
      const logs = await auditLogModel.find({}).setOptions({ bypassTenantIsolation: true });
      
      const signupLog = logs.find((l) => l.action === 'SIGNUP');
      expect(signupLog).toBeDefined();
      expect(signupLog!.entityType).toBe('User');

      // Do another login to trigger login log
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminSignupData.email, password: adminSignupData.password })
        .expect(HttpStatus.OK);

      const updatedLogs = await auditLogModel.find({}).setOptions({ bypassTenantIsolation: true });
      const loginLog = updatedLogs.find((l) => l.action === 'LOGIN');
      expect(loginLog).toBeDefined();
    });

    it('should automatically log document creations (plugin post-save hook)', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Audit Audit Audit',
          code: 'AAA',
          client: 'Client A',
          budget: 20000,
        })
        .expect(HttpStatus.CREATED);

      createdProjectId = response.body._id;

      // Check audit logs
      const logs = await auditLogModel.find({ action: 'CREATE' }).setOptions({ bypassTenantIsolation: true });
      const projectCreateLog = logs.find((l) => l.entityId === createdProjectId);
      expect(projectCreateLog).toBeDefined();
      expect(projectCreateLog!.entityType).toBe('Project');
      expect(projectCreateLog!.details.name).toBe('Audit Audit Audit');
    });

    it('should automatically log document updates (plugin post-findOneAndUpdate hook)', async () => {
      await request(app.getHttpServer())
        .put(`/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Audit Project Updated Name',
          budget: 25000,
        })
        .expect(HttpStatus.OK);

      // Check audit logs
      const logs = await auditLogModel.find({ action: 'UPDATE' }).setOptions({ bypassTenantIsolation: true });
      const projectUpdateLog = logs.find((l) => l.entityId === createdProjectId);
      expect(projectUpdateLog).toBeDefined();
      expect(projectUpdateLog!.details.$set.name).toBe('Audit Project Updated Name');
    });

    it('should allow Org Admin to fetch paginated audit logs', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should block normal employees from viewing audit logs', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
