import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Organization, OrganizationDocument } from '../src/modules/organizations/schemas/organization.schema';
import { User, UserDocument } from '../src/modules/users/schemas/user.schema';
import { Project, ProjectDocument } from '../src/modules/projects/schemas/project.schema';
import { Budget, BudgetDocument, BudgetScope } from '../src/modules/budgets/schemas/budget.schema';
import { AlertLog, AlertLogDocument } from '../src/modules/budgets/schemas/alert-log.schema';
import { Category, CategoryDocument } from '../src/modules/categories/schemas/category.schema';
import { PaymentMethod, PaymentMethodDocument, PaymentMethodType } from '../src/modules/payment-methods/schemas/payment-method.schema';
import { Expense, ExpenseDocument, ExpenseStatus } from '../src/modules/expenses/schemas/expense.schema';
import { BudgetAlertsProcessor } from '../src/modules/budgets/processors/budget-alerts.processor';

describe('Expenses Submission & Normalization (E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let projectModel: Model<ProjectDocument>;
  let budgetModel: Model<BudgetDocument>;
  let alertLogModel: Model<AlertLogDocument>;
  let categoryModel: Model<CategoryDocument>;
  let paymentMethodModel: Model<PaymentMethodDocument>;
  let expenseModel: Model<ExpenseDocument>;
  let processor: BudgetAlertsProcessor;

  const signupData = {
    email: 'admin-expenses@provenpeak.com',
    name: 'Admin Expenses',
    password: 'password123',
    orgName: 'Expenses Inc',
    orgSlug: 'expensesinc',
  };

  let adminAccessToken: string;
  let tenantId: string;
  let createdProjectId: string;
  let createdCategoryId: string;
  let createdPaymentMethodId: string;
  let projectBudgetId: string;

  beforeAll(async () => {
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseflow_test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider('BullQueue_budget-alerts')
    .useValue({
      add: jest.fn().mockImplementation(async (name, data) => {
        await processor.process({ data } as any);
      }),
    })
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    processor = moduleFixture.get<BudgetAlertsProcessor>(BudgetAlertsProcessor);

    organizationModel = moduleFixture.get<Model<OrganizationDocument>>(getModelToken(Organization.name));
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
    projectModel = moduleFixture.get<Model<ProjectDocument>>(getModelToken(Project.name));
    budgetModel = moduleFixture.get<Model<BudgetDocument>>(getModelToken(Budget.name));
    alertLogModel = moduleFixture.get<Model<AlertLogDocument>>(getModelToken(AlertLog.name));
    categoryModel = moduleFixture.get<Model<CategoryDocument>>(getModelToken(Category.name));
    paymentMethodModel = moduleFixture.get<Model<PaymentMethodDocument>>(getModelToken(PaymentMethod.name));
    expenseModel = moduleFixture.get<Model<ExpenseDocument>>(getModelToken(Expense.name));

    // Clear collections
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await budgetModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await alertLogModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await categoryModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await paymentMethodModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await expenseModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });

    // Sign up admin
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupData)
      .expect(HttpStatus.CREATED);

    adminAccessToken = signupResponse.body.accessToken;

    const adminUser = await userModel.findOne({ email: signupData.email }).setOptions({ bypassTenantIsolation: true });
    tenantId = adminUser!.organization.toString();

    // Create a Project
    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Project Delta',
        code: 'DEL',
        client: 'Client Y',
        budget: 150000,
      })
      .expect(HttpStatus.CREATED);

    createdProjectId = projectResponse.body._id;

    // Create active Org Budget (100k)
    await request(app.getHttpServer())
      .post('/budgets')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        scope: 'organization',
        amount: 100000,
        currency: 'USD',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })
      .expect(HttpStatus.CREATED);

    // Create active Project Budget (50k)
    const budgetResponse = await request(app.getHttpServer())
      .post('/budgets')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        scope: 'project',
        project: createdProjectId,
        amount: 50000,
        currency: 'USD',
        startDate: '2026-02-01',
        endDate: '2026-11-30',
        thresholds: [80, 100],
      })
      .expect(HttpStatus.CREATED);

    projectBudgetId = budgetResponse.body._id;
  });

  afterAll(async () => {
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await budgetModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await alertLogModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await categoryModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await paymentMethodModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await expenseModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await app.close();
  });

  describe('Categories & Payment Methods Setup', () => {
    it('should create an active Category', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Meals & Entertainment',
          code: 'MEALS',
          description: 'Dining out and events',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.code).toBe('MEALS');
      createdCategoryId = response.body._id;
    });

    it('should create an active Payment Method', async () => {
      const response = await request(app.getHttpServer())
        .post('/payment-methods')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Corporate Card',
          code: 'CORP_CARD',
          type: PaymentMethodType.CORPORATE_CARD,
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.code).toBe('CORP_CARD');
      createdPaymentMethodId = response.body._id;
    });
  });

  describe('Expense Submission & Normalization', () => {
    it('should save a draft claim, auto-normalizing EUR amount to base USD', async () => {
      const response = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          amount: 200,
          currency: 'EUR',
          date: '2026-06-01',
          category: createdCategoryId,
          paymentMethod: createdPaymentMethodId,
          project: createdProjectId,
          merchant: 'Bistro Paris',
          description: 'Team dinner',
          status: ExpenseStatus.DRAFT,
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.status).toBe(ExpenseStatus.DRAFT);
      expect(response.body.exchangeRate).toBe(1.1); // Mock EUR_USD rate is 1.1
      expect(response.body.convertedAmount).toBe(220); // 200 * 1.1 = 220 USD
    });

    it('should update project budget spent and trigger alert jobs upon submission', async () => {
      // Create a submission that exceeds 80% of 50k project budget (e.g. 41k USD = 41000)
      const response = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          amount: 41000,
          currency: 'USD',
          date: '2026-06-01',
          category: createdCategoryId,
          paymentMethod: createdPaymentMethodId,
          project: createdProjectId,
          merchant: 'Software Licensing Inc',
          status: ExpenseStatus.SUBMITTED,
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.status).toBe(ExpenseStatus.SUBMITTED);

      // Verify that budget spent in database has been incremented
      const budget = await budgetModel.findById(projectBudgetId).setOptions({ bypassTenantIsolation: true });
      expect(budget!.spent).toBe(41000); // 41k USD spent

      // Assert that alert log has been triggered (41k of 50k is 82%, crossing the 80% threshold!)
      const alerts = await alertLogModel.find({}).setOptions({ bypassTenantIsolation: true });
      expect(alerts.length).toBe(1);
      expect(alerts[0].threshold).toBe(80);
      expect(alerts[0].percentage).toBe(82);
    });

    it('should enforce Category maxLimit and requireReceipt validation rules', async () => {
      // 1. Create a category with limit 100 USD and requireReceipt: true
      const catRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Limited Receipts Cat',
          code: 'LTD_RC',
          description: 'Testing limit and receipt requirement rules',
          requireReceipt: true,
          maxLimit: 100,
        })
        .expect(HttpStatus.CREATED);

      const strictCatId = catRes.body._id;

      // 2. Submit expense exceeding limit -> expect 400
      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          amount: 150,
          currency: 'USD',
          date: '2026-06-01',
          category: strictCatId,
          paymentMethod: createdPaymentMethodId,
          merchant: 'Expensive Vendor',
          status: ExpenseStatus.SUBMITTED,
        })
        .expect(HttpStatus.BAD_REQUEST);

      // 3. Submit expense without receiptUrl -> expect 400
      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          amount: 50,
          currency: 'USD',
          date: '2026-06-01',
          category: strictCatId,
          paymentMethod: createdPaymentMethodId,
          merchant: 'Merchant X',
          status: ExpenseStatus.SUBMITTED,
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should upload a receipt file and save expense capturing GST and Vendor fields', async () => {
      // 1. Upload mock file
      const uploadRes = await request(app.getHttpServer())
        .post('/expenses/upload')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .attach('file', Buffer.from('mock pdf invoice content'), 'invoice.pdf')
        .expect(HttpStatus.CREATED);

      expect(uploadRes.body).toHaveProperty('url');
      const receiptUrl = uploadRes.body.url;

      // 2. Create expense claim with upload URL, GST, and Vendor name
      const expenseRes = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          amount: 80,
          currency: 'USD',
          date: '2026-06-01',
          category: createdCategoryId,
          paymentMethod: createdPaymentMethodId,
          merchant: 'Target Store',
          gst: 8,
          vendor: 'Target US Corp',
          receiptUrl,
          status: ExpenseStatus.SUBMITTED,
        })
        .expect(HttpStatus.CREATED);

      expect(expenseRes.body.gst).toBe(8);
      expect(expenseRes.body.vendor).toBe('Target US Corp');
      expect(expenseRes.body.receiptUrl).toBe(receiptUrl);
    });
  });
});
