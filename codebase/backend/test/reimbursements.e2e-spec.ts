import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Organization, OrganizationDocument } from '../src/modules/organizations/schemas/organization.schema';
import { User, UserDocument } from '../src/modules/users/schemas/user.schema';
import { Expense, ExpenseDocument, ExpenseStatus } from '../src/modules/expenses/schemas/expense.schema';
import { Category, CategoryDocument } from '../src/modules/categories/schemas/category.schema';
import { PaymentMethod, PaymentMethodDocument, PaymentMethodType } from '../src/modules/payment-methods/schemas/payment-method.schema';
import { Reimbursement, ReimbursementDocument, ReimbursementStatus } from '../src/modules/reimbursements/schemas/reimbursement.schema';
import { runWithTenant } from '../src/common/tenant/tenant.context';

describe('Reimbursements & Ledgers Module (E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let expenseModel: Model<ExpenseDocument>;
  let categoryModel: Model<CategoryDocument>;
  let paymentMethodModel: Model<PaymentMethodDocument>;
  let reimbursementModel: Model<ReimbursementDocument>;

  const signupData = {
    email: 'admin-reimburse@provenpeak.com',
    name: 'Admin Reimbursements',
    password: 'password123',
    orgName: 'Payouts Inc',
    orgSlug: 'payoutsinc',
  };

  let adminAccessToken: string;
  let tenantId: string;
  let createdCategoryId: string;
  let createdPaymentMethodId: string;
  let approvedExpenseId: string;
  let reimbursementBatchId: string;

  beforeAll(async () => {
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseflow_test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    organizationModel = moduleFixture.get<Model<OrganizationDocument>>(getModelToken(Organization.name));
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
    expenseModel = moduleFixture.get<Model<ExpenseDocument>>(getModelToken(Expense.name));
    categoryModel = moduleFixture.get<Model<CategoryDocument>>(getModelToken(Category.name));
    paymentMethodModel = moduleFixture.get<Model<PaymentMethodDocument>>(getModelToken(PaymentMethod.name));
    reimbursementModel = moduleFixture.get<Model<ReimbursementDocument>>(getModelToken(Reimbursement.name));

    // Sign up admin
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupData)
      .expect(HttpStatus.CREATED);

    adminAccessToken = signupResponse.body.accessToken;

    const adminUser = await userModel.findOne({ email: signupData.email }).setOptions({ bypassTenantIsolation: true });
    tenantId = adminUser!.organization.toString();

    // Create a Category, Payment Method, and Expense within the tenant context
    await new Promise<void>((resolve, reject) => {
      runWithTenant(tenantId, async () => {
        try {
          const category = await categoryModel.create({
            name: 'Business Travel',
            code: 'TRAVEL',
            organization: tenantId as any,
          });
          createdCategoryId = category._id.toString();

          const pm = await paymentMethodModel.create({
            name: 'Cash Payout',
            code: 'CASH',
            type: PaymentMethodType.CASH,
            organization: tenantId as any,
          });
          createdPaymentMethodId = pm._id.toString();

          const expense = await expenseModel.create({
            amount: 150,
            currency: 'USD',
            convertedAmount: 150,
            date: new Date(),
            category: category._id,
            paymentMethod: pm._id,
            merchant: 'Uber Rides',
            status: ExpenseStatus.APPROVED,
            employee: adminUser!._id,
            organization: tenantId as any,
          });
          approvedExpenseId = expense._id.toString();
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
    await expenseModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await categoryModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await paymentMethodModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await reimbursementModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await app.close();
  });

  describe('Reimbursement Batch Workflows', () => {
    it('should generate a draft reimbursement batch from approved expenses', async () => {
      const response = await request(app.getHttpServer())
        .post('/reimbursements/batches/generate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          batchName: 'Travel Payouts Q2',
          expenseIds: [approvedExpenseId],
          notes: 'Standard travel batch',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.batchName).toBe('Travel Payouts Q2');
      expect(response.body.status).toBe(ReimbursementStatus.DRAFT);
      expect(response.body.totalAmount).toBe(150);
      expect(response.body.expenses.length).toBe(1);

      reimbursementBatchId = response.body._id;
    });

    it('should fail to generate batch if no approved expenses exist', async () => {
      // Trying to generate a batch with a random expense ID
      await request(app.getHttpServer())
        .post('/reimbursements/batches/generate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          batchName: 'Empty Batch',
          expenseIds: [new Types.ObjectId().toString()],
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should list generated batches', async () => {
      const response = await request(app.getHttpServer())
        .get('/reimbursements/batches')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].batchName).toBe('Travel Payouts Q2');
    });

    it('should fetch batch details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/reimbursements/batches/${reimbursementBatchId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body._id).toBe(reimbursementBatchId);
      expect(response.body.expenses[0].merchant).toBe('Uber Rides');
    });

    it('should pay out the reimbursement batch and set expense to REIMBURSED', async () => {
      const response = await request(app.getHttpServer())
        .put(`/reimbursements/batches/${reimbursementBatchId}/pay`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          paymentMethodId: createdPaymentMethodId,
          referenceNumber: 'TXN-9988-ABC',
          payoutDate: new Date().toISOString(),
          notes: 'Paid via bank cash payout',
        })
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe(ReimbursementStatus.PAID);
      expect(response.body.referenceNumber).toBe('TXN-9988-ABC');

      // Assert that associated expense status is updated to REIMBURSED
      const updatedExpense = await expenseModel.findById(approvedExpenseId).setOptions({ bypassTenantIsolation: true });
      expect(updatedExpense!.status).toBe(ExpenseStatus.REIMBURSED);
    });

    it('should retrieve paid batches in the ledger query', async () => {
      const response = await request(app.getHttpServer())
        .get('/reimbursements/ledger')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBe(1);
      expect(response.body.data[0]._id).toBe(reimbursementBatchId);
    });

    it('should block deletion of a paid batch', async () => {
      await request(app.getHttpServer())
        .delete(`/reimbursements/batches/${reimbursementBatchId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.CONFLICT);
    });
  });
});
