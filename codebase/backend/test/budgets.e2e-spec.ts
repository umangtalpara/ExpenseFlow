import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Organization, OrganizationDocument } from '../src/modules/organizations/schemas/organization.schema';
import { User, UserDocument } from '../src/modules/users/schemas/user.schema';
import { Project, ProjectDocument } from '../src/modules/projects/schemas/project.schema';
import { Budget, BudgetDocument, BudgetScope, BudgetStatus } from '../src/modules/budgets/schemas/budget.schema';
import { AlertLog, AlertLogDocument } from '../src/modules/budgets/schemas/alert-log.schema';
import { BudgetAlertsProcessor } from '../src/modules/budgets/processors/budget-alerts.processor';

describe('Budget & Expense Alerts (E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let projectModel: Model<ProjectDocument>;
  let budgetModel: Model<BudgetDocument>;
  let alertLogModel: Model<AlertLogDocument>;
  let processor: BudgetAlertsProcessor;

  const signupData = {
    email: 'admin-budgets@provenpeak.com',
    name: 'Admin Budgets',
    password: 'password123',
    orgName: 'Budgets Inc',
    orgSlug: 'budgetsinc',
  };

  let adminAccessToken: string;
  let createdProjectId: string;
  let orgBudgetId: string;
  let projBudgetId: string;

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

    // Clear collections
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await budgetModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await alertLogModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });

    // Sign up admin
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupData)
      .expect(HttpStatus.CREATED);

    adminAccessToken = signupResponse.body.accessToken;

    // Create a Project
    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Project Alpha',
        code: 'PHA',
        client: 'Internal',
        budget: 200000,
      })
      .expect(HttpStatus.CREATED);

    createdProjectId = projectResponse.body._id;
  });

  afterAll(async () => {
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await budgetModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await alertLogModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await app.close();
  });

  describe('POST /budgets (Create Budget Cap)', () => {
    it('should allow admin to create an active Organization Budget', async () => {
      const response = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          scope: BudgetScope.ORGANIZATION,
          amount: 500000,
          currency: 'USD',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.scope).toBe(BudgetScope.ORGANIZATION);
      expect(response.body.amount).toBe(500000);
      orgBudgetId = response.body._id;
    });

    it('should block duplicate organization budget for overlapping dates', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          scope: BudgetScope.ORGANIZATION,
          amount: 100000,
          currency: 'USD',
          startDate: '2026-06-01',
          endDate: '2026-08-31',
        })
        .expect(HttpStatus.CONFLICT);
    });
  });

  describe('Project Budget allocations and ceiling checks', () => {
    it('should block project budget that exceeds remaining org budget cap', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          scope: BudgetScope.PROJECT,
          project: createdProjectId,
          amount: 600000, // Org is 500k, so 600k exceeds limits
          startDate: '2026-02-01',
          endDate: '2026-10-31',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should create project budget within org budget limits successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          scope: BudgetScope.PROJECT,
          project: createdProjectId,
          amount: 100000,
          startDate: '2026-02-01',
          endDate: '2026-10-31',
          thresholds: [80, 100],
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.scope).toBe(BudgetScope.PROJECT);
      expect(response.body.amount).toBe(100000);
      projBudgetId = response.body._id;
    });
  });

  describe('POST /budgets/:id/spent (Spent Updates & Alert logs dispatches)', () => {
    it('should trigger alert jobs on background queues when thresholds are crossed', async () => {
      // 1. Update spent to 85,000 (85% of 100k project budget, crossing 80%)
      await request(app.getHttpServer())
        .post(`/budgets/${projBudgetId}/spent`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ amount: 85000 })
        .expect(HttpStatus.OK);

      // Give BullMQ worker a small delay to pick up and process the alert job
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Query database alerts logs
      const alerts = await alertLogModel.find({}).setOptions({ bypassTenantIsolation: true });
      expect(alerts.length).toBe(1);
      expect(alerts[0].threshold).toBe(80);
      expect(alerts[0].percentage).toBe(85);
    });
  });
});
