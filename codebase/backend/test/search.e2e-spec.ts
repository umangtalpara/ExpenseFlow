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
import { Expense, ExpenseDocument } from '../src/modules/expenses/schemas/expense.schema';
import { Category, CategoryDocument } from '../src/modules/categories/schemas/category.schema';
import { PaymentMethod, PaymentMethodDocument, PaymentMethodType } from '../src/modules/payment-methods/schemas/payment-method.schema';
import { runWithTenant } from '../src/common/tenant/tenant.context';

describe('Global Search System (E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let projectModel: Model<ProjectDocument>;
  let vendorModel: Model<VendorDocument>;
  let expenseModel: Model<ExpenseDocument>;
  let categoryModel: Model<CategoryDocument>;
  let paymentMethodModel: Model<PaymentMethodDocument>;

  const tenantA_Admin = {
    email: 'admin-search-a@provenpeak.com',
    name: 'Admin A',
    password: 'password123',
    orgName: 'Search A Inc',
    orgSlug: 'searchainc',
  };

  const tenantB_Admin = {
    email: 'admin-search-b@provenpeak.com',
    name: 'Admin B',
    password: 'password123',
    orgName: 'Search B Inc',
    orgSlug: 'searchbinc',
  };

  let tokenA: string;
  let tokenB: string;
  let tenantAId: string;
  let tenantBId: string;

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
    expenseModel = moduleFixture.get<Model<ExpenseDocument>>(getModelToken(Expense.name));
    categoryModel = moduleFixture.get<Model<CategoryDocument>>(getModelToken(Category.name));
    paymentMethodModel = moduleFixture.get<Model<PaymentMethodDocument>>(getModelToken(PaymentMethod.name));

    // Clear collections
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await vendorModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await expenseModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await categoryModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await paymentMethodModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });

    // Sign up Tenant A
    const signupARes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(tenantA_Admin)
      .expect(HttpStatus.CREATED);
    tokenA = signupARes.body.accessToken;

    const userA = await userModel.findOne({ email: tenantA_Admin.email }).setOptions({ bypassTenantIsolation: true });
    tenantAId = userA!.organization.toString();

    // Sign up Tenant B
    const signupBRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(tenantB_Admin)
      .expect(HttpStatus.CREATED);
    tokenB = signupBRes.body.accessToken;

    const userB = await userModel.findOne({ email: tenantB_Admin.email }).setOptions({ bypassTenantIsolation: true });
    tenantBId = userB!.organization.toString();

    // Create resources in Tenant A context
    await new Promise<void>((resolve, reject) => {
      runWithTenant(tenantAId, async () => {
        try {
          await projectModel.create({
            name: 'SuperSecretProjectA',
            code: 'SSP_A',
            client: 'A-Corp',
            organization: tenantAId as any,
          });

          await vendorModel.create({
            name: 'AcmeSearchVendor',
            company: 'Acme Corp',
            organization: tenantAId as any,
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    // Create resources in Tenant B context
    await new Promise<void>((resolve, reject) => {
      runWithTenant(tenantBId, async () => {
        try {
          await projectModel.create({
            name: 'SuperSecretProjectB',
            code: 'SSP_B',
            client: 'B-Corp',
            organization: tenantBId as any,
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  });

  afterAll(async () => {
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await vendorModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await expenseModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await categoryModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await paymentMethodModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await app.close();
  });

  describe('Global Search Execution & Tenant Isolation', () => {
    it('should find Tenant A resources when searching as Tenant A', async () => {
      const response = await request(app.getHttpServer())
        .get('/search')
        .set('Authorization', `Bearer ${tokenA}`)
        .query({ q: 'SSP' })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('projects');
      expect(response.body.projects.length).toBe(1);
      expect(response.body.projects[0].name).toBe('SuperSecretProjectA');

      const responseVendor = await request(app.getHttpServer())
        .get('/search')
        .set('Authorization', `Bearer ${tokenA}`)
        .query({ q: 'Acme' })
        .expect(HttpStatus.OK);

      expect(responseVendor.body).toHaveProperty('vendors');
      expect(responseVendor.body.vendors.length).toBe(1);
      expect(responseVendor.body.vendors[0].name).toBe('AcmeSearchVendor');
    });

    it('should find Tenant B resources when searching as Tenant B, isolating from Tenant A', async () => {
      const response = await request(app.getHttpServer())
        .get('/search')
        .set('Authorization', `Bearer ${tokenB}`)
        .query({ q: 'SSP' })
        .expect(HttpStatus.OK);

      expect(response.body.projects.length).toBe(1);
      expect(response.body.projects[0].name).toBe('SuperSecretProjectB');

      // Tenant B searches for Tenant A's vendor
      const responseVendor = await request(app.getHttpServer())
        .get('/search')
        .set('Authorization', `Bearer ${tokenB}`)
        .query({ q: 'Acme' })
        .expect(HttpStatus.OK);

      expect(responseVendor.body.vendors.length).toBe(0);
    });

    it('should return empty results for empty query', async () => {
      const response = await request(app.getHttpServer())
        .get('/search')
        .set('Authorization', `Bearer ${tokenA}`)
        .query({ q: '' })
        .expect(HttpStatus.OK);

      expect(response.body.projects.length).toBe(0);
      expect(response.body.users.length).toBe(0);
    });
  });
});
