import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { Organization, OrganizationDocument } from '../src/modules/organizations/schemas/organization.schema';
import { User, UserDocument, UserStatus } from '../src/modules/users/schemas/user.schema';
import { Project, ProjectDocument } from '../src/modules/projects/schemas/project.schema';
import { Role, RoleDocument } from '../src/modules/roles/schemas/role.schema';
import { runWithTenant } from '../src/common/tenant/tenant.context';

describe('Project Management (E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let projectModel: Model<ProjectDocument>;
  let roleModel: Model<RoleDocument>;

  const signupData = {
    email: 'admin-projects@provenpeak.com',
    name: 'Admin Projects',
    password: 'password123',
    orgName: 'Projects Inc',
    orgSlug: 'projectsinc',
  };

  let adminAccessToken: string;
  let employeeAccessToken: string;
  let tenantId: string;
  let employeeUserId: string;
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
    projectModel = moduleFixture.get<Model<ProjectDocument>>(getModelToken(Project.name));
    roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));

    // Clear collections
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
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
            email: 'employee-projects@provenpeak.com',
            name: 'Joe Employee',
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
        email: 'employee-projects@provenpeak.com',
        password: 'password123',
      })
      .expect(HttpStatus.OK);

    employeeAccessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await app.close();
  });

  describe('POST /projects (Create Project)', () => {
    it('should block non-admin employee from creating a project (RBAC)', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .send({
          name: 'Restricted Project',
          code: 'RST',
          client: 'Client X',
          budget: 50000,
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should allow admin to create a project', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Apollo Landing',
          code: 'APL',
          client: 'NASA',
          budget: 1000000,
          currency: 'USD',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe('Apollo Landing');
      expect(response.body.code).toBe('APL');
      createdProjectId = response.body._id;
    });

    it('should block duplicate name/code in organization', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Apollo Landing',
          code: 'APL-NEW',
          client: 'NASA',
        })
        .expect(HttpStatus.CONFLICT);
    });
  });

  describe('GET /projects (List Projects)', () => {
    it('should list all projects scoped to organization for any authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Apollo Landing');
    });
  });

  describe('POST /projects/:id/members (Member Assignment)', () => {
    it('should allow admin to assign employees and managers to project', async () => {
      // Assign members
      await request(app.getHttpServer())
        .post(`/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ userIds: [employeeUserId] })
        .expect(HttpStatus.OK);

      // Verify population
      const response = await request(app.getHttpServer())
        .get(`/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.employees.length).toBe(1);
      expect(response.body.employees[0]._id).toBe(employeeUserId);
    });
  });
});
