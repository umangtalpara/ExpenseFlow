import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Organization, OrganizationDocument } from '../src/modules/organizations/schemas/organization.schema';
import { User, UserDocument } from '../src/modules/users/schemas/user.schema';
import { Project, ProjectDocument } from '../src/modules/projects/schemas/project.schema';
import { Vendor, VendorDocument } from '../src/modules/vendors/schemas/vendor.schema';

describe('Vendor Management (E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let projectModel: Model<ProjectDocument>;
  let vendorModel: Model<VendorDocument>;

  const signupData = {
    email: 'admin-vendors@provenpeak.com',
    name: 'Admin Vendors',
    password: 'password123',
    orgName: 'Vendors Inc',
    orgSlug: 'vendorsinc',
  };

  let adminAccessToken: string;
  let createdProjectId: string;
  let createdVendorId: string;

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
    vendorModel = moduleFixture.get<Model<VendorDocument>>(getModelToken(Vendor.name));

    // Clear collections
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await vendorModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });

    // Sign up admin
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupData)
      .expect(HttpStatus.CREATED);

    adminAccessToken = signupResponse.body.accessToken;

    // Create a Project to link with
    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Project Orion',
        code: 'ORN',
        client: 'Lockheed',
        budget: 500000,
      })
      .expect(HttpStatus.CREATED);

    createdProjectId = projectResponse.body._id;
  });

  afterAll(async () => {
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await vendorModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await app.close();
  });

  describe('POST /vendors (Create Vendor)', () => {
    it('should allow admin with projects:manage to create vendor details', async () => {
      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Office Supplies Depot',
          company: 'Acme Supplies Ltd',
          gstPan: '22AAAAA0000A1Z1',
          contactEmail: 'sales@acmesupplies.com',
          contactPhone: '+15550188',
          bankName: 'First Union Bank',
          bankAccount: '1234567890',
          bankIfsc: 'FUB0001',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe('Office Supplies Depot');
      expect(response.body.company).toBe('Acme Supplies Ltd');
      createdVendorId = response.body._id;
    });

    it('should block duplicate vendor name or company legal name per tenant', async () => {
      await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Office Supplies Depot',
          company: 'Acme Supplies Ltd New',
        })
        .expect(HttpStatus.CONFLICT);
    });
  });

  describe('GET /vendors (List Vendors)', () => {
    it('should return all vendors scoped to active tenant context', async () => {
      const response = await request(app.getHttpServer())
        .get('/vendors')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Office Supplies Depot');
    });
  });

  describe('POST /vendors/:id/link-projects (Link Project Context)', () => {
    it('should allow linking vendor to project', async () => {
      await request(app.getHttpServer())
        .post(`/vendors/${createdVendorId}/link-projects`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ projectIds: [createdProjectId] })
        .expect(HttpStatus.OK);

      const response = await request(app.getHttpServer())
        .get(`/vendors/${createdVendorId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.projects.length).toBe(1);
      expect(response.body.projects[0]._id).toBe(createdProjectId);
    });
  });
});
