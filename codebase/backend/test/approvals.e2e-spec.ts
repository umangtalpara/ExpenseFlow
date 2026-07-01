import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Organization, OrganizationDocument } from '../src/modules/organizations/schemas/organization.schema';
import { User, UserDocument } from '../src/modules/users/schemas/user.schema';
import { Role, RoleDocument } from '../src/modules/roles/schemas/role.schema';
import { Project, ProjectDocument } from '../src/modules/projects/schemas/project.schema';
import { Category, CategoryDocument } from '../src/modules/categories/schemas/category.schema';
import { PaymentMethod, PaymentMethodDocument, PaymentMethodType } from '../src/modules/payment-methods/schemas/payment-method.schema';
import { Expense, ExpenseDocument, ExpenseStatus } from '../src/modules/expenses/schemas/expense.schema';
import { ApprovalWorkflow, ApprovalWorkflowDocument } from '../src/modules/approvals/schemas/approval-workflow.schema';
import { ApprovalRequest, ApprovalRequestDocument, ApprovalRequestStatus } from '../src/modules/approvals/schemas/approval-request.schema';

import { runWithTenant } from '../src/common/tenant/tenant.context';

describe('Dynamic Approval Workflows Engine (E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let roleModel: Model<RoleDocument>;
  let projectModel: Model<ProjectDocument>;
  let categoryModel: Model<CategoryDocument>;
  let paymentMethodModel: Model<PaymentMethodDocument>;
  let expenseModel: Model<ExpenseDocument>;
  let workflowModel: Model<ApprovalWorkflowDocument>;
  let requestModel: Model<ApprovalRequestDocument>;

  const signupData = {
    email: 'admin-approvals@provenpeak.com',
    name: 'Admin Approvals',
    password: 'password123',
    orgName: 'Approvals Corp',
    orgSlug: 'approvalscorp',
  };

  let adminAccessToken: string;
  let tenantId: string;
  let employeeToken: string;
  let financeManagerToken: string;

  let employeeUserId: string;
  let financeManagerRoleId: string;

  let categoryId: string;
  let paymentMethodId: string;
  let projectId: string;
  let workflowId: string;
  let expenseId: string;
  let approvalRequestId: string;

  beforeAll(async () => {
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseflow_test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider('BullQueue_budget-alerts')
    .useValue({
      add: jest.fn(),
    })
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    organizationModel = moduleFixture.get<Model<OrganizationDocument>>(getModelToken(Organization.name));
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
    roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));
    projectModel = moduleFixture.get<Model<ProjectDocument>>(getModelToken(Project.name));
    categoryModel = moduleFixture.get<Model<CategoryDocument>>(getModelToken(Category.name));
    paymentMethodModel = moduleFixture.get<Model<PaymentMethodDocument>>(getModelToken(PaymentMethod.name));
    expenseModel = moduleFixture.get<Model<ExpenseDocument>>(getModelToken(Expense.name));
    workflowModel = moduleFixture.get<Model<ApprovalWorkflowDocument>>(getModelToken(ApprovalWorkflow.name));
    requestModel = moduleFixture.get<Model<ApprovalRequestDocument>>(getModelToken(ApprovalRequest.name));

    // Clear DB
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await categoryModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await paymentMethodModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await expenseModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await workflowModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await requestModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });

    // 1. Sign up admin
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupData)
      .expect(HttpStatus.CREATED);

    adminAccessToken = signupResponse.body.accessToken;

    const adminUser = await userModel.findOne({ email: signupData.email }).setOptions({ bypassTenantIsolation: true });
    tenantId = adminUser!.organization.toString();

    // 2. Fetch or Create Finance Manager Role
    const rolesList = await roleModel.find({ organization: tenantId }).setOptions({ bypassTenantIsolation: true });
    
    const employeeRole = rolesList.find((r) => r.name === 'Employee');
    const employeeRoleId = employeeRole!._id.toString();

    let financeManagerRole = rolesList.find((r) => r.name === 'Finance Manager');
    if (!financeManagerRole) {
      await new Promise<void>((resolve) => {
        runWithTenant(tenantId, async () => {
          const newRole = await roleModel.create({
            name: 'Finance Manager',
            description: 'Finances',
            organization: new Types.ObjectId(tenantId),
            permissions: [],
          });
          financeManagerRoleId = newRole._id.toString();
          resolve();
        });
      });
    } else {
      financeManagerRoleId = financeManagerRole._id.toString();
    }

    // 3. Create Employee B
    const employeeBRes = await request(app.getHttpServer())
      .post('/invitations')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: 'employee-b@provenpeak.com',
        roleId: employeeRoleId,
      })
      .expect(HttpStatus.CREATED);

    const claimBToken = employeeBRes.body.token;

    const onboardB = await request(app.getHttpServer())
      .post('/invitations/accept')
      .send({
        token: claimBToken,
        name: 'Employee B',
        password: 'password123',
      })
      .expect(HttpStatus.OK);

    const userDoc = await userModel.findOne({ email: 'employee-b@provenpeak.com' }).setOptions({ bypassTenantIsolation: true });
    employeeUserId = userDoc!._id.toString();
    employeeToken = onboardB.body.accessToken;

    // 4. Create Finance Manager User
    const finRes = await request(app.getHttpServer())
      .post('/invitations')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: 'finance@provenpeak.com',
        roleId: financeManagerRoleId,
      })
      .expect(HttpStatus.CREATED);

    const claimFinToken = finRes.body.token;

    const onboardFin = await request(app.getHttpServer())
      .post('/invitations/accept')
      .send({
        token: claimFinToken,
        name: 'Finance Manager User',
        password: 'password123',
      })
      .expect(HttpStatus.OK);

    financeManagerToken = onboardFin.body.accessToken;

    // 5. Create Category & Payment Method
    const catRes = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Travel Expenses', code: 'TRAVEL' })
      .expect(HttpStatus.CREATED);
    categoryId = catRes.body._id;

    const pmRes = await request(app.getHttpServer())
      .post('/payment-methods')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Cash', code: 'CASH', type: PaymentMethodType.CASH })
      .expect(HttpStatus.CREATED);
    paymentMethodId = pmRes.body._id;
  });

  afterAll(async () => {
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await projectModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await categoryModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await paymentMethodModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await expenseModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await workflowModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await requestModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await app.close();
  });

  describe('Approval Workflows Engine Configurations', () => {
    it('should prevent creating a workflow with non-linear step indexes', async () => {
      await request(app.getHttpServer())
        .post('/approvals/workflows')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Invalid Step Rule',
          steps: [
            { stepNumber: 2, approverUser: employeeUserId },
          ],
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should create a valid 2-step Approval Workflow rule for large travel expenses', async () => {
      const response = await request(app.getHttpServer())
        .post('/approvals/workflows')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Large Travel Rule',
          description: 'Travel above $500',
          isDefault: true,
          conditions: {
            minAmount: 500,
            category: categoryId,
          },
          steps: [
            { stepNumber: 1, approverUser: employeeUserId },
            { stepNumber: 2, approverRole: financeManagerRoleId },
          ],
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.steps.length).toBe(2);
      workflowId = response.body._id;
    });
  });

  describe('Workflows Execution Pipeline', () => {
    it('should submit an expense matching the rule, setting to step 1 pending', async () => {
      const response = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          amount: 800,
          currency: 'USD',
          date: '2026-06-01',
          category: categoryId,
          paymentMethod: paymentMethodId,
          merchant: 'Air France flights',
          status: ExpenseStatus.SUBMITTED,
        })
        .expect(HttpStatus.CREATED);

      expenseId = response.body._id;

      // Verify that an ApprovalRequest has been created
      const reqDoc = await requestModel.findOne({ expense: expenseId }).setOptions({ bypassTenantIsolation: true });
      expect(reqDoc).toBeDefined();
      expect(reqDoc!.status).toBe(ApprovalRequestStatus.PENDING);
      expect(reqDoc!.currentStepNumber).toBe(1);
      approvalRequestId = reqDoc!._id.toString();
    });

    it('should fail if an unauthorized user attempts to approve the step', async () => {
      await request(app.getHttpServer())
        .post(`/approvals/${approvalRequestId}/action`)
        .set('Authorization', `Bearer ${financeManagerToken}`) // Finance Manager is step 2, not step 1!
        .send({ action: 'approved', comment: 'Looks good' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should transition to step 2 when step 1 approver user approves', async () => {
      await request(app.getHttpServer())
        .post(`/approvals/${approvalRequestId}/action`)
        .set('Authorization', `Bearer ${employeeToken}`) // Employee B is step 1 approver user
        .send({ action: 'approved', comment: 'Step 1 OK' })
        .expect(HttpStatus.OK);

      const reqDoc = await requestModel.findById(approvalRequestId).setOptions({ bypassTenantIsolation: true });
      expect(reqDoc!.currentStepNumber).toBe(2);
      expect(reqDoc!.status).toBe(ApprovalRequestStatus.PENDING);

      // Verify expense is still submitted
      const expense = await expenseModel.findById(expenseId).setOptions({ bypassTenantIsolation: true });
      expect(expense!.status).toBe(ExpenseStatus.SUBMITTED);
    });

    it('should finalize workflow and set expense to approved when step 2 approver role approves', async () => {
      await request(app.getHttpServer())
        .post(`/approvals/${approvalRequestId}/action`)
        .set('Authorization', `Bearer ${financeManagerToken}`) // Finance Manager User matches Finance Manager Role
        .send({ action: 'approved', comment: 'All approved' })
        .expect(HttpStatus.OK);

      const reqDoc = await requestModel.findById(approvalRequestId).setOptions({ bypassTenantIsolation: true });
      expect(reqDoc!.status).toBe(ApprovalRequestStatus.APPROVED);

      // Verify expense is now approved!
      const expense = await expenseModel.findById(expenseId).setOptions({ bypassTenantIsolation: true });
      expect(expense!.status).toBe(ExpenseStatus.APPROVED);
    });
  });
});
