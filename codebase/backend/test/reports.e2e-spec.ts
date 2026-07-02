import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Organization, OrganizationDocument } from '../src/modules/organizations/schemas/organization.schema';
import { User, UserDocument } from '../src/modules/users/schemas/user.schema';
import { Project, ProjectDocument } from '../src/modules/projects/schemas/project.schema';
import { Category, CategoryDocument } from '../src/modules/categories/schemas/category.schema';
import { PaymentMethod, PaymentMethodDocument, PaymentMethodType } from '../src/modules/payment-methods/schemas/payment-method.schema';
import { Expense, ExpenseDocument, ExpenseStatus } from '../src/modules/expenses/schemas/expense.schema';
import { Role, RoleDocument } from '../src/modules/roles/schemas/role.schema';
import { runWithTenant } from '../src/common/tenant/tenant.context';

describe('Reports & Analytics (E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let projectModel: Model<ProjectDocument>;
  let categoryModel: Model<CategoryDocument>;
  let paymentMethodModel: Model<PaymentMethodDocument>;
  let expenseModel: Model<ExpenseDocument>;
  let roleModel: Model<RoleDocument>;

  const adminSignupData = {
    email: 'admin-reports@provenpeak.com',
    name: 'Admin Reports',
    password: 'password123',
    orgName: 'Reporting Corp',
    orgSlug: 'reportingcorp',
  };

  let adminAccessToken: string;
  let tenantId: string;
  let createdProjectId: string;
  let categoryId: string;
  let paymentMethodId: string;

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
    categoryModel = moduleFixture.get<Model<CategoryDocument>>(getModelToken(Category.name));
    paymentMethodModel = moduleFixture.get<Model<PaymentMethodDocument>>(getModelToken(PaymentMethod.name));
    expenseModel = moduleFixture.get<Model<ExpenseDocument>>(getModelToken(Expense.name));
    roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));

    // Clear collections
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await categoryModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await paymentMethodModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await expenseModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });

    // 1. Sign up admin
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(adminSignupData)
      .expect(HttpStatus.CREATED);

    adminAccessToken = signupResponse.body.accessToken;

    const adminUser = await userModel.findOne({ email: adminSignupData.email }).setOptions({ bypassTenantIsolation: true });
    tenantId = adminUser!.organization.toString();

    // 2. Create entities inside tenant context
    await new Promise<void>((resolve, reject) => {
      runWithTenant(tenantId, async () => {
        try {
          const category = await categoryModel.create({
            name: 'Office Travel',
            code: 'TRAV',
            organization: tenantId as any,
          });
          categoryId = category._id.toString();

          const pm = await paymentMethodModel.create({
            name: 'Corporate Card',
            code: 'CC_CORP',
            type: PaymentMethodType.CORPORATE_CARD,
            organization: tenantId as any,
          });
          paymentMethodId = pm._id.toString();

          const project = await projectModel.create({
            name: 'Deep Reporting Project',
            code: 'DRP',
            client: 'Reporting Client',
            organization: tenantId as any,
          });
          createdProjectId = project._id.toString();

          // Create multiple expenses for testing analytics
          // Expense 1: Approved, 150 USD
          await expenseModel.create({
            title: 'Uber to office',
            merchant: 'Uber Rides',
            amount: 150,
            currency: 'USD',
            convertedAmount: 150,
            date: new Date(),
            category: category._id,
            paymentMethod: pm._id,
            project: project._id,
            status: ExpenseStatus.APPROVED,
            employee: adminUser!._id,
            organization: tenantId as any,
          });

          // Expense 2: Reimbursed, 250 USD
          await expenseModel.create({
            title: 'Hotel Booking',
            merchant: 'Marriott',
            amount: 250,
            currency: 'USD',
            convertedAmount: 250,
            date: new Date(),
            category: category._id,
            paymentMethod: pm._id,
            project: project._id,
            status: ExpenseStatus.REIMBURSED,
            employee: adminUser!._id,
            organization: tenantId as any,
          });

          // Expense 3: Pending, 75 USD
          await expenseModel.create({
            title: 'Dinner with client',
            merchant: 'Olive Garden',
            amount: 75,
            currency: 'USD',
            convertedAmount: 75,
            date: new Date(),
            category: category._id,
            paymentMethod: pm._id,
            project: project._id,
            status: ExpenseStatus.SUBMITTED,
            employee: adminUser!._id,
            organization: tenantId as any,
          });

          // Expense 4: Rejected, 50 USD
          await expenseModel.create({
            title: 'Incorrect item purchase',
            merchant: 'Walmart',
            amount: 50,
            currency: 'USD',
            convertedAmount: 50,
            date: new Date(),
            category: category._id,
            paymentMethod: pm._id,
            project: project._id,
            status: ExpenseStatus.REJECTED,
            employee: adminUser!._id,
            organization: tenantId as any,
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
    await categoryModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await paymentMethodModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await expenseModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await app.close();
  });

  describe('GET /analytics/dashboard', () => {
    it('should aggregate financial metrics correctly for the organization admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      const metrics = response.body;

      expect(metrics).toHaveProperty('cards');
      expect(metrics).toHaveProperty('charts');

      // Cards checking
      expect(metrics.cards.totalExpenses).toBe(400); // 150 + 250 (approved & reimbursed)
      expect(metrics.cards.pendingCount).toBe(1);
      expect(metrics.cards.pendingAmount).toBe(75);
      expect(metrics.cards.approvedCount).toBe(1); // status === approved
      expect(metrics.cards.rejectedCount).toBe(1);
      expect(metrics.cards.rejectedAmount).toBe(50);
      expect(metrics.cards.activeProjects).toBe(1);

      // Charts checking
      expect(metrics.charts.categorySpending.length).toBeGreaterThan(0);
      expect(metrics.charts.categorySpending[0].category).toBe('Office Travel');
      expect(metrics.charts.categorySpending[0].amount).toBe(400);

      expect(metrics.charts.projectSpending.length).toBeGreaterThan(0);
      expect(metrics.charts.projectSpending[0].project).toBe('Deep Reporting Project');
      expect(metrics.charts.projectSpending[0].amount).toBe(400);
    });
  });

  describe('GET /reports/data', () => {
    it('should return filtered paginated expenses', async () => {
      // Test status filter
      const resStatus = await request(app.getHttpServer())
        .get('/reports/data?status=submitted')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(resStatus.body.total).toBe(1);
      expect(resStatus.body.data[0].merchant).toBe('Olive Garden');

      // Test amount range filter
      const resAmount = await request(app.getHttpServer())
        .get('/reports/data?minAmount=100&maxAmount=200')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(resAmount.body.total).toBe(1);
      expect(resAmount.body.data[0].merchant).toBe('Uber Rides');
    });
  });

  describe('GET /reports/export', () => {
    it('should download report in CSV format', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/export?status=approved')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment; filename=');
      
      const csvText = response.text;
      expect(csvText).toContain('Date,Expense Title,Merchant,Employee Name');
      expect(csvText).toContain('Uber Rides');
      expect(csvText).not.toContain('Olive Garden'); // Olive Garden is pending, not approved
    });
  });
});
