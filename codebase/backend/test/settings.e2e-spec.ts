import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Organization, OrganizationDocument } from '../src/modules/organizations/schemas/organization.schema';
import { User, UserDocument } from '../src/modules/users/schemas/user.schema';
import { Department, DepartmentDocument } from '../src/modules/departments/schemas/department.schema';
import { Designation, DesignationDocument } from '../src/modules/designations/schemas/designation.schema';

describe('Settings CRUD & Constraints (E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let departmentModel: Model<DepartmentDocument>;
  let designationModel: Model<DesignationDocument>;

  const signupData = {
    email: 'admin-settings@provenpeak.com',
    name: 'Admin Settings',
    password: 'password123',
    orgName: 'Settings Corp',
    orgSlug: 'settingscorp',
  };

  let adminAccessToken: string;
  let tenantId: string;
  let createdDepartmentId: string;
  let createdDesignationId: string;

  beforeAll(async () => {
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseflow_test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    organizationModel = moduleFixture.get<Model<OrganizationDocument>>(getModelToken(Organization.name));
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
    departmentModel = moduleFixture.get<Model<DepartmentDocument>>(getModelToken(Department.name));
    designationModel = moduleFixture.get<Model<DesignationDocument>>(getModelToken(Designation.name));

    // Clear collections
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await departmentModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await designationModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });

    // Sign up to establish tenant organization and admin user
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupData)
      .expect(HttpStatus.CREATED);

    adminAccessToken = signupResponse.body.accessToken;

    const user = await userModel.findOne({ email: signupData.email }).setOptions({ bypassTenantIsolation: true });
    tenantId = user!.organization.toString();
  });

  afterAll(async () => {
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await departmentModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await designationModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await app.close();
  });

  describe('Organization Profile Settings', () => {
    it('should retrieve current organization profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/organizations/profile')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.slug).toBe(signupData.orgSlug);
      expect(response.body.name).toBe(signupData.orgName);
      expect(response.body.currency).toBe('USD');
    });

    it('should allow admin to update organization profile', async () => {
      const response = await request(app.getHttpServer())
        .patch('/organizations/profile')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Updated Settings Corp',
          website: 'https://settingscorp.com',
          address: '123 Tech Avenue, Silicon Valley',
          currency: 'EUR',
        })
        .expect(HttpStatus.OK);

      expect(response.body.name).toBe('Updated Settings Corp');
      expect(response.body.website).toBe('https://settingscorp.com');
      expect(response.body.currency).toBe('EUR');
    });
  });

  describe('Departments CRUD Operations', () => {
    it('should create a department', async () => {
      const response = await request(app.getHttpServer())
        .post('/departments')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Engineering',
          code: 'ENG',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe('Engineering');
      expect(response.body.code).toBe('ENG');
      expect(response.body.organization.toString()).toBe(tenantId);
      createdDepartmentId = response.body._id;
    });

    it('should block duplicate department name or code per tenant', async () => {
      await request(app.getHttpServer())
        .post('/departments')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Engineering',
          code: 'ENG-NEW',
        })
        .expect(HttpStatus.CONFLICT);

      await request(app.getHttpServer())
        .post('/departments')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'New Engineering',
          code: 'ENG',
        })
        .expect(HttpStatus.CONFLICT);
    });

    it('should list all departments in active tenant context', async () => {
      const response = await request(app.getHttpServer())
        .get('/departments')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Engineering');
    });

    it('should update department details', async () => {
      const response = await request(app.getHttpServer())
        .put(`/departments/${createdDepartmentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Software Engineering',
        })
        .expect(HttpStatus.OK);

      expect(response.body.name).toBe('Software Engineering');
    });
  });

  describe('Designations CRUD Operations', () => {
    it('should create a designation', async () => {
      const response = await request(app.getHttpServer())
        .post('/designations')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Software Engineer',
          code: 'SWE',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe('Software Engineer');
      expect(response.body.code).toBe('SWE');
      createdDesignationId = response.body._id;
    });

    it('should block duplicate designation name or code per tenant', async () => {
      await request(app.getHttpServer())
        .post('/designations')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Software Engineer',
          code: 'SWE-NEW',
        })
        .expect(HttpStatus.CONFLICT);
    });

    it('should list all designations in active tenant context', async () => {
      const response = await request(app.getHttpServer())
        .get('/designations')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Software Engineer');
    });

    it('should update designation details', async () => {
      const response = await request(app.getHttpServer())
        .put(`/designations/${createdDesignationId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Senior Software Engineer',
        })
        .expect(HttpStatus.OK);

      expect(response.body.name).toBe('Senior Software Engineer');
    });
  });
});
