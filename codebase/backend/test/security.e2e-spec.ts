import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Organization, OrganizationDocument } from '../src/modules/organizations/schemas/organization.schema';
import { User, UserDocument } from '../src/modules/users/schemas/user.schema';
import { Role, RoleDocument } from '../src/modules/roles/schemas/role.schema';
import { UserSession, UserSessionDocument } from '../src/modules/auth/schemas/session.schema';
import { Notification, NotificationDocument } from '../src/modules/notifications/schemas/notification.schema';
import { TotpHelper } from '../src/modules/auth/helpers/totp.helper';
import { NotificationsService } from '../src/modules/notifications/notifications.service';

describe('Security (2FA, Sessions & Notifications E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let roleModel: Model<RoleDocument>;
  let sessionModel: Model<UserSessionDocument>;
  let notificationModel: Model<NotificationDocument>;
  let notificationsService: NotificationsService;

  const adminSignupData = {
    email: 'admin-sec@provenpeak.com',
    name: 'Admin Security',
    password: 'password123',
    orgName: 'Security Corp',
    orgSlug: 'securitycorp',
  };

  let adminAccessToken: string;
  let adminUserId: string;
  let tenantId: string;

  beforeAll(async () => {
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseflow_test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    organizationModel = moduleFixture.get<Model<OrganizationDocument>>(getModelToken(Organization.name));
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
    roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));
    sessionModel = moduleFixture.get<Model<UserSessionDocument>>(getModelToken(UserSession.name));
    notificationModel = moduleFixture.get<Model<NotificationDocument>>(getModelToken(Notification.name));
    notificationsService = moduleFixture.get<NotificationsService>(NotificationsService);

    // Clear collections
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await sessionModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await notificationModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });

    // Signup admin user
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(adminSignupData)
      .expect(HttpStatus.CREATED);

    adminAccessToken = signupResponse.body.accessToken;

    const adminUser = await userModel.findOne({ email: adminSignupData.email }).setOptions({ bypassTenantIsolation: true });
    adminUserId = adminUser!._id.toString();
    tenantId = adminUser!.organization.toString();
  });

  afterAll(async () => {
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await sessionModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await notificationModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await app.close();
  });

  describe('Notifications Module', () => {
    it('should create in-app notifications and fetch them via controller', async () => {
      // 1. Manually trigger a notification creation
      await notificationsService.createNotification(
        adminUserId,
        'Expense Claim Audit Alert',
        'Your claim has been audited successfully',
        'expense_audited',
        { amount: 500 },
        tenantId,
      );

      // 2. Fetch notifications list
      const getRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(getRes.body.total).toBe(1);
      expect(getRes.body.data[0].title).toBe('Expense Claim Audit Alert');
      expect(getRes.body.data[0].isRead).toBe(false);

      const notifId = getRes.body.data[0]._id;

      // 3. Mark notification as read
      await request(app.getHttpServer())
        .put(`/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      // 4. Verify isRead is true
      const verifyRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(verifyRes.body.data[0].isRead).toBe(true);
    });
  });

  describe('2FA Security Setup & Login Verification', () => {
    let twoFactorSecret: string;
    let tempToken: string;

    it('should generate 2FA secret key', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/2fa/generate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('secret');
      expect(res.body).toHaveProperty('otpauthUrl');
      twoFactorSecret = res.body.secret;
    });

    it('should reject enabling 2FA with incorrect code', async () => {
      await request(app.getHttpServer())
        .post('/auth/2fa/enable')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ secret: twoFactorSecret, code: '000000' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should enable 2FA with correct TOTP code', async () => {
      const code = TotpHelper.getOTP(twoFactorSecret);
      
      await request(app.getHttpServer())
        .post('/auth/2fa/enable')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ secret: twoFactorSecret, code })
        .expect(HttpStatus.OK);

      // Verify DB shows 2FA active
      const user = await userModel.findById(adminUserId).setOptions({ bypassTenantIsolation: true });
      expect(user?.isTwoFactorEnabled).toBe(true);
    });

    it('should redirect login to 2FA challenge when enabled', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminSignupData.email, password: adminSignupData.password })
        .expect(HttpStatus.OK);

      expect(res.body.is2faRequired).toBe(true);
      expect(res.body).toHaveProperty('tempToken');
      tempToken = res.body.tempToken;
    });

    it('should verify 2FA login code and issue JWT tokens', async () => {
      const code = TotpHelper.getOTP(twoFactorSecret);

      const res = await request(app.getHttpServer())
        .post('/auth/2fa/verify')
        .send({ tempToken, code })
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(adminSignupData.email);

      // Save new access token
      adminAccessToken = res.body.accessToken;
    });

    it('should disable 2FA using a valid code', async () => {
      const code = TotpHelper.getOTP(twoFactorSecret);

      await request(app.getHttpServer())
        .post('/auth/2fa/disable')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ code })
        .expect(HttpStatus.OK);

      const user = await userModel.findById(adminUserId).setOptions({ bypassTenantIsolation: true });
      expect(user?.isTwoFactorEnabled).toBe(false);
    });
  });

  describe('Active User Sessions Management', () => {
    it('should list active login sessions', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].status).toBe('active');
    });

    it('should instantly revoke a session and invalidate subsequent requests', async () => {
      // 1. Fetch sessions
      const sessionsRes = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      const sessionId = sessionsRes.body[0]._id;

      // 2. Revoke the active session
      await request(app.getHttpServer())
        .delete(`/auth/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      // 3. Verify that making request with the same accessToken is now rejected with 401
      await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
